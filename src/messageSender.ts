/**
 * Port pengiriman pesan keluar. Provider-agnostic: implementasi konkret
 * (mis. WhatsApp Cloud API) berada di src/adapters/.
 */
export interface MessageSender {
  /** Kirim pesan teks ke nomor tujuan (E.164 tanpa tanda '+'). */
  sendText(to: string, text: string): Promise<void>;
}
