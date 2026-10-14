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
 * sebagai `faq`, melainkan diteruskan ke admin (ADR-0009). Tiket 09 mengoreksi
 * false-negative-nya: varian ejaan nama layanan dinormalkan sebelum pencocokan
 * topik, dan kata harga berimbuhan "-nya" tetap diakui sebagai pertanyaan
 * Harga Indikatif. Tiket 10 menutup celah kecilnya: ketentuan asuransi dan
 * bentuk tanya sehari-hari tanpa tanda tanya ("... dapat ga", "... bisa")
 * terbaca sebagai `handoff`, bukan lolos menjadi `opener`. Tiket 11 menutup
 * celah pola korpus dasar: akhiran "-nya" pada kata benda ("tur kotanya",
 * "kendaraannya"), "nemenin" dalam konteks ibadah, "sedekah", "keliling",
 * dan singkatan "hrg".
 */
import {
  isPriceTopic,
  matchFaqTopic,
  normalkanAkhiranNya,
  normalkanVarianEjaan,
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
 *
 * Tiket 09: "tersedia" yang muncul sebagai syarat ("Jika tersedia, mohon ...")
 * bukan pertanyaan ketersediaan — kalimat lanjutannya justru sering menanyakan
 * cakupan atau tarif layanan yang ada materinya. Karena itu kata tersebut tidak
 * memicu handoff bila didahului penanda syarat.
 */
const QUOTE_OR_AVAILABILITY_REQUEST =
  /\b(penawaran|quote|quotation|promo|diskon|discount|harga (khusus|spesial|pasti|final|fixed|terbaik)|special (price|offer)|best (price|quote)|konfirmasi (harga|ketersediaan)|confirm (the )?(price|availability)|ketersediaan|ketersediaannya|(?<!\b(?:jika|kalau|kalo|bila|if|when)\s)(?:tersedia|available|availability)|kuota|slot|ready|masih (kosong|buka|berlaku)|still (valid|applicable))\b/i;

/**
 * Sisa pertanyaan harga/biaya yang tidak dapat dijawab dari daftar Harga
 * Indikatif — angkanya tidak tercantum materi (mis. paket umrah) atau
 * pertanyaannya lebih bersifat permintaan penawaran (mis. murah/mahal,
 * anggaran) — tetap diteruskan ke admin dengan alasan
 * `custom-quote-or-availability`. Singkatan `hrg` dari korpus dasar ikut
 * dikenali (tiket 11).
 */
const CUSTOM_QUOTE_OR_AVAILABILITY =
  /\b((harga|biaya|tarif|ongkos)(nya)?|hrg|price|priced|pricing|costs?|rates?|how much|budget|anggaran|murah|mahal|cheap|expensive|affordable)\b/i;

/**
 * Satuan harga yang tidak tercantum materi (mis. "per malam" pada daftar hotel
 * yang menyebut periode dengan satuan yang masih bertentangan). Bot tidak
 * menafsirkan satuan sendiri (spec, tiket 05) — pesan diteruskan ke admin.
 */
const UNVERIFIED_UNIT_REQUEST =
  /\b(per|\/)\s?(malam|night|hari|day|jam|hour|minggu|week|bulan|month|tahun|year)s?\b|\b(nightly|hourly|daily|weekly|monthly|yearly)\b/i;

/**
 * Rincian yang tidak tercantum dalam materi (syarat, ketentuan, durasi, masa
 * berlaku) sehingga tidak pasti dan tidak boleh dikarang. "ketentuan" masuk
 * tiket 10: ketentuan asuransi/pembayaran bukan fakta materi.
 */
const UNSUPPORTED_DETAIL =
  /\b(syarat|persyaratan|ketentuan(nya)?|requirements?|berapa lama|masa berlaku|validity|expired|kadaluarsa|harus (bawa|siapkan|urus|persiapkan)|perlu (bawa|siapkan)|what do i need|what documents|how long)\b/i;

/**
 * Tiket 09 — permintaan penerbitan/mengurus paspor (mis. "Apakah MUTAWWIFMU
 * bisa mengurus paspor?"). Penerbitan paspor bukan layanan yang tercantum
 * materi, jadi permintaannya diteruskan ke admin; pertanyaan *detail* dokumen
 * paspor (mis. "Paspor nya apakah halaman depan aja atau semuanya?") tetap
 * dikenali sebagai topik visa-documents.
 */
const PASSPORT_ARRANGEMENT_REQUEST =
  /\b(mengurus|diurus|urus|membuat|dibuat|buat(kan)?|dibuatkan|membikin|bikin|dibikin|menerbitkan|diterbitkan|terbitkan|arrange|arranges|issue|issuing)\s+(paspor|passports?)\b/i;

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
 * tertarik ke handoff. Tiket 11 menambahkan "perubahan harga/biaya/tarif/ongkos":
 * pertanyaan perubahan penawaran ("...perubahan harga tsb apakah memungkinkan?")
 * bukan permintaan Harga Indikatif, walau menyebut kata harga dan topik layanan.
 */
const PRICE_DELTA_REQUEST =
  /\b(upgrade|up grade|selisih|tambahan(nya)?|surcharge)\b|\bperubahan\s+(harga|biaya|tarif|ongkos)\b/i;

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
 * Tiket 11 menambahkan pertanyaan proses "bagaimana/gimana caranya": toleransi
 * akhiran "-nya" tidak boleh menariknya menjadi topik materi (fixture transkrip
 * "Mas, utk cek hotelnya itu nanti bagaimana caranya?").
 */
const POLICY_OR_PROCESS_REQUEST =
  /\b(approval(nya)?|approv(e|ed)|disetujui|di ?acc)\b|\b(abis|habis|setelah)\s+visa\s+(keluar|terbit|terbitkan|jadi|proses)\b|\b(masih|masi|bisa|boleh)\b[^?!.]{0,30}\b(ganti|ubah|tukar)\b[^?!.]{0,30}\b(hotel|kamar|akomodasi|maskapai|pesawat|tiket)\b|\b(bagaimana|gimana)\s+caranya\b/i;

/**
 * Kelompok 5 & 6 tiket 08 — topik tanpa padanan materi: kereta Haramain
 * (termasuk "HHR"), Raudhah, Nusuk, dan siskopatuh. "kereta gantung"
 * dikecualikan karena rinciannya justru tercantum pada materi city tour Thaif.
 * Tiket 09: varian ejaan (harramain, siskapatuh) dinormalkan lebih dahulu, jadi
 * pola ini cukup memuat bentuk baku.
 */
const UNSUPPORTED_TOPIC =
  /\b(siskopatuh)\b|\b(?:(?:al\s?)?haramain|hhr)\b|\bkereta(?!\s*gantung)\b/i;

/**
 * Varian Raudhah/Nusuk dipisah dari `UNSUPPORTED_TOPIC` (fitur
 * harga-fotografi-tasreh-cgk): pengurusan tasreh kini punya materi harga, jadi
 * pertanyaan **harga tasreh** yang kebetulan menyebut Raudhah/Nusuk diberi
 * pengecualian pada loop pemicu handoff. Pesan lain yang menyebut Raudhah atau
 * Nusuk tetap diteruskan ke admin seperti sebelumnya.
 */
const UNSUPPORTED_TOPIC_RAUDHAH =
  /\b(raudhah|raudah|rawdhah|raudhatul|rawda|nusuk)\b/i;

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
 * asuransi perjalanannya ga ya") dan ketentuan cakupannya (tiket 10, mis.
 * "insurance nya include ga?", "asuransi cover apa saja"). Pertanyaan angka
 * biayanya tetap dijawab sebagai Harga Indikatif; yang diteruskan adalah
 * konfirmasi ketersediaan dan ketentuan yang tidak tercantum materi.
 */
