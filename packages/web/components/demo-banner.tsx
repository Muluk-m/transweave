'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useTranslations } from 'next-intl';

export function DemoBanner() {
  const { user, isAuthenticated } = useAuth();
  const t = useTranslations();

  if (!isAuthenticated || user?.email !== 'admin@test.com') return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-center text-sm py-2 px-4">
      {t('demo.banner')}
    </div>
  );
}
