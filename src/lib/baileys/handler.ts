import type makeWASocket from "@whiskeysockets/baileys";
import type { WAMessage } from "@whiskeysockets/baileys";
import {
  getOrCreateConversation,
  insertMessage,
  getConversationById,
  getRecentHistory,
} from "../db";
import { generateReply } from "../openrouter";

type Sock = ReturnType<typeof makeWASocket>;

export async function handleMessages(
  sock: Sock,
  messages: WAMessage[]
): Promise<void> {
  for (const msg of messages) {
    try {
      await handleSingleMessage(sock, msg);
    } catch (err) {
      console.error("[bot] Error procesando mensaje:", err);
    }
  }
}

async function handleSingleMessage(
  sock: Sock,
  msg: WAMessage
): Promise<void> {
  if (msg.key.fromMe) return;

  const remoteJid = msg.key.remoteJid ?? "";
  if (remoteJid.endsWith("@g.us")) return;
  if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) return;

  const text =
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    null;

  if (!text) return;

  const phone = remoteJid.replace(/@s\.whatsapp\.net$|@lid$/, "");
  const pushName = msg.pushName ?? null;

  console.log(`[bot] ← Mensaje de ${phone} (${pushName ?? "sin nombre"}): "${text}"`);

  const convo = getOrCreateConversation(phone, pushName);
  insertMessage(convo.id, "user", text);

  const fresh = getConversationById(convo.id);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[bot] Modo HUMAN para ${phone} — no respondiendo automáticamente`);
    return;
  }

  const history = getRecentHistory(convo.id, 20);
  const chatHistory = history.map((m) => ({
    role:
      m.role === "user"
        ? ("user" as const)
        : ("assistant" as const),
    content: m.content,
  }));

  console.log(`[bot] Llamando LLM con ${chatHistory.length} mensajes...`);
  const start = Date.now();

  const reply = await generateReply(chatHistory);

  console.log(`[bot] LLM respondió en ${Date.now() - start}ms`);

  insertMessage(convo.id, "assistant", reply);

  await sock.sendMessage(remoteJid, { text: reply });

  console.log(`[bot] → Enviado a ${phone}: "${reply.slice(0, 60)}"`);
}
