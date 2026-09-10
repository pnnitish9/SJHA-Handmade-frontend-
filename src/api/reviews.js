import api from "./axios.js";

export const getProductReviewsRequest = (productId) => api.get(`/products/${productId}/reviews`);
export const createReviewRequest = (formData) =>
  api.post("/reviews", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateReviewRequest = (id, data) => api.patch(`/reviews/${id}`, data);
export const deleteReviewRequest = (id) => api.delete(`/reviews/${id}`);

// Returns the list of product IDs the current user has already reviewed for a given order
export const getMyReviewedProductsRequest = (orderId) =>
  api.get(`/reviews/my-reviewed-products?orderId=${orderId}`);

// Admin
export const getAllReviewsRequest = () => api.get("/admin/reviews");
export const setReviewVisibilityRequest = (id, isHidden) =>
  api.patch(`/admin/reviews/${id}/visibility`, { isHidden });
