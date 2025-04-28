"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import WelcomeView from '@/components/views/welcomeView';

export default function Page() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // 只有当加载完成且用户未认证时才重定向到登录页面
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (!isLoading && isAuthenticated) {
      router.replace('/teams');
    }
  }, [router, isAuthenticated, isLoading]);

  // 当正在加载或已认证时，显示正常内容
  return isLoading ? null : (
    isAuthenticated ? <div>welcome</div> : null
  );
}
