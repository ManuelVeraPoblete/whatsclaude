"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import ModeToggle from "./ModeToggle";

interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "human";
  content: string;
  created_at: number;
}

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
}

interface Props {
  conversationId: number;
  onDelete: () => void;
}

export default function ConversationPanel({ conversationId, onDelete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    const res = await fetch(`/api/messages/${conversationId}`);
    if (!res.ok) return;
    const data = await res.json() as { messages: Message[]; conversation: Conversation };
    setMessages(data.messages);
    setConversation(data.conversation);
  }

  useEffect(() => {
    setMessages([]);
    setConversation(null);
    setText("");
    setConfirmDelete(false);
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
    onDelete();
  }

  function handleModeChange(mode: "AI" | "HUMAN") {
    setConversation((prev) => prev ? { ...prev, mode } : prev);
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div>
          <div className="font-semibold text-gray-900">
            {conversation.name ?? conversation.phone}
          </div>
          {conversation.name && (
            <div className="text-xs text-gray-400">{conversation.phone}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle
            mode={conversation.mode}
            conversationId={conversationId}
            onChange={handleModeChange}
          />
          <button
            onClick={handleDelete}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              confirmDelete
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {confirmDelete ? "¿Confirmar?" : "Borrar"}
          </button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            createdAt={m.created_at}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        {conversation.mode === "AI" ? (
          <div className="text-sm text-gray-400 text-center py-1">
            El bot responde automáticamente en modo IA
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {sending ? "..." : "Enviar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
