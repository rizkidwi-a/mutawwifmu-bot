/**
 * Klasifikasi pesan masuk Calon Jemaah untuk routing percakapan (tiket 03).
 *
 * Hasil klasifikasi hanya menentukan jalur percakapan:
 * - `faq` — pertanyaan yang didukung materi, dijawab langsung;
 * - `handoff` — kasus yang harus diteruskan ke admin melalui alur handoff
 *   (tiket 02: pengumpulan Permintaan Tindak Lanjut + persetujuan); pemicunya
 *   mencakup pertanyaan harga/ketersediaan yang memerlukan konfirmasi,
 *   kasus booking/pembayaran, permintaan manusia, segmen agen/korporasi,
 *   perjalanan aktif/keadaan darurat, serta pertanyaan yang tidak didukung
 *   materi atau tidak pasti;
 * - `opener` — sapaan atau pembuka percakapan tanpa pertanyaan substantif.
 *
 * Alur handoff sendiri (persetujuan, penerusan, kanal admin) dimiliki tiket 02;
 * modul ini tidak meneruskan informasi apa pun. Nilai `trigger` sengaja sama
 * dengan `HandOffReason` pada types.ts agar dapat langsung dipakai sebagai
 * alasan pada tindakan `hand-off-to-admin`.
 */
import { matchFaqTopic, type FaqTopic } from "../knowledge/businessFaq.ts";

/** Alasan sebuah pesan perlu diteruskan ke admin. */
export type HandoffTrigger =
  | "human-request"
  | "agency-or-corporate"
  | "active-trip"
  | "emergency"
  | "booking-or-payment"
  | "custom-quote-or-availability"
  | "unsupported-question";

/** Hasil klasifikasi pesan masuk. */
export type InboundRouting =
  | { readonly kind: "faq"; readonly topic: FaqTopic }
  | { readonly kind: "handoff"; readonly trigger: HandoffTrigger }
  | { readonly kind: "opener" };

/**
 * Permintaan berbicara dengan manusia atau laporan masalah yang membutuhkan
 * bantuan langsung.
 */
const HUMAN_REQUEST =
  /\b((talk|speak|chat)\s+(to|with)\s+(a\s+)?(human|agent|person|someone|staff|manager|admin|cs)|(bicara|ngobrol|ngomong|chat|kontak|hubungi|telepon|sambungkan|sambung|hubungkan)\s+(saya\s+|kami\s+)?(dengan|ke|kepada|to)?\s*(manusia|orang|admin|cs|customer service|human|agent|person|staff|tim|team)|(masalah|keluhan|komplain|complain|problem|rusak|hilang|kecewa))\b/i;

/** Pertanyaan dari segmen agen travel, korporasi, atau institusi. */
const AGENCY_OR_CORPORATE =
  /\b(agen travel|travel agent|agent travel|korporasi|corporate|institusi|institution|perusahaan|kantor|reseller|b2b|company trip|study tour|agency)\b/i;

/** Kasus di luar cakupan pra-pemesanan: perjalanan yang sedang berlangsung. */
const ACTIVE_TRIP =
  /\b((sedang|lagi|tengah|currently)\s+(berada\s+)?(di|dalam)\s+(mekkah|makkah|madinah|jeddah|tanah suci|arab|saudi|bandara|hotel|perjalanan|penerbangan)\b|(i am|i'm|we are)\s+(currently\s+)?(in|on|at|traveling)\b|(hotel|kamar|visa|dokumen|pesanan|booking|order|penerbangan|flight|tiket|pesawat|bagasi|pembayaran)\s+saya)\b/i;

/** Keadaan darurat yang harus ditangani manusia. */
const EMERGENCY = /\b(darurat|emergency|urgent|kecelakaan|musibah)\b/i;

/** Kasus booking, pembayaran, atau perubahan transaksi. */
const BOOKING_OR_PAYMENT =
  /\b(booking|book|memesan|pesan|pemesanan|order|membooking|bayar|membayar|pembayaran|payment|pay|dp|down payment|invoice|transfer (dana|uang|bank)|refund|pembatalan|cancel|reschedule|ubah (jadwal|tanggal)|ganti (jadwal|tanggal))\b/i;

/**
 * Pertanyaan harga atau ketersediaan yang memerlukan konfirmasi admin — tidak
 * boleh dijawab sebagai penawaran final (spec: Harga Indikatif, tiket 05).
 */
const CUSTOM_QUOTE_OR_AVAILABILITY =
  /\b(harga|biaya|tarif|ongkos|price|cost|rate|how much|quote|quotation|penawaran|promo|diskon|discount|budget|anggaran|murah|mahal|cheap|expensive|ketersediaan|tersedia|available|availability|kuota|slot|ready|masih (kosong|buka))\b/i;

/**
 * Rincian yang tidak tercantum dalam materi (syarat, durasi, masa berlaku)
 * sehingga tidak pasti dan tidak boleh dikarang.
 */
const UNSUPPORTED_DETAIL =
  /\b(syarat|persyaratan|requirements?|berapa lama|masa berlaku|validity|expired|kadaluarsa|harus (bawa|siapkan|urus|persiapkan)|perlu (bawa|siapkan)|what do i need|what documents|how long)\b/i;

/** Basa-basi/sapaan tanpa pertanyaan substantif — tetap dibalas pembuka yang hangat. */
const PLEASANTRY = /apa kabar|how are you|gimana kabar|kabar (baik|saja)|what'?s up/i;

/** Pertanyaan eksplisit yang tidak cocok dengan topik mana pun. */
const QUESTION_LIKE =
  /\?|\b(apa(kah)?|bagaimana|gimana|kenapa|mengapa|kapan|dimana|di mana|siapa|berapa|bisakah|bolehkah|adakah|do|does|did|is|are|was|were|can|could|should|what|how|when|where|why|who|which)\b/i;

interface HandoffPattern {
  readonly trigger: HandoffTrigger;
  readonly pattern: RegExp;
}

/** Pola pemicu handoff; urutan menentukan alasan yang dilaporkan bila tumpang tindih. */
const HANDOFF_PATTERNS: readonly HandoffPattern[] = [
  { trigger: "emergency", pattern: EMERGENCY },
  { trigger: "active-trip", pattern: ACTIVE_TRIP },
  { trigger: "human-request", pattern: HUMAN_REQUEST },
  { trigger: "agency-or-corporate", pattern: AGENCY_OR_CORPORATE },
  { trigger: "booking-or-payment", pattern: BOOKING_OR_PAYMENT },
  { trigger: "custom-quote-or-availability", pattern: CUSTOM_QUOTE_OR_AVAILABILITY },
  { trigger: "unsupported-question", pattern: UNSUPPORTED_DETAIL },
];

/**
 * Klasifikasikan pesan Calon Jemaah ke jalur percakapan yang sesuai.
 * Pesan non-pertanyaan yang tidak dikenal diperlakukan sebagai pembuka
 * percakapan agar balasan awal tetap hangat.
 */
export function classifyInbound(text: string): InboundRouting {
  for (const { trigger, pattern } of HANDOFF_PATTERNS) {
    if (pattern.test(text)) {
      return { kind: "handoff", trigger };
    }
  }
  const topic = matchFaqTopic(text);
  if (topic !== null) {
    return { kind: "faq", topic };
  }
  if (!PLEASANTRY.test(text) && QUESTION_LIKE.test(text)) {
    return { kind: "handoff", trigger: "unsupported-question" };
  }
  return { kind: "opener" };
}
