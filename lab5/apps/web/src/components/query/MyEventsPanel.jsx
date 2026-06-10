import React, { useEffect, useState } from "react";
import { Autocomplete, AutocompleteItem, Button, Input, Pagination } from "@heroui/react";
import { DateRangePicker } from "@heroui/date-picker";
import { parseDate } from "@internationalized/date";
import { addToast } from "@heroui/toast";
import { EventCard } from "./EventCard.jsx";
import { listMyEvents, unregisterFromEvent } from "../../services/eventParticipationApi.js";
import { listCatalogOptions } from "../../services/catalog/options.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

const emptyOptionKey = "__all__";
const pageSize = 12;
const initialPagination = { page: 1, pageSize, total: 0, pages: 1 };
const showRemoteOption = () => true;

const filterConfig = [
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
];

function createEmptyFilters() {
  return filterConfig.reduce((values, field) => {
    if (field.type === "dateRange") {
      values[field.startKey] = "";
      values[field.endKey] = "";
      return values;
    }

    values[field.key] = "";
    return values;
  }, {});
}

function getDependentKeys(changedKey) {
  const dependentKeys = new Set();
  const queue = [changedKey];

  while (queue.length) {
    const currentKey = queue.shift();

    filterConfig.forEach((field) => {
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

function createEmptyOptionSearch() {
  return filterConfig.reduce((values, field) => {
    if (field.optionKey) {
      values[field.key] = "";
    }

    return values;
  }, {});
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

export function MyEventsPanel({ user, activeItem, onEnterAccount }) {
  const [items, setItems] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState(createEmptyFilters);
  const [optionSearch, setOptionSearch] = useState(createEmptyOptionSearch);
  const [optionMap, setOptionMap] = useState({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function notify(message, color = "success") {
    addToast({
      title: message,
      color,
      timeout: 2600
    });
  }

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value };
    getDependentKeys(key).forEach((dependentKey) => {
      nextFilters[dependentKey] = "";
    });

    setFilters(nextFilters);
    setOptionSearch((current) => {
      const nextSearch = { ...current };
      const selectedOption = (optionMap[key] ?? []).find((option) => String(option.value) === String(value));

      nextSearch[key] = value ? selectedOption?.label ?? "" : "";
      getDependentKeys(key).forEach((dependentKey) => {
        nextSearch[dependentKey] = "";
      });

      return nextSearch;
    });
    setPage(1);
  }

  function updateOptionSearch(key, value) {
    setOptionSearch((current) => ({ ...current, [key]: value }));

    if (!value && filters[key]) {
      updateFilter(key, "");
    }
  }

  function updateDateRange(field, value) {
    setFilters({
      ...filters,
      [field.startKey]: value?.start ? value.start.toString() : "",
      [field.endKey]: value?.end ? value.end.toString() : ""
    });
    setPage(1);
  }

  async function loadItems(nextPage = page) {
    if (!user?.peopleId) {
      setItems([]);
      setPagination(initialPagination);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await listMyEvents(user.userId, {
        keyWord: keyword,
        ...filters,
        page: nextPage,
        pageSize
      });
      setItems(result.data ?? []);
      setPagination(result.pagination ?? { page: nextPage, pageSize, total: result.data?.length ?? 0, pages: 1 });
    } catch (error) {
      setItems([]);
      setPagination({ page: nextPage, pageSize, total: 0, pages: 1 });
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [user.userId, user?.peopleId, keyword, filters, page]);

  useEffect(() => {
    if (!user?.peopleId) {
      setOptionMap({});
      return;
    }

    let isCurrent = true;
    const optionFields = filterConfig.filter((field) => field.optionKey);

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const entries = await Promise.all(
          optionFields.map(async (field) => {
            const result = await listCatalogOptions(field.optionKey, {
              ...getOptionParams(field, filters),
              keyword: optionSearch[field.key] ?? ""
            });
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
  }, [filters, optionSearch, user?.peopleId]);

  async function handleUnregister(eventId) {
    await unregisterFromEvent(user.userId, eventId);
    notify("已取消报名。");
    await loadItems();
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>首页</span>
              <span>/</span>
              <span>我的活动</span>
            </div>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{activeItem.label}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        <div className="grid gap-5">
          {!user?.peopleId ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <p>您尚未绑定人员信息，无法查看已报名活动。</p>
              <Button className="mt-4" color="primary" radius="sm" onPress={onEnterAccount}>
                前往账户管理
              </Button>
            </section>
          ) : null}

          {user?.peopleId ? (
            <section className="flex flex-wrap items-end gap-3">
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
                ) : (
                  <Autocomplete
                    key={field.key}
                    className="w-full sm:w-44"
                    allowsCustomValue
                    defaultItems={[
                      { value: emptyOptionKey, label: "全部" },
                      ...(optionMap[field.key] ?? [])
                    ]}
                    defaultFilter={showRemoteOption}
                    isClearable={false}
                    isLoading={isLoadingOptions && !optionMap[field.key]?.length}
                    label={field.label}
                    menuTrigger="input"
                    radius="sm"
                    inputValue={optionSearch[field.key] ?? ""}
                    selectedKey={filters[field.key] ? String(filters[field.key]) : emptyOptionKey}
                    variant="bordered"
                    onInputChange={(value) => updateOptionSearch(field.key, value)}
                    onSelectionChange={(key) => updateFilter(field.key, key === emptyOptionKey ? "" : key)}
                  >
                    {(option) => (
                      <AutocompleteItem key={option.value}>{option.label}</AutocompleteItem>
                    )}
                  </Autocomplete>
                )
              )}

              <Input
                className="min-w-72 flex-1"
                aria-label={`${activeItem.label}名称搜索`}
                classNames={cleanInputClassNames}
                label="名称搜索"
                placeholder="输入名称关键词"
                radius="sm"
                value={keyword}
                variant="bordered"
                onValueChange={(value) => {
                  setKeyword(value);
                  setPage(1);
                }}
              />
            </section>
          ) : null}

          {isLoading ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              加载中...
            </section>
          ) : null}

          {errorMessage && !isLoading ? (
            <section className="rounded-lg border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700">
              {errorMessage}
            </section>
          ) : null}

          {!isLoading && !errorMessage && user?.peopleId && items.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) => (
                <EventCard
                  key={item.eventId}
                  item={{ ...item, isRegistered: true }}
                  user={user}
                  showRegisterAction
                  onUnregister={handleUnregister}
                />
              ))}
            </section>
          ) : null}

          {!isLoading && !errorMessage && user?.peopleId && items.length === 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              暂无匹配的已报名活动。
            </section>
          ) : null}

          {!errorMessage && user?.peopleId && pagination.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.pages} 页
              </p>
              <Pagination
                showControls
                isDisabled={isLoading}
                page={pagination.page}
                radius="sm"
                total={Math.max(1, pagination.pages)}
                onChange={setPage}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
