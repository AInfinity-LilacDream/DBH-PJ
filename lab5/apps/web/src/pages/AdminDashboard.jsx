import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  Button,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea
} from "@heroui/react";
import {
  createAdminRow,
  deleteAdminRow,
  listAdminFieldOptions,
  listAdminRows,
  updateAdminRow
} from "../services/adminApi.js";
import { cleanInputClassNames } from "../styles/inputClassNames.js";

const roleTextMap = {
  student: "学生",
  teacher: "教师",
  admin: "管理员"
};

const optionSets = {
  gender: [
    ["M", "男"],
    ["F", "女"],
    ["O", "其他"]
  ],
  roleType: [
    ["student", "学生"],
    ["teacher", "教师"],
    ["admin", "管理员"]
  ],
  verificationStatus: [
    ["pending", "待审核"],
    ["verified", "已认证"],
    ["rejected", "已拒绝"]
  ],
  facilityType: ["教室", "食堂", "咖啡店", "自习室", "图书馆", "实验室", "运动场地", "办公室", "医务室", "其他"].map((item) => [item, item]),
  buildingType: ["教学楼", "宿舍楼", "食堂楼", "图书馆", "行政楼", "实验楼", "体育设施", "医疗卫生", "其他"].map((item) => [item, item]),
  eventType: ["讲座", "论坛", "文艺演出", "体育赛事", "学术交流", "招聘宣讲", "志愿服务", "其他"].map((item) => [item, item])
};

const modules = [
  {
    key: "campus",
    label: "校区",
    tableName: "Campus",
    description: "维护校区名称和地址信息。",
    fields: [
      { key: "campusName", label: "校区名称", required: true },
      { key: "address", label: "地址", required: true }
    ],
    columns: [
      { key: "campusName", label: "校区名称" },
      { key: "address", label: "地址" }
    ]
  },
  {
    key: "building",
    label: "楼宇",
    tableName: "Building",
    description: "维护楼宇名称、所属校区、类型与描述。",
    fields: [
      { key: "buildingName", label: "楼宇名称", required: true },
      { key: "campusId", label: "所属校区", type: "fk-select", options: "campuses", required: true },
      { key: "buildingType", label: "楼宇类型", type: "select", options: "buildingType", required: true },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "buildingName", label: "楼宇名称" },
      { key: "campusName", label: "所属校区" },
      { key: "buildingType", label: "楼宇类型" },
      { key: "description", label: "描述" }
    ]
  },
  {
    key: "location",
    label: "地点",
    tableName: "Location",
    description: "维护地点、所属楼宇、设施类型和开放时间。",
    fields: [
      { key: "locationName", label: "地点名称", required: true },
      { key: "buildingId", label: "所属楼宇", type: "fk-select", options: "buildings", required: true },
      { key: "facilityType", label: "设施类型", type: "select", options: "facilityType", required: true },
      { key: "openTime", label: "开放时间" },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "locationName", label: "地点名称" },
      { key: "buildingName", label: "所属楼宇" },
      { key: "facilityType", label: "设施类型" },
      { key: "openTime", label: "开放时间" }
    ]
  },
  {
    key: "department",
    label: "院系",
    tableName: "Department",
    description: "维护院系名称、联系方式、办公室地点与负责人。",
    fields: [
      { key: "depName", label: "院系名称", required: true },
      { key: "contactInfo", label: "联系方式" },
      { key: "officeLocationId", label: "办公室地点", type: "fk-select", options: "locations", allowEmpty: true },
      { key: "managerId", label: "负责人", type: "fk-select", options: "people", allowEmpty: true },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "depName", label: "院系名称" },
      { key: "contactInfo", label: "联系方式" },
      { key: "officeLocationName", label: "办公室" },
      { key: "managerName", label: "负责人" }
    ]
  },
  {
    key: "course",
    label: "课程",
    tableName: "Course",
    description: "维护课程、开课院系和课程描述。",
    fields: [
      { key: "courseName", label: "课程名称", required: true },
      { key: "depId", label: "开课院系", type: "fk-select", options: "departments", required: true },
      { key: "description", label: "课程描述", type: "textarea" }
    ],
    columns: [
      { key: "courseName", label: "课程名称" },
      { key: "departmentName", label: "开课院系" },
      { key: "description", label: "课程描述" }
    ]
  },
  {
    key: "event",
    label: "活动",
    tableName: "Event",
    description: "维护讲座、论坛、体育赛事等校园活动。",
    fields: [
      { key: "eventName", label: "活动名称", required: true },
      { key: "eventType", label: "活动类型", type: "select", options: "eventType", required: true },
      { key: "startTime", label: "开始时间", type: "datetime-local", required: true },
      { key: "endTime", label: "结束时间", type: "datetime-local" },
      { key: "locationId", label: "活动地点", type: "fk-select", options: "locations", allowEmpty: true },
      { key: "hostDepId", label: "主办院系", type: "fk-select", options: "departments", allowEmpty: true },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "eventName", label: "活动名称" },
      { key: "eventType", label: "活动类型" },
      { key: "startTime", label: "开始时间", format: "datetime" },
      { key: "locationName", label: "地点" }
    ]
  },
  {
    key: "people",
    label: "人员",
    tableName: "People / SysUser",
    description: "维护人员资料和账号信息。密码留空时，编辑不会修改原密码；新建账号默认密码为 123456。",
    fields: [
      { key: "name", label: "姓名", required: true },
      { key: "gender", label: "性别", type: "select", options: "gender", required: true },
      { key: "phone", label: "手机号" },
      { key: "email", label: "邮箱" },
      { key: "username", label: "用户名" },
      { key: "password", label: "密码", type: "password" },
      { key: "roleType", label: "账号角色", type: "select", options: "roleType" },
      { key: "verificationStatus", label: "审核状态", type: "select", options: "verificationStatus" }
    ],
    columns: [
      { key: "name", label: "姓名" },
      { key: "username", label: "用户名" },
      { key: "roleType", label: "角色" },
      { key: "verificationStatus", label: "审核状态" }
    ]
  }
];

