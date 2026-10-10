/**
 * Klasifikasi pesan masuk Calon Jemaah untuk routing percakapan (tiket 03,
 * disempit oleh tiket 05 sesuai ADR-0005, disempit lagi oleh tiket 08).
 *
 * Hasil klasifikasi hanya menentukan jalur percakapan (sejak ADR-0009/tiket
 * 01, lihat perubahan pada `handleInbound`):
 * - `faq` — pertanyaan non-harga yang didukung materi; TIDAK lagi dijawab dari
 *   corpus, melainkan dicatat apa adanya sebagai bagian kebutuhan dan
 *   diteruskan ke admin bersama Ringkasan Kebutuhan;
 * - `indicative-price` (tiket 05) — pertanyaan angka harga yang tercantum
 *   materi, dijawab sebagai Harga Indikatif dengan peringatan satuan/periode
 *   yang belum terverifikasi;
 * - `handoff` — kasus yang harus diteruskan ke admin melalui alur handoff
 *   (tiket 02: pengumpulan Permintaan Tindak Lanjut + persetujuan); pemicunya
 *   mencakup permintaan penawaran khusus atau konfirmasi harga/ketersediaan,
 *   pertanyaan harga yang angkanya tidak tercantum materi atau satuannya tidak
 *   tercantum, kasus booking/pembayaran, permintaan manusia, segmen agen/
 *   korporasi, perjalanan aktif/keadaan darurat, serta pertanyaan yang tidak
 *   didukung materi atau tidak pasti;
 * - `opener` — sapaan atau pembuka percakapan tanpa pertanyaan substantif.
 *
 * Alur handoff sendiri (persetujuan, penerusan, kanal admin) dimiliki tiket 02;
 * modul ini tidak meneruskan informasi apa pun. Nilai `trigger` sengaja sama
 * dengan `HandOffReason` pada types.ts agar dapat langsung dipakai sebagai
 * alasan pada tindakan `hand-off-to-admin`.
 *
 * Hubungan dengan ADR-0004 (dinyatakan eksplisit, tidak diubah diam-diam):
 * ADR-0004 mengasumsikan tiket 05 "menambah atau mengubah entri pada modul
 * pengetahuan yang sama tanpa menyentuh logika klasifikasi". Tiket 05 justru
 * menyempitkan pola harga/ketersediaan di modul ini agar angka yang tercantum
 * materi dapat disebut sebagai Harga Indikatif — lihat ADR-0005. Tiket 08
 * menyempitkan lagi pola topik layanan yang terlalu longgar: pertanyaan yang
 * menyebut rincian, kebijakan, atau topik tanpa materi tidak lagi dicatat
 * sebagai `faq`, melainkan diteruskan ke admin (ADR-0009).
 */
import {
  isPriceTopic,
  matchFaqTopic,
  type FaqTopic,
} from "../knowledge/businessFaq.ts";

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
  | { readonly kind: "indicative-price"; readonly topic: FaqTopic }
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
 * Permintaan penawaran khusus atau konfirmasi harga/ketersediaan (spec, tiket
 * 05): kasus ini tidak boleh dijawab sebagai Harga Indikatif karena hanya tim
 * yang berwenang memberikan konfirmasi akhir. Pola ini disempitkan oleh tiket
 * 05 — kata harga umum tidak lagi berada di sini; pertanyaan angka harga yang
 * tercantum materi dijawab lebih dahulu sebagai Harga Indikatif.
 */
const QUOTE_OR_AVAILABILITY_REQUEST =
  /\b(penawaran|quote|quotation|promo|diskon|discount|harga (khusus|spesial|pasti|final|fixed|terbaik)|special (price|offer)|best (price|quote)|konfirmasi (harga|ketersediaan)|confirm (the )?(price|availability)|ketersediaan|ketersediaannya|tersedia|available|availability|kuota|slot|ready|masih (kosong|buka|berlaku)|still (valid|applicable))\b/i;

/**
 * Sisa pertanyaan harga/biaya yang tidak dapat dijawab dari daftar Harga
 * Indikatif — angkanya tidak tercantum materi (mis. paket umrah) atau
 * pertanyaannya lebih bersifat permintaan penawaran (mis. murah/mahal,
 * anggaran) — tetap diteruskan ke admin dengan alasan
 * `custom-quote-or-availability`.
 */
