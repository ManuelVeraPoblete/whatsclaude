# Agente WhatsApp

Bot de WhatsApp local con respuestas por IA y dashboard para intervención humana.

## Requisitos

- Node.js 20+ (recomendado: 22)
- Una cuenta de [OpenRouter](https://openrouter.ai) con API key

## Configuración inicial

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

> **Nota sobre modelos:** Los modelos `:free` de OpenRouter tienen un límite de ~50 requests/día sin créditos cargados y fallarán con error 429 en uso normal. Se recomienda `openai/gpt-4o-mini` (~$0.15 por millón de tokens — centavos al mes para uso normal).

## Uso

En dos terminales separadas:

```bash
# Terminal 1: bot de WhatsApp
npm run start:bot

# Terminal 2: dashboard Next.js
npm run dev
```

O en una sola terminal:

```bash
npm run start:all   # bot + servidor en producción
```

Abre [http://localhost:3000](http://localhost:3000). Si no hay sesión guardada, verás el código QR. Escanéalo con WhatsApp (Dispositivos vinculados → Vincular dispositivo).

## Personalizar el prompt del bot

Edita `src/lib/system-prompt.ts`:

```typescript
export const SYSTEM_PROMPT = `
  Tu prompt personalizado aquí.
`.trim();
```

## Modos de conversación

- **Modo IA**: el bot responde automáticamente usando el LLM.
- **Modo Humano**: los mensajes entrantes se guardan pero el bot no responde. Puedes responder manualmente desde el dashboard.

El toggle está en la esquina superior derecha de cada conversación.

## Estructura de datos

- `./data/messages.db` — base de datos SQLite (conversaciones, mensajes, estado)
- `./auth/` — sesión de WhatsApp Web (no perder en producción)

## Deploy en producción (EasyPanel sin Docker)

1. Configura las variables de entorno `OPENROUTER_API_KEY` y `OPENROUTER_MODEL` en el panel.
2. El `nixpacks.toml` incluido configura Node 22 y la compilación nativa de `better-sqlite3`.
3. **Volúmenes persistentes obligatorios:** monta `/app/data` y `/app/auth` en volúmenes persistentes. Sin esto, cada redespliegue pierde las conversaciones y obliga a re-escanear el QR.

### Seguridad (IMPORTANTE)

El dashboard **no tiene autenticación**. Si lo desplegás a internet, cualquiera con la URL puede leer todas las conversaciones de WhatsApp y enviar mensajes haciéndose pasar por vos. **Antes de exponer a internet**, configurá alguna de estas opciones:

- Basic auth a nivel proxy (EasyPanel / Caddy / Nginx)
- Cloudflare Access
- VPN

Esto es **bloqueante** para producción.

## Solución de problemas

### El bot entra en loop con código 440
WhatsApp está enviando `connectionReplaced`. Soluciones:
1. Verificá que en tu teléfono (Configuración → Dispositivos vinculados) no haya dispositivos viejos de pruebas anteriores.
2. Si persiste, esperá 15-30 minutos o cambiá de IP.

### Error 429 del LLM
El modelo `:free` agotó la cuota diaria. Cambiá a `openai/gpt-4o-mini` en `.env.local`.

### El QR no aparece en el dashboard
Verificá que el proceso `start:bot` esté corriendo en otra terminal. El dashboard solo muestra el QR cuando el bot lo genera.

## Mejoras pendientes

- Autenticación básica para el dashboard
- Soporte para mensajes de imagen y audio
- Exportación de conversaciones a CSV
- Configuración de system prompt por conversación
- Estadísticas de uso del LLM
- Notificaciones de mensajes nuevos (browser notifications)
