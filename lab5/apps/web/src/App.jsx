import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { AdminDashboard } from "./pages/AdminDashboard.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { QueryDashboard } from "./pages/QueryDashboard.jsx";

const SESSION_STORAGE_KEY = "dbh_auth_session";
const AUTH_TOKEN_STORAGE_KEY = "dbh_auth_token";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function clearStoredSession() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function readStoredSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    const storedSession = rawSession ? JSON.parse(rawSession) : null;

    if (!storedSession?.token || !storedSession?.user || Date.now() > storedSession.expiresAt) {
      clearStoredSession();
      return null;
    }

    return storedSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState(readStoredSession);

  function navigate(nextPath, options = {}) {
    if (options.replace) {
      window.history.replaceState(null, "", nextPath);
    } else {
      window.history.pushState(null, "", nextPath);
    }

    setPath(nextPath);
  }

  function handleAuthenticated(nextSession) {
    const storedSession = {
      ...nextSession,
      expiresAt: Date.now() + SESSION_TTL_MS
    };

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextSession.token);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession));
    setSession(storedSession);
    window.location.assign("/homepage");
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    window.location.assign("/user/login");
  }

  function enterAdmin() {
    navigate("/admin/homepage");
  }

  function backHome() {
    navigate("/homepage");
  }

  useEffect(() => {
    function syncPath() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if ((path === "/" || path === "/user/login") && session) {
      navigate("/homepage", { replace: true });
      return;
    }

    if ((path === "/homepage" || path === "/admin/homepage") && !session) {
      navigate("/user/login", { replace: true });
    }
  }, [path, session]);

  if (path === "/" || path === "/user/login") {
    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  if (path === "/homepage") {
    if (!session) {
      return <LoginPage onAuthenticated={handleAuthenticated} />;
    }

    return (
      <QueryDashboard
        user={session.user}
        onEnterAdmin={enterAdmin}
        onLogout={handleLogout}
      />
    );
  }

  if (path === "/admin/homepage") {
    if (!session) {
      return <LoginPage onAuthenticated={handleAuthenticated} />;
    }

    if (session.user?.roleType !== "admin") {
      return (
        <main className="grid min-h-screen place-items-center bg-[#f7f8fa] px-6 text-slate-950">
          <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-2xl font-black">没有管理权限</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              当前账号不是管理员，请返回用户首页继续使用查询功能。
            </p>
            <Button className="mt-5" color="primary" radius="sm" onPress={backHome}>
              返回首页
            </Button>
          </section>
        </main>
      );
    }

    return <AdminDashboard user={session.user} onBackHome={backHome} onLogout={handleLogout} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8fa] px-6 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black">页面不存在</h1>
        <Button className="mt-5" color="primary" radius="sm" onPress={() => navigate("/user/login")}>
          返回登录页
        </Button>
      </section>
    </main>
  );
}
