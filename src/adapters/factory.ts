/**
 * Pemilihan adapter transport sesuai provider yang dikonfigurasi. Titik
 * penggantian tunggal: menambah provider baru cukup menambah satu cabang di
 * sini tanpa menyentuh seam percakapan maupun server.
 */

import { CLOUD_API_PROVIDER, FONNTE_PROVIDER, SUPPORTED_PROVIDERS, type WhatsAppConfig } from "../config.ts";
import type { InboundTransport } from "../inboundTransport.ts";
import type { MessageSender } from "../messageSender.ts";
import { createFonnteSender } from "./fonnte/sender.ts";
import { createFonnteInboundTransport } from "./fonnte/webhook.ts";
import { createCloudApiSender } from "./whatsapp-cloud/sender.ts";
import { createCloudApiInboundTransport } from "./whatsapp-cloud/webhook.ts";

export interface Transport {
  readonly sender: MessageSender;
  readonly inbound: InboundTransport;
}

export function createTransport(config: WhatsAppConfig): Transport {
  // Alias konstan supaya penyempitan tipe mengikuti cabang provider.
  const provider = config.provider;
  switch (provider) {
    case FONNTE_PROVIDER:
      return { sender: createFonnteSender(config), inbound: createFonnteInboundTransport(config) };
    case CLOUD_API_PROVIDER:
      return { sender: createCloudApiSender(config), inbound: createCloudApiInboundTransport(config) };
    default:
      throw new Error(
        `Provider WhatsApp tidak dikenal: "${provider}". Pilihan yang didukung: ${SUPPORTED_PROVIDERS.join(", ")}`,
      );
  }
}
