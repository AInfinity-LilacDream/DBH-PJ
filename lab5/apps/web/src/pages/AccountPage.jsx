import React, { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import {
  bindPeople,
  getAccount,
  listBindablePeople,
  unbindPeople,
  updateAccount
} from "../services/accountApi.js";
import { roleTextMap } from "../constants/roleTextMap.js";
import { verificationTextMap } from "../constants/verificationTextMap.js";
import { cleanInputClassNames } from "../styles/inputClassNames.js";

export function AccountPage({ user, onBackHome, onSessionUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [account, setAccount] = useState(user);
  const [form, setForm] = useState({ username: user?.username ?? "", password: "" });
  const [people, setPeople] = useState([]);
  const [bindForm, setBindForm] = useState({ name: "", workNo: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function notify(message, color = "success") {
    addToast({
      title: message,
      color,
      timeout: 2600
    });
  }

  async function loadAccount() {
    const result = await getAccount(user.userId);
    setAccount(result.data);
    setForm((current) => ({
      ...current,
      username: result.data?.username ?? ""
    }));
    onSessionUpdate(result.data);
  }

  async function loadPeople(nextForm = bindForm) {
    const result = await listBindablePeople(user.userId, nextForm);
    setPeople(result.data ?? []);
  }

  useEffect(() => {
    loadAccount().catch((error) => notify(error.message, "danger"));
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateBindField(name, value) {
    setBindForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateAccount(user.userId, form);
      setAccount(result.data);
      setForm({ username: result.data.username, password: "" });
      onSessionUpdate(result.data);
      notify("账号信息已更新。");
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (!bindForm.name.trim() || !bindForm.workNo.trim()) {
      setPeople([]);
      notify("请输入姓名和学工号。", "warning");
      return;
    }

    try {
      await loadPeople(bindForm);
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  async function handleBind(peopleId) {
    try {
      const result = await bindPeople(user.userId, peopleId);
      setAccount(result.data);
      onSessionUpdate(result.data);
      setPeople([]);
      notify("人员绑定已更新。");
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  async function handleUnbind() {
    try {
      const result = await unbindPeople(user.userId);
      setAccount(result.data);
      onSessionUpdate(result.data);
      setPeople([]);
      notify("已解除人员绑定。");
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  const currentPersonText = account?.peopleId ? account.name : "当前账号尚未绑定人员";

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>用户端</span>
              <span>/</span>
              <span>管理账户</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">账户设置</h1>
          </div>
          <Button color="primary" radius="sm" variant="flat" onPress={onBackHome}>
            返回首页
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-5 px-5 py-6 sm:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">{account?.username}</h2>
              <p className="mt-1 text-sm text-slate-500">{currentPersonText}</p>
            </div>
            <div className="flex gap-2">
              <Chip color="primary" radius="sm" variant="flat">
                {roleTextMap[account?.roleType] ?? account?.roleType}
              </Chip>
              <Chip color="warning" radius="sm" variant="flat">
                {verificationTextMap[account?.verificationStatus] ?? account?.verificationStatus}
              </Chip>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Tabs
            aria-label="账户设置标签页"
            color="primary"
            radius="sm"
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(String(key))}
          >
            <Tab key="profile" title="修改个人信息">
              <form className="mt-5 grid max-w-lg gap-4" onSubmit={handleProfileSubmit}>
                <Input
                  label="用户名"
                  classNames={cleanInputClassNames}
                  radius="sm"
                  value={form.username}
                  variant="bordered"
                  onValueChange={(value) => updateField("username", value)}
                />
                <Input
                  label="新密码"
                  type="password"
                  classNames={cleanInputClassNames}
                  description="留空则不修改密码"
                  radius="sm"
                  value={form.password}
                  variant="bordered"
                  onValueChange={(value) => updateField("password", value)}
                />
                <Button className="w-fit bg-[#d96f3f] px-8 font-semibold text-white" isLoading={isSubmitting} radius="sm" type="submit">
                  保存修改
                </Button>
              </form>
            </Tab>

            <Tab key="binding" title="人员绑定">
              <div className="mt-5 grid gap-4">
                {account?.peopleId ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">当前已绑定人员</p>
                        <p className="mt-1 text-sm text-slate-600">{account.name}</p>
                      </div>
                      <Chip color="primary" radius="sm" variant="flat">
                        已认证
                      </Chip>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      如需更换绑定，请先解除当前绑定，再使用姓名和学工号重新绑定。
                    </p>
                    <Button className="mt-5" color="danger" radius="sm" variant="flat" onPress={handleUnbind}>
                      解除绑定
                    </Button>
                  </div>
                ) : (
                  <>
                    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_96px]" onSubmit={handleSearch}>
                      <Input
                        label="学生姓名"
                        classNames={cleanInputClassNames}
                        placeholder="请输入真实姓名"
                        radius="sm"
                        value={bindForm.name}
                        variant="bordered"
                        onValueChange={(value) => updateBindField("name", value)}
                      />
                      <Input
                        label="学工号"
                        classNames={cleanInputClassNames}
                        placeholder="学生学号或教师工号"
                        radius="sm"
                        value={bindForm.workNo}
                        variant="bordered"
                        onValueChange={(value) => updateBindField("workNo", value)}
                      />
                      <Button className="self-end" color="primary" radius="sm" type="submit">
                        搜索
                      </Button>
                    </form>

                    <Table aria-label="匹配人员列表" radius="sm" shadow="none">
                      <TableHeader>
                        <TableColumn>姓名</TableColumn>
                        <TableColumn>学工号</TableColumn>
                        <TableColumn>类型</TableColumn>
                        <TableColumn>绑定状态</TableColumn>
                        <TableColumn>操作</TableColumn>
                      </TableHeader>
                      <TableBody emptyContent="暂无匹配人员" items={people}>
                        {(item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.workNo || "未填写"}</TableCell>
                            <TableCell>{item.personType === "teacher" ? "教师" : "学生"}</TableCell>
                            <TableCell>
                              {item.isBound ? (
                                <Chip color="default" radius="sm" size="sm" variant="flat">
                                  已绑定 {item.boundUsername}
                                </Chip>
                              ) : (
                                <Chip color="success" radius="sm" size="sm" variant="flat">
                                  可绑定
                                </Chip>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                className="bg-[#d96f3f] font-semibold text-white"
                                isDisabled={item.isBound}
                                radius="sm"
                                size="sm"
                                onPress={() => handleBind(item.id)}
                              >
                                绑定
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            </Tab>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
