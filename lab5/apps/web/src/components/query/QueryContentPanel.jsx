import React, { useEffect, useMemo, useState } from "react";
import { Input, Select, SelectItem } from "@heroui/react";
import { DateRangePicker } from "@heroui/date-picker";
import { parseDate } from "@internationalized/date";
import { addToast } from "@heroui/toast";
import { ChatPanel } from "./ChatPanel.jsx";
import { EventCard } from "./EventCard.jsx";
import { WaterfallCard } from "./WaterfallCard.jsx";
import { registerForEvent, unregisterFromEvent } from "../../services/eventParticipationApi.js";
import { listCatalogOptions } from "../../services/catalog/options.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

const emptyOptionKey = "__all__";

const filterConfigs = {
  "location-query": [
    { key: "campusId", label: "所属校区", optionKey: "campuses" },
    {
      key: "buildingId",
      label: "所属建筑",
      optionKey: "buildings",
      dependsOn: ["campusId"],
      optionParams: { campusId: "campusId" }
    }
  ],
  "course-query": [
    { key: "depId", label: "开课院系", optionKey: "departments" },
    {
      key: "teacherId",
      label: "授课老师",
      optionKey: "teachers",
      dependsOn: ["depId"],
      optionParams: { depId: "depId" }
    },
    {
      key: "semester",
      label: "学期",
      optionKey: "semesters",
      dependsOn: ["depId", "teacherId"],
      optionParams: { depId: "depId", teacherId: "teacherId" }
    }
  ],
  "event-query": [
    { key: "hostDepId", label: "举办院系", optionKey: "departments" },
    { key: "campusId", label: "校区", optionKey: "campuses" },
    {
      key: "locationId",
      label: "地点",
      optionKey: "locations",
      dependsOn: ["campusId"],
      optionParams: { campusId: "campusId" }
    },
    { key: "dateRange", label: "时间范围", type: "dateRange", startKey: "startDate", endKey: "endDate" }
  ]
};

function getSelectionValue(keys) {
  const value = Array.from(keys)[0] ?? "";
  return value === emptyOptionKey ? "" : value;
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

function getOptionParams(field, filters) {
  return Object.fromEntries(
    Object.entries(field.optionParams ?? {})
      .map(([paramKey, filterKey]) => [paramKey, filters[filterKey]])
      .filter(([, value]) => value)
  );
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

export function QueryContentPanel({ activeItem, user }) {
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({});
  const [optionMap, setOptionMap] = useState({});
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isEventQuery = activeItem.key === "event-query";
  const activeFilterConfig = useMemo(() => filterConfigs[activeItem.key] ?? [], [activeItem.key]);

  function notify(message, color = "success") {
    addToast({
      title: message,
      color,
      timeout: 2600
    });
  }

  function updateFilter(key, value) {
    setFilters((current) => {
      const nextFilters = { ...current, [key]: value };
      getDependentKeys(key, activeFilterConfig).forEach((dependentKey) => {
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

  async function handleRegister(eventId) {
    try {
      await registerForEvent(user.userId, eventId);
      setItems((current) =>
        current.map((item) => (item.eventId === eventId ? { ...item, isRegistered: true } : item))
      );
      notify("报名成功。");
    } catch (error) {
      notify(error.message, "danger");
      throw error;
    }
  }

  async function handleUnregister(eventId) {
    try {
      await unregisterFromEvent(user.userId, eventId);
      setItems((current) =>
        current.map((item) => (item.eventId === eventId ? { ...item, isRegistered: false } : item))
      );
      notify("已取消报名。");
    } catch (error) {
      notify(error.message, "danger");
      throw error;
    }
  }

  useEffect(() => {
    setKeyword("");
    setFilters(createEmptyFilters(activeFilterConfig));
  }, [activeFilterConfig]);

  useEffect(() => {
    if (!activeFilterConfig.length) {
      setOptionMap({});
      return;
    }

    let isCurrent = true;
    const optionFields = activeFilterConfig.filter((field) => field.optionKey);

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const entries = await Promise.all(
          optionFields.map(async (field) => {
            const result = await listCatalogOptions(field.optionKey, getOptionParams(field, filters));
            return [field.key, result.data ?? []];
          })
        );

        if (isCurrent) {
          setOptionMap(Object.fromEntries(entries));
        }
      } catch (error) {
        if (isCurrent) {
          setOptionMap({});
          notify(error.message, "danger");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      isCurrent = false;
    };
  }, [activeFilterConfig, filters]);

  useEffect(() => {
    if (activeItem.key === "new-chat") {
      return;
    }

    let isCurrent = true;

    async function loadItems() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const searchFilters = { keyWord: keyword, ...filters };
        const result = isEventQuery
          ? await activeItem.search(searchFilters, user?.peopleId ?? undefined)
          : await activeItem.search(searchFilters);

        if (isCurrent) {
          setItems(result.data ?? []);
        }
      } catch (error) {
        if (isCurrent) {
          setItems([]);
          setErrorMessage(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isCurrent = false;
    };
  }, [activeItem, keyword, filters, user?.peopleId, isEventQuery]);

  if (activeItem.key === "new-chat") {
    return <ChatPanel />;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>首页</span>
              <span>/</span>
              <span>信息查询</span>
            </div>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{activeItem.label}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        <div className="grid gap-5">
          <section className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
              {activeFilterConfig.map((field) =>
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
                ) : (
                  <Select
                    key={field.key}
                    className="w-full sm:w-44"
                    isLoading={isLoadingOptions && !optionMap[field.key]?.length}
                    label={field.label}
                    radius="sm"
                    selectedKeys={[filters[field.key] ? String(filters[field.key]) : emptyOptionKey]}
                    variant="bordered"
                    onSelectionChange={(keys) => updateFilter(field.key, getSelectionValue(keys))}
                  >
                    <SelectItem key={emptyOptionKey}>全部</SelectItem>
                    {(optionMap[field.key] ?? []).map((option) => (
                      <SelectItem key={option.value}>{option.label}</SelectItem>
                    ))}
                  </Select>
                )
              )}

              <Input
                className="min-w-72 flex-1"
                aria-label={`${activeItem.label}名称搜索`}
                classNames={cleanInputClassNames}
                isClearable
                label="名称搜索"
                placeholder="输入名称关键词"
                radius="sm"
                value={keyword}
                variant="bordered"
                onClear={() => setKeyword("")}
                onValueChange={setKeyword}
              />
            </div>
          </section>

          {isLoading && (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              加载中...
            </section>
          )}

          {errorMessage && !isLoading && (
            <section className="rounded-lg border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700">
              {errorMessage}
            </section>
          )}

          {!isLoading && !errorMessage && items.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) =>
                isEventQuery ? (
                  <EventCard
                    key={item.eventId ?? `${item.title}-${item.meta}`}
                    item={item}
                    user={user}
                    onRegister={handleRegister}
                    onUnregister={handleUnregister}
                  />
                ) : (
                  <WaterfallCard key={`${item.title}-${item.meta}`} item={item} />
                )
              )}
            </section>
          ) : null}

          {!isLoading && !errorMessage && items.length === 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              没有匹配的内容
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
