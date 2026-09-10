import api from "./axios.js";

export const getCategoriesRequest = () => api.get("/categories");
export const getCategoryRequest = (slug) => api.get(`/categories/${slug}`);

export const createCategoryRequest = (formData) =>
  api.post("/categories", formData, { headers: { "Content-Type": "multipart/form-data" } });

export const updateCategoryRequest = (id, formData) =>
  api.patch(`/categories/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });

export const deleteCategoryRequest = (id) => api.delete(`/categories/${id}`);
