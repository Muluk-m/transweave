'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { SidebarView } from './sidebarView';

const noSidebarPaths = ['/login', '/register', '/signup', '/setup', '/forgot-password', '/reset-password'];

export function SidebarManager() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const hideSidebar =
    !isAuthenticated ||
    isLoading ||
    noSidebarPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (hideSidebar) return null;
  return <SidebarView />;
}
