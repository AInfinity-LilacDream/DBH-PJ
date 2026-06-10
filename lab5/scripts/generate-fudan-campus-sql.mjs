import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lab5Root = path.resolve(__dirname, "..");

const DEFAULT_INPUT = path.join(lab5Root, "data/fudan-campus/fudan-campus-events.json");
const DEFAULT_OUTPUT = path.join(lab5Root, "data/fudan-campus/fudan-campus-events.sql");

const ALLOWED_BUILDING_TYPES = new Set([
  "教学楼",
  "宿舍楼",
  "食堂楼",
  "图书馆",
  "行政楼",
  "实验楼",
  "体育设施",
  "医疗卫生",
  "其他"
]);

const ALLOWED_FACILITY_TYPES = new Set([
  "教室",
  "食堂",
  "咖啡店",
  "自习室",
  "图书馆",
  "实验室",
  "运动场地",
  "办公室",
  "医务室",
  "其他"
]);

const ALLOWED_EVENT_TYPES = new Set([
  "讲座",
  "论坛",
  "文艺演出",
  "体育赛事",
  "学术交流",
  "招聘宣讲",
  "志愿服务",
  "其他"
]);

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      options.input = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    throw new Error(`未知参数：${arg}`);
  }

  return options;
}

function requireArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} 必须是数组`);
  }

  return value;
}

function requireText(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} 必须是非空字符串`);
  }

  return value.trim();
}

function optionalText(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("可选文本字段必须是字符串");
  }

  return value.trim();
}

function assertEnum(value, allowedValues, fieldName) {
  if (!allowedValues.has(value)) {
    throw new Error(`${fieldName} 不符合枚举约束：${value}`);
  }
}

function makeKey(...parts) {
  return parts.map((part) => requireText(part, "key")).join("::");
}

function assertUnique(collection, keyGetter, label) {
  const seen = new Set();

  for (const item of collection) {
    const key = keyGetter(item);

    if (seen.has(key)) {
      throw new Error(`${label} 重复：${key}`);
    }

    seen.add(key);
  }
}

function validatePayload(payload) {
  const campuses = requireArray(payload.campuses, "campuses");
  const buildings = requireArray(payload.buildings, "buildings");
  const locations = requireArray(payload.locations, "locations");
  const events = requireArray(payload.events, "events");

  assertUnique(campuses, (campus) => requireText(campus.name, "campus.name"), "校区");

  const campusNames = new Set(campuses.map((campus) => requireText(campus.name, "campus.name")));

  for (const campus of campuses) {
    requireText(campus.address, `${campus.name}.address`);
  }

  assertUnique(
    buildings,
    (building) => makeKey(building.campusName, building.name),
    "建筑"
  );

  const buildingKeys = new Set();

  for (const building of buildings) {
    const campusName = requireText(building.campusName, "building.campusName");
    const buildingName = requireText(building.name, "building.name");
    const buildingType = requireText(building.buildingType, "building.buildingType");

    if (!campusNames.has(campusName)) {
      throw new Error(`建筑引用了不存在的校区：${buildingName} -> ${campusName}`);
    }

    assertEnum(buildingType, ALLOWED_BUILDING_TYPES, `${buildingName}.buildingType`);
    buildingKeys.add(makeKey(campusName, buildingName));
  }

  assertUnique(
    locations,
    (location) => makeKey(location.campusName, location.buildingName, location.name),
    "地点"
  );

  const locationKeys = new Set();

  for (const location of locations) {
    const campusName = requireText(location.campusName, "location.campusName");
    const buildingName = requireText(location.buildingName, "location.buildingName");
    const locationName = requireText(location.name, "location.name");
    const facilityType = requireText(location.facilityType, "location.facilityType");

    if (!buildingKeys.has(makeKey(campusName, buildingName))) {
      throw new Error(`地点引用了不存在的建筑：${locationName} -> ${campusName}/${buildingName}`);
    }

    assertEnum(facilityType, ALLOWED_FACILITY_TYPES, `${locationName}.facilityType`);
    locationKeys.add(makeKey(campusName, buildingName, locationName));
  }

  assertUnique(events, (event) => requireText(event.name, "event.name"), "活动");

  for (const event of events) {
    const eventName = requireText(event.name, "event.name");
    const eventType = requireText(event.eventType, "event.eventType");
    const campusName = requireText(event.campusName, "event.campusName");
    const buildingName = requireText(event.buildingName, "event.buildingName");
    const locationName = requireText(event.locationName, "event.locationName");
    const startTime = requireText(event.startTime, "event.startTime");
    const endTime = optionalText(event.endTime);

    assertEnum(eventType, ALLOWED_EVENT_TYPES, `${eventName}.eventType`);

    if (!locationKeys.has(makeKey(campusName, buildingName, locationName))) {
      throw new Error(`活动引用了不存在的地点：${eventName} -> ${campusName}/${buildingName}/${locationName}`);
    }

    if (endTime && Date.parse(endTime) <= Date.parse(startTime)) {
      throw new Error(`活动结束时间必须晚于开始时间：${eventName}`);
    }
  }
}

