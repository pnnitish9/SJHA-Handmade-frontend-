import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  getAllConversationsRequest,
  getMessagesRequest,
  markReadRequest,
} from "../../api/conversations.js";

export default function AdminMessages() {
  const { socket, connected } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const scrollRef = useRef(null);

  const loadConversations = () => {
    getAllConversationsRequest().then(({ data }) => setConversations(data.conversations));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Live-update the inbox list whenever any conversation gets a new message
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updated) => {
      setConversations((prev) => {
        const others = prev.filter((c) => c._id !== updated._id);
        return [updated, ...others].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    };
    socket.on("conversation_updated", handleUpdate);
    return () => socket.off("conversation_updated", handleUpdate);
  }, [socket]);

  const openConversation = (id) => {
    setActiveId(id);
    setLoadingThread(true);
    getMessagesRequest(id)
      .then(({ data }) => setMessages(data.messages))
      .finally(() => setLoadingThread(false));
    markReadRequest(id).then(loadConversations);
  };

  useEffect(() => {
    if (!socket || !connected || !activeId) return;
    socket.emit("join_conversation", activeId);

    const handleNewMessage = (message) => {
      if (message.conversation !== activeId) return;
      setMessages((prev) => [...prev, message]);
      markReadRequest(activeId).catch(() => {});
    };
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_conversation", activeId);
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, connected, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket || !activeId) return;
    socket.emit("send_message", { conversationId: activeId, text: text.trim() });
    setText("");
  };

  const activeConversation = conversations.find((c) => c._id === activeId);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Messages</h1>

      <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-xl ring-1 ring-clay/15 md:grid-cols-[280px_1fr]">
        {/* Conversation list — hidden on mobile once a thread is open */}
        <div className={`divide-y divide-clay/10 overflow-y-auto bg-cream md:max-h-[600px] ${activeId ? "hidden md:block" : ""}`}>
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-clay">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => openConversation(conv._id)}
                className={`block w-full p-4 text-left hover:bg-oat ${activeId === conv._id ? "bg-oat" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink">{conv.customer?.name}</p>
                  {conv.unreadByAdmin > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-thread text-xs text-cream">
                      {conv.unreadByAdmin}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-clay">{conv.lastMessage || "No messages yet"}</p>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className={`flex flex-col bg-oat md:max-h-[600px] ${activeId ? "" : "hidden md:flex"}`}>
          {!activeId ? (
            <p className="m-auto text-sm text-clay">Select a conversation to view messages.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-clay/15 bg-cream p-3">
                <button onClick={() => setActiveId(null)} className="text-clay hover:text-ink md:hidden">
                  <ArrowLeft size={18} />
                </button>
                <p className="text-sm font-medium text-ink">{activeConversation?.customer?.name}</p>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingThread ? (
                  <p className="text-center text-sm text-clay">Loading…</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        msg.senderRole === "admin"
                          ? "ml-auto bg-thread text-cream"
                          : "bg-cream text-ink ring-1 ring-clay/15"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-clay/15 bg-cream p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a reply…"
                  className="w-full rounded-full border border-clay/30 bg-oat px-4 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  aria-label="Send"
                  className="shrink-0 rounded-full bg-thread p-2.5 text-cream disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
