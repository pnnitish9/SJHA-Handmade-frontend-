import api from "./axios.js";

export const getMyNotificationsRequest = () => api.get("/notifications");
export const markNotificationReadRequest = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsReadRequest = () => api.patch("/notifications/read-all");
