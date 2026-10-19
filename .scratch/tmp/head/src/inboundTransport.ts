/**
 * Port penerimaan pesan masuk. Provider-agnostic: server hanya mengurus HTTP,
 * sedangkan autentikasi webhook dan konversi payload provider ke InboundMessage
 * berada di implementasi konkret di src/adapters/.
 */

import type { InboundMessage } from "./conversation/types.ts";

/** Permintaan HTTP yang relevan bagi adapter webhook. */
export interface InboundRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  /** Badan mentah permintaan; adapter tertentu butuh bytes asli untuk tanda tangan. */
  readonly rawBody: Buffer;
}

/** Hasil pembacaan pesan masuk: daftar pesan, atau penolakan beserta alasannya. */
export type InboundReadResult =
  | { readonly ok: true; readonly messages: readonly InboundMessage[] }
  | { readonly ok: false; readonly status: number; readonly reason: string };

export interface InboundTransport {
  /**
   * Hasil handshake langganan webhook, atau null bila provider tidak memakai
   * handshake (server lalu memperlakukan permintaan sebagai tidak ditemukan).
   */
  handleSubscription(url: URL): { readonly status: number; readonly body: string } | null;

  /** Baca dan autentikasi permintaan webhook, lalu konversi ke pesan masuk. */
  readInbound(request: InboundRequest): Promise<InboundReadResult>;
}
