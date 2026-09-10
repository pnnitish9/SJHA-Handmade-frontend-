import api from "./axios.js";

export const getCartRequest = () => api.get("/cart");
export const addCartItemRequest = (data) => api.post("/cart/items", data);
export const updateCartItemRequest = (itemId, quantity) =>
  api.patch(`/cart/items/${itemId}`, { quantity });
export const removeCartItemRequest = (itemId) => api.delete(`/cart/items/${itemId}`);
export const clearCartRequest = () => api.delete("/cart");
