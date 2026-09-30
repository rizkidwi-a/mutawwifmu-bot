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
        throw new Error(`Pengiriman pesan WhatsApp gagal: HTTP ${respon.status}`);
      }
    },
  };
}
