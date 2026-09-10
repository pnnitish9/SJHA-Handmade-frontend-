import api from "./axios.js";

export const createCustomOrderRequest = (formData) =>
  api.post("/custom-orders", formData, { headers: { "Content-Type": "multipart/form-data" } });

export const getMyCustomOrdersRequest = () => api.get("/custom-orders/mine");

// Initiates a Razorpay payment for an approved custom order.
// Returns { order, razorpay: { orderId, amount, currency, keyId } }
export const initiateCustomOrderPaymentRequest = (customOrderId) =>
  api.post(`/custom-orders/${customOrderId}/initiate-payment`);

// Admin
export const getAllCustomOrdersRequest = (params) => api.get("/custom-orders", { params });
export const respondToCustomOrderRequest = (id, data) => api.patch(`/custom-orders/${id}`, data);
