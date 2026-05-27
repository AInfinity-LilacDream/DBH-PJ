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

export function normalizeFormValues(activeModule, row) {
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

export function displayValue(value, column) {
  if (column?.format === "datetime") {
    return formatDateTimeDisplay(value);
  }

  if (value === null || value === undefined || value === "") {
    return "未填写";
  }

  return String(value);
}

export function getRowDisplayName(row) {
  return displayValue(
    row.name ?? row.campusName ?? row.buildingName ?? row.locationName ?? row.depName ?? row.courseName ?? row.eventName
  );
}
