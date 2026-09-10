import api from "./axios.js";

export const getAnalyticsRequest = () => api.get("/admin/analytics");