const CUSTOM_QUOTE_OR_AVAILABILITY =
  /\b(harga|biaya|tarif|ongkos|price|priced|pricing|costs?|rates?|how much|budget|anggaran|murah|mahal|cheap|expensive|affordable)\b/i;

/**
 * Satuan harga yang tidak tercantum materi (mis. "per malam" pada daftar hotel
 * yang menyebut periode dengan satuan yang masih bertentangan). Bot tidak
 * menafsirkan satuan sendiri (spec, tiket 05) — pesan diteruskan ke admin.
 */
const UNVERIFIED_UNIT_REQUEST =
  /\b(per|\/)\s?(malam|night|hari|day|jam|hour|minggu|week|bulan|month|tahun|year)s?\b|\b(nightly|hourly|daily|weekly|monthly|yearly)\b/i;

/**
 * Rincian yang tidak tercantum dalam materi (syarat, durasi, masa berlaku)
 * sehingga tidak pasti dan tidak boleh dikarang.
 */
const UNSUPPORTED_DETAIL =
  /\b(syarat|persyaratan|requirements?|berapa lama|masa berlaku|validity|expired|kadaluarsa|harus (bawa|siapkan|urus|persiapkan)|perlu (bawa|siapkan)|what do i need|what documents|how long)\b/i;

/**
 * Kelompok 1 tiket 08 — permintaan mencarikan/mengecek harga spesifik dengan
 * barang, hotel, atau tanggal yang disebut (mis. "tolong di check ... untuk
 * harganya: 13-20 Januari - Jumeirah Jabal Omar"). Angka akhirnya harus
 * dicari admin, bukan dijawab dari daftar Harga Indikatif.
 */
const SPECIFIC_QUOTE_REQUEST =
  /\b(tolong|tlg|mohon|minta|boleh)\b[^?!.]{0,80}\b(carikan|dicarikan|dicari|cek|dicek|check|hitungkan|dihitung|hitung)\b/i;

/**
 * Kelompok 2 tiket 08 — selisih/upgrade harga. Angka delta (mis. "upgrade ke
 * staria, tambahannya brp?") tidak tercantum materi sehingga tetap ke admin
 * (ADR-0005). Sengaja hanya "tambahan"/"tambahan(nya)", bukan "tambah", agar
 * permintaan menambahkan layanan yang punya materi (mis. mutawwif) tidak ikut
 * tertarik ke handoff.
 */
const PRICE_DELTA_REQUEST = /\b(upgrade|up grade|selisih|tambahan(nya)?|surcharge)\b/i;

/**
 * Kelompok 3 tiket 08 — timing dan ketersediaan dokumen/keberangkatan yang
 * tidak tercantum materi (mis. "visa nya gpp h-1 bulan? apakah kekejar?",
 * "berapa bulan sebelum berangkat harus submit utk visa?").
 */
const TIMING_OR_DEADLINE_REQUEST =
  /\b(h\s?-?\s?\d|berapa (bulan|minggu|hari|jam)|kekejar|sebelum (berangkat|keberangkatan)|lead ?time)\b/i;

/**
 * Kelompok 4 tiket 08 — permintaan menambahkan layanan ke penawaran (mis.
 * "apakah bisa include dibantu di airportnya untuk bagasi, air zam-zam, dll?").
 * Permintaan seperti ini adalah perubahan penawaran, bukan pertanyaan materi.
 */
const INCLUDE_REQUEST =
  /\b(apakah|bisakah|bisa|boleh|dapat|can|could)\b[^?!.]{0,50}\binclud(e|kan)\b|\binclud(e|kan)\b[^?!.]{0,40}\b(dibantu|bantuan|dll|dan lain-lain)\b/i;

/**
 * Kelompok 5 tiket 08 — kebijakan/proses yang tidak tercantum materi: approval
 * hotel untuk visa, penggantian hotel setelah visa keluar, atau topik Raudhah &
 * Nusuk. Pola penggantian hotel sengaja menuntut bentuk pertanyaan ("masi bisa
 * ganti hotel") agar pernyataan perubahan hotel biasa tidak ikut ke handoff.
 */