function normalizeFormValues(activeModule, row) {
  if (!row) {
    return {};
  }

  return activeModule.fields.reduce((values, field) => {
    let value = row[field.key] ?? "";

    if (field.type === "datetime-local" && value) {
      value = toDatetimeLocalValue(value);
    }

    values[field.key] = value;
    return values;
  }, {});
}

function toDatetimeLocalValue(value) {
  const text = String(value).trim();

  if (!text) {
    return "";
  }

  return text.replace(" ", "T").slice(0, 16);
}

function formatDateTimeDisplay(value) {
  if (value === null || value === undefined || value === "") {
    return "未填写";
  }

  return String(value).replace("T", " ");
}

function displayValue(value, column) {
  if (column?.format === "datetime") {
    return formatDateTimeDisplay(value);
  }

  if (value === null || value === undefined || value === "") {
    return "未填写";
  }

  return String(value);
}

function NavButton({ item, isActive, onPress }) {
  return (
    <Button
      className="h-11 justify-start gap-3 px-3 text-sm font-semibold"
      color={isActive ? "primary" : "default"}
      radius="sm"
      variant={isActive ? "flat" : "light"}
      onPress={onPress}
      fullWidth
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/80 text-sm shadow-sm">
        {item.label.slice(0, 1)}
      </span>
      <span className="truncate">{item.label}管理</span>
    </Button>
  );
}

