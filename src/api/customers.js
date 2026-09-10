import api from "./axios.js";

export const getCustomersRequest = () => api.get("/admin/customers");
export const getCustomerRequest = (id) => api.get(`/admin/customers/${id}`);
export const setCustomerStatusRequest = (id, isActive) =>
  api.patch(`/admin/customers/${id}/status`, { isActive });
