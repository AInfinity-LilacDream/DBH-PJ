import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  ModalFooter,
  Select,
  SelectItem,
  Textarea
} from "@heroui/react";
import { DatePicker } from "@heroui/date-picker";
import { parseDateTime } from "@internationalized/date";
import { optionSets } from "../../config/adminModules.js";
import { normalizeFormValues } from "../../utils/adminFormUtils.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

export function AdminDataForm({
  activeModule,
  fieldOptionMap,
  initialValues,
  isSubmitting,
  onSubmit,
  onClose,
  onSearchFieldOptions
}) {
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

  function renderLabel(field) {
    return field.label;
  }

  function toDatePickerValue(value) {
    if (!value) {
      return null;
    }

    try {
      return parseDateTime(String(value).slice(0, 16));
    } catch {
      return null;
    }
  }

  return (
    <form className="grid content-start gap-4" onSubmit={handleSubmit}>
      {activeModule.fields.map((field) => {
        if (field.visibleWhen && formValues[field.visibleWhen.key] !== field.visibleWhen.value) {
          return null;
        }

        if (field.immutableOnEdit && initialValues) {
          const options = fieldOptionMap[field.options] ?? [];
          const label =
            options.find((item) => String(item.value) === String(formValues[field.key]))?.label ??
            formValues[field.key] ??
            "";

          return (
            <Input
              key={field.key}
              isReadOnly
              label={renderLabel(field)}
              classNames={cleanInputClassNames}
              isRequired={field.required}
              radius="sm"
              value={label}
              variant="bordered"
            />
          );
        }

        if (field.type === "textarea") {
          return (
            <Textarea
              key={field.key}
              label={renderLabel(field)}
              classNames={cleanInputClassNames}
              isRequired={field.required}
              minRows={3}
              radius="sm"
              value={formValues[field.key] ?? ""}
              variant="bordered"
              onValueChange={(value) => updateField(field.key, value)}
            />
          );
        }

        if (field.type === "datetime-local") {
          return (
            <DatePicker
              key={field.key}
              label={renderLabel(field)}
              granularity="minute"
              hideTimeZone
              isRequired={field.required}
              radius="sm"
              value={toDatePickerValue(formValues[field.key])}
              variant="bordered"
              onChange={(value) => updateField(field.key, value ? value.toString().slice(0, 16) : "")}
            />
          );
        }

        if (field.type === "select") {
          return (
            <Select
              key={field.key}
              label={renderLabel(field)}
              isRequired={field.required}
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
          const selectedKey = currentValue ? String(currentValue) : field.allowEmpty ? emptyKey : null;

          return (
            <Autocomplete
              key={field.key}
              label={renderLabel(field)}
              allowsCustomValue={false}
              defaultItems={[
                ...(field.allowEmpty ? [{ value: emptyKey, label: "不选择" }] : []),
                ...options
              ]}
              isRequired={field.required}
              isLoading={options.length === 0}
              menuTrigger="focus"
              radius="sm"
              selectedKey={selectedKey}
              variant="bordered"
              onInputChange={(value) => onSearchFieldOptions?.(field.options, value)}
              onSelectionChange={(key) => {
                const value = key ?? "";
                updateField(field.key, value === emptyKey ? "" : value);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>
          );
        }

        return (
          <Input
            key={field.key}
            label={renderLabel(field)}
            classNames={cleanInputClassNames}
            isRequired={field.required}
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
