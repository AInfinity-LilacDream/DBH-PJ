import { createEntityApi } from "./createEntityApi.js";

export const campusApi = createEntityApi("/api/admin/campuses");
export const buildingApi = createEntityApi("/api/admin/buildings");
export const locationApi = createEntityApi("/api/admin/locations");
export const departmentApi = createEntityApi("/api/admin/departments");
export const courseApi = createEntityApi("/api/admin/courses");
export const eventApi = createEntityApi("/api/admin/events");
export const peopleApi = createEntityApi("/api/admin/people");
