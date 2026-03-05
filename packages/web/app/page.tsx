"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import TeamsView from '@/components/views/teamsView';

export default function Page() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [router, isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) return null;

  return <TeamsView />;
}
