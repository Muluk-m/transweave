"use client";

import { useAuth } from '@/lib/auth/auth-context';
import TeamsView from '@/components/views/teamsView';
import WelcomeView from '@/components/views/welcomeView';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <WelcomeView />;
  }

  return <TeamsView />;
}
