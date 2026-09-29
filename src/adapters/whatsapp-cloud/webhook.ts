/**
 * Adapter webhook WhatsApp Cloud API (ADR-0001).
 *
 * Bagian ini hanya soal transport: handshake verifikasi, pemeriksaan tanda
 * tangan, dan konversi payload provider ke InboundMessage. Perilaku percakapan
 * tetap berada di seam provider-agnostic (src/conversation/).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { InboundMessage } from "../../conversation/types.ts";

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
  for (const change of changesDari(payload)) {
    const value = (change as { value?: unknown }).value;
    const daftar = ambil(value, "messages");
    if (!Array.isArray(daftar)) {
      continue;
    }
    for (const item of daftar) {
      const pesan = konversiPesan(item);
      if (pesan) {
        messages.push(pesan);
      }
    }
  }
  return messages;
}

function changesDari(payload: unknown): unknown[] {
  const entry = ambil(payload, "entry");
  if (!Array.isArray(entry)) {
    return [];
  }
  const changes: unknown[] = [];
  for (const item of entry) {
    const daftar = ambil(item, "changes");
    if (Array.isArray(daftar)) {
      changes.push(...daftar);
    }
  }
  return changes;
}

function konversiPesan(item: unknown): InboundMessage | null {
  const id = ambil(item, "id");
  const from = ambil(item, "from");
  const timestamp = ambil(item, "timestamp");
  if (typeof id !== "string" || typeof from !== "string" || typeof timestamp !== "string") {
    return null;
  }
  const text = ambil(item, "text");
  const body = ambil(text, "body");
  return {
    id,
    from,
    timestamp,
    text: typeof body === "string" ? body : null,
  };
}

function ambil(obj: unknown, kunci: string): unknown {
  if (obj !== null && typeof obj === "object") {
    return (obj as Record<string, unknown>)[kunci];
  }
  return undefined;
}
