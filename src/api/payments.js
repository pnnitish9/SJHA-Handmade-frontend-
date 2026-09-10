import api from "./axios.js";

export const verifyPaymentRequest = (data) => api.post("/payments/verify", data);
