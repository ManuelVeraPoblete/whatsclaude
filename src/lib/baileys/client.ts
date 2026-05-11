import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "node:path";
import fs from "node:fs";
import qrcodeTerminal from "qrcode-terminal";
import { setConnectionState, getConnectionState } from "../db";
import { handleMessages } from "./handler";
import { getPendingOutbox, markOutboxSent } from "../db";

const AUTH_DIR = path.resolve(process.cwd(), "auth");
const RESTART_FLAG = path.resolve(process.cwd(), "data", ".restart");

const logger = pino({ level: "silent" });

export interface BaileysHandle {
  sock: ReturnType<typeof makeWASocket>;
  shutdown: () => Promise<void>;
}

let handle: BaileysHandle | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let outboxTimer: ReturnType<typeof setInterval> | null = null;
let restartWatcher: ReturnType<typeof setInterval> | null = null;

export async function start(): Promise<void> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  let version: [number, number, number] | undefined;
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version;
    console.log(`[bot] Versión WA: ${version.join(".")}`);
  } catch (err) {
    console.warn("[bot] No se pudo obtener última versión de WA:", err);
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.macOS("Desktop"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  handle = {
    sock,
    shutdown: async () => {
      try { sock.end(undefined); } catch {}
    },
  };

  // ── Eventos de conexión ───────────────────────────────────────────────────

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("[bot] QR recibido — escanea en localhost:3000");
      qrcodeTerminal.generate(qr, { small: true });
      setConnectionState({ status: "qr", qr_string: qr, phone: null });
    }

    if (connection === "connecting") {
      const current = getConnectionState();
      if (current.status === "disconnected") {
        setConnectionState({ status: "connecting" });
      }
    }

    if (connection === "open") {
      const rawId = sock.user?.id ?? "";
      const phone = rawId.split(":")[0];
      setConnectionState({ status: "connected", qr_string: null, phone });
      console.log(`[bot] Conectado como ${phone}`);
      startOutboxPoller(sock);
    }

    if (connection === "close") {
      const code =
        (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode ?? 0;

      console.log(`[bot] Conexión cerrada. Código: ${code}`);

      if (code === DisconnectReason.loggedOut) {
        setConnectionState({
          status: "disconnected",
          qr_string: null,
          phone: null,
        });
        console.log("[bot] Sesión cerrada (logout). No reconectando.");
        return;
      }

      scheduleReconnect(code);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    await handleMessages(sock, messages);
  });

  // ── Watcher de flag de reinicio ───────────────────────────────────────────

  if (!restartWatcher) {
    restartWatcher = setInterval(() => {
      if (fs.existsSync(RESTART_FLAG)) {
        fs.unlinkSync(RESTART_FLAG);
        console.log("[bot] Flag de reinicio detectado — reiniciando...");
        performRestart();
      }
    }, 1000);
  }
}

function scheduleReconnect(code: number): void {
  if (reconnectTimer) return;
  const delay = code === 440 ? 15000 : 5000;
  console.log(`[bot] Reconectando en ${delay / 1000}s...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (handle) {
      try { handle.sock.end(undefined); } catch {}
      handle = null;
    }
    start().catch((err) => console.error("[bot] Error al reconectar:", err));
  }, delay);
}

function startOutboxPoller(sock: ReturnType<typeof makeWASocket>): void {
  if (outboxTimer) clearInterval(outboxTimer);
  outboxTimer = setInterval(async () => {
    const pending = getPendingOutbox();
    for (const item of pending) {
      try {
        const jid = `${item.phone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: item.content });
        markOutboxSent(item.id);
        console.log(`[bot] → Outbox enviado a ${item.phone}: "${item.content.slice(0, 40)}"`);
      } catch (err) {
        console.error(`[bot] Error enviando outbox ${item.id}:`, err);
      }
    }
  }, 2000);
}

async function performRestart(): Promise<void> {
  if (outboxTimer) {
    clearInterval(outboxTimer);
    outboxTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (handle) {
    try {
      await handle.shutdown();
    } catch {}
    handle = null;
  }
  try {
    const { default: fse } = await import("node:fs");
    fse.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}
  setConnectionState({ status: "disconnected", qr_string: null, phone: null });
  await start();
}
