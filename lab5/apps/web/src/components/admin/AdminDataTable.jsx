import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { DateRangePicker } from "@heroui/date-picker";
import { parseDate } from "@internationalized/date";
import { roleTextMap } from "../../constants/roleTextMap.js";
import { verificationTextMap } from "../../constants/verificationTextMap.js";
import { displayValue } from "../../utils/adminFormUtils.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

const emptyFilterKey = "__all__";

const filterConfigs = {
  building: [
    { key: "campusId", label: "所属校区", type: "select", valueKey: "campusId", labelKey: "campusName" },
    { key: "buildingName", label: "楼宇名称", type: "text", matchKeys: ["buildingName"] }
  ],
  location: [
    { key: "campusId", label: "所属校区", type: "select", valueKey: "campusId", labelKey: "campusName" },
    {
      key: "buildingId",
      label: "所属楼宇",
      type: "select",
      valueKey: "buildingId",
      labelKey: "buildingName",
      dependsOn: ["campusId"]
    },
    { key: "locationName", label: "名称搜索", type: "text", matchKeys: ["locationName"] }
  ],
  department: [
    { key: "depName", label: "名称搜索", type: "text", matchKeys: ["depName"] }
  ],
  course: [
    { key: "teacherId", label: "开课老师", type: "multiValueSelect", valueKey: "teacherIds", labelKey: "teacherNames" },
    { key: "semester", label: "学期", type: "multiValueSelect", valueKey: "semesters", labelKey: "semesters" },
    { key: "courseName", label: "名称搜索", type: "text", matchKeys: ["courseName"] }
  ],
  event: [
    { key: "hostDepId", label: "举办院系", type: "select", valueKey: "hostDepId", labelKey: "hostDepartmentName" },
    { key: "campusId", label: "校区", type: "select", valueKey: "campusId", labelKey: "campusName" },
    {
      key: "locationId",
      label: "地点",
      type: "select",
      valueKey: "locationId",
      labelKey: "locationName",
      dependsOn: ["campusId"]
    },
    { key: "dateRange", label: "时间范围", type: "dateRange", startKey: "startDate", endKey: "endDate" },
    { key: "eventName", label: "名称搜索", type: "text", matchKeys: ["eventName"] }
  ],
  people: [
    { key: "name", label: "姓名", type: "text", matchKeys: ["name"] },
    { key: "studentNo", label: "学号", type: "text", matchKeys: ["studentNo"] }
  ],
  users: [
    { key: "username", label: "用户名", type: "text", matchKeys: ["username"] }
  ],
  teaching: [
    { key: "teacherId", label: "老师", type: "select", valueKey: "teacherId", labelKey: "teacherName" },
    { key: "courseId", label: "课程", type: "select", valueKey: "courseId", labelKey: "courseName" }
  ],
  enrollment: [
    { key: "studentId", label: "学生", type: "select", valueKey: "studentId", labelKey: "studentName" },
    { key: "courseId", label: "课程", type: "select", valueKey: "courseId", labelKey: "courseName" }
  ]
};

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getSelectionValue(keys) {
  const value = Array.from(keys)[0] ?? "";
  return value === emptyFilterKey ? "" : value;
}

