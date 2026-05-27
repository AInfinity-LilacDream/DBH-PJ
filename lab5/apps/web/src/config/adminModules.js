import {
  campusApi,
  buildingApi,
  locationApi,
  departmentApi,
  courseApi,
  eventApi,
  peopleApi,
  usersApi
} from "../services/admin/entities.js";

export const optionSets = {
  gender: [
    ["M", "男"],
    ["F", "女"],
    ["O", "其他"]
  ],
  roleType: [
    ["student", "学生"],
    ["teacher", "教师"],
    ["admin", "管理员"]
  ],
  verificationStatus: [
    ["pending", "待审核"],
    ["verified", "已认证"],
    ["rejected", "已拒绝"]
  ],
  facilityType: ["教室", "食堂", "咖啡店", "自习室", "图书馆", "实验室", "运动场地", "办公室", "医务室", "其他"].map(
    (item) => [item, item]
  ),
  buildingType: ["教学楼", "宿舍楼", "食堂楼", "图书馆", "行政楼", "实验楼", "体育设施", "医疗卫生", "其他"].map(
    (item) => [item, item]
  ),
  eventType: ["讲座", "论坛", "文艺演出", "体育赛事", "学术交流", "招聘宣讲", "志愿服务", "其他"].map((item) => [
    item,
    item
  ])
};

export const adminModules = [
  {
    key: "campus",
    api: campusApi,
    label: "校区",
    tableName: "Campus",
    description: "维护校区名称和地址信息。",
    fields: [
      { key: "campusName", label: "校区名称", required: true },
      { key: "address", label: "地址", required: true }
    ],
    columns: [
      { key: "campusName", label: "校区名称" },
      { key: "address", label: "地址" }
    ]
  },
  {
    key: "building",
    api: buildingApi,
    label: "楼宇",
    tableName: "Building",
    description: "维护楼宇名称、所属校区、类型与描述。",
    fields: [
      { key: "buildingName", label: "楼宇名称", required: true },
      { key: "campusId", label: "所属校区", type: "fk-select", options: "campuses", required: true },
      { key: "buildingType", label: "楼宇类型", type: "select", options: "buildingType", required: true },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "buildingName", label: "楼宇名称" },
      { key: "campusName", label: "所属校区" },
      { key: "buildingType", label: "楼宇类型" },
      { key: "description", label: "描述" }
    ]
  },
  {
    key: "location",
    api: locationApi,
    label: "地点",
    tableName: "Location",
    description: "维护地点、所属楼宇、设施类型和开放时间。",
    fields: [
      { key: "locationName", label: "地点名称", required: true },
      { key: "buildingId", label: "所属楼宇", type: "fk-select", options: "buildings", required: true },
      { key: "facilityType", label: "设施类型", type: "select", options: "facilityType", required: true },
      { key: "openTime", label: "开放时间" },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "locationName", label: "地点名称" },
      { key: "buildingName", label: "所属楼宇" },
      { key: "facilityType", label: "设施类型" },
      { key: "openTime", label: "开放时间" }
    ]
  },
  {
    key: "department",
    api: departmentApi,
    label: "院系",
    tableName: "Department",
    description: "维护院系名称、联系方式、办公室地点与负责人。",
    fields: [
      { key: "depName", label: "院系名称", required: true },
      { key: "contactInfo", label: "联系方式" },
      { key: "officeLocationId", label: "办公室地点", type: "fk-select", options: "locations", allowEmpty: true },
      { key: "managerId", label: "负责人", type: "fk-select", options: "people", allowEmpty: true },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "depName", label: "院系名称" },
      { key: "contactInfo", label: "联系方式" },
      { key: "officeLocationName", label: "办公室" },
      { key: "managerName", label: "负责人" }
    ]
  },
  {
    key: "course",
    api: courseApi,
    label: "课程",
    tableName: "Course",
    description: "维护课程、开课院系和课程描述。",
    fields: [
      { key: "courseName", label: "课程名称", required: true },
      { key: "depId", label: "开课院系", type: "fk-select", options: "departments", required: true },
      { key: "description", label: "课程描述", type: "textarea" }
    ],
    columns: [
      { key: "courseName", label: "课程名称" },
      { key: "departmentName", label: "开课院系" },
      { key: "description", label: "课程描述" }
    ]
  },
  {
    key: "event",
    api: eventApi,
    label: "活动",
    tableName: "Event",
    description: "维护讲座、论坛、体育赛事等校园活动。",
    fields: [
      { key: "eventName", label: "活动名称", required: true },
      { key: "eventType", label: "活动类型", type: "select", options: "eventType", required: true },
      { key: "startTime", label: "开始时间", type: "datetime-local", required: true },
      { key: "endTime", label: "结束时间", type: "datetime-local" },
      { key: "locationId", label: "活动地点", type: "fk-select", options: "locations", allowEmpty: true },
      { key: "hostDepId", label: "主办院系", type: "fk-select", options: "departments", allowEmpty: true },
      { key: "description", label: "描述", type: "textarea" }
    ],
    columns: [
      { key: "eventName", label: "活动名称" },
      { key: "eventType", label: "活动类型" },
      { key: "startTime", label: "开始时间", format: "datetime" },
      { key: "locationName", label: "地点" }
    ]
  },
  {
    key: "people",
    api: peopleApi,
    label: "人员",
    tableName: "People",
    description: "维护真实人员档案（姓名、性别、联系方式）。删除人员会级联删除其登录账号与学生/教师扩展信息。",
    fields: [
      { key: "name", label: "姓名", required: true },
      { key: "gender", label: "性别", type: "select", options: "gender", required: true },
      { key: "phone", label: "手机号" },
      { key: "email", label: "邮箱" }
    ],
    columns: [
      { key: "name", label: "姓名" },
      { key: "gender", label: "性别", format: "gender" },
      { key: "phone", label: "手机号" },
      { key: "email", label: "邮箱" }
    ]
  },
  {
    key: "users",
    api: usersApi,
    label: "用户",
    tableName: "SysUser",
    description:
      "维护系统登录账号，须关联已有人员。一人仅可有一个账号。密码留空时编辑不修改原密码；新建默认密码为 123456。",
    fields: [
      {
        key: "peopleId",
        label: "关联人员",
        type: "fk-select",
        options: "people",
        required: true,
        immutableOnEdit: true
      },
      { key: "username", label: "用户名", required: true },
      { key: "password", label: "密码", type: "password" },
      { key: "roleType", label: "账号角色", type: "select", options: "roleType", required: true },
      {
        key: "verificationStatus",
        label: "审核状态",
        type: "select",
        options: "verificationStatus",
        required: true
      },
      { key: "depId", label: "所属院系", type: "fk-select", options: "departments", allowEmpty: true }
    ],
    columns: [
      { key: "personName", label: "姓名" },
      { key: "username", label: "用户名" },
      { key: "roleType", label: "角色" },
      { key: "verificationStatus", label: "审核状态", format: "verificationStatus" },
      { key: "departmentName", label: "所属院系" }
    ]
  }
];
