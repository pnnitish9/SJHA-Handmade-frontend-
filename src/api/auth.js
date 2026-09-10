import api from "./axios.js";

export const registerRequest = (data) => api.post("/auth/register", data);
export const loginRequest = (data) => api.post("/auth/login", data);
export const logoutRequest = () => api.post("/auth/logout");
export const getMeRequest = () => api.get("/auth/me");
export const updateMeRequest = (data) => api.patch("/auth/me", data);
export const updatePasswordRequest = (data) => api.patch("/auth/update-password", data);
export const addAddressRequest = (data) => api.post("/auth/addresses", data);
export const deleteAddressRequest = (addressId) => api.delete(`/auth/addresses/${addressId}`);
