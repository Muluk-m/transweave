'use client';

import { usePathname } from 'next/navigation';
import { SidebarView } from './sidebarView';

const noSidebarPaths = ['/login', '/register', '/signup', '/setup', '/forgot-password', '/reset-password'];

export function SidebarManager() {
  const pathname = usePathname();
  const hideSidebar = noSidebarPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (hideSidebar) return null;
  return <SidebarView />;
}
