import { useEffect, useMemo, useState } from "react";
import * as fieldOptionsApi from "../services/admin/fieldOptionsApi.js";
import { adminModules } from "../config/adminModules.js";
import { getRowDisplayName } from "../utils/adminFormUtils.js";

export function useAdminModuleState() {
  const [activeKey, setActiveKey] = useState(adminModules[0].key);
  const [rows, setRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldOptionMap, setFieldOptionMap] = useState({});
  const [fieldOptionSearchMap, setFieldOptionSearchMap] = useState({});

  const activeModule = useMemo(
    () => adminModules.find((item) => item.key === activeKey) ?? adminModules[0],
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

  async function loadRows(moduleKey = activeKey) {
    setIsLoading(true);
    setMessage("");

    const module = adminModules.find((item) => item.key === moduleKey) ?? activeModule;

    try {
      const result = await module.api.list();
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

  async function loadFieldOptions(optionKeys = fkOptionKeys, searchMap = fieldOptionSearchMap) {
    if (!isFormOpen || optionKeys.length === 0) {
      return;
    }

    try {
      const entries = await Promise.all(
        optionKeys.map(async (optionKey) => {
          const result = await fieldOptionsApi.list(optionKey, searchMap[optionKey] ?? "");
          return [optionKey, result.data ?? []];
        })
      );

      setFieldOptionMap((current) => ({ ...current, ...Object.fromEntries(entries) }));
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadFieldOptions();
  }, [isFormOpen, fkOptionKeys]);

  async function searchFieldOptions(optionKey, keyword) {
    const nextSearchMap = { ...fieldOptionSearchMap, [optionKey]: keyword };
    setFieldOptionSearchMap(nextSearchMap);
    await loadFieldOptions([optionKey], nextSearchMap);
  }

  function openCreateForm() {
    setEditingRow(null);
    setFieldOptionSearchMap({});
    setIsFormOpen(true);
  }

  function openEditForm(row) {
    setEditingRow(row);
    setFieldOptionSearchMap({});
    setIsFormOpen(true);
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true);
    setMessage("");

    try {
      if (editingRow) {
        await activeModule.api.update(editingRow.id, payload);
      } else {
        await activeModule.api.create(payload);
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
    const confirmed = window.confirm(`确定删除「${getRowDisplayName(row)}」吗？`);

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      await activeModule.api.remove(row.id);
      await loadRows(activeModule.key);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function switchModule(moduleKey) {
    setActiveKey(moduleKey);
    setIsFormOpen(false);
    setEditingRow(null);
    setFieldOptionSearchMap({});
  }

  return {
    activeKey,
    activeModule,
    rows,
    editingRow,
    isFormOpen,
    setIsFormOpen,
    isLoading,
    isSubmitting,
    message,
    fieldOptionMap,
    searchFieldOptions,
    openCreateForm,
    openEditForm,
    handleSubmit,
    handleDelete,
    switchModule
  };
}
