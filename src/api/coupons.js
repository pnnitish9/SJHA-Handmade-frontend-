import api from "./axios.js";

export const validateCouponRequest = (code, subtotal) => api.post("/coupons/validate", { code, subtotal });

// Admin
export const getCouponsRequest = () => api.get("/coupons");
export const createCouponRequest = (data) => api.post("/coupons", data);
export const updateCouponRequest = (id, data) => api.patch(`/coupons/${id}`, data);
export const deleteCouponRequest = (id) => api.delete(`/coupons/${id}`);
