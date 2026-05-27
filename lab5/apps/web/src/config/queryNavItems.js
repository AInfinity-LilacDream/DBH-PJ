import { searchLocations, searchCourses, searchEvents } from "../services/catalog/queries.js";

export const queryNavItems = [
  {
    key: "new-chat",
    label: "新建对话",
    icon: "lucide:message-square-plus",
    description: "通过自然语言查询地点、课程和活动信息。"
  },
  {
    key: "location-query",
    label: "地点查询",
    icon: "lucide:map-pin",
    description: "查询校区、楼宇、教室、食堂、自习室等空间信息。",
    search: searchLocations
  },
  {
    key: "course-query",
    label: "课程查询",
    icon: "lucide:book-open",
    description: "查询课程、授课教师、开课院系和学期信息。",
    search: searchCourses
  },
  {
    key: "event-query",
    label: "活动查询",
    icon: "lucide:calendar-days",
    description: "查询讲座、论坛、招聘宣讲、文体活动等校园事件。",
    search: searchEvents
  },
  {
    key: "my-events",
    label: "我的活动",
    icon: "lucide:calendar-check",
    description: "按开始时间从早到晚展示您已报名、尚未开始的校园活动。"
  }
];

export const chatSuggestions = [
  "邯郸校区有哪些晚上开放的自习室？",
  "数据库设计这门课由谁授课？",
  "这周有什么讲座或招聘宣讲？"
];
