'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  type ApiKeyInfo,
} from '@/api/api-key';
import { Loader2, Plus, Copy, Check, Trash2, Key } from 'lucide-react';

export function ApiKeysView() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Key list state
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [name, setName] = useState('');
  const [scopeRead, setScopeRead] = useState(true);
  const [scopeWrite, setScopeWrite] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  // Created key dialog state
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load keys
  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listApiKeys();
      setKeys(result);
    } catch (error) {
      toast({
        title: 'Failed to load API keys',
        description:
          error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadKeys();
    }
  }, [user, loadKeys]);

  // Create key handler
  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the API key.',
        variant: 'destructive',
      });
      return;
    }

    const scopes: string[] = [];
    if (scopeRead) scopes.push('read');
    if (scopeWrite) scopes.push('write');

    if (scopes.length === 0) {
      toast({
        title: 'Scope required',
        description: 'Please select at least one scope.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const result = await createApiKey({
        name: name.trim(),
        scopes,
        expiresAt: expiresAt || undefined,
      });
      setCreatedKey(result.apiKey.key);
      setName('');
      setScopeRead(true);
      setScopeWrite(true);
      setExpiresAt('');
      loadKeys();
    } catch (error) {
      toast({
        title: 'Failed to create API key',
        description:
          error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Copy key to clipboard
  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please select and copy the key manually.',
        variant: 'destructive',
      });
    }
  };

  // Delete key handler
  const handleDelete = async (keyId: string) => {
    try {
      await deleteApiKey(keyId);
      toast({ title: 'API key revoked' });
      loadKeys();
    } catch (error) {
      toast({
        title: 'Failed to revoke API key',
        description:
          error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Not logged in</CardTitle>
            <CardDescription>
              Please log in to manage your API keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = '/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            API Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage API keys for CLI tools, MCP integrations, and
            programmatic access.
          </p>
        </div>

        {/* Create key card */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New API Key</CardTitle>
            <CardDescription>
              API keys authenticate CLI and API requests. The key is shown once
              after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. CI Pipeline, Local CLI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scope-read"
                      checked={scopeRead}
                      onCheckedChange={(c) => setScopeRead(!!c)}
                    />
                    <Label htmlFor="scope-read" className="font-normal">
                      Read
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scope-write"
                      checked={scopeWrite}
                      onCheckedChange={(c) => setScopeWrite(!!c)}
                    />
                    <Label htmlFor="scope-write" className="font-normal">
                      Write
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-expires">
                  Expiration (optional)
                </Label>
                <Input
                  id="key-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate API Key
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key created dialog */}
        <Dialog
          open={!!createdKey}
          onOpenChange={(open) => {
            if (!open) {
              setCreatedKey(null);
              setCopied(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription className="text-amber-500 font-medium">
                This key will only be shown once. Copy it now.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm font-mono break-all select-all">
                  {createdKey}
                </code>
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="default"
                onClick={() => {
                  setCreatedKey(null);
                  setCopied(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Key list card */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              {keys.length === 0
                ? 'No API keys yet. Create one above.'
                : `${keys.length} key${keys.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : keys.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No API keys found. Generate one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">
                        {apiKey.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {apiKey.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {apiKey.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              variant="secondary"
                              className="text-xs"
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(apiKey.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(apiKey.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {apiKey.expiresAt
                          ? formatDate(apiKey.expiresAt)
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Revoke API Key
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke{' '}
                                <strong>{apiKey.name}</strong>? Any
                                applications using this key will lose access
                                immediately. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(apiKey.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Revoke Key
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
