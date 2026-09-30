/**
 * Adapter webhook Fonnte (ADR-0003).
 *
 * Berbeda dengan Cloud API, Fonnte mengirim payload datar (bukan amplop
 * entry/changes), tidak menandatangani badan permintaan, dan tidak punya
 * handshake langganan. Endpoint dilindungi dengan menyisipkan token pada URL
 * webhook yang didaftarkan di dashboard Fonnte, sehingga permintaan dari luar
 * tidak langsung membakar kuota pengiriman.
 */

import type { InboundMessage } from "../../conversation/types.ts";
import type { FonnteConfig } from "../../config.ts";
import type { InboundTransport } from "../../inboundTransport.ts";
import { parseJsonBody } from "../webhookSupport.ts";

/** Nama parameter query yang memuat token webhook pada URL yang didaftarkan. */
export const FONNTE_WEBHOOK_TOKEN_PARAM = "token";

/**
 * Periksa token webhook yang disisipkan pada URL saat pendaftaran di dashboard:
 * sebagai query `?token=…` atau sebagai segmen terakhir path. Perbandingan
 * dilakukan nilai utuh.
 */
export function isFonnteTokenValid(url: URL, expectedToken: string): boolean {
  const fromQuery = url.searchParams.get(FONNTE_WEBHOOK_TOKEN_PARAM);
  if (fromQuery !== null) {
    return fromQuery === expectedToken;
  }
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  return last !== undefined && last === expectedToken;
}

export function createFonnteInboundTransport(config: FonnteConfig): InboundTransport {
  return {
    handleSubscription() {
      return null;
    },
    async readInbound(request) {
      if (!isFonnteTokenValid(request.url, config.webhookVerifyToken)) {
        return { ok: false, status: 401, reason: "token webhook tidak sah" };
      }
      const payload = parseJsonBody(request.rawBody);
      if (payload === null) {
        return { ok: false, status: 400, reason: "badan permintaan bukan JSON" };
      }
      return { ok: true, messages: parseInboundMessages(payload, config.countryCode) };
    },
  };
}

/**
 * Konversi payload Fonnte ke pesan masuk. Fonnte juga mengirim status
 * perangkat dan status pengiriman ke endpoint yang sama; keduanya tidak punya
 * pengirim sehingga tidak menghasilkan pesan masuk.
 */
export function parseInboundMessages(payload: unknown, countryCode: string): InboundMessage[] {
  const items = Array.isArray(payload) ? payload : [payload];
  const messages: InboundMessage[] = [];
  for (const item of items) {
    const pesan = toInboundMessage(item, countryCode);
    if (pesan) {
      messages.push(pesan);
    }
  }
  return messages;
}

function toInboundMessage(item: unknown, countryCode: string): InboundMessage | null {
  if (item === null || typeof item !== "object") {
    return null;
  }
  const record = item as Record<string, unknown>;
  const from = normalizeSender(record.sender, countryCode);
  if (from === null) {
    return null;
  }
  const timestamp = readTimestamp(record.timestamp);
  const message = record.message;
  return {
    id: readId(record.inboxid) ?? `fonnte:${from}:${timestamp}`,
    from,
    timestamp,
    text: typeof message === "string" && message.length > 0 ? message : null,
  };
}

/**
 * Nomor pengirim dinormalisasi ke digit E.164. Pengirim grup berformat
 * "…@g.us" bukan Calon Jemaah dan diabaikan, karena percakapan di grup tidak
 * boleh dijawab otomatis.
 */
function normalizeSender(sender: unknown, countryCode: string): string | null {
  if (typeof sender !== "string" || sender.length === 0 || sender.includes("@")) {
    return null;
  }
  let digits = sender.replace(/[^0-9]/g, "");
  if (digits.length < 8) {
    return null;
  }
  if (digits.startsWith("0")) {
    digits = countryCode + digits.slice(1);
  }
  return digits;
}

function readTimestamp(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(Math.floor(Date.now() / 1000));
}

function readId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}
