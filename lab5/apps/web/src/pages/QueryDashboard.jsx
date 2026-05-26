import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Textarea
} from "@heroui/react";

const queryTypes = [
  { key: "location", label: "地点查询" },
  { key: "course", label: "课程查询" },
  { key: "event", label: "活动查询" },
  { key: "people", label: "人员查询" }
];

const campuses = [
  { key: "all", label: "全部校区" },
  { key: "handan", label: "邯郸校区" },
  { key: "jiangwan", label: "江湾校区" },
  { key: "fenglin", label: "枫林校区" },
  { key: "zhangjiang", label: "张江校区" }
];

const mockResults = [
  {
    title: "北区食堂",
    tag: "地点",
    meta: "邯郸校区 / 光华楼附近",
    description: "营业时间、所在建筑、设施类型等信息将在接入后端后展示。"
  },
  {
    title: "数据库设计",
    tag: "课程",
    meta: "计算机科学技术学院 / 2025-2026-1",
    description: "授课教师、选课关系、成绩记录等信息将在接入后端后展示。"
  },
  {
    title: "数据库前沿讲座",
    tag: "活动",
    meta: "2026-06-10 14:00 / H3101",
    description: "活动地点、主办院系、参与人数等信息将在接入后端后展示。"
  }
];

const historyItems = [
  "邯郸校区有哪些食堂？",
  "数据库设计课程由谁授课？",
  "近期有哪些校园讲座？",
  "计算机学院办公室在哪里？"
];

export function QueryDashboard({ user, onLogout }) {
  const [queryType, setQueryType] = useState("location");
  const [campus, setCampus] = useState("all");
  const [question, setQuestion] = useState("");
  const [selectedTab, setSelectedTab] = useState("results");

  const userLabel = useMemo(() => {
    if (!user) {
      return "访客";
    }

    return `${user.name} / ${user.roleType}`;
  }, [user]);

  function fillQuestion(value) {
    setQuestion(value);
    setSelectedTab("results");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Fudan Campus Q&A</p>
            <h1 className="text-2xl font-black">校园百事通查询台</h1>
          </div>
          <div className="flex items-center gap-3">
            <Chip color="primary" variant="flat">
              {userLabel}
            </Chip>
            <Button variant="bordered" radius="sm" onPress={onLogout}>
              退出
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="flex flex-col gap-4">
          <Card radius="sm">
            <CardHeader className="pb-2">
              <h2 className="text-base font-bold">查询范围</h2>
            </CardHeader>
            <CardBody className="gap-4">
              <Select
                label="查询类型"
                selectedKeys={[queryType]}
                onSelectionChange={(keys) => setQueryType(Array.from(keys)[0])}
                variant="bordered"
              >
                {queryTypes.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>

              <Select
                label="校区"
                selectedKeys={[campus]}
                onSelectionChange={(keys) => setCampus(Array.from(keys)[0])}
                variant="bordered"
              >
                {campuses.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>

              <Divider />

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-slate-700">常用入口</p>
                {queryTypes.map((item) => (
                  <Button
                    key={item.key}
                    className="justify-start"
                    variant={queryType === item.key ? "flat" : "light"}
                    color={queryType === item.key ? "primary" : "default"}
                    radius="sm"
                    onPress={() => setQueryType(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card radius="sm">
            <CardHeader className="pb-2">
              <h2 className="text-base font-bold">查询历史</h2>
            </CardHeader>
            <CardBody className="gap-2">
              {historyItems.map((item) => (
                <Button
                  key={item}
                  className="h-auto justify-start whitespace-normal text-left"
                  variant="light"
                  radius="sm"
                  onPress={() => fillQuestion(item)}
                >
                  {item}
                </Button>
              ))}
            </CardBody>
          </Card>
        </aside>

        <section className="flex flex-col gap-4">
          <Card radius="sm" shadow="sm">
            <CardBody className="gap-4">
              <Textarea
                label="输入你的问题"
                minRows={4}
                value={question}
                onValueChange={setQuestion}
                placeholder="例如：邯郸校区有哪些食堂？数据库设计课程由谁授课？"
                variant="bordered"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Chip variant="flat">仅前端骨架</Chip>
                  <Chip color="primary" variant="flat">
                    {queryTypes.find((item) => item.key === queryType)?.label}
                  </Chip>
                  <Chip variant="flat">{campuses.find((item) => item.key === campus)?.label}</Chip>
                </div>
                <Button color="primary" radius="sm">
                  查询
                </Button>
              </div>
            </CardBody>
          </Card>

          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(String(key))}
            color="primary"
            radius="sm"
          >
            <Tab key="results" title="结果预览">
              <div className="mt-4 grid gap-3">
                {mockResults.map((item) => (
                  <Card key={item.title} radius="sm" shadow="sm">
                    <CardBody className="gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">{item.title}</h3>
                          <p className="text-sm text-slate-500">{item.meta}</p>
                        </div>
                        <Chip color="primary" variant="flat">
                          {item.tag}
                        </Chip>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </Tab>

            <Tab key="sql" title="结构化结果">
              <Card className="mt-4" radius="sm">
                <CardBody>
                  <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">
{`{
  "status": "placeholder",
  "message": "这里预留给后端返回的结构化查询结果",
  "sourceTables": ["Campus", "Building", "Location", "Course", "Event"]
}`}
                  </pre>
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        </section>

        <aside className="flex flex-col gap-4">
          <Card radius="sm">
            <CardHeader className="pb-2">
              <h2 className="text-base font-bold">详情面板</h2>
            </CardHeader>
            <CardBody className="gap-3 text-sm leading-6 text-slate-600">
              <p>后续接入后端后，这里可以展示选中结果的完整字段、关联表和操作入口。</p>
              <Divider />
              <div>
                <p className="font-semibold text-slate-800">可接入数据表</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Location", "Course", "Event", "People", "QueryRecord"].map((item) => (
                    <Chip key={item} size="sm" variant="flat">
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card radius="sm">
            <CardHeader className="pb-2">
              <h2 className="text-base font-bold">快捷问题</h2>
            </CardHeader>
            <CardBody className="gap-2">
              {[
                "最近 30 天有哪些讲座？",
                "某门课有哪些授课教师？",
                "某个学生的选课和成绩？"
              ].map((item) => (
                <Button
                  key={item}
                  className="h-auto justify-start whitespace-normal text-left"
                  variant="flat"
                  radius="sm"
                  onPress={() => fillQuestion(item)}
                >
                  {item}
                </Button>
              ))}
            </CardBody>
          </Card>
        </aside>
      </div>
    </main>
  );
}
