import { useEffect, useState } from 'react';
import { Outlet } from '@umijs/max';
import { Spin } from 'antd';
import { useApp } from '@/hooks';
import { isAuthenticatedUser, redirectToLogin } from '@/lib/auth-redirect';

export default function AuthWrapper() {
  const { auth } = useApp();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    auth.loadCurrentUser().then(([error, response]) => {
      if (!active) return;
      if (error?.response?.status === 401 || (!error && !isAuthenticatedUser(response?.data?.data))) {
        redirectToLogin();
        return;
      }
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [auth.loadCurrentUser]);

  if (!checking) return <Outlet />;

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Spin size="large" />
    </div>
  );
}