function DataForm({ activeModule, fieldOptionMap, initialValues, isSubmitting, onSubmit, onClose }) {
  const [formValues, setFormValues] = useState(() => normalizeFormValues(activeModule, initialValues));

  useEffect(() => {
    setFormValues(normalizeFormValues(activeModule, initialValues));
  }, [activeModule, initialValues]);

  function updateField(field, value) {
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(formValues);
  }

  return (
    <form className="grid content-start gap-4" onSubmit={handleSubmit}>
      {activeModule.fields.map((field) => {
        if (field.type === "textarea") {
          return (
            <Textarea
              key={field.key}
              label={field.label}
              classNames={cleanInputClassNames}
              minRows={3}
              radius="sm"
              value={formValues[field.key] ?? ""}
              variant="bordered"
              onValueChange={(value) => updateField(field.key, value)}
            />
          );
        }

        if (field.type === "select") {
          return (
            <Select
              key={field.key}
              label={field.label}
              radius="sm"
              selectedKeys={formValues[field.key] ? [String(formValues[field.key])] : []}
              variant="bordered"
              onSelectionChange={(keys) => updateField(field.key, Array.from(keys)[0] ?? "")}
            >
              {(optionSets[field.options] ?? []).map(([value, label]) => (
                <SelectItem key={value}>{label}</SelectItem>
              ))}
            </Select>
          );
        }

        if (field.type === "fk-select") {
          const options = fieldOptionMap[field.options] ?? [];
          const emptyKey = "__none__";
          const currentValue = formValues[field.key];
          const selectedKeys = currentValue
            ? [String(currentValue)]
            : field.allowEmpty
              ? [emptyKey]
              : [];

          return (
            <Select
              key={field.key}
              label={field.label}
              isLoading={options.length === 0}
              radius="sm"
              selectedKeys={selectedKeys}
              variant="bordered"
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] ?? "";
                updateField(field.key, value === emptyKey ? "" : value);
              }}
            >
              {field.allowEmpty ? <SelectItem key={emptyKey}>不选择</SelectItem> : null}
              {options.map((item) => (
                <SelectItem key={item.value}>{item.label}</SelectItem>
              ))}
            </Select>
          );
        }

        return (
          <Input
            key={field.key}
            label={field.label}
            classNames={cleanInputClassNames}
            radius="sm"
            type={field.type ?? "text"}
            value={formValues[field.key] ?? ""}
            variant="bordered"
            onValueChange={(value) => updateField(field.key, value)}
          />
        );
      })}

      <ModalFooter className="px-0 pb-4">
        <Button radius="sm" variant="bordered" onPress={onClose}>
          取消
        </Button>
        <Button className="bg-[#d96f3f] font-semibold text-white" isLoading={isSubmitting} radius="sm" type="submit">
          保存
        </Button>
      </ModalFooter>
    </form>
  );
}

