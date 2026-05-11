"use client";

export interface ConversationSummary {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  last_message_preview: string | null;
}

interface Props {
  conversations: ConversationSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diffSec = Math.floor(Date.now() / 1000) - ts;
  if (diffSec < 60) return "ahora";
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`;
  return `hace ${Math.floor(diffSec / 86400)} d`;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4">
        Sin conversaciones aún. Espera que alguien te escriba.
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedId === c.id ? "bg-gray-100" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium text-sm text-gray-900 truncate">
                {c.name ?? c.phone}
              </span>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    c.mode === "AI"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {c.mode === "AI" ? "IA" : "HUM"}
                </span>
                <span className="text-xs text-gray-400">
                  {relativeTime(c.last_message_at)}
                </span>
              </div>
            </div>
            {c.name && (
              <div className="text-xs text-gray-400">{c.phone}</div>
            )}
            {c.last_message_preview && (
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {c.last_message_preview}
              </div>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