const POLICY_OR_PROCESS_REQUEST =
  /\b(approval(nya)?|approv(e|ed)|disetujui|di ?acc)\b|\b(abis|habis|setelah)\s+visa\s+(keluar|terbit|terbitkan|jadi|proses)\b|\b(masih|masi|bisa|boleh)\b[^?!.]{0,30}\b(ganti|ubah|tukar)\b[^?!.]{0,30}\b(hotel|kamar|akomodasi|maskapai|pesawat|tiket)\b/i;

/**
 * Kelompok 5 & 6 tiket 08 — topik tanpa padanan materi: kereta Haramain
 * (termasuk "HHR"), Raudhah, dan Nusuk. "kereta gantung" dikecualikan karena
 * rinciannya justru tercantum pada materi city tour Thaif.
 */
const UNSUPPORTED_TOPIC =
  /\b(raudhah|raudah|rawdhah|raudhatul|rawda|nusuk)\b|\b(?:(?:al\s?)?haramain|harramain|hhr)\b|\bkereta(?!\s*gantung)\b/i;

/**
 * Kelompok 6 tiket 08 — kerjasama/kolaborasi pihak ketiga (mis. "ada kerjasama
 * dengan jago syariah ya?"). Bukan kebutuhan calon jemaah, jadi ditangani tim.
 * Sengaja tidak menangkap kata "influencer" saja agar pesan negosiasi harga
 * yang kebetulan menyebut influencer tidak berpindah alasan handoff.
 */
const PARTNERSHIP_REQUEST =
  /\b(kerja ?sama|kolaborasi|berkolaborasi|collaborat(e|ion|ing)|partnership)\b/i;

/**
 * Kelompok 6 tiket 08 — ketersediaan/keberadaan asuransi perjalanan (mis. "ada
 * asuransi perjalanannya ga ya?"). Pertanyaan angka biayanya tetap dijawab
 * sebagai Harga Indikatif; yang diteruskan adalah konfirmasi ketersediaannya.
 */
const INSURANCE_AVAILABILITY_REQUEST =
  /\b(ada|punya|tersedia|menyediakan|sediakan|provides?|have|includes?)\b[^?!.]{0,40}\b(asuransi|insurance)\b/i;

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
  { trigger: "unsupported-question", pattern: UNSUPPORTED_DETAIL },
  // Tiket 08: pertanyaan yang menyebut rincian, kebijakan, atau topik tanpa
  // materi tidak dicatat sebagai `faq`, melainkan diteruskan ke admin.
  { trigger: "unsupported-question", pattern: PARTNERSHIP_REQUEST },
  { trigger: "unsupported-question", pattern: UNSUPPORTED_TOPIC },
  { trigger: "unsupported-question", pattern: TIMING_OR_DEADLINE_REQUEST },
  { trigger: "unsupported-question", pattern: POLICY_OR_PROCESS_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: PRICE_DELTA_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: SPECIFIC_QUOTE_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: INCLUDE_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: INSURANCE_AVAILABILITY_REQUEST },
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
  // Permintaan penawaran/konfirmasi menyelap Harga Indikatif apa pun isinya.
  if (QUOTE_OR_AVAILABILITY_REQUEST.test(text)) {
    return { kind: "handoff", trigger: "custom-quote-or-availability" };
  }
  const topic = matchFaqTopic(text);
  // Harga Indikatif hanya untuk angka yang tercantum materi dengan satuan yang
  // tercantum materi; selain itu tetap ke admin (ADR-0005).
  if (topic !== null && isPriceTopic(topic) && !UNVERIFIED_UNIT_REQUEST.test(text)) {
    return { kind: "indicative-price", topic };
  }
  if (CUSTOM_QUOTE_OR_AVAILABILITY.test(text)) {
    return { kind: "handoff", trigger: "custom-quote-or-availability" };
  }
  if (topic !== null) {
    return { kind: "faq", topic };
  }
  if (!PLEASANTRY.test(text) && QUESTION_LIKE.test(text)) {
    return { kind: "handoff", trigger: "unsupported-question" };
  }
  return { kind: "opener" };
}
