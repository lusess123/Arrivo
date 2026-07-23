import { useEffect, useState } from "react";
import { Outlet, useLocation } from "@umijs/max";
import { Spin } from "antd";
import { useApp } from "@/hooks";
import { isAuthenticatedUser, redirectToLogin } from "@/lib/auth-redirect";

export default function AuthWrapper() {
  const { auth } = useApp();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    auth.loadCurrentUser().then(([error, response]) => {
      if (!active) return;
      if (
        error?.response?.status === 401 ||
        (!error && !isAuthenticatedUser(response?.data?.data))
      ) {
        redirectToLogin();
        return;
      }
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [auth.loadCurrentUser]);

  useEffect(() => {
    if (checking) return;
    const path = `${location.pathname}${location.search}${location.hash}`;
    void auth.saveLastVisitedPage(path);
  }, [
    auth.saveLastVisitedPage,
    checking,
    location.hash,
    location.pathname,
    location.search,
  ]);

  if (!checking) return <Outlet />;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Spin size="large" />
    </div>
  );
}
