import api from "./axios.js";

// params: { search, category, 'price[gte]', 'price[lte]', sort, page, limit, isFeatured }
export const getProductsRequest = (params) => api.get("/products", { params });
export const getProductRequest = (slug) => api.get(`/products/${slug}`);
export const getProductByIdRequest = (id) => api.get(`/products/id/${id}`);

// formData must be a FormData instance (fields + optional `images` files)
export const createProductRequest = (formData) =>
  api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } });

export const updateProductRequest = (id, formData) =>
  api.patch(`/products/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });

export const deleteProductRequest = (id) => api.delete(`/products/${id}`);