function splitMultiValue(value) {
  return String(value ?? "")
    .split(/[、,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createEmptyFilters(config) {
  return config.reduce((values, field) => {
    if (field.type === "dateRange") {
      values[field.startKey] = "";
      values[field.endKey] = "";
      return values;
    }

    values[field.key] = "";
    return values;
  }, {});
}

function getDependentKeys(changedKey, config) {
  const dependentKeys = new Set();
  const queue = [changedKey];

  while (queue.length) {
    const currentKey = queue.shift();

    config.forEach((field) => {
      if (dependentKeys.has(field.key) || !field.dependsOn?.includes(currentKey)) {
        return;
      }

      dependentKeys.add(field.key);
      queue.push(field.key);
    });
  }

  return dependentKeys;
}

function toDatePickerValue(value) {
  if (!value) {
    return null;
  }

  try {
    return parseDate(String(value));
  } catch {
    return null;
  }
}

function toDateRangePickerValue(startValue, endValue) {
  const start = toDatePickerValue(startValue);
  const end = toDatePickerValue(endValue);

  if (!start && !end) {
    return null;
  }

  return { start, end };
}

function getDateStart(date) {
  return date ? new Date(`${date}T00:00:00`).getTime() : null;
}

function getDateEnd(date) {
  return date ? new Date(`${date}T00:00:00`).getTime() + 24 * 60 * 60 * 1000 : null;
}

function getSelectOptions(rows, field, filters) {
  const options = [];
  const seen = new Set();

  rows.forEach((row) => {
    if (field.dependsOn?.some((key) => filters[key] && String(row[key] ?? "") !== String(filters[key]))) {
      return;
    }

    if (field.type === "multiValueSelect") {
      const values = splitMultiValue(row[field.valueKey]);
      const labels = splitMultiValue(row[field.labelKey]);

      values.forEach((value, index) => {
        if (!value || seen.has(value)) {
          return;
        }

        seen.add(value);
        options.push({ value, label: labels[index] ?? value });
      });
      return;
    }

    const value = row[field.valueKey];
    const label = row[field.labelKey];

    if (value === null || value === undefined || value === "" || seen.has(String(value))) {
      return;
    }

    seen.add(String(value));
    options.push({ value: String(value), label: String(label || value) });
  });

  return options.sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
}

function matchesFilter(row, field, filters) {
  if (field.type === "dateRange") {
    const eventTime = row.startTime ? new Date(String(row.startTime).replace(" ", "T")).getTime() : null;
    const startTime = getDateStart(filters[field.startKey]);
    const endTime = getDateEnd(filters[field.endKey]);

    if (startTime && (!eventTime || eventTime < startTime)) {
      return false;
    }

    if (endTime && (!eventTime || eventTime >= endTime)) {
      return false;
    }

    return true;
  }

  const filterValue = filters[field.key];

  if (!filterValue) {
    return true;
  }

  if (field.type === "select") {
    return String(row[field.valueKey] ?? "") === String(filterValue);
  }

  if (field.type === "multiValueSelect") {
    return splitMultiValue(row[field.valueKey]).includes(String(filterValue));
  }

  const searchableText = (field.matchKeys ?? [field.key])
    .map((key) => row[key])
    .join(" ");

  return normalizeText(searchableText).includes(normalizeText(filterValue));
}

export function AdminDataTable({ activeModule, rows, isLoading, onCreate, onEdit, onDelete }) {
  const filterConfig = filterConfigs[activeModule.key] ?? [];
  const [filters, setFilters] = useState(() => createEmptyFilters(filterConfig));

  useEffect(() => {
    setFilters(createEmptyFilters(filterConfig));
  }, [activeModule.key]);

  const filteredRows = useMemo(() => {
    if (!filterConfig.length) {
      return rows;
    }

    return rows.filter((row) => filterConfig.every((field) => matchesFilter(row, field, filters)));
  }, [filterConfig, filters, rows]);

  function updateFilter(key, value) {
    setFilters((current) => {
      const nextFilters = { ...current, [key]: value };
      getDependentKeys(key, filterConfig).forEach((dependentKey) => {
        nextFilters[dependentKey] = "";
      });
      return nextFilters;
    });
  }

  function updateDateRange(field, value) {
    setFilters((current) => ({
      ...current,
      [field.startKey]: value?.start ? value.start.toString() : "",
      [field.endKey]: value?.end ? value.end.toString() : ""
    }));
  }

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-h-14 items-center">
          <h3 className="text-xl font-black text-slate-950">{activeModule.label}数据展示</h3>
        </div>
        <div className="flex flex-1 flex-wrap items-end justify-end gap-3">
          {filterConfig.map((field) =>
            field.type === "dateRange" ? (
              <DateRangePicker
                key={field.key}
                className="w-full sm:w-64"
                label={field.label}
                pageBehavior="single"
                radius="sm"
                value={toDateRangePickerValue(filters[field.startKey], filters[field.endKey])}
                visibleMonths={2}
                variant="bordered"
                onChange={(value) => updateDateRange(field, value)}
              />
            ) : field.type === "select" || field.type === "multiValueSelect" ? (
              <Select
                key={field.key}
                className="w-full sm:w-44"
                label={field.label}
                radius="sm"
                selectedKeys={[filters[field.key] ? String(filters[field.key]) : emptyFilterKey]}
                variant="bordered"
                onSelectionChange={(keys) => updateFilter(field.key, getSelectionValue(keys))}
              >
                <SelectItem key={emptyFilterKey}>全部</SelectItem>
                {getSelectOptions(rows, field, filters).map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>
            ) : (
              <Input
                key={field.key}
                className="w-full sm:w-44"
                aria-label={`${field.label}筛选`}
                classNames={cleanInputClassNames}
                isClearable
                label={field.label}
                radius="sm"
                value={filters[field.key] ?? ""}
                variant="bordered"
                onClear={() => updateFilter(field.key, "")}
                onValueChange={(value) => updateFilter(field.key, value)}
              />
            )
          )}
          <Button className="h-14 bg-[#d96f3f] font-semibold text-white" radius="sm" onPress={onCreate}>
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
          <TableBody emptyContent={isLoading ? "加载中..." : "暂无匹配数据"} items={filteredRows}>
            {(item) => (
              <TableRow key={item.id}>
                {activeModule.columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.key === "roleType" ? (
                      <Chip color="primary" radius="sm" size="sm" variant="flat">
                        {roleTextMap[item[column.key]] ?? displayValue(item[column.key])}
                      </Chip>
                    ) : column.key === "verificationStatus" ? (
                      <Chip color="warning" radius="sm" size="sm" variant="flat">
                        {verificationTextMap[item[column.key]] ?? displayValue(item[column.key], column)}
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
