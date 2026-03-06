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
import { useTranslations } from 'next-intl';

export function ApiKeysView() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('apiKeys');

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
        title: t('errors.loadFailed'),
        description:
          error instanceof Error ? error.message : t('errors.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (user) {
      loadKeys();
    }
  }, [user, loadKeys]);

  // Create key handler
  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: t('errors.nameRequired'),
        description: t('errors.nameRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    const scopes: string[] = [];
    if (scopeRead) scopes.push('read');
    if (scopeWrite) scopes.push('write');

    if (scopes.length === 0) {
      toast({
        title: t('errors.scopeRequired'),
        description: t('errors.scopeRequiredDesc'),
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
        title: t('errors.createFailed'),
        description:
          error instanceof Error ? error.message : t('errors.unknownError'),
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
        title: t('errors.copyFailed'),
        description: t('errors.copyFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  // Delete key handler
  const handleDelete = async (keyId: string) => {
    try {
      await deleteApiKey(keyId);
      toast({ title: t('revokeSuccess') });
      loadKeys();
    } catch (error) {
      toast({
        title: t('errors.revokeFailed'),
        description:
          error instanceof Error ? error.message : t('errors.unknownError'),
        variant: 'destructive',
      });
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('never');
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
            <CardTitle>{t('notLoggedIn')}</CardTitle>
            <CardDescription>
              {t('notLoggedInDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = '/login')}>
              {t('goToLogin')}
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
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>

        {/* Create key card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('createTitle')}</CardTitle>
            <CardDescription>
              {t('createDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">{t('name')}</Label>
                <Input
                  id="key-name"
                  placeholder={t('namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('scopes')}</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scope-read"
                      checked={scopeRead}
                      onCheckedChange={(c) => setScopeRead(!!c)}
                    />
                    <Label htmlFor="scope-read" className="font-normal">
                      {t('read')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scope-write"
                      checked={scopeWrite}
                      onCheckedChange={(c) => setScopeWrite(!!c)}
                    />
                    <Label htmlFor="scope-write" className="font-normal">
                      {t('write')}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-expires">
                  {t('expiration')}
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
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('generateButton')}
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
              <DialogTitle>{t('createdTitle')}</DialogTitle>
              <DialogDescription className="text-amber-500 font-medium">
                {t('createdWarning')}
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
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('copyButton')}
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
                {t('done')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Key list card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('listTitle')}</CardTitle>
            <CardDescription>
              {keys.length === 0
                ? t('noKeys')
                : t('keyCount', { count: keys.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : keys.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('noKeysFound')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('tableHeaders.name')}</TableHead>
                    <TableHead>{t('tableHeaders.keyPrefix')}</TableHead>
                    <TableHead>{t('tableHeaders.scopes')}</TableHead>
                    <TableHead>{t('tableHeaders.created')}</TableHead>
                    <TableHead>{t('tableHeaders.lastUsed')}</TableHead>
                    <TableHead>{t('tableHeaders.expires')}</TableHead>
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
                          : t('never')}
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
                                {t('revokeTitle')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('revokeDesc', { name: apiKey.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(apiKey.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t('revokeButton')}
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
