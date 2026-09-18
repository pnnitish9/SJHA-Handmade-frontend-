import api from "./axios.js";

// Public — fetch UPI config (merchant UPI ID and name) for the QR code
export const getPaymentConfigRequest = () => api.get("/payments/config");

// Admin
export const getPendingPaymentsRequest = (tab = "pending") =>
  api.get("/payments/pending", { params: { tab } });

export const adminVerifyPaymentRequest = (paymentId) =>
  api.patch(`/payments/${paymentId}/verify`);

export const adminRejectPaymentRequest = (paymentId, reason) =>
  api.patch(`/payments/${paymentId}/reject`, { reason });
