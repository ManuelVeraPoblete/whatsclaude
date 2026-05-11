// env-loader DEBE ser el primer import — ES modules hoistean todos los imports,
// y necesitamos que .env.local esté cargado antes de que openrouter.ts lo lea.
import "./env-loader";

import { start } from "../src/lib/baileys/client";

console.log("[bot] Iniciando agente WhatsApp...");

start().catch((err) => {
  console.error("[bot] Error fatal al iniciar:", err);
  process.exit(1);
});
