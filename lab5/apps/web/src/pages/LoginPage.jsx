import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs
} from "@heroui/react";
import { login, register } from "../services/authApi.js";
import { QueryDashboard } from "./QueryDashboard.jsx";

const initialForm = {
  name: "",
  username: "",
  password: "",
  gender: "O",
  roleType: "student",
  phone: "",
  email: ""
};

const genderOptions = [
  { key: "M", label: "男" },
  { key: "F", label: "女" },
  { key: "O", label: "其他" }
];

const roleOptions = [
  { key: "student", label: "学生" },
  { key: "teacher", label: "教师" },
  { key: "admin", label: "管理员" }
];

const roleMap = {
  student: "学生",
  teacher: "教师",
  admin: "管理员"
};

export function LoginPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);

  const isRegister = mode === "register";
  const title = isRegister ? "创建账号" : "账号登录";
  const submitLabel = isSubmitting ? "处理中..." : isRegister ? "注册" : "登录";

  const roleText = useMemo(
    () => roleMap[session?.user?.roleType] ?? session?.user?.roleType,
    [session]
  );

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setSession(null);
  }

  function handleLogout() {
    localStorage.removeItem("dbh_auth_token");
    setSession(null);
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setSession(null);

    try {
      const payload = isRegister
        ? form
        : { username: form.username, password: form.password };
      const result = isRegister ? await register(payload) : await login(payload);

      localStorage.setItem("dbh_auth_token", result.token);
      setSession(result);
      setMessage(isRegister ? "注册成功，已自动登录。" : "登录成功。");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session || searchParams.get("mockDashboard") === "1") {
    return (
      <QueryDashboard
        user={session?.user ?? { name: "演示用户", username: "demo", roleType: "student" }}
        onLogout={handleLogout}
      />
    );
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

          <CardBody className="flex items-center justify-center px-0 pb-0">
            <form className="flex w-full max-w-md flex-col justify-center gap-5" onSubmit={handleSubmit}>
              <h2 className="text-center text-3xl font-black text-slate-800">{title}</h2>

              {isRegister && (
                <>
                  <Input
                    label="姓名"
                    value={form.name}
                    onValueChange={(value) => updateField("name", value)}
                    placeholder="张三"
                    autoComplete="name"
                    variant="bordered"
                    isRequired
                  />

                  <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    <Select
                      label="性别"
                      selectedKeys={[form.gender]}
                      onSelectionChange={(keys) => updateField("gender", Array.from(keys)[0])}
                      variant="bordered"
                    >
                      {genderOptions.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    <Select
                      label="角色"
                      selectedKeys={[form.roleType]}
                      onSelectionChange={(keys) => updateField("roleType", Array.from(keys)[0])}
                      variant="bordered"
                    >
                      {roleOptions.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>
                  </div>
                </>
              )}

              <Input
                label="用户名"
                value={form.username}
                onValueChange={(value) => updateField("username", value)}
                placeholder="zhangsan"
                autoComplete="username"
                variant="bordered"
                isRequired
              />

              <Input
                label="密码"
                type="password"
                value={form.password}
                onValueChange={(value) => updateField("password", value)}
                placeholder="至少 6 位"
                autoComplete={isRegister ? "new-password" : "current-password"}
                variant="bordered"
                isRequired
              />

              {isRegister && (
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <Input
                    label="手机号"
                    value={form.phone}
                    onValueChange={(value) => updateField("phone", value)}
                    placeholder="可选"
                    autoComplete="tel"
                    variant="bordered"
                  />

                  <Input
                    label="邮箱"
                    type="email"
                    value={form.email}
                    onValueChange={(value) => updateField("email", value)}
                    placeholder="可选"
                    autoComplete="email"
                    variant="bordered"
                  />
                </div>
              )}

              <Button color="primary" type="submit" isLoading={isSubmitting} fullWidth radius="sm">
                {submitLabel}
              </Button>

              {message && (
                <p
                  className={
                    session
                      ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
                      : "rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  }
                >
                  {message}
                </p>
              )}

              {session && (
                <div className="grid gap-1 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <strong>{session.user.name}</strong>
                  <span className="text-sm text-slate-600">@{session.user.username}</span>
                  <span className="text-sm text-slate-600">{roleText}</span>
                </div>
              )}
            </form>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
