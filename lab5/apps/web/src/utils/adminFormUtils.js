function toDatetimeLocalValue(value) {
  const text = String(value).trim();

  if (!text) {
    return "";
  }

  return text.replace(" ", "T").slice(0, 16);
}

import { optionSets } from "../config/adminModules.js";
import { verificationTextMap } from "../constants/verificationTextMap.js";

const genderTextMap = Object.fromEntries(optionSets.gender);

function formatDateTimeDisplay(value) {
  if (value === null || value === undefined || value === "") {
    return "未填写";
  }

  return String(value).replace("T", " ");
}

export function normalizeFormValues(activeModule, row) {
  if (!row) {
    if (activeModule.key === "people") {
      return { personType: "student", gender: "O", grade: "大一", title: "讲师" };
    }

    return {};
  }

  return activeModule.fields.reduce((values, field) => {
    let value = row[field.key] ?? "";

    if (field.type === "datetime-local" && value) {
      value = toDatetimeLocalValue(value);
    }

    if (field.type === "fk-select" && value !== "" && value != null) {
      value = String(value);
    }

    values[field.key] = value;
    return values;
  }, {});
}

export function displayValue(value, column) {
  if (column?.format === "datetime") {
    return formatDateTimeDisplay(value);
  }

  if (column?.format === "gender") {
    return genderTextMap[value] ?? "未填写";
  }

  if (column?.format === "verificationStatus") {
    return verificationTextMap[value] ?? "未填写";
  }

  if (column?.format === "personType") {
    return value === "student" ? "学生" : value === "teacher" ? "教师" : "未填写";
  }

  if (value === null || value === undefined || value === "") {
    return "未填写";
  }

  return String(value);
}

export function getRowDisplayName(row) {
  return displayValue(
    row.name ??
      row.personName ??
      row.username ??
      row.campusName ??
      row.buildingName ??
      row.locationName ??
      row.depName ??
      row.courseName ??
      row.eventName
  );
}
