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
 * Catat laporan status pengiriman (sent/delivered/read/failed) yang dikirim Meta
 * ke webhook.
 *
 * Graph API selalu membalas HTTP 200 saat pesan diterima untuk antrean kirim,
 * jadi kegagalan pengantaran ke HP penerima hanya muncul sebagai `statuses`
 * pada pemanggilan webhook berikutnya — bukan sebagai error saat `sendText`.
 * Tanpa jejak ini, kegagalan seperti 131026 (perangkat tidak terdaftar) atau
 * 131030 (penerima tidak ada di daftar uji) tidak terlihat dari mana pun dan
 * tampak seperti "bot diam".
 *
 * Hanya field yang aman yang dicatat (status, kode error, id pesan); isi pesan
 * dan token tidak pernah ikut.
 */
export function catatStatusPengiriman(payload: unknown): void {
  for (const change of changesFrom(payload)) {
    const value = (change as { value?: unknown }).value;
    const daftar = readField(value, "statuses");
    if (!Array.isArray(daftar)) {
      continue;
    }
    for (const item of daftar) {
      const id = readField(item, "id");
      const status = readField(item, "status");
      const penerima = readField(item, "recipient_id");
      const errors = readField(item, "errors");
      let rincian = "";
      if (Array.isArray(errors)) {
        rincian = errors
          .map((e) => {
            const kode = readField(e, "code");
            const judul = readField(e, "title");
            return [typeof kode === "number" ? `code ${kode}` : "", typeof judul === "string" ? judul : ""]
              .filter((bagian) => bagian !== "")
              .join(" ");
          })
          .filter((bagian) => bagian !== "")
          .join("; ");
      }
      console.log(
        `Status pengiriman WhatsApp: ${String(status)} -> ${String(penerima)} (pesan ${String(id)})` +
          (rincian === "" ? "" : ` — ${rincian}`),
      );
    }
  }
}

/**
 * Konversi payload webhook provider ke daftar InboundMessage. Pesan non-teks
 * diteruskan dengan text null; status pengiriman dicatat lewat
 * `catatStatusPengiriman` dan payload tak dikenal diabaikan.
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
      catatStatusPengiriman(payload);
      return { ok: true, messages: parseInboundMessages(payload) };
    },
  };
}
