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
 * Bidang Permintaan Tindak Lanjut yang dikumpulkan untuk admin (spec tiket
 * 02: layanan yang diminati dari menu Layanan MUTAWWIFMU, tanggal/periode
 * perjalanan, jumlah jemaah, kebutuhan detail, kisaran anggaran opsional).
 * Setiap nilai disimpan verbatim apa adanya dari calon jemaah — tidak ada
 * komponen generatif yang memparafrase data jemaah.
 */
export interface FollowUpRequest {
  /**
   * Layanan yang diminati dari menu Layanan MUTAWWIFMU (mutawwif, visa &
   * dokumen, hotel, transportasi, airport handling, ziarah/city tour, tasreh,
   * fotografi, lainnya). Jawaban bebas diterima tanpa dipaksa memilih menu dan
   * boleh menyebut lebih dari satu layanan.
   */
  readonly interestedServices: string;
  readonly travelDateOrPeriod: string;
  readonly travellerCount: string;
  /**
   * Kebutuhan detail yang boleh disampaikan sekaligus dalam satu jawaban
   * panjang (kebutuhan visa per jemaah, rute/asal keberangkatan, hotel pesan
   * sendiri atau lewat kami, catatan) — disimpan utuh tanpa dipotong.
   */
  readonly detailedNeeds: string;
  /** Kisaran anggaran bila diberikan; null bila calon jemaah melewatinya. */
  readonly budgetRange: string | null;
  /**
   * Pertanyaan non-harga yang dicatat apa adanya sebagai bagian kebutuhan
   * (ADR-0009, tiket 01): tidak dijawab dari materi, tetapi dibawa ke
   * Ringkasan Kebutuhan untuk admin.
   */
  readonly notedQuestions: readonly string[];
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
      /**
       * Jawaban Harga Indikatif yang diberikan langsung dari materi (tiket 05).
       * Sejak ADR-0009 (tiket 01) hanya topik harga yang dijawab dari materi;
       * pertanyaan non-harga dicatat pada Permintaan Tindak Lanjut.
       */
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
