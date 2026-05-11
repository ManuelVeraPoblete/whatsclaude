interface Props {
  role: "user" | "assistant" | "human";
  content: string;
  createdAt: number;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ role, content, createdAt }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-start mb-2">
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-gray-800">
            {content}
          </div>
          <div className="text-xs text-gray-400 mt-1 ml-1">{formatTime(createdAt)}</div>
        </div>
      </div>
    );
  }

  if (role === "assistant") {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm">
            {content}
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right mr-1">
            IA · {formatTime(createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-2">
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-amber-400 text-amber-900 rounded-2xl rounded-tr-sm px-4 py-2 text-sm">
          {content}
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right mr-1">
          Humano · {formatTime(createdAt)}
        </div>
      </div>
    </div>
  );
}
