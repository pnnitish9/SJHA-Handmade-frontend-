import api from "./axios.js";

export const getOrCreateConversationRequest = () => api.post("/conversations");
export const getMyConversationsRequest = () => api.get("/conversations/mine");
export const getAllConversationsRequest = () => api.get("/conversations");
export const getMessagesRequest = (conversationId) => api.get(`/conversations/${conversationId}/messages`);
export const markReadRequest = (conversationId) => api.patch(`/conversations/${conversationId}/read`);
