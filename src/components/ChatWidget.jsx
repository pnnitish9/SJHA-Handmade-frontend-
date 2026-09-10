import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { getOrCreateConversationRequest, getMessagesRequest, markReadRequest } from "../api/conversations.js";

export default function ChatWidget() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { socket, connected } = useSocket();

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Open (or create) the customer's conversation and load history the first time the panel opens
  useEffect(() => {
    if (!open || conversationId) return;
    setLoading(true);
    getOrCreateConversationRequest()
      .then(({ data }) => {
        setConversationId(data.conversation._id);
        return getMessagesRequest(data.conversation._id);
      })
      .then(({ data }) => setMessages(data.messages))
      .finally(() => setLoading(false));
  }, [open, conversationId]);

  // Join the socket room once we know the conversation id and the socket is connected
  useEffect(() => {
    if (!socket || !connected || !conversationId) return;
    socket.emit("join_conversation", conversationId);
    markReadRequest(conversationId).catch(() => {});

    const handleNewMessage = (message) => {
      if (message.conversation !== conversationId) return;
      setMessages((prev) => [...prev, message]);
    };
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_conversation", conversationId);
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, connected, conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket || !conversationId) return;
    socket.emit("send_message", { conversationId, text: text.trim() });
    setText("");
  };

  if (!isAuthenticated || isAdmin) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[70vh] max-h-[520px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-cream shadow-xl ring-1 ring-clay/20 sm:w-96">
          <div className="flex items-center justify-between bg-thread px-4 py-3 text-cream">
            <p className="font-display text-lg">Chat with us</p>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <p className="text-center text-sm text-clay">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-clay">
                Say hello — we usually reply within a few hours.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.senderRole === "customer"
                      ? "ml-auto bg-thread text-cream"
                      : "bg-oat text-ink ring-1 ring-clay/15"
                  }`}
                >
                  {msg.text}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-clay/20 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
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
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-thread text-cream shadow-lg transition hover:bg-thread/90"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
