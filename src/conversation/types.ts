/**
 * Tipe pada seam percakapan yang disepakati (lihat spec "Testing Decisions"):
 * batas pemrosesan pesan masuk yang menerima pesan beserta konteks percakapan,
 * lalu menghasilkan balasan serta tindakan yang terlihat. Seam ini
 * provider-agnostic — tidak ada tipe transport WhatsApp di sini.
 */

/** Pesan masuk dari Calon Jemaah, sudah dinormalisasi dari kanal provider. */
export interface InboundMessage {
  readonly id: string;
  /** Nomor pengirim dalam format E.164 tanpa tanda '+', mis. "628123456789". */
  readonly from: string;
  readonly timestamp: string;
  /** Isi pesan teks; null untuk tipe pesan yang belum didukung. */
  readonly text: string | null;
}

/** Satu giliran percakapan untuk konteks. */
export interface ConversationTurn {
  readonly role: "calon-jemaah" | "asisten";
  readonly text: string;
}

/** Konteks percakapan yang dibawa ke seam. */
export interface ConversationContext {
  readonly history: readonly ConversationTurn[];
}

/** Balasan yang terlihat oleh Calon Jemaah. */
export interface Reply {
  readonly text: string;
}

/**
 * Tindakan terlihat yang dihasilkan seam — sesuai spec: "mencatat permintaan
 * atau meneruskan percakapan". Varian baru hanya ditambahkan saat tiket yang
 * membutuhkannya dikerjakan.
 */
export type ConversationAction =
  | { readonly kind: "record-follow-up-request" }
  | { readonly kind: "hand-off-to-admin" };

/** Hasil satu pemrosesan pesan masuk pada seam percakapan. */
export interface BotTurn {
  /** Balasan untuk Calon Jemaah; null bila pesan tidak perlu dibalas (mis. bukan teks). */
  readonly reply: Reply | null;
  readonly actions: readonly ConversationAction[];
}
