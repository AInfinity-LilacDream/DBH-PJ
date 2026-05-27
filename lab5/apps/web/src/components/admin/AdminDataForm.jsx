import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  ModalFooter,
  Select,
  SelectItem,
  Textarea
} from "@heroui/react";
import { optionSets } from "../../config/adminModules.js";
import { normalizeFormValues } from "../../utils/adminFormUtils.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

export function AdminDataForm({ activeModule, fieldOptionMap, initialValues, isSubmitting, onSubmit, onClose }) {
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
          const selectedKeys = currentValue ? [String(currentValue)] : field.allowEmpty ? [emptyKey] : [];

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