const INSURANCE_AVAILABILITY_REQUEST =
  /\b(ada|punya|tersedia|menyediakan|sediakan|provides?|have|includes?)\b[^?!.]{0,40}\b(asuransi|insurance)\b|\b(asuransi|insurance)\b[^?!.]{0,40}\b(ketentuan(nya)?|syarat|persyaratan|coverage|cover|manfaat(nya)?|benefit(nya)?|include|termasuk|sertakan)\b/i;

/**
 * Bentuk tanya sehari-hari tanpa tanda tanya (tiket 10), mis. "vaksin di
 * malaysia bisa", "perlengkapan umrohnya dapat ga", "insurance nya include ga".
 * Pesan seperti ini tidak boleh lolos menjadi pembuka percakapan: pertanyaannya
 * harus terbaca sebagai pertanyaan agar tercatat pada Ringkasan Kebutuhan.
 * Dipakai bersama `handleInbound` (lihat `isPertanyaan`) sebagai satu-satunya
 * sumber pola.
 */
export const BENTUK_TANYA_SEHARI_HARI =
  /\b(bisa|boleh|dapat|wajib|termasuk|include|ada|aman|bagus|bener|benar|ready)\b[^?!.]{0,40}\b(ga|gak|gk|ngga|nggak|engga|tidak|tdk|kan|kah)\b|(?<!\b(?:tidak|tdk|gak|gk|ga|nggak|ngga|engga|kagak|belum|sudah|udah|masih|tetap)\s)\b(bisa|boleh|dapat)\b[?!.]*\s*$/i;

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
  { trigger: "unsupported-question", pattern: PASSPORT_ARRANGEMENT_REQUEST },
  // Tiket 08: pertanyaan yang menyebut rincian, kebijakan, atau topik tanpa
  // materi tidak dicatat sebagai `faq`, melainkan diteruskan ke admin.
  { trigger: "unsupported-question", pattern: PARTNERSHIP_REQUEST },
  { trigger: "unsupported-question", pattern: UNSUPPORTED_TOPIC },
  { trigger: "unsupported-question", pattern: UNSUPPORTED_TOPIC_RAUDHAH },
  { trigger: "unsupported-question", pattern: TIMING_OR_DEADLINE_REQUEST },
  { trigger: "unsupported-question", pattern: POLICY_OR_PROCESS_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: PRICE_DELTA_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: SPECIFIC_QUOTE_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: INCLUDE_REQUEST },
  { trigger: "custom-quote-or-availability", pattern: INSURANCE_AVAILABILITY_REQUEST },
];

