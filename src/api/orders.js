import api from "./axios.js";

export const createOrderRequest = (data) => api.post("/orders", data);
export const getMyOrdersRequest = () => api.get("/orders/mine");
export const getOrderRequest = (id) => api.get(`/orders/${id}`);
export const cancelOrderRequest = (id) => api.patch(`/orders/${id}/cancel`);

// Admin
export const getAllOrdersRequest = (params) => api.get("/orders", { params });
export const updateOrderStatusRequest = (id, data) => api.patch(`/orders/${id}/status`, data);
