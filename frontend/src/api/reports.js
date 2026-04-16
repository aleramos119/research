import api from "./axios";

export const listReports = (params) => api.get("/api/reports/", { params });

export const createReport = (data) => api.post("/api/reports/", data);

export const toggleVote = (id) => api.post(`/api/reports/${id}/vote/`);
