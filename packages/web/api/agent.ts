import { apiClient } from "../lib/api";

export interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  toolCallId?: string;
  sessionId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
    id: string;
  }>;
}

export interface AgentSession {
  id: string;
  projectId: string;
  userId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export async function agentChat(
  message: string,
  projectId: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onEvent: (event: AgentEvent) => void,
  sessionId?: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, projectId, history, sessionId }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Agent chat failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as AgentEvent;
          onEvent(event);
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

export async function listAgentSessions(projectId: string): Promise<AgentSession[]> {
  return apiClient.get<AgentSession[]>(`/api/agent/sessions/${projectId}`);
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(`/api/agent/session/${sessionId}/messages`);
}

export async function deleteAgentSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/agent/session/${sessionId}`);
}
