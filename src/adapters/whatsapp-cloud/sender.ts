/**
 * Pengirim pesan WhatsApp Cloud API (ADR-0001): POST /{phone-number-id}/messages
 * dengan bearer token dari konfigurasi.
 */

import type { WhatsAppCloudConfig } from "../../config.ts";
import type { MessageSender } from "../../messageSender.ts";

export function createCloudApiSender(config: WhatsAppCloudConfig, fetchImpl: typeof fetch = fetch): MessageSender {
  return {
    async sendText(to: string, text: string): Promise<void> {
      const url = `${config.apiBaseUrl}/${config.phoneNumberId}/messages`;
      const respon = await fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: text },
        }),
      });
      if (!respon.ok) {
        throw new Error(`Pengiriman pesan WhatsApp gagal: ${await jelaskanKegagalan(respon)}`);
      }
    },
  };
}

/**
 * Terjemahkan respons gagal Graph API menjadi keterangan yang bisa ditindaklanjuti.
 *
 * Graph API selalu menyertakan badan error berisi `code` dan `error_subcode`
 * yang menentukan penyebab sebenarnya (mis. 131030 = penerima tidak terdaftar
 * di daftar uji, 131047 = di luar jendela layanan 24 jam). Tanpa ini semua
 * kegagalan hanya tampak sebagai "HTTP 400" dan tidak bisa ditelusuri dari
 * log proses.
 *
 * Badan error boleh memuat hal yang tidak boleh bocor, jadi hanya field
 * yang aman yang diambil: kode, subkode, dan pesan dari Meta. Token akses
 * dan isi pesan tidak pernah ikut ke dalam pesan error.
 */
async function jelaskanKegagalan(respon: Response): Promise<string> {
  const status = `HTTP ${respon.status}`;
  let badan: unknown;
  try {
    badan = await respon.json();
  } catch {
    // Gateway/proxy kadang membalas HTML atau teks kosong; status saja sudah
    // cukup sebagai petunjuk dan parsing gagal tidak boleh menutupi aslinya.
    return status;
  }

  if (typeof badan !== "object" || badan === null) return status;
  const error = (badan as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return status;

  const fields = error as { message?: unknown; code?: unknown; error_subcode?: unknown };
  const kode = typeof fields.code === "number" ? String(fields.code) : "";
  const subkode = typeof fields.error_subcode === "number" ? `/${fields.error_subcode}` : "";
  const pesan = typeof fields.message === "string" ? fields.message : "";

  const rincian = [kode + subkode, pesan].filter((bagian) => bagian !== "").join(" ");
  return rincian === "" ? status : `${status} — ${rincian}`;
}