function sqlString(value) {
  if (value == null) {
    return "NULL";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function renderCampus(campus) {
  return `
INSERT INTO Campus (campus_name, address)
VALUES (${sqlString(campus.name)}, ${sqlString(campus.address)})
ON CONFLICT (campus_name)
DO UPDATE SET address = EXCLUDED.address;`.trim();
}

function renderBuilding(building) {
  return `
INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  ${sqlString(building.name)},
  campus_id,
  ${sqlString(building.buildingType)},
  ${sqlString(optionalText(building.description))}
FROM Campus
WHERE campus_name = ${sqlString(building.campusName)}
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;`.trim();
}

function renderLocation(location) {
  return `
INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  ${sqlString(location.name)},
  b.building_id,
  ${sqlString(location.facilityType)},
  ${sqlString(optionalText(location.description))},
  ${sqlString(optionalText(location.openTime))}
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = ${sqlString(location.campusName)}
  AND b.building_name = ${sqlString(location.buildingName)}
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;`.trim();
}

function renderEvent(event) {
  return `
INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  ${sqlString(event.name)},
  ${sqlString(event.eventType)},
  ${sqlString(event.startTime)}::timestamp,
  ${sqlString(optionalText(event.endTime))}::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = ${sqlString(optionalText(event.hostDepartmentName))}),
  ${sqlString(optionalText(event.description))}
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = ${sqlString(event.campusName)}
  AND b.building_name = ${sqlString(event.buildingName)}
  AND l.location_name = ${sqlString(event.locationName)};`.trim();
}

function renderSql(payload) {
  const eventNames = payload.events.map((event) => sqlString(event.name)).join(",\n  ");
  const sourceLines = payload.metadata?.sources?.map((source) => `-- - ${source.name}: ${source.url}`) ?? [];

  return [
    "-- 由 scripts/generate-fudan-campus-sql.mjs 根据 data/fudan-campus/fudan-campus-events.json 生成",
    "-- 地点参考复旦公开信息；活动为演示数据组合。",
    ...sourceLines,
    "",
    "BEGIN;",
    "",
    "-- 1) 校区",
    ...payload.campuses.map(renderCampus),
    "",
    "-- 2) 建筑",
    ...payload.buildings.map(renderBuilding),
    "",
    "-- 3) 地点",
    ...payload.locations.map(renderLocation),
    "",
    "-- 4) 活动：Event 没有业务唯一约束，按活动名清理后重建，避免重复导入。",
    `DELETE FROM Event WHERE event_name IN (\n  ${eventNames}\n);`,
    "",
    ...payload.events.map(renderEvent),
    "",
    "COMMIT;",
    ""
  ].join("\n\n");
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(await readFile(input, "utf8"));

  validatePayload(payload);

  const sql = renderSql(payload);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, sql, "utf8");

  console.log(`已生成 SQL：${output}`);
  console.log(`校区 ${payload.campuses.length} 条，建筑 ${payload.buildings.length} 条，地点 ${payload.locations.length} 条，活动 ${payload.events.length} 条。`);
}

main().catch((error) => {
  console.error("生成失败。");
  console.error(error);
  process.exitCode = 1;
});