function DataTablePane({ activeModule, rows, isLoading, onCreate, onEdit, onDelete }) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase text-primary">Table</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{activeModule.label}数据展示</h3>
          <p className="mt-1 text-sm text-slate-500">{activeModule.description}</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Input
            className="w-full sm:w-72"
            aria-label="管理端表格搜索"
            classNames={cleanInputClassNames}
            isClearable
            placeholder="搜索当前表"
            radius="sm"
            variant="bordered"
          />
          <Button className="bg-[#d96f3f] font-semibold text-white" radius="sm" onPress={onCreate}>
            新建
          </Button>
        </div>
      </div>

      <Divider />

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <Table aria-label={`${activeModule.label}数据表格`} radius="sm" shadow="none">
          <TableHeader>
            {activeModule.columns.map((column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            ))}
            <TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody emptyContent={isLoading ? "加载中..." : "暂无数据"} items={rows}>
            {(item) => (
              <TableRow key={item.id}>
                {activeModule.columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.key === "roleType" ? (
                      <Chip color="primary" radius="sm" size="sm" variant="flat">
                        {roleTextMap[item[column.key]] ?? displayValue(item[column.key])}
                      </Chip>
                    ) : (
                      displayValue(item[column.key], column)
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" radius="sm" variant="flat" onPress={() => onEdit(item)}>
                      编辑
                    </Button>
                    <Button size="sm" radius="sm" color="danger" variant="light" onPress={() => onDelete(item)}>
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function AdminDashboard({ user, onBackHome, onLogout }) {
  const [activeKey, setActiveKey] = useState(modules[0].key);
  const [rows, setRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldOptionMap, setFieldOptionMap] = useState({});
  const activeModule = useMemo(
    () => modules.find((item) => item.key === activeKey) ?? modules[0],
    [activeKey]
  );
  const fkOptionKeys = useMemo(
    () => [
      ...new Set(
        activeModule.fields
          .filter((field) => field.type === "fk-select" && field.options)
          .map((field) => field.options)
      )
    ],
    [activeModule]
  );
  const displayName = user?.name || user?.username || "管理员";
  const roleText = roleTextMap[user?.roleType] ?? "管理员";

  async function loadRows(moduleKey = activeKey) {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await listAdminRows(moduleKey);
      setRows(result.data ?? []);
    } catch (error) {
      setRows([]);
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRows(activeKey);
  }, [activeKey]);

  useEffect(() => {
    if (!isFormOpen || fkOptionKeys.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadFieldOptions() {
      try {
        const entries = await Promise.all(
          fkOptionKeys.map(async (optionKey) => {
            const result = await listAdminFieldOptions(optionKey);
            return [optionKey, result.data ?? []];
          })
        );

        if (!cancelled) {
          setFieldOptionMap(Object.fromEntries(entries));
        }
      } catch (error) {
        if (!cancelled) {
          setFieldOptionMap({});
          setMessage(error.message);
        }
      }
    }

    loadFieldOptions();

    return () => {
      cancelled = true;
    };
  }, [isFormOpen, fkOptionKeys]);

  function openCreateForm() {
    setEditingRow(null);
    setIsFormOpen(true);
  }

  function openEditForm(row) {
    setEditingRow(row);
    setIsFormOpen(true);
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true);
    setMessage("");

    try {
      if (editingRow) {
        await updateAdminRow(activeModule.key, editingRow.id, payload);
      } else {
        await createAdminRow(activeModule.key, payload);
      }

      setIsFormOpen(false);
      setEditingRow(null);
      await loadRows(activeModule.key);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(row) {
    const confirmed = window.confirm(
      `确定删除「${displayValue(row.name ?? row.campusName ?? row.buildingName ?? row.locationName ?? row.depName ?? row.courseName ?? row.eventName)}」吗？`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      await deleteAdminRow(activeModule.key, row.id);
      await loadRows(activeModule.key);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function switchModule(moduleKey) {
    setActiveKey(moduleKey);
    setIsFormOpen(false);
    setEditingRow(null);
  }

  return (
    <main className="flex min-h-screen bg-white text-slate-950">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-[#fbfaf7] lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-lg font-black text-white">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black">管理控制台</p>
              <p className="text-xs font-semibold uppercase text-slate-500">Admin Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-auto px-3 py-4">
          <div className="grid gap-1">
            {modules.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                isActive={activeModule.key === item.key}
                onPress={() => switchModule(item.key)}
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{roleText}</p>
            </div>
            <Dropdown placement="top-end">
              <DropdownTrigger>
                <Button aria-label="管理端设置" className="h-11 w-11" isIconOnly radius="sm" variant="light">
                  <Icon icon="lucide:settings" width={20} height={20} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="管理端账户菜单">
                <DropdownItem key="home" onPress={onBackHome}>
                  返回用户端
                </DropdownItem>
                <DropdownItem key="logout" className="text-danger" color="danger" onPress={onLogout}>
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#f7f8fa]">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>管理端</span>
                <span>/</span>
                <span>{activeModule.label}管理</span>
              </div>
              <h1 className="mt-1 truncate text-2xl font-black text-slate-950">后台数据管理</h1>
            </div>
            <Button className="lg:hidden" color="primary" radius="sm" variant="flat" onPress={onBackHome}>
              返回用户端
            </Button>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-[#fbfaf7] px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {modules.map((item) => (
              <Button
                key={item.key}
                className="shrink-0"
                color={activeModule.key === item.key ? "primary" : "default"}
                radius="sm"
                variant={activeModule.key === item.key ? "flat" : "bordered"}
                onPress={() => switchModule(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {message && (
          <div className="mx-5 mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8">
            {message}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-8">
          <DataTablePane
            activeModule={activeModule}
            isLoading={isLoading}
            rows={rows}
            onCreate={openCreateForm}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <Modal
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        placement="center"
        radius="sm"
        scrollBehavior="inside"
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-3 pr-12">
                <div>
                  <p className="text-xs font-bold uppercase text-[#d96f3f]">
                    {editingRow ? "Edit" : "Create"}
                  </p>
                  <h3 className="text-xl font-black text-slate-950">
                    {editingRow ? "编辑数据" : "创建数据"}
                  </h3>
                </div>
                <Chip className="w-fit bg-[#f7d7c6] text-[#99441f]" radius="sm" variant="flat">
                  {activeModule.tableName}
                </Chip>
                <p className="text-sm font-normal leading-6 text-slate-600">{activeModule.description}</p>
              </ModalHeader>
              <ModalBody>
                <DataForm
                  activeModule={activeModule}
                  fieldOptionMap={fieldOptionMap}
                  initialValues={editingRow}
                  isSubmitting={isSubmitting}
                  onClose={onClose}
                  onSubmit={handleSubmit}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
