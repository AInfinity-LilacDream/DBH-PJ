import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Chip,
  Divider,
  Input,
  Pagination,
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
import * as fieldOptionsApi from "../../services/admin/fieldOptionsApi.js";

const emptyFilterKey = "__all__";
const emptyFilterConfig = [];
const pageSizeOptions = [10, 20, 50, 100];
const showRemoteOption = () => true;

const filterConfigs = {
  building: [
    { key: "campusId", label: "所属校区", type: "select", optionKey: "campuses" },
    { key: "buildingName", label: "楼宇名称", type: "text", matchKeys: ["buildingName"] }
  ],
  location: [
    { key: "campusId", label: "所属校区", type: "select", optionKey: "campuses" },
    {
      key: "buildingId",
      label: "所属楼宇",
      type: "select",
      optionKey: "buildings",
      dependsOn: ["campusId"],
      optionParams: { campusId: "campusId" }
    },
    { key: "locationName", label: "名称搜索", type: "text", matchKeys: ["locationName"] }
  ],
  department: [
    { key: "depName", label: "名称搜索", type: "text", matchKeys: ["depName"] }
  ],
  course: [
    { key: "teacherId", label: "开课老师", type: "multiValueSelect", optionKey: "teachers" },
    {
      key: "semester",
      label: "学期",
      type: "multiValueSelect",
      optionKey: "semesters",
      dependsOn: ["teacherId"],
      optionParams: { teacherId: "teacherId" }
    },
    { key: "courseName", label: "名称搜索", type: "text", matchKeys: ["courseName"] }
  ],
  event: [
    { key: "hostDepId", label: "举办院系", type: "select", optionKey: "departments" },
    { key: "campusId", label: "校区", type: "select", optionKey: "campuses" },
    {
      key: "locationId",
      label: "地点",
      type: "select",
      optionKey: "locations",
      dependsOn: ["campusId"],
      optionParams: { campusId: "campusId" }
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
    { key: "teacherId", label: "老师", type: "select", optionKey: "teachers" },
    { key: "courseId", label: "课程", type: "select", optionKey: "courses" }
  ],
  enrollment: [
    { key: "studentId", label: "学生", type: "select", optionKey: "students" },
    { key: "courseId", label: "课程", type: "select", optionKey: "courses" }
  ]
};

function getSelectionValue(keys) {
  const value = Array.from(keys)[0] ?? "";
  return value === emptyFilterKey ? "" : value;
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

function getOptionParams(field, filters) {
  return Object.fromEntries(
    Object.entries(field.optionParams ?? {})
      .map(([paramKey, filterKey]) => [paramKey, filters[filterKey]])
      .filter(([, value]) => value)
  );
}

function createEmptyOptionSearch(config) {
  return config.reduce((values, field) => {
    if (field.optionKey) {
      values[field.key] = "";
    }

    return values;
  }, {});
}

function getPageSize(listParams, pagination) {
  return listParams?.pageSize ?? pagination?.pageSize ?? 20;
}

export function AdminDataTable({
  activeModule,
  rows,
  isLoading,
  pagination,
  listParams,
  onCreate,
  onEdit,
  onDelete,
  onQueryChange
}) {
  const filterConfig = filterConfigs[activeModule.key] ?? emptyFilterConfig;
  const [filters, setFilters] = useState(() => createEmptyFilters(filterConfig));
  const [optionSearch, setOptionSearch] = useState(() => createEmptyOptionSearch(filterConfig));
  const [filterOptionMap, setFilterOptionMap] = useState({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    setFilters(createEmptyFilters(filterConfig));
    setOptionSearch(createEmptyOptionSearch(filterConfig));
  }, [activeModule.key]);

  useEffect(() => {
    const optionFields = filterConfig.filter((field) => field.optionKey);

    if (!optionFields.length) {
      setFilterOptionMap({});
      return undefined;
    }

    let isCurrent = true;

    async function loadFilterOptions() {
      setIsLoadingOptions(true);

      try {
        const entries = await Promise.all(
          optionFields.map(async (field) => {
            const result = await fieldOptionsApi.list(field.optionKey, {
              ...getOptionParams(field, filters),
              keyword: optionSearch[field.key] ?? ""
            });
            return [field.key, result.data ?? []];
          })
        );

        if (isCurrent) {
          setFilterOptionMap(Object.fromEntries(entries));
        }
      } catch {
        if (isCurrent) {
          setFilterOptionMap({});
        }
      } finally {
        if (isCurrent) {
          setIsLoadingOptions(false);
        }
      }
    }

    loadFilterOptions();

    return () => {
      isCurrent = false;
    };
  }, [activeModule.key, filterConfig, filters, optionSearch]);

  function queryWithFilters(nextFilters, nextParams = {}) {
    onQueryChange?.({
      ...nextFilters,
      page: 1,
      pageSize: getPageSize(listParams, pagination),
      ...nextParams
    });
  }

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value };
    getDependentKeys(key, filterConfig).forEach((dependentKey) => {
      nextFilters[dependentKey] = "";
    });

    setFilters(nextFilters);
    setOptionSearch((current) => {
      const nextSearch = { ...current };
      const selectedOption = (filterOptionMap[key] ?? []).find((option) => String(option.value) === String(value));

      nextSearch[key] = value ? selectedOption?.label ?? "" : "";
      getDependentKeys(key, filterConfig).forEach((dependentKey) => {
        nextSearch[dependentKey] = "";
      });

      return nextSearch;
    });
    queryWithFilters(nextFilters);
  }

  function updateOptionSearch(key, value) {
    setOptionSearch((current) => ({ ...current, [key]: value }));

    if (!value && filters[key]) {
      updateFilter(key, "");
    }
  }

  function updateDateRange(field, value) {
    const nextFilters = {
      ...filters,
      [field.startKey]: value?.start ? value.start.toString() : "",
      [field.endKey]: value?.end ? value.end.toString() : ""
    };

    setFilters(nextFilters);
    queryWithFilters(nextFilters);
  }

  function handlePageChange(page) {
    queryWithFilters(filters, { page });
  }

  function handlePageSizeChange(keys) {
    const nextPageSize = Number(getSelectionValue(keys)) || getPageSize(listParams, pagination);
    queryWithFilters(filters, { page: 1, pageSize: nextPageSize });
  }

  const currentPage = pagination?.page ?? listParams?.page ?? 1;
  const totalPages = Math.max(1, pagination?.pages ?? 1);
  const totalRows = pagination?.total ?? rows.length;
  const selectedPageSize = String(getPageSize(listParams, pagination));

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
              <Autocomplete
                key={field.key}
                className="w-full sm:w-44"
                allowsCustomValue
                defaultItems={[
                  { value: emptyFilterKey, label: "全部" },
                  ...(filterOptionMap[field.key] ?? [])
                ]}
                defaultFilter={showRemoteOption}
                isClearable={false}
                isLoading={isLoadingOptions && !filterOptionMap[field.key]?.length}
                label={field.label}
                menuTrigger="input"
                radius="sm"
                inputValue={optionSearch[field.key] ?? ""}
                selectedKey={filters[field.key] ? String(filters[field.key]) : emptyFilterKey}
                variant="bordered"
                onInputChange={(value) => updateOptionSearch(field.key, value)}
                onSelectionChange={(key) => updateFilter(field.key, key === emptyFilterKey ? "" : key)}
              >
                {(option) => (
                  <AutocompleteItem key={option.value}>{option.label}</AutocompleteItem>
                )}
              </Autocomplete>
            ) : (
              <Input
                key={field.key}
                className="w-full sm:w-44"
                aria-label={`${field.label}筛选`}
                classNames={cleanInputClassNames}
                label={field.label}
                radius="sm"
                value={filters[field.key] ?? ""}
                variant="bordered"
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
          <TableBody emptyContent={isLoading ? "加载中..." : "暂无匹配数据"} items={rows}>
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
      <Divider />
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm text-slate-500">
          共 {totalRows} 条，第 {currentPage} / {totalPages} 页
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Select
            aria-label="每页条数"
            className="w-28"
            radius="sm"
            selectedKeys={[selectedPageSize]}
            size="sm"
            variant="bordered"
            onSelectionChange={handlePageSizeChange}
          >
            {pageSizeOptions.map((size) => (
              <SelectItem key={String(size)}>{`${size} 条/页`}</SelectItem>
            ))}
          </Select>
          <Pagination
            showControls
            isDisabled={isLoading}
            page={currentPage}
            radius="sm"
            total={totalPages}
            onChange={handlePageChange}
          />
        </div>
      </div>
    </section>
  );
}
