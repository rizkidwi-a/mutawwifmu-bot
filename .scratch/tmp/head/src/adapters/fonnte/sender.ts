/**
 * Pengirim pesan Fonnte (ADR-0003): POST {apiBaseUrl}/send dengan header
 * Authorization berisi token perangkat. Fonnte membalas HTTP 200 meski
 * penolakan, jadi keberhasilan ditentukan dari field status pada badan respons.
 */

import type { FonnteConfig } from "../../config.ts";
import type { MessageSender } from "../../messageSender.ts";

export function createFonnteSender(config: FonnteConfig, fetchImpl: typeof fetch = fetch): MessageSender {
  return {
    async sendText(to: string, text: string): Promise<void> {
      const respon = await fetchImpl(`${config.apiBaseUrl}/send`, {
        method: "POST",
        headers: {
          authorization: config.apiToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          target: to,
          message: text,
          countryCode: config.countryCode,
        }),
      });
      const hasil = await readSendResult(respon);
      if (!hasil.ok) {
        throw new Error(`Pengiriman pesan Fonnte gagal: ${hasil.reason}`);
      }
    },
  };
}

type SendResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Bacalah hasil pengiriman. Field status ditulis Fonnte dengan kapitalisasi
 * yang tidak konsisten ("status"/"Status"), jadi dibaca case-insensitive.
 * Respons tanpa status yang jelas dianggap gagal agar pesan hilang diam-diam
 * tidak dianggap terkirim.
 */
async function readSendResult(respon: Response): Promise<SendResult> {
  let payload: unknown = null;
  try {
    payload = (await respon.json()) as unknown;
  } catch {
    payload = null;
  }

  if (!respon.ok) {
    return { ok: false, reason: `HTTP ${respon.status}${detailSuffix(payload)}` };
  }

  const status = readStatusField(payload);
  if (status === true) {
    return { ok: true };
  }
  if (status === false) {
    return { ok: false, reason: detailSuffix(payload) || "ditolak provider tanpa alasan" };
  }
  return { ok: false, reason: `respons tidak dikenali${detailSuffix(payload) || ": tanpa field status"}` };
}

function readStatusField(payload: unknown): boolean | undefined {
  if (payload === null || typeof payload !== "object") {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === "status") {
      return record[key] === true;
    }
  }
  return undefined;
}

/** Alasan dari provider dalam kurung, atau string kosong bila tidak ada. */
function detailSuffix(payload: unknown): string {
  if (payload === null || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  const reason = record.reason ?? record.detail;
  return typeof reason === "string" && reason.length > 0 ? ` (${reason})` : "";
}
