"use client";

import { useEffect, useState } from "react";
import QRScreen from "./QRScreen";
import DashboardHeader from "./DashboardHeader";
import ConversationList, { type ConversationSummary } from "./ConversationList";
import ConversationPanel from "./ConversationPanel";

type AppState = "loading" | "qr" | "dashboard";

interface StatusResponse {
  status: string;
  phone?: string;
  qrPng?: string;
}

export default function ConnectionGate() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [phone, setPhone] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Verificar estado inicial al montar
  useEffect(() => {
    async function checkInitialStatus() {
      try {
        const res = await fetch("/api/connection/status");
        const data = await res.json() as StatusResponse;
        if (data.status === "connected" && data.phone) {
          setPhone(data.phone);
          setAppState("dashboard");
        } else {
          setAppState("qr");
        }
      } catch {
        setAppState("qr");
      }
    }
    checkInitialStatus();
  }, []);

  // Polling de conversaciones cuando está conectado
  useEffect(() => {
    if (appState !== "dashboard") return;

    async function fetchConversations() {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json() as { conversations: ConversationSummary[] };
      setConversations(data.conversations);
    }

    fetchConversations();
    const interval = setInterval(fetchConversations, 2000);
    return () => clearInterval(interval);
  }, [appState]);

  function handleConnected(connectedPhone: string) {
    setPhone(connectedPhone);
    setAppState("dashboard");
  }

  function handleDisconnect() {
    setPhone("");
    setConversations([]);
    setSelectedId(null);
    setAppState("qr");
  }

  function handleDeleteConversation() {
    setSelectedId(null);
  }

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (appState === "qr") {
    return <QRScreen onConnected={handleConnected} />;
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader phone={phone} onDisconnect={handleDisconnect} />
      <div className="flex flex-1 min-h-0">
        {/* Lista de conversaciones */}
        <aside className="w-72 flex flex-col border-r border-gray-200 bg-white shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Conversaciones
            </h2>
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        {/* Panel de conversación */}
        <main className="flex-1 flex min-h-0">
          {selectedId ? (
            <ConversationPanel
              key={selectedId}
              conversationId={selectedId}
              onDelete={handleDeleteConversation}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecciona una conversación
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
