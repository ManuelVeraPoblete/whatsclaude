import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system-prompt";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateReply(
  history: ChatMessage[]
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
    ],
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
