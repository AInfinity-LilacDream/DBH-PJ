import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Tab,
  Tabs
} from "@heroui/react";
import { login, register } from "../services/authApi.js";
import { cleanInputClassNames } from "../styles/inputClassNames.js";

const initialForm = {
  username: "",
  password: ""
};

export function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";
  const title = isRegister ? "用户注册" : "账号登录";
  const submitLabel = isSubmitting ? "处理中..." : isRegister ? "注册" : "登录";

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = isRegister
        ? { username: form.username, password: form.password }
        : { username: form.username, password: form.password };
      const result = isRegister ? await register(payload) : await login(payload);

      localStorage.setItem("dbh_auth_token", result.token);
      onAuthenticated(result);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffdf9] px-5 py-8 text-slate-950 sm:px-8">
      <section
        className="grid min-h-[600px] w-full max-w-5xl items-stretch overflow-hidden rounded-lg border border-orange-100 bg-white shadow-[0_24px_80px_rgba(236,160,115,0.16)] lg:grid-cols-[0.9fr_1.1fr]"
        aria-labelledby="auth-title"
      >
        <div className="flex min-h-[600px] flex-col justify-end border-r border-orange-100 bg-[linear-gradient(rgba(251,225,183,0.38),rgba(251,225,183,0.72)),url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center p-10 text-slate-900 max-lg:min-h-[260px] max-lg:border-b max-lg:border-r-0 max-lg:p-7">
          <p className="mb-3 text-sm font-bold uppercase tracking-normal text-orange-600">
            Fudan Campus Q&A
          </p>
          <h1 id="auth-title" className="text-5xl font-black leading-tight max-sm:text-4xl">
            校园百事通
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-700">
            用一个账号进入校园信息服务，查询课程、地点、活动与个人问答记录。
          </p>
        </div>

        <Card className="h-full w-full rounded-none border-0 p-8 shadow-none sm:p-10">
          <CardHeader className="mx-auto w-full max-w-md px-0 pb-0">
            <Tabs
              aria-label="认证模式"
              selectedKey={mode}
              onSelectionChange={(key) => switchMode(String(key))}
              fullWidth
              radius="sm"
              color="primary"
            >
              <Tab key="login" title="登录" />
              <Tab key="register" title="注册" />
            </Tabs>
          </CardHeader>

          <CardBody className="flex justify-center px-0 pb-0">
            <form className="flex min-h-[420px] w-full max-w-md flex-col" onSubmit={handleSubmit}>
              <div className="flex min-h-[150px] items-center justify-center">
                <h2 className="text-center text-3xl font-black text-slate-800">{title}</h2>
              </div>

              <div className="grid gap-5">
                <Input
                  label="用户名"
                  value={form.username}
                  classNames={cleanInputClassNames}
                  onValueChange={(value) => updateField("username", value)}
                  placeholder="用户名"
                  autoComplete="username"
                  variant="bordered"
                  isRequired
                />

                <Input
                  label="密码"
                  type="password"
                  value={form.password}
                  classNames={cleanInputClassNames}
                  onValueChange={(value) => updateField("password", value)}
                  placeholder="密码"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  variant="bordered"
                  isRequired
                />

                <Button color="primary" type="submit" isLoading={isSubmitting} fullWidth radius="sm">
                  {submitLabel}
                </Button>

                {message && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
