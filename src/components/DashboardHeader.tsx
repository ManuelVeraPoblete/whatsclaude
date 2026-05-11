"use client";

interface Props {
  phone: string;
  onDisconnect: () => void;
}

export default function DashboardHeader({ phone, onDisconnect }: Props) {
  async function handleDisconnect() {
    await fetch("/api/connection/disconnect", { method: "POST" });
    onDisconnect();
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span className="font-semibold text-gray-800">Agente WhatsApp</span>
        <span className="text-sm text-gray-400">{phone}</span>
      </div>
      <button
        onClick={handleDisconnect}
        className="text-sm px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        Desconectar
      </button>
    </header>
  );
}
