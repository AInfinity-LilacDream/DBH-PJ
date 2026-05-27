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

  useEffect(() => {
    if (!isFormOpen || fkOptionKeys.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadFieldOptions() {
      try {
        const entries = await Promise.all(
          fkOptionKeys.map(async (optionKey) => {
            const result = await fieldOptionsApi.list(optionKey);
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
    openCreateForm,
    openEditForm,
    handleSubmit,
    handleDelete,
    switchModule
  };
}
