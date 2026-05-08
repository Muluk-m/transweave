"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Bot, Send, Loader2, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import { agentChat } from "@/api/agent";
import type { ChatMessage, AgentEvent } from "@/api/agent";
import { useAtom } from "jotai";
import { agentChatTokenContextAtom } from "@/jotai";

interface AgentChatProps {
  projectId: string;
  aiConfigured: boolean;
}

function ToolCallDisplay({
  name,
  args,
  result,
}: {
  name: string;
  args: any;
  result?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-muted/50 border rounded-md p-2 text-xs my-1">
      <button
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground w-full"
        onClick={() => setExpanded(!expanded)}
      >
        <Wrench className="w-3 h-3" />
        <span className="font-medium">{name}</span>
        {result ? (
          <span className="text-success ml-auto">done</span>
        ) : (
          <Loader2 className="w-3 h-3 animate-spin ml-auto" />
        )}
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          <pre className="bg-background rounded p-1.5 overflow-x-auto text-[11px]">
            {JSON.stringify(args, null, 2)}
          </pre>
          {result && (
            <pre className="bg-background rounded p-1.5 overflow-x-auto text-[11px] max-h-[200px] overflow-y-auto">
              {typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentChat({ projectId, aiConfigured }: AgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [tokenContext, setTokenContext] = useAtom(agentChatTokenContextAtom);
  const lastNonceRef = useRef<number | null>(null);

  // When a token context arrives via the global atom (row-level Ask Agent),
  // open the sheet, reset the conversation, and seed it with token context.
  useEffect(() => {
    if (!tokenContext) return;
    if (tokenContext.nonce === lastNonceRef.current) return;
    lastNonceRef.current = tokenContext.nonce;
    abortRef.current?.abort();
    const seed: ChatMessage = {
      role: "assistant",
      content: [
        `已加载 token 上下文：`,
        `- key: \`${tokenContext.key}\``,
        tokenContext.module ? `- module: \`${tokenContext.module}\`` : null,
        `- 当前译文: ${JSON.stringify(tokenContext.translations)}`,
        tokenContext.screenshots.length > 0
          ? `- 截图: ${tokenContext.screenshots.length} 张已附加`
          : null,
        ``,
        `你可以直接问我关于这条 token 的任何问题：建议译文、QA、改 key 等。`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
    setMessages([seed]);
    setSessionId(undefined);
    setIsOpen(true);
  }, [tokenContext]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Build history for API (exclude tool details)
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      toolCalls: [],
    };
    setMessages((prev) => [...prev, assistantMsg]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await agentChat(text, projectId, history.slice(0, -1), (event: AgentEvent) => {
        if (event.type === 'done' && event.sessionId) {
          setSessionId(event.sessionId);
        }
        setMessages((prev) => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };

          switch (event.type) {
            case "text":
              last.content += event.content || "";
              break;
            case "tool_call":
              last.toolCalls = [
                ...(last.toolCalls || []),
                {
                  name: event.toolName!,
                  args: event.toolArgs,
                  id: event.toolCallId!,
                },
              ];
              break;
            case "tool_result": {
              last.toolCalls = (last.toolCalls || []).map((tc) =>
                tc.id === event.toolCallId
                  ? { ...tc, result: event.toolResult }
                  : tc,
              );
              break;
            }
            case "error":
              last.content += `\n\nError: ${event.content}`;
              break;
          }

          updated[updated.length - 1] = last;
          return updated;
        });
      }, sessionId, controller.signal);
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = { ...updated[updated.length - 1] };
        last.content = `Error: ${err instanceof Error ? err.message : String(err)}`;
        updated[updated.length - 1] = last;
        return updated;
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (!aiConfigured) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
        if (!open) {
          abortRef.current?.abort();
          // Closing also clears the token context so a future row-click
          // re-opens with fresh state.
          setTokenContext(null);
        }
        setIsOpen(open);
      }}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg z-50"
        >
          <Bot className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bot className="w-4 h-4" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ask me about your translations!</p>
              <p className="text-xs mt-1">
                I can create tokens, translate text, run QA checks, and more.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.toolCalls?.map((tc) => (
                  <ToolCallDisplay
                    key={tc.id}
                    name={tc.name}
                    args={tc.args}
                    result={tc.result}
                  />
                ))}
                {msg.content && (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                {msg.role === "assistant" &&
                  !msg.content &&
                  !msg.toolCalls?.length && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about translations..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
