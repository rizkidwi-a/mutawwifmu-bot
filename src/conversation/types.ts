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
 * Bidang Permintaan Tindak Lanjut yang dikumpulkan untuk admin (spec:
 * layanan/tujuan, tanggal/periode, jumlah jemaah, kebutuhan utama, anggaran
 * opsional). Nilai disimpan apa adanya dari calon jemaah.
 */
export interface FollowUpRequest {
  readonly serviceOrDestination: string;
  readonly travelDateOrPeriod: string;
  readonly travellerCount: string;
  readonly mainNeeds: string;
  /** Kisaran anggaran bila diberikan; null bila calon jemaah melewatinya. */
  readonly budgetRange: string | null;
}

/** Alasan percakapan diteruskan kepada admin (spec: kasus yang diteruskan ke admin). */
export type HandOffReason =
  | "follow-up-request"
  | "human-request"
  | "unsupported-question"
  | "custom-quote-or-availability"
  | "agency-or-corporate"
  | "booking-or-payment"
  | "active-trip"
  | "emergency";

/**
 * Tindakan terlihat yang dihasilkan seam — sesuai spec: "mencatat permintaan
 * atau meneruskan percakapan". Varian baru hanya ditambahkan saat tiket yang
 * membutuhkannya dikerjakan.
 */
export type ConversationAction =
  | { readonly kind: "record-follow-up-request"; readonly request: FollowUpRequest }
  | {
      /** Jawaban FAQ/Harga Indikatif yang diberikan langsung dari materi (tiket 03, tiket 05). */
      readonly kind: "record-faq-answer";
      /**
       * Topik materi yang dijawab. Disengaja `string` agar tipe seam tidak
       * bergantung pada modul knowledge; nilainya berasal dari `FaqTopic`
       * (termasuk topik Harga Indikatif `price-*`, tiket 05).
       */
      readonly topic: string;
    }
  | {
      readonly kind: "hand-off-to-admin";
      readonly reason: HandOffReason;
      /** Permintaan Tindak Lanjut bila ada; selain itu null. */
      readonly request: FollowUpRequest | null;
      /** Konteks percakapan yang diteruskan bersama handoff. */
      readonly history: readonly ConversationTurn[];
    };

/** Hasil satu pemrosesan pesan masuk pada seam percakapan. */
export interface BotTurn {
  /** Balasan untuk Calon Jemaah; null bila pesan tidak perlu dibalas (mis. bukan teks). */
  readonly reply: Reply | null;
  readonly actions: readonly ConversationAction[];
}
