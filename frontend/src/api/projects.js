import api from "./axios";

export const getProject = (id) => api.get(`/api/projects/${id}/`);

export const listFolders = (projectId, parentId) =>
  api.get("/api/project-folders/", {
    params: { project: projectId, parent: parentId ?? "root" },
  });

export const createFolder = (data) => api.post("/api/project-folders/", data);

export const renameFolder = (id, data) =>
  api.patch(`/api/project-folders/${id}/`, data);

export const deleteFolder = (id) => api.delete(`/api/project-folders/${id}/`);

export const listFiles = (projectId, folderId) =>
  api.get("/api/project-files/", {
    params: { project: projectId, folder: folderId ?? "root" },
  });

export const createFile = (data) =>
  api.post("/api/project-files/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteFile = (id) => api.delete(`/api/project-files/${id}/`);