/**
 * Cocokkan topik materi beserta toleransi akhiran "-nya" pada kata benda
 * (tiket 11: "tur kotanya", "kendaraannya"). Toleransi hanya diberlakukan
 * untuk pesan yang memuat penanda pertanyaan eksplisit (`QUESTION_LIKE`),
 * bukan `BENTUK_TANYA_SEHARI_HARI`: penanda terakhir menganggap kalimat yang
 * berakhir "... bisa/boleh/dapat" sebagai pertanyaan, sehingga pernyataan
 * bermuatan harga ("harga mutawwifnya boleh") akan salah terjawab sebagai
 * Harga Indikatif. Pencocokan langsung tetap berlaku untuk semua pesan.
 */
function cocokkanTopik(pesan: string): FaqTopic | null {
  const langsung = matchFaqTopic(pesan);
  if (langsung !== null) {
    return langsung;
  }
  if (!QUESTION_LIKE.test(pesan)) {
    return null;
  }
  return matchFaqTopic(normalkanAkhiranNya(pesan));
}

/**
 * Klasifikasikan pesan Calon Jemaah ke jalur percakapan yang sesuai.
 * Pesan non-pertanyaan yang tidak dikenal diperlakukan sebagai pembuka
 * percakapan agar balasan awal tetap hangat.
 */
export function classifyInbound(text: string): InboundRouting {
  // Tiket 09: satu pandangan pesan yang sudah dinormalkan varian ejaannya,
  // dipakai untuk seluruh pencocokan (pemicu handoff maupun topik materi).
  const pesan = normalkanVarianEjaan(text);
  for (const { trigger, pattern } of HANDOFF_PATTERNS) {
    if (!pattern.test(pesan)) continue;
    // Pengecualian harga tasreh (spec harga-fotografi-tasreh-cgk): pesan yang
    // terbaca sebagai pertanyaan harga tasreh melewati pola Raudhah/Nusuk agar
    // dijawab Harga Indikatif. Topik lain tetap lolos bila pesan juga menyebut
    // siskopatuh atau kereta Haramain (pola terpisah, tetap handoff).
    if (pattern === UNSUPPORTED_TOPIC_RAUDHAH && matchFaqTopic(pesan) === "price-tasreh") {
      continue;
    }
    return { kind: "handoff", trigger };
  }
  // Permintaan penawaran/konfirmasi menyelap Harga Indikatif apa pun isinya.
  if (QUOTE_OR_AVAILABILITY_REQUEST.test(pesan)) {
    return { kind: "handoff", trigger: "custom-quote-or-availability" };
  }
  const topic = cocokkanTopik(pesan);
  // Harga Indikatif hanya untuk angka yang tercantum materi dengan satuan yang
  // tercantum materi; selain itu tetap ke admin (ADR-0005).
  if (topic !== null && isPriceTopic(topic) && !UNVERIFIED_UNIT_REQUEST.test(pesan)) {
    return { kind: "indicative-price", topic };
  }
  if (CUSTOM_QUOTE_OR_AVAILABILITY.test(pesan)) {
    return { kind: "handoff", trigger: "custom-quote-or-availability" };
  }
  if (topic !== null) {
    return { kind: "faq", topic };
  }
  if (!PLEASANTRY.test(pesan) && (QUESTION_LIKE.test(pesan) || BENTUK_TANYA_SEHARI_HARI.test(pesan))) {
    return { kind: "handoff", trigger: "unsupported-question" };
  }
  return { kind: "opener" };
}
