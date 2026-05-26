import React from "react";
import { LoginPage } from "./pages/LoginPage.jsx";

export function App() {
  const path = window.location.pathname;

  if (path === "/" || path === "/user/login") {
    return <LoginPage />;
  }

  return (
    <main className="not-found">
      <h1>页面不存在</h1>
      <a href="/user/login">返回登录页</a>
    </main>
  );
}
