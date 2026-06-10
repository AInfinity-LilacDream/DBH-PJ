import { createEntityApi } from "./createEntityApi.js";

export const campusApi = createEntityApi("/api/admin/campuses");
export const buildingApi = createEntityApi("/api/admin/buildings");
export const locationApi = createEntityApi("/api/admin/locations");
export const departmentApi = createEntityApi("/api/admin/departments");
export const courseApi = createEntityApi("/api/admin/courses");
export const eventApi = createEntityApi("/api/admin/events");
export const peopleApi = createEntityApi("/api/admin/people");
export const usersApi = createEntityApi("/api/admin/users");
export const teachingApi = createEntityApi("/api/admin/teachings");
export const enrollmentApi = createEntityApi("/api/admin/enrollments");
export const eventParticipationApi = createEntityApi("/api/admin/event-participations");
export const queryRecordApi = createEntityApi("/api/admin/query-records");
