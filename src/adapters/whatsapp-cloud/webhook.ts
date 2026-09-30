/**
 * Adapter webhook WhatsApp Cloud API (ADR-0001).
 *
 * Bagian ini hanya soal transport: handshake verifikasi, pemeriksaan tanda
 * tangan, dan konversi payload provider ke InboundMessage. Perilaku percakapan
 * tetap berada di seam provider-agnostic (src/conversation/).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { InboundMessage } from "../../conversation/types.ts";
import type { WhatsAppCloudConfig } from "../../config.ts";
import type { InboundTransport } from "../../inboundTransport.ts";
import { firstHeaderValue, parseJsonBody } from "../webhookSupport.ts";

/**
 * Handshake langganan webhook (GET /webhook). Mengembalikan hub.challenge bila
 * hub.mode dan hub.verify_token cocok dengan konfigurasi; selain itu null.
 */
export function verifySubscriptionQuery(query: URLSearchParams, webhookVerifyToken: string): string | null {
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");
  if (mode === "subscribe" && token === webhookVerifyToken && challenge !== null) {
    return challenge;
  }
  return null;
}

/**
 * Pemeriksaan X-Hub-Signature-256: HMAC-SHA256 atas badan mentah dengan
 * app secret. Header berformat "sha256=<hex>".
 */
export function isSignatureValid(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const provided = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Konversi payload webhook provider ke daftar InboundMessage. Pesan non-teks
 * diteruskan dengan text null; status pengiriman dan payload tak dikenal
 * diabaikan.
 */
export function parseInboundMessages(payload: unknown): InboundMessage[] {
  const messages: InboundMessage[] = [];
  for (const change of changesFrom(payload)) {
    const value = (change as { value?: unknown }).value;
    const daftar = readField(value, "messages");
    if (!Array.isArray(daftar)) {
      continue;
    }
    for (const item of daftar) {
      const pesan = toInboundMessage(item);
      if (pesan) {
        messages.push(pesan);
      }
    }
  }
  return messages;
}

function changesFrom(payload: unknown): unknown[] {
  const entry = readField(payload, "entry");
  if (!Array.isArray(entry)) {
    return [];
  }
  const changes: unknown[] = [];
  for (const item of entry) {
    const daftar = readField(item, "changes");
    if (Array.isArray(daftar)) {
      changes.push(...daftar);
    }
  }
  return changes;
}

function toInboundMessage(item: unknown): InboundMessage | null {
  const id = readField(item, "id");
  const from = readField(item, "from");
  const timestamp = readField(item, "timestamp");
  if (typeof id !== "string" || typeof from !== "string" || typeof timestamp !== "string") {
    return null;
  }
  const text = readField(item, "text");
  const body = readField(text, "body");
  return {
    id,
    from,
    timestamp,
    text: typeof body === "string" ? body : null,
  };
}

function readField(obj: unknown, kunci: string): unknown {
  if (obj !== null && typeof obj === "object") {
    return (obj as Record<string, unknown>)[kunci];
  }
  return undefined;
}

/**
 * Transport masuk WhatsApp Cloud API: handshake hub.verify_token dan pemeriksaan
 * tanda tangan X-Hub-Signature-256 sebelum payload dibaca.
 */
export function createCloudApiInboundTransport(config: WhatsAppCloudConfig): InboundTransport {
  return {
    handleSubscription(url: URL) {
      const challenge = verifySubscriptionQuery(url.searchParams, config.webhookVerifyToken);
      if (challenge === null) {
        return { status: 403, body: "verify-token tidak cocok" };
      }
      return { status: 200, body: challenge };
    },
    async readInbound(request) {
      const signature = firstHeaderValue(request.headers["x-hub-signature-256"]);
      if (!isSignatureValid(request.rawBody, signature, config.appSecret)) {
        return { ok: false, status: 401, reason: "tanda tangan tidak sah" };
      }
      const payload = parseJsonBody(request.rawBody);
      if (payload === null) {
        return { ok: false, status: 400, reason: "badan permintaan bukan JSON" };
      }
      return { ok: true, messages: parseInboundMessages(payload) };
    },
  };
}
