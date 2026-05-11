import { NextRequest, NextResponse } from "next/server";
import {
  getMessages,
  getConversationById,
  insertMessage,
  enqueueOutbox,
} from "@/lib/db";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const convo = getConversationById(id);
  if (!convo) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const messages = getMessages(id, 100);
  return NextResponse.json({ messages, conversation: convo });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const convo = getConversationById(id);
  if (!convo) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const body = await req.json() as { content?: string; role?: string };
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
  }

  insertMessage(id, "human", content);
  enqueueOutbox(id, convo.phone, content);

  return NextResponse.json({ ok: true });
}
