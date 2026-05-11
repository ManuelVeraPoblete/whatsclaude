"use client";

import { useEffect, useState } from "react";

interface StatusResponse {
  status: "disconnected" | "qr" | "connecting" | "connected";
  qrPng?: string;
  phone?: string;
  updatedAt?: number;
}

interface Props {
  onConnected: (phone: string) => void;
}

export default function QRScreen({ onConnected }: Props) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [since, setSince] = useState(Date.now());

  useEffect(() => {
    setSince(Date.now());

    async function poll() {
      try {
        const res = await fetch("/api/connection/status");
        const json = await res.json() as StatusResponse;
        setData(json);
        if (json.status === "connected" && json.phone) {
          onConnected(json.phone);
        }
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsed = Math.floor((Date.now() - since) / 1000);
  const showError =
    (!data || data.status === "disconnected") &&
    !data?.qrPng &&
    elapsed > 10;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6">
      <h1 className="text-2xl font-bold text-gray-800">Agente WhatsApp</h1>
      <p className="text-gray-500">Conectar número</p>

      {data?.status === "qr" && data.qrPng ? (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qrPng} alt="QR de WhatsApp" width={320} height={320} />
          </div>
          <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Esperando escaneo...
          </div>
          <p className="text-xs text-gray-400 max-w-xs text-center">
            Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo
          </p>
        </div>
      ) : data?.status === "connecting" ? (
        <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Conectando...
        </div>
      ) : showError ? (
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-lg font-bold">!</span>
          </div>
          <p className="text-gray-600 text-sm">
            El bot no responde. Asegúrate de haber ejecutado{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">npm run start:bot</code> en otra terminal.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Esperando conexión del bot...
        </div>
      )}
    </div>
  );
}
