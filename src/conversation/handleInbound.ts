import {
  BENTUK_TANYA_SEHARI_HARI,
  classifyInbound,
  type HandoffTrigger,
  type InboundRouting,
} from "./classifyInbound.ts";
import { resolveReplyLanguage, type Language } from "./language.ts";
import {
  deteksiPenyela,
  URUTAN_BIDANG,
  type BidangKebutuhan,
} from "./penyelaPengumpulan.ts";
import { jawabanFaq, memuatKataHarga } from "../knowledge/businessFaq.ts";
import type {
  BotTurn,
  ConversationContext,
  ConversationTurn,
  FollowUpRequest,
  HandOffReason,
  InboundMessage,
} from "./types.ts";

const INITIAL_REPLY_ID =
  "Halo! Terima kasih sudah menghubungi MUTAWWIFMU. " +
  "Saya asisten otomatis yang tersedia kapan saja untuk mencatat kebutuhan perjalanan Anda " +
  "agar dapat ditindaklanjuti tim kami.";

const INITIAL_REPLY_EN =
  "Hello! Thank you for contacting MUTAWWIFMU. " +
  "I'm an automated assistant available anytime to note down your travel needs " +
  "so that our team can follow them up.";

const SERVICE_INTRO =
  "Terima kasih telah menghubungi Mutawwifmu, Travel Partner Top #1 Personalized Land Arrangement dan Premium Umrah Experience terpercaya untuk perjalanan ibadah dan wisata muslim di seluruh dunia 😇";

// Port MessageSender saat ini hanya mendukung pesan teks; gunakan fallback
// bernomor agar tujuan chat tetap dapat dipilih.
const MENU_TUJUAN_CHAT_ID =
  "Silakan pilih tujuan chat dengan membalas angka:\n" +
  "1. Calon jemaah / informasi paket\n" +
  "2. Vendor / mitra bisnis\n" +
  "3. Tim internal Mutawwifmu\n" +
  "4. Keperluan lain / ingin menghubungi admin";
const MENU_TUJUAN_CHAT_EN =
  "Please choose your reason for contacting us by replying with a number:\n" +
  "1. Prospective pilgrim / package information\n" +
  "2. Vendor / business partner\n" +
  "3. Mutawwifmu internal team\n" +
  "4. Other / contact an admin";

/**
 * Balasan atas pertanyaan non-harga: pertanyaan tidak dijawab dari materi
 * (ADR-0009), melainkan dicatat apa adanya sebagai bagian kebutuhan dan
 * diteruskan ke admin bersama Ringkasan Kebutuhan.
 */
const CATAT_PERTANYAAN_ID =
  "Terima kasih, pertanyaan Anda saya catat dan akan saya sertakan dalam " +
  "Permintaan Tindak Lanjut untuk tim kami.";
const CATAT_PERTANYAAN_EN =
  "Thank you, I've noted your question and will include it in the " +
  "follow-up request for our team.";

/**
 * Jawaban pertanyaan harga yang angkanya tidak tercantum materi
 * (`.scratch/harga-di-semua-fase`): angka tidak boleh dikarang, tetapi
 * pertanyaannya tetap dijawab — penawaran khusus serta konfirmasi harga dan
 * ketersediaan ditangani tim. Sengaja tidak memuat "Harga Indikatif", angka,
 * klaim harga final, maupun janji ketersediaan/waktu balasan (invarian tes
 * `indicativePricing` dan `topikGapHandoff`).
 */
const HARGA_KE_TIM_ID =
  "Materi kami belum memuat kepastian harga atau ketersediaan untuk pertanyaan Anda. " +
  "Penawaran khusus serta konfirmasi harga dan ketersediaan perlu ditangani tim " +
  "customer service/penjualan MUTAWWIFMU.";
const HARGA_KE_TIM_EN =
  "Our materials do not yet include a confirmed price or availability for your question. " +
  "Special quotes and price/availability confirmations need to be handled by the " +
  "MUTAWWIFMU customer service/sales team.";

/**
 * Balasan atas pertanyaan menyela berkata kunci (mis. "ingin bertanya",
 * "ada yang ingin ditanyakan"): pertanyaan disimpan di Bagian Pertanyaan dan
 * dikonfirmasi admin bersama Ringkasan Kebutuhan, bukan menjadi jawaban bidang
 * (spesifikasi `.scratch/penyela-pengumpulan`, tiket 01).
 */
const PERTANYAAN_MENYELA_ID =
  "Baik, akan saya simpan di bagian pertanyaan dan nanti dikonfirmasi admin.";
const PERTANYAAN_MENYELA_EN =
  "Alright, I'll save this in the questions section and the admin will confirm it later.";

/** Permintaan isi pertanyaan setelah kata kunci pertanyaan polos (tiket 01). */
const MINTA_PERTANYAAN_ID = "Baik, silakan sampaikan pertanyaannya.";
const MINTA_PERTANYAAN_EN = "Sure, please go ahead and ask your question.";

/**
 * Penanda pesan yang berupa pertanyaan, bukan jawaban bidang. Dipakai agar
 * pertanyaan yang menyela pengumpulan (mis. "mau tanya harga fotografer")
 * tidak dikonsumsi sebagai jawaban bidang, melainkan dijawab (Harga Indikatif)
 * atau dicatat apa adanya dan dibawa ke admin (tiket 06), sementara jawaban
 * bidang yang kebetulan memuat kata harga tetap tercatat apa adanya.
 */
const PERTANYAAN =
  /\?|\b(apa(kah)?|bagaimana|gimana|kenapa|mengapa|kapan|dimana|di mana|siapa|berapa|bisakah|bolehkah|adakah|do|does|did|is|are|was|were|can|could|should|what|how|when|where|why|who|which|tany(a|akan)|bertanya|info(rmasi|kan)?|mau tahu|ingin tahu|cek|check)\b/i;

/**
 * Apakah pesan berupa pertanyaan (lihat `PERTANYAAN` dan bentuk tanya
 * sehari-hari tanpa tanda tanya pada `classifyInbound`).
 */
function isPertanyaan(text: string): boolean {
  return PERTANYAAN.test(text) || BENTUK_TANYA_SEHARI_HARI.test(text);
}

/**
 * Pertanyaan yang dicatat apa adanya dan dibawa ke admin (tiket 06): pesan
 * bertanda pertanyaan yang bukan pembuka polos — berapa pun routing-nya
 * (`faq` maupun `handoff`) — tidak pernah menjadi jawaban bidang atau
 * perubahan kebutuhan.
 */
function isPertanyaanTercatat(text: string, routing: InboundRouting): boolean {
  return isPertanyaan(text) && routing.kind !== "opener";
}

/**
 * Pertanyaan harga yang harus dijawab bot di semua fase percakapan
 * (`.scratch/harga-di-semua-fase`): bertanda pertanyaan, memuat kata penanda
 * harga (`memuatKataHarga`, mis. "kisaran harga ...", "biaya ...",
 * "pricelist") atau ber-routing `indicative-price`. Pemicu mendesak dan
 * booking/pembayaran dikecualikan agar prioritas "pemicu mendesak > pertanyaan
 * harga" (ADR-0014) tidak berubah. Pertanyaan meta ("Apa maksudnya dari
 * kisaran anggaran?") dan parafrase tanpa kata penanda harga tetap ke jalur
 * catat-pertanyaan — batas pola yang disengaja (ADR-0005).
 */
function isPertanyaanHarga(text: string, routing: InboundRouting): boolean {
  if (!isPertanyaan(text)) return false;
  if (
    routing.kind === "handoff" &&
    (URGENT_TRIGGERS.has(routing.trigger) || routing.trigger === "booking-or-payment")
  ) {
    return false;
  }
  return routing.kind === "indicative-price" || memuatKataHarga(text);
}

/** Hasil jawaban harga: teks balasan beserta tindakan terlihat (mis. metrik). */
interface JawabanHarga {
  readonly reply: string;
  readonly actions: readonly InternalAction[];
}

/**
 * Jawaban atas pertanyaan harga: template Harga Indikatif bila angkanya
 * tercantum materi, atau penjelasan penawaran/konfirmasi oleh tim bila tidak.
 * Kembalikan `null` bila pesan bukan pertanyaan harga (lihat
 * `isPertanyaanHarga`).
 */
function jawabanPertanyaanHarga(
  text: string,
  routing: InboundRouting,
  language: Language,
): JawabanHarga | null {
  if (!isPertanyaanHarga(text, routing)) return null;
  if (routing.kind === "indicative-price") {
    return {
      reply: jawabanFaq(routing.topic, text, language),
      actions: [{ kind: "record-faq-answer", topic: routing.topic }],
    };
  }
  return { reply: language === "id" ? HARGA_KE_TIM_ID : HARGA_KE_TIM_EN, actions: [] };
}

/**
 * Kata basa-basi: sapaan, ucapan terima kasih, pengakuan singkat, dan partikel
 * (tiket 06). Pesan yang seluruh katanya berasal dari daftar ini dianggap
 * basa-basi: dibalas singkat tanpa mengisi bidang, mencatat perubahan, atau
 * memicu jawaban template — alur yang sedang berjalan tetap berlanjut.
 */
const BASA_BASI_KATA: ReadonlySet<string> = new Set([
  // Sapaan dan pembuka percakapan.
  "assalamualaikum", "assalamu", "alaikum", "waalaikumsalam", "wassalamualaikum",
  "salam", "kenal", "halo", "hai", "hi", "hello", "hei", "pagi", "siang", "sore", "malam",
  // Ucapan terima kasih dan jawabannya.
  "terima", "kasih", "terimakasih", "makasi", "makasih", "mksh", "mksih", "trims",
  "thanks", "thx", "thank", "kembali", "sama", "sama2",
  // Pengakuan singkat.
  "oke", "ok", "okelah", "okey", "okay", "sip", "siap", "noted", "betul", "benar", "bener",
  "iya", "iyah", "iyaa", "y", "ya", "yah", "yaa", "yup", "yoi", "baik", "baiklah",
  "gpp", "gapapa", "mantap", "mantul", "mantaf", "jos", "top", "keren", "bagus", "asik",
  // Sapaan orang dan partikel.
  "kak", "kakak", "ka", "mba", "mbak", "mas", "pak", "bu", "ibu", "bapak", "bang",
  "bro", "sis", "om", "tante", "gan", "bos", "cuy",
  "nih", "sih", "dong", "deh", "lah", "kok", "koq", "kan", "udah", "sudah",
  "banyak", "banget", "sekali", "paling", "saja", "apa", "kabar",
  // Ekspresi.
  "aamiin", "amin", "alhamdulillah", "masyaallah", "subhanallah", "waduh", "aduh",
  "wow", "wah", "waa", "hehe", "hihi", "haha", "wkwk", "wkwkwk", "wk", "ckck", "hmm",
  "oh", "ohh", "ooh", "ih", "ah", "yuk", "yok",
]);

/** Apakah pesan berupa basa-basi tanpa muatan kebutuhan (lihat `BASA_BASI_KATA`). */
function isBasaBasi(text: string): boolean {
  const kata = text
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((k) => k.length > 0);
  return (
    kata.length > 0 &&
    kata.every((k) => BASA_BASI_KATA.has(k) || BASA_BASI_KATA.has(k.replace(/(nya|lah|kah|pun)$/, "")))
  );
}

/** Penanda jawaban yang melewati bidang opsional (kisaran anggaran). */
const SKIP_ANSWER =
  /\b(tidak|tdk|ngga|nggak|enggak|ndak|tak|ga|gak|no|skip|lewati|lewatkan|dilewati|tanpa|belum|nanti|tidak usah|tidak ada|tidak punya|sama sekali)\b/i;

/**
 * Jawaban persetujuan. Penolakan diperiksa lebih dulu; persetujuan harus tegas
 * (di awal pesan atau kata persetujuan eksplisit) agar partikel "ya" di akhir
 * kalimat ambigu tidak dianggap persetujuan.
 */
const CONSENT_NO =
  /\b(tidak|tdk|ngga|nggak|enggak|ndak|tak|ga|gak|no|jangan|batal|tolak|cancel|nope|tidak setuju|tidak jadi)\b/i;
const CONSENT_YES = /^\s*(ya|iya|y|yes|ok|oke|okay|baik|sip|boleh|setuju|silakan|lanjut)\b/i;
const CONSENT_YES_ANYWHERE = /\b(setuju|iya|agree[d]?|consent|yes please|go ahead)\b/i;

const CONFIRM_FORWARDED_ID =
  "Terima kasih. Permintaan Anda telah diteruskan ke tim customer service/penjualan MUTAWWIFMU " +
  "untuk ditindaklanjuti. Waktu balasan dari tim belum dapat saya pastikan. " +
  "Bila ada perubahan kebutuhan, silakan sampaikan kapan saja; ringkasan yang diperbarui dapat " +
  "dikirim ulang sebagai PEMBARUAN setelah Anda setujui.";
const CONFIRM_FORWARDED_EN =
  "Thank you. Your request has been forwarded to the MUTAWWIFMU customer service/sales team " +
  "for follow-up. I cannot confirm when the team will respond. " +
  "If your needs change, just let me know anytime; the updated summary can be re-sent " +
  "as an update once you approve it.";

const CONSENT_REFUSED_ID =
  "Baik, informasi Anda tidak akan saya teruskan. Silakan sampaikan kembali bila Anda berubah pikiran.";
const CONSENT_REFUSED_EN =
  "Understood, your information will not be forwarded. Let me know if you change your mind.";

const CONSENT_REASK_ID = "Mohon konfirmasi: apakah Anda setuju informasi ini diteruskan? (jawab ya atau tidak)";
const CONSENT_REASK_EN = "Please confirm: do you consent to this information being forwarded? (answer yes or no)";

const CONFIRM_HANDOFF_FORWARDED_ID =
  "Terima kasih. Percakapan Anda telah diteruskan ke tim customer service/penjualan MUTAWWIFMU. " +
  "Waktu balasan dari tim belum dapat saya pastikan.";
const CONFIRM_HANDOFF_FORWARDED_EN =
  "Thank you. Your conversation has been forwarded to the MUTAWWIFMU customer service/sales team. " +
  "I cannot confirm when the team will respond.";

const HANDOFF_CONSENT_TAIL_ID =
  "Saya dapat meneruskan percakapan ini beserta informasi yang Anda sampaikan kepada tim " +
  "customer service/penjualan MUTAWWIFMU. Apakah Anda setuju informasi ini diteruskan?";
const HANDOFF_CONSENT_TAIL_EN =
  "I can forward this conversation along with the information you shared to the MUTAWWIFMU " +
  "customer service/sales team. Do you consent to this information being forwarded?";

/**
 * Menu Layanan MUTAWWIFMU pada langkah pertama pengumpulan: calon jemaah tahu
 * apa yang bisa diminta, tetapi jawaban tetap bebas — tidak dipaksa memilih
 * menu dan disimpan apa adanya (tiket 02).
 */
const MENU_LAYANAN_ID =
  "Menu Layanan MUTAWWIFMU:\n" +
  "- Mutawwif\n" +
  "- Visa & dokumen\n" +
  "- Hotel\n" +
  "- Transportasi\n" +
  "- Airport handling\n" +
  "- Ziarah/city tour\n" +
  "- Tasreh\n" +
  "- Fotografi\n" +
  "- Lainnya";
const MENU_LAYANAN_EN =
  "MUTAWWIFMU service menu:\n" +
  "- Mutawwif\n" +
  "- Visa & documents\n" +
  "- Hotel\n" +
  "- Transportation\n" +
  "- Airport handling\n" +
  "- Ziarah/city tour\n" +
  "- Tasreh\n" +
  "- Photography\n" +
  "- Others";

const COLLECT_INTERESTED_SERVICES_ID =
  "Baik, saya bantu mencatat Permintaan Tindak Lanjut Anda. " +
  "Layanan apa saja yang Anda minati? (jawaban bebas, boleh lebih dari satu)\n\n" +
  MENU_LAYANAN_ID;
const COLLECT_INTERESTED_SERVICES_EN =
  "Sure, I can note down your follow-up request. " +
  "Which services are you interested in? (free text, you may name more than one)\n\n" +
  MENU_LAYANAN_EN;

/**
 * Tanggal/periode keberangkatan bisa bermakna dua: periode selama di Mekkah,
 * periode selama di Madinah, atau keduanya. Prompt meminta cakupannya disebut
 * sekalian agar admin tidak salah membaca; jawaban tetap disimpan verbatim.
 */
const COLLECT_TRAVEL_DATE_OR_PERIOD_ID =
  "Terima kasih. Kapan rencana tanggal atau periode perjalanan Anda? " +
  "Agar tidak salah paham, mohon disebutkan sekalian cakupannya: " +
  "apakah hanya selama di Mekkah saja, hanya selama di Madinah saja, atau keduanya?";
const COLLECT_TRAVEL_DATE_OR_PERIOD_EN =
  "Thank you. When is your planned travel date or period? " +
  "To avoid ambiguity, please include the scope as well: " +
  "is it for the time in Makkah only, in Madinah only, or both?";

const COLLECT_TRAVELLER_COUNT_ID = "Berapa jumlah jemaah yang akan berangkat?";
const COLLECT_TRAVELLER_COUNT_EN = "How many travellers will be going?";

/**
 * Kebutuhan detail boleh disampaikan sekaligus dalam satu jawaban panjang dan
 * disimpan utuh. Prompt menyebut rincian yang lazim diperlukan admin (visa per
 * jemaah, rute/asal keberangkatan, hotel pesan sendiri atau lewat kami,
 * catatan) tanpa meminta data paspor atau kesehatan (larangan lama berlaku).
 */
const COLLECT_DETAILED_NEEDS_ID =
  "Apa kebutuhan detail Anda untuk perjalanan ini? " +
  "Boleh disampaikan sekaligus dalam satu jawaban: kebutuhan visa per jemaah, " +
  "rute atau asal keberangkatan, hotel pesan sendiri atau lewat kami, serta catatan khusus.";
const COLLECT_DETAILED_NEEDS_EN =
  "What are your detailed needs for this trip? " +
  "You may share them all at once in one message: visa needs per traveller, " +
  "route or departure city, hotel booked by yourself or through us, and any special notes.";

/**
 * Prompt kisaran anggaran — tidak lagi diajukan pada pengumpulan biasa
 * (pertanyaan anggaran dihapus); hanya terpakai bila bidang itu diulang
 * lewat perbaikan bidang.
 */
const COLLECT_BUDGET_ID =
  "Apakah ada kisaran anggaran yang ingin disampaikan? Ini opsional — Anda boleh melewatinya.";
const COLLECT_BUDGET_EN =
  "Do you have a budget range you would like to share? This is optional — you may skip it.";

/**
 * Sebutan lampiran (pesan non-teks) pada riwayat percakapan. Dipakai agar
 * Ringkasan Kebutuhan, transkrip, dan konteks percakapan dapat menyebut
 * penerimaannya tanpa bot menafsirkan isinya (tiket 03).
 */
const SEBUTAN_LAMPIRAN = "Lampiran: pesan non-teks";

/** Pengakuan penerimaan lampiran; isinya tidak pernah ditafsirkan bot. */
const LAMPIRAN_DITERIMA_ID =
  "Terima kasih, pesan non-teks Anda sudah saya terima dan saya catat sebagai lampiran " +
  "pada Ringkasan Kebutuhan; isinya tidak saya tafsirkan.";
const LAMPIRAN_DITERIMA_EN =
  "Thank you, I've received your non-text message and noted it as an attachment " +
  "in the needs summary; its contents are not interpreted.";

/**
 * Pengakuan perubahan kebutuhan yang disampaikan setelah Ringkasan Kebutuhan
 * terkirim (tiket 05). Perubahan dikumpulkan apa adanya, tanpa penafsiran.
 */
const CATAT_PERUBAHAN_ID = "Terima kasih, perubahan kebutuhan Anda saya catat.";
const CATAT_PERUBAHAN_EN = "Thank you, I've noted the change to your needs.";

/** Balasan singkat atas basa-basi (tiket 06); tidak memuat isi kebutuhan apa pun. */
const BASA_BASI_ID = "Terima kasih atas pesan Anda.";
const BASA_BASI_EN = "Thank you for your message.";

/**
 * Menu Lanjutan pasca-handoff (`.scratch/pasca-handoff`): jalan keluar setelah
 * Ringkasan Kebutuhan terkirim. Menyebut cara memperbarui bagian tertentu lewat
 * kata kunci (Perbaikan Bidang yang sudah ada) dan cara mengulang percakapan,
 * sehingga pesan yang tidak dikenali tidak lagi dijawab "Terima kasih atas
 * pesan Anda." tanpa langkah berikutnya.
 */
const MENU_LANJUTAN_ID =
  "Ringkasan Kebutuhan Anda sudah diteruskan ke tim kami. " +
  "Bila ada yang ingin diubah, sebutkan bagiannya — layanan yang diminati, tanggal/periode, " +
  "jumlah jemaah, atau kebutuhan detail (contoh: \"ubah jumlah jemaah\"). " +
  "Untuk mengulang percakapan dari awal, balas \"ulangi\".";
const MENU_LANJUTAN_EN =
  "Your needs summary has been forwarded to our team. " +
  "If anything needs changing, mention the part — services of interest, travel date/period, " +
  "number of travellers, or detailed needs (for example: \"change number of travellers\"). " +
  "To start the conversation over, reply \"ulangi\".";

/**
 * Permintaan mengulang percakapan dari awal (`.scratch/pasca-handoff` tiket 02).
 * Hanya berlaku setelah Ringkasan Kebutuhan terkirim agar tidak menabrak
 * Perbaikan Bidang di tengah pengumpulan; "ulangi bagian tanggal" tetap
 * Perbaikan Bidang karena deteksi penyela diperiksa lebih dulu.
 */
const RESTART_REQUEST =
  /\b(ulangi|ulang\s+(percakapan|chat|obrolan|dari\s+awal)|mulai\s+(dari\s+)?awal|dari\s+awal|reset|restart|percakapan\s+baru|chat\s+baru|new\s+conversation|start\s+over)\b/i;

function isRestartRequest(text: string): boolean {
  return RESTART_REQUEST.test(text);
}

/** Permintaan konfirmasi ulang yang singkat setelah basa-basi (tiket 05/06). */
const REVISI_REASK_ID =
  "Mohon konfirmasi: apakah Anda setuju pengiriman ulang ringkasan yang diperbarui? (jawab ya atau tidak)";
const REVISI_REASK_EN =
  "Please confirm: do you consent to re-sending the updated summary? (answer yes or no)";

/** Konfirmasi pengiriman ulang Ringkasan Kebutuhan yang diperbarui (tiket 05). */
const CONFIRM_RESENT_ID =
  "Terima kasih. Ringkasan Kebutuhan yang diperbarui telah diteruskan ke tim " +
  "customer service/penjualan MUTAWWIFMU sebagai PEMBARUAN. " +
  "Waktu balasan dari tim belum dapat saya pastikan.";
const CONFIRM_RESENT_EN =
  "Thank you. The updated needs summary has been forwarded to the MUTAWWIFMU " +
  "customer service/sales team as an update. " +
  "I cannot confirm when the team will respond.";

/**
 * Bidang Permintaan Tindak Lanjut yang sedang dikumpulkan. Nilai disimpan apa
 * adanya dari calon jemaah; `budgetResolved` menandai pengumpulan bidang
 * opsional anggaran sudah selesai — sejak hilangnya pertanyaan kisaran
 * anggaran, tanda ini langsung terpasang saat kebutuhan detail terisi sehingga
 * alur beralih ke persetujuan tanpa bertanya anggaran. Bidang null berarti
 * belum terisi.
 */
interface FollowUpDraft {
  readonly interestedServices: string | null;
  readonly travelDateOrPeriod: string | null;
  readonly travellerCount: string | null;
  readonly detailedNeeds: string | null;
  readonly budgetRange: string | null;
  readonly budgetResolved: boolean;
  /** Pertanyaan non-harga yang dicatat apa adanya sebagai bagian kebutuhan. */
  readonly notedQuestions: readonly string[];
  /**
   * Jumlah lampiran (pesan non-teks) yang diterima selama pengumpulan;
   * disebut sebagai lampiran pada Ringkasan Kebutuhan bila ada.
   */
  readonly attachmentCount: number;
  /**
   * Catatan perubahan kebutuhan setelah Ringkasan Kebutuhan terkirim (tiket
   * 05), apa adanya. Tidak pernah dikosongkan kembali agar riwayat ringkasan
   * yang sudah terkirim tidak tertimpa diam-diam.
   */
  readonly changeNotes: readonly string[];
}

/**
 * Pemicu yang menuntut penanganan manusia (spec: kasus yang diteruskan ke
 * admin); menyela alur apa pun, termasuk pengumpulan Permintaan Tindak Lanjut.
 */
const URGENT_TRIGGERS: ReadonlySet<HandoffTrigger> = new Set([
  "emergency",
  "active-trip",
  "human-request",
]);

function isUrgentHandoffRequest(text: string | null, hasilKlasifikasi?: InboundRouting): boolean {
  if (text === null) return false;
  const routing = hasilKlasifikasi ?? classifyInbound(text);
  return routing.kind === "handoff" && URGENT_TRIGGERS.has(routing.trigger);
}

function isVendorPartnerMessage(text: string, hasilKlasifikasi?: InboundRouting): boolean {
  const routing = hasilKlasifikasi ?? classifyInbound(text);
  return routing.kind === "handoff" && routing.trigger === "agency-or-corporate";
}

function openingReply(text: string | null, language: Language): string {
  const greeting =
    text !== null && containsSalam(text)
      ? "Waalaikumsalam Wr. Wb"
      : language === "id"
        ? "Halo!"
        : "Hello!";
  const menu = language === "id" ? MENU_TUJUAN_CHAT_ID : MENU_TUJUAN_CHAT_EN;
  return `${greeting}\n\n${SERVICE_INTRO}\n\n${menu}`;
}

function containsSalam(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, "");
  return (
    normalized.startsWith("assalamualaikum") ||
    normalized.startsWith("asalamualaikum") ||
    /\bsalam\b/i.test(text)
  );
}

/** State alur percakapan; diturunkan dari riwayat sehingga seam tetap murni. */
type PurposeHandoffReason = Extract<HandOffReason, "vendor_mitra" | "internal" | "other">;
type PurposeSelection = "prospective" | PurposeHandoffReason;

type FlowState =
  | { readonly kind: "idle" }
  | { readonly kind: "admin-routed" }
  | { readonly kind: "collecting"; readonly draft: FollowUpDraft }
  | { readonly kind: "awaiting-consent"; readonly draft: FollowUpDraft }
  | {
      readonly kind: "awaiting-handoff-consent";
      readonly reason: HandOffReason;
      /**
       * State yang dilanjutkan setelah handoff selesai (tiket 05: pemulihan
       * setelah handoff). Draft yang sedang berjalan tetap tidak ikut dibawa
       * ke pesan handoff — hanya dipulihkan untuk percakapan berikutnya.
       */
      readonly resume: FlowState;
    }
  /** Ringkasan Kebutuhan sudah terkirim ke admin (tiket 05). */
  | { readonly kind: "sent"; readonly draft: FollowUpDraft }
  /** Menunggu persetujuan pengiriman ulang ringkasan yang diperbarui (tiket 05). */
  | { readonly kind: "awaiting-revision-consent"; readonly draft: FollowUpDraft }
  /**
   * Bidang tertentu sedang diulang jawabannya setelah permintaan perbaikan
   * (mis. "hapus bagian tanggal"); state `resume` dilanjutkan kembali setelah
   * seluruh bidang pada `sisa` dijawab ulang (tiket 02 penyela-pengumpulan).
   */
  | {
      readonly kind: "reasking-field";
      readonly draft: FollowUpDraft;
      readonly sisa: readonly BidangKebutuhan[];
      readonly resume: FlowState;
    }
  /**
   * Menunggu isi pertanyaan setelah kata kunci pertanyaan polos ("ingin
   * bertanya" tanpa isi); pesan berikutnya menjadi pertanyaan, lalu alur
   * kembali ke `resume` (tiket 01 penyela-pengumpulan).
   */
  | { readonly kind: "awaiting-question"; readonly resume: FlowState };

const EMPTY_DRAFT: FollowUpDraft = {
  interestedServices: null,
  travelDateOrPeriod: null,
  travellerCount: null,
  detailedNeeds: null,
  budgetRange: null,
  budgetResolved: false,
  notedQuestions: [],
  attachmentCount: 0,
  changeNotes: [],
};

interface StepResult {
  readonly reply: string;
  readonly actions: readonly InternalAction[];
  readonly next: FlowState;
}

/** Tindakan internal alur percakapan yang dapat diteruskan ke server. */
type InternalAction =
  | { readonly kind: "record-faq-answer"; readonly topic: string }
  | { readonly kind: "record-follow-up-request"; readonly request: FollowUpRequest }
  | {
      readonly kind: "hand-off-to-admin";
      readonly reason: HandOffReason;
      readonly request: FollowUpRequest | null;
      readonly revision?: true;
    };

/**
 * Giliran riwayat untuk satu pesan masuk. Pesan non-teks direkam sebagai
 * giliran lampiran dengan sebutannya, sehingga state alur (termasuk Ringkasan
 * Kebutuhan) dan konteks percakapan dapat menyebut penerimaannya tanpa
 * menafsirkan isinya.
 */
export function turnForInbound(
  message: InboundMessage,
  hasilKlasifikasi?: InboundRouting,
): ConversationTurn {
  const dasar: ConversationTurn =
    message.text === null
      ? { role: "calon-jemaah", text: SEBUTAN_LAMPIRAN, attachment: true }
      : { role: "calon-jemaah", text: message.text };
  // Hasil klasifikasi ikut disimpan pada giliran agar pemutaran ulang riwayat
  // memakai hasil yang sama dengan saat pesan diproses (tiket 01).
  return hasilKlasifikasi === undefined ? dasar : { ...dasar, routing: hasilKlasifikasi };
}

/**
 * Seam pemrosesan pesan masuk yang disepakati: menerima pesan beserta konteks
 * percakapan, menghasilkan balasan serta tindakan yang terlihat.
 *
 * `hasilKlasifikasi` (opsional) adalah hasil `InboundRouting` untuk pesan ini
 * yang sudah dihitung sebelumnya (mis. lewat pemaham Gemini di jalur webhook).
 * Bila diberikan, SEMUA keputusan percakapan untuk pesan ini memakai hasil yang
 * sama. Fungsi ini tetap sinkron/deterministik dan tidak pernah memanggil
 * pemaham; tanpa `hasilKlasifikasi`, pesan diklasifikasi dengan `classifyInbound()`.
 */
export function handleInbound(
  message: InboundMessage,
  context: ConversationContext,
  hasilKlasifikasi?: InboundRouting,
): BotTurn {
  const routing =
    message.text === null ? undefined : (hasilKlasifikasi ?? classifyInbound(message.text));
  if (context.history.length === 0 && !isUrgentHandoffRequest(message.text, routing)) {
    const language = message.text !== null && containsSalam(message.text)
      ? "id"
      : resolveReplyLanguage(context.history, message.text ?? "");
    return {
      reply: { text: openingReply(message.text, language) },
      actions: [],
    };
  }

  let state: FlowState = { kind: "idle" };
  let awaitingPurposeSelection = false;
  for (const turn of context.history) {
    if (turn.role === "asisten") {
      if (containsPurposeMenu(turn.text)) {
        state = { kind: "idle" };
        awaitingPurposeSelection = true;
      } else {
        awaitingPurposeSelection = false;
      }
      continue;
    }
    if (awaitingPurposeSelection) {
      state = stateAfterMenuInput(turn);
      awaitingPurposeSelection = false;
      continue;
    }
    // Lampiran tidak pernah menjadi jawaban bidang; penerimaannya dicatat
    // terpisah oleh `nextStateLampiran`.
    state =
      turn.attachment === true
        ? nextStateLampiran(state)
        : nextState(state, turn.text, turn.routing);
  }

  const language = resolveReplyLanguage(context.history, message.text ?? "");
  if (awaitingPurposeSelection) {
    return handlePurposeSelection(message, language, routing);
  }
  const result =
    message.text === null
      ? stepLampiran(state, language)
      : step(state, message.text, language, routing);
  return { reply: { text: result.reply }, actions: result.actions };
}

function handlePurposeSelection(
  message: InboundMessage,
  language: Language,
  hasilKlasifikasi?: InboundRouting,
): BotTurn {
  const selection = message.text === null ? null : parsePurposeSelection(message.text);
  if (selection === "prospective") {
    return {
      reply: { text: promptForNextField(EMPTY_DRAFT, language === "id") },
      actions: [],
    };
  }
  if (selection !== null) {
    return purposeHandoff(selection, language);
  }
  if (isUrgentHandoffRequest(message.text, hasilKlasifikasi)) {
    const result = step({ kind: "idle" }, message.text ?? "", language, hasilKlasifikasi);
    return { reply: { text: result.reply }, actions: result.actions };
  }
  if (message.text !== null && isVendorPartnerMessage(message.text, hasilKlasifikasi)) {
    return purposeHandoff("vendor_mitra", language);
  }
  return { reply: { text: retryPurposeMenu(language) }, actions: [] };
}

function stateAfterMenuInput(turn: ConversationTurn): FlowState {
  if (turn.attachment === true) {
    return { kind: "idle" };
  }
  const selection = parsePurposeSelection(turn.text);
  if (selection === "prospective") {
    return { kind: "collecting", draft: EMPTY_DRAFT };
  }
  if (selection !== null) {
    return { kind: "admin-routed" };
  }
  if (isUrgentHandoffRequest(turn.text, turn.routing)) {
    return nextState({ kind: "idle" }, turn.text, turn.routing);
  }
  return isVendorPartnerMessage(turn.text, turn.routing)
    ? { kind: "admin-routed" }
    : { kind: "idle" };
}

const PURPOSE_CHOICE_WORD_TO_DIGIT: Readonly<Record<string, string>> = {
  "satu": "1",
  "one": "1",
  "pertama": "1",
  "first": "1",
  "dua": "2",
  "two": "2",
  "kedua": "2",
  "second": "2",
  "tiga": "3",
  "three": "3",
  "ketiga": "3",
  "third": "3",
  "empat": "4",
  "four": "4",
  "keempat": "4",
  "fourth": "4",
};

const PURPOSE_CHOICE_FILLERS: ReadonlySet<string> = new Set([
  "pilihan",
  "opsi",
  "option",
  "nomor",
  "number",
  "no",
  "pilih",
  "choose",
]);

function leadingPurposeChoiceDigit(normalized: string): string | undefined {
  const tokens = normalized.split(" ");
  let i = 0;
  while (i < tokens.length && PURPOSE_CHOICE_FILLERS.has(tokens[i]!)) i++;
  if (i >= tokens.length) return undefined;
  const token = tokens[i]!;
  if (/^[1-4]$/.test(token)) return token;
  return PURPOSE_CHOICE_WORD_TO_DIGIT[token];
}

function parsePurposeSelection(text: string): PurposeSelection | null {
  const normalized = text.toLowerCase().trim().replace(/[.():]/g, "").replace(/\s+/g, " ");
  const choices: Readonly<Record<string, PurposeSelection>> = {
    "1": "prospective",
    "calon jemaah": "prospective",
    "calon jemaah / informasi paket": "prospective",
    "calon jamaah": "prospective",
    "informasi paket": "prospective",
    "prospective pilgrim": "prospective",
    "prospective pilgrim / package information": "prospective",
    "package information": "prospective",
    "2": "vendor_mitra",
    "vendor": "vendor_mitra",
    "mitra": "vendor_mitra",
    "vendor / mitra bisnis": "vendor_mitra",
    "vendor/mitra bisnis": "vendor_mitra",
    "vendor / business partner": "vendor_mitra",
    "3": "internal",
    "tim internal": "internal",
    "tim internal mutawwifmu": "internal",
    "internal": "internal",
    "mutawwifmu internal team": "internal",
    "4": "other",
    "keperluan lain": "other",
    "keperluan lain / ingin menghubungi admin": "other",
    "lainnya": "other",
    "other": "other",
    "other / contact an admin": "other",
    "ingin menghubungi admin": "other",
    "saya ingin menghubungi admin": "other",
    "contact an admin": "other",
  };
  // Jawaban boleh memakai kata (bukan angka): "satu"/"pertama" = 1, dst.
  const leadingChoice = leadingPurposeChoiceDigit(normalized);
  return (leadingChoice ? choices[leadingChoice]! : undefined) ?? choices[normalized] ?? null;
}

function containsPurposeMenu(text: string): boolean {
  return text.includes(MENU_TUJUAN_CHAT_ID) || text.includes(MENU_TUJUAN_CHAT_EN);
}

function retryPurposeMenu(language: Language): string {
  const retry = language === "id"
    ? "Maaf, pilihan belum dikenali. Silakan pilih salah satu opsi dengan membalas angka."
    : "Sorry, I didn't recognize that choice. Please reply with one of the option numbers.";
  const menu = language === "id" ? MENU_TUJUAN_CHAT_ID : MENU_TUJUAN_CHAT_EN;
  return `${retry}\n\n${menu}`;
}

function purposeHandoff(reason: PurposeHandoffReason, language: Language): BotTurn {
  return {
    reply: { text: language === "id" ? CONFIRM_HANDOFF_FORWARDED_ID : CONFIRM_HANDOFF_FORWARDED_EN },
    actions: [{ kind: "hand-off-to-admin", reason, request: null }],
  };
}

/** Satu langkah pemrosesan teks: balasan, tindakan, dan state berikutnya. */
function step(
  state: FlowState,
  text: string,
  language: Language,
  hasilKlasifikasi?: InboundRouting,
): StepResult {
  const indonesian = language === "id";
  const next = nextState(state, text, hasilKlasifikasi);
  const routing = hasilKlasifikasi ?? classifyInbound(text);
  const leadPertanyaan = indonesian ? CATAT_PERTANYAAN_ID : CATAT_PERTANYAAN_EN;
  // Jawaban pertanyaan harga (`.scratch/harga-di-semua-fase`): Harga Indikatif
  // bila angkanya tercantum materi, atau penjelasan penawaran/konfirmasi oleh
  // tim bila tidak — berlaku di semua fase, digabung dengan alur berjalan.
  const jawabanHarga = jawabanPertanyaanHarga(text, routing, language);
  // Pertanyaan yang dicatat didahulukan daripada jawaban persetujuan: pesan
  // berisi kata penolakan (mis. "boleh cek gak harganya?") tetap dicatat
  // sebagai pertanyaan, bukan ditafsirkan sebagai penolakan penerusan. Guard
  // berlaku untuk semua state (termasuk menunggu persetujuan handoff/revisi).
  const pertanyaanTercatat = isPertanyaanTercatat(text, routing);
  const menolak = CONSENT_NO.test(text);
  const menjawabPersetujuan = !pertanyaanTercatat && (menolak || isConsentYes(text));
  const ditolak = {
    reply: indonesian ? CONSENT_REFUSED_ID : CONSENT_REFUSED_EN,
    actions: [],
    next,
  };

  // Penyela pengumpulan ditangani sebelum jawaban persetujuan agar "ya, hapus
  // bagian tanggal" berarti perbaikan bidang, bukan persetujuan pengiriman.
  // Prioritas: pemicu mendesak > pertanyaan menyela > perbaikan bidang.
  const mendesak = isUrgentHandoffRequest(text, routing);
  const penyela = mendesak ? null : deteksiPenyela(text);
  const pertanyaanHarga = routing.kind === "indicative-price" && isPertanyaan(text);
  if (!mendesak) {
    if (state.kind === "awaiting-question") {
      if (penyela?.jenis === "perbaikan-bidang") {
        return hasilPerbaikan(state, penyela.bidang, next, indonesian);
      }
      if (isBasaBasi(text)) {
        return {
          reply: balasanDenganPrompt(
            indonesian ? BASA_BASI_ID : BASA_BASI_EN,
            indonesian ? MINTA_PERTANYAAN_ID : MINTA_PERTANYAAN_EN,
          ),
          actions: [],
          next,
        };
      }
      if (penyela?.jenis === "pertanyaan-polos") {
        return {
          reply: indonesian ? MINTA_PERTANYAAN_ID : MINTA_PERTANYAAN_EN,
          actions: [],
          next,
        };
      }
      // Isi pertanyaan berupa pertanyaan harga langsung dijawab
      // (`.scratch/harga-di-semua-fase`); yang bermateri juga tidak dicatat ke
      // Bagian Pertanyaan (lihat `nextState`).
      if (jawabanHarga !== null) {
        const lead =
          routing.kind === "indicative-price"
            ? jawabanHarga.reply
            : balasanDenganPrompt(
                jawabanHarga.reply,
                indonesian ? PERTANYAAN_MENYELA_ID : PERTANYAAN_MENYELA_EN,
              );
        return {
          reply: balasanDenganPrompt(lead, promptMenyela(next, indonesian)),
          actions: [...jawabanHarga.actions],
          next,
        };
      }
      // Pesan apa pun (non-mendesak) berikutnya adalah isi pertanyaannya.
      return {
        reply: balasanDenganPrompt(
          indonesian ? PERTANYAAN_MENYELA_ID : PERTANYAAN_MENYELA_EN,
          promptMenyela(next, indonesian),
        ),
        actions: [],
        next,
      };
    }
    if (penyela !== null && !pertanyaanHarga && stateMemilikiDraft(state)) {
      if (penyela.jenis === "perbaikan-bidang") {
        return hasilPerbaikan(state, penyela.bidang, next, indonesian);
      }
      if (penyela.jenis === "pertanyaan-polos") {
        return {
          reply: indonesian ? MINTA_PERTANYAAN_ID : MINTA_PERTANYAAN_EN,
          actions: [],
          next,
        };
      }
      // Pertanyaan harga tanpa materi tetap dicatat ke Bagian Pertanyaan,
      // tetapi jawabannya (penawaran oleh tim) tetap disampaikan lebih dulu.
      const leadMenyela =
        jawabanHarga !== null
          ? balasanDenganPrompt(
              jawabanHarga.reply,
              indonesian ? PERTANYAAN_MENYELA_ID : PERTANYAAN_MENYELA_EN,
            )
          : indonesian
            ? PERTANYAAN_MENYELA_ID
            : PERTANYAAN_MENYELA_EN;
      return {
        reply: balasanDenganPrompt(leadMenyela, promptMenyela(next, indonesian)),
        actions: [],
        next,
      };
    }
    if (penyela?.jenis === "perbaikan-bidang" && state.kind === "idle") {
      return hasilPerbaikan(state, penyela.bidang, next, indonesian);
    }
  }

  if (state.kind === "awaiting-handoff-consent" && menjawabPersetujuan) {
    if (menolak) {
      return ditolak;
    }
    return {
      reply: indonesian ? CONFIRM_HANDOFF_FORWARDED_ID : CONFIRM_HANDOFF_FORWARDED_EN,
      actions: [{ kind: "hand-off-to-admin", reason: state.reason, request: null }],
      next,
    };
  }

  if (state.kind === "awaiting-consent" && menjawabPersetujuan) {
    if (menolak) {
      return ditolak;
    }
    const request = toFollowUpRequest(state.draft);
    return {
      reply: indonesian ? CONFIRM_FORWARDED_ID : CONFIRM_FORWARDED_EN,
      actions: [
        { kind: "record-follow-up-request", request },
        { kind: "hand-off-to-admin", reason: "follow-up-request", request },
      ],
      next,
    };
  }

  if (state.kind === "awaiting-revision-consent" && menjawabPersetujuan) {
    if (menolak) {
      // Penolakan pengiriman ulang tidak menghapus catatan perubahan; Menu
      // Lanjutan memberi jalan keluar (perbarui bagian atau ulangi percakapan).
      return {
        reply: balasanDenganPrompt(
          indonesian ? CONSENT_REFUSED_ID : CONSENT_REFUSED_EN,
          indonesian ? MENU_LANJUTAN_ID : MENU_LANJUTAN_EN,
        ),
        actions: [],
        next,
      };
    }
    // Pengiriman ulang (tiket 05) selalu memakai persetujuan baru dan ditandai
    // sebagai revisi Ringkasan Kebutuhan yang sudah dikirim, bukan prospek baru.
    const request = toFollowUpRequest(state.draft);
    return {
      reply: indonesian ? CONFIRM_RESENT_ID : CONFIRM_RESENT_EN,
      actions: [
        { kind: "record-follow-up-request", request },
        { kind: "hand-off-to-admin", reason: "follow-up-request", request, revision: true },
      ],
      next,
    };
  }

  if (state.kind === "admin-routed") {
    // Pertanyaan harga tetap dijawab meski percakapan sudah ditangani admin
    // (`.scratch/harga-di-semua-fase`); pesan lain tetap pengakuan singkat.
    if (jawabanHarga !== null) {
      return { reply: jawabanHarga.reply, actions: [...jawabanHarga.actions], next };
    }
    // Ulangi percakapan dari `admin-routed` (tiket 02 `.scratch/tujuan-chat`):
    // jalan keluar agar pengguna yang memilih tujuan 2/3/4 tidak terkunci pada
    // "Terima kasih atas pesan Anda." sampai proses di-restart. Diletakkan
    // setelah jawaban harga dan dijaga `!mendesak`, sehingga pemicu mendesak
    // (mis. "ulangi, ada darurat") tetap menyela ke handoff sesuai prioritas
    // ADR-0014. Balasan pembuka memuat menu tujuan sehingga pesan berikutnya
    // diproses sebagai percakapan baru.
    if (!mendesak && isRestartRequest(text)) {
      return {
        reply: openingReply(null, language),
        actions: [],
        next: { kind: "idle" },
      };
    }
    if (next.kind === "admin-routed") {
      return {
        reply: indonesian ? BASA_BASI_ID : BASA_BASI_EN,
        actions: [],
        next,
      };
    }
  }

  // Basa-basi (tiket 06) dibalas singkat: tidak mengisi bidang, tidak mencatat
  // perubahan, dan tidak memicu jawaban template — alur yang sedang berjalan
  // (bidang yang ditanya, konfirmasi, atau penutup) tetap dilanjutkan.
  if (state.kind !== "idle" && isBasaBasi(text)) {
    if (state.kind === "sent") {
      // Pasca-handoff: tidak ada prompt tertunda untuk state `sent`, jadi
      // basa-basi dibalas Menu Lanjutan agar tidak macet pada "Terima kasih
      // atas pesan Anda." tanpa langkah berikutnya (tiket 01).
      return {
        reply: indonesian ? MENU_LANJUTAN_ID : MENU_LANJUTAN_EN,
        actions: [],
        next,
      };
    }
    const lead = indonesian ? BASA_BASI_ID : BASA_BASI_EN;
    const prompt = promptSetelahBasaBasi(state, indonesian);
    return {
      reply: prompt === "" ? lead : balasanDenganPrompt(lead, prompt),
      actions: [],
      next,
    };
  }

  // Pertanyaan Harga Indikatif setelah ringkasan terkirim dijawab dari materi
  // (spec ruang lingkup 4) tanpa mengubah kebutuhan; saat menunggu persetujuan
  // pengiriman ulang, jawabannya digabung dengan permintaan konfirmasi ulang.
  // Hanya pesan bertanda pertanyaan yang dijawab — pernyataan bermuatan kata
  // harga adalah informasi/kebutuhan (tiket 06), bukan pertanyaan harga.
  if (
    routing.kind === "indicative-price" &&
    isPertanyaan(text) &&
    (state.kind === "sent" || state.kind === "awaiting-revision-consent")
  ) {
    const jawaban = jawabanFaq(routing.topic, text, language);
    const aksi: InternalAction = { kind: "record-faq-answer", topic: routing.topic };
    if (state.kind === "sent") {
      return { reply: jawaban, actions: [aksi], next };
    }
    return {
      reply: balasanDenganPrompt(jawaban, revisiConsentPrompt(state.draft, indonesian)),
      actions: [aksi],
      next,
    };
  }

  // Ulangi percakapan pasca-handoff (tiket 02): balasan adalah pembuka layanan
  // + menu tujuan, sehingga pemutaran riwayat berikutnya memulai percakapan
  // baru dari kosong. Diletakkan setelah penyela/Perbaikan Bidang agar
  // "ulangi bagian tanggal" tetap Perbaikan Bidang.
  if (
    (state.kind === "sent" || state.kind === "awaiting-revision-consent") &&
    isRestartRequest(text)
  ) {
    return {
      reply: openingReply(null, language),
      actions: [],
      next: { kind: "idle" },
    };
  }

  if (next.kind === "awaiting-handoff-consent") {
    const prompt = promptHandoff(next.reason, indonesian);
    // Pertanyaan harga yang angkanya tercantum materi dijawab lebih dulu;
    // pertanyaan harga tanpa materi sudah terjawab oleh lead handoff
    // `custom-quote-or-availability` di dalam `promptHandoff`.
    if (jawabanHarga !== null && routing.kind === "indicative-price") {
      return {
        reply: balasanDenganPrompt(jawabanHarga.reply, prompt),
        actions: [...jawabanHarga.actions],
        next,
      };
    }
    return {
      reply: prompt,
      actions: [],
      next,
    };
  }
  if (state.kind === "reasking-field") {
    // Jawaban ulang bidang: tampilkan bidang berikutnya yang masih diulang,
    // atau kembali ke state sebelumnya (ringkasan/konfirmasi/pengumpulan).
    const menyela = isPertanyaanTercatat(text, routing);
    if (menyela && routing.kind === "indicative-price" && isPertanyaan(text)) {
      return {
        reply: balasanDenganPrompt(
          jawabanFaq(routing.topic, text, language),
          promptBidang(state.sisa[0], indonesian),
        ),
        actions: [{ kind: "record-faq-answer", topic: routing.topic }],
        next,
      };
    }
    if (menyela) {
      // Pertanyaan harga tanpa materi tetap dicatat, tetapi jawabannya
      // (penawaran oleh tim) disampaikan lebih dulu.
      const lead =
        jawabanHarga !== null
          ? balasanDenganPrompt(jawabanHarga.reply, leadPertanyaan)
          : leadPertanyaan;
      return {
        reply: balasanDenganPrompt(lead, promptBidang(state.sisa[0], indonesian)),
        actions: [],
        next,
      };
    }
    return {
      reply: next.kind === "reasking-field"
        ? promptBidang(next.sisa[0], indonesian)
        : promptKembali(next, indonesian),
      actions: [],
      next,
    };
  }
  if (next.kind === "awaiting-consent") {
    const reask = indonesian ? CONSENT_REASK_ID : CONSENT_REASK_EN;
    if (state.kind !== "awaiting-consent") {
      return { reply: consentPrompt(next.draft, indonesian), actions: [], next };
    }
    // Pertanyaan harga dijawab lebih dulu, lalu konfirmasi persetujuan diulang.
    if (jawabanHarga !== null) {
      const lead =
        routing.kind === "indicative-price"
          ? jawabanHarga.reply
          : balasanDenganPrompt(jawabanHarga.reply, leadPertanyaan);
      return {
        reply: balasanDenganPrompt(lead, reask),
        actions: [...jawabanHarga.actions],
        next,
      };
    }
    // Pertanyaan non-harga yang menyela konfirmasi dicatat apa adanya; balasan
    // tetap meminta konfirmasi persetujuan.
    const dicatat = isPertanyaanTercatat(text, routing);
    return { reply: dicatat ? balasanDenganPrompt(leadPertanyaan, reask) : reask, actions: [], next };
  }

  const menyela = state.kind === "collecting" && isPertanyaanTercatat(text, routing);

  if (next.kind === "collecting") {
    if (next.draft.detailedNeeds !== null) {
      // Pengumpulan sudah lengkap: kisaran anggaran tidak lagi ditanya, jadi
      // langsung ke permintaan persetujuan penerusan ke admin.
      return {
        reply: consentPrompt(next.draft, indonesian),
        actions: [],
        next: { kind: "awaiting-consent", draft: next.draft },
      };
    }
    const prompt = promptForNextField(next.draft, indonesian);
    if (state.kind === "collecting" && !menyela) {
      // Jawaban bidang biasa: cukup ajukan bidang berikutnya.
      return { reply: prompt, actions: [], next };
    }
    // Pertanyaan yang menyela pengumpulan tidak mengisi bidang yang sedang
    // ditanya. Setiap chat prospek (ADR-0009) dibalas cepat — respons awal,
    // catatan pertanyaan, atau Harga Indikatif — lalu diarahkan ke
    // pengumpulan Permintaan Tindak Lanjut, tanpa pola pembuka khusus.
    if (routing.kind === "indicative-price" && isPertanyaan(text)) {
      return {
        reply: balasanDenganPrompt(jawabanFaq(routing.topic, text, language), prompt),
        actions: [{ kind: "record-faq-answer", topic: routing.topic }],
        next,
      };
    }
    // Pertanyaan non-harga (apa pun routing-nya) dicatat apa adanya dan dibawa
    // ke admin (tiket 06); pesan tanpa tanda pertanyaan diperlakukan sebagai
    // informasi/kebutuhan dan tetap membuka pengumpulan dari state idle.
    const dicatat = isPertanyaanTercatat(text, routing);
    const lead = dicatat ? leadPertanyaan : initialReplyFor(indonesian);
    return {
      // Pertanyaan harga tanpa materi tetap dicatat apa adanya, tetapi
      // jawabannya (penawaran oleh tim) disampaikan lebih dulu.
      reply: balasanDenganPrompt(
        jawabanHarga !== null ? balasanDenganPrompt(jawabanHarga.reply, lead) : lead,
        prompt,
      ),
      actions: [],
      next,
    };
  }
  if (next.kind === "awaiting-revision-consent") {
    // Pembaruan setelah ringkasan terkirim (tiket 05): perubahan kebutuhan
    // (atau pertanyaan non-harga) dicatat apa adanya, lalu Ringkasan Kebutuhan
    // yang diperbarui ditampilkan untuk dimintai persetujuan pengiriman ulang.
    const lead = isPertanyaanTercatat(text, routing)
      ? leadPertanyaan
      : indonesian
        ? CATAT_PERUBAHAN_ID
        : CATAT_PERUBAHAN_EN;
    return {
      // Pertanyaan harga tanpa materi tetap dicatat apa adanya, tetapi
      // jawabannya (penawaran oleh tim) disampaikan lebih dulu.
      reply: balasanDenganPrompt(
        jawabanHarga !== null ? balasanDenganPrompt(jawabanHarga.reply, lead) : lead,
        revisiConsentPrompt(next.draft, indonesian),
      ),
      actions: [],
      next,
    };
  }
  // Semua state lain sudah ditangani di atas: pesan apa pun dari idle masuk ke
  // pengumpulan, dan hanya jawaban persetujuan yang kembali ke idle.
  throw new Error(`state alur tidak dikenal: ${next.kind}`);
}

/** Gabungkan balasan cepat dengan langkah pengumpulan berikutnya. */
function balasanDenganPrompt(lead: string, prompt: string): string {
  return `${lead}\n\n${prompt}`;
}

/** Sebutan bidang pada balasan perbaikan bidang (mengikuti label ringkasan). */
const LABEL_BIDANG: Record<BidangKebutuhan, readonly [id: string, en: string]> = {
  interestedServices: ["Layanan yang diminati", "Services of interest"],
  travelDateOrPeriod: ["Tanggal/periode", "Travel date/period"],
  travellerCount: ["Jumlah jemaah", "Number of travellers"],
  detailedNeeds: ["Kebutuhan detail", "Detailed needs"],
  budgetRange: ["Kisaran anggaran", "Budget range"],
};

function labelBidang(bidang: readonly BidangKebutuhan[], indonesian: boolean): string {
  return bidang
    .map((b) => (indonesian ? LABEL_BIDANG[b][0] : LABEL_BIDANG[b][1]))
    .join(indonesian ? " dan " : " and ");
}

/** Prompt pengumpulan sebuah bidang (dipakai saat bidang diulang). */
function promptBidang(bidang: BidangKebutuhan | undefined, indonesian: boolean): string {
  if (bidang === undefined) {
    return "";
  }
  switch (bidang) {
    case "interestedServices":
      return indonesian ? COLLECT_INTERESTED_SERVICES_ID : COLLECT_INTERESTED_SERVICES_EN;
    case "travelDateOrPeriod":
      return indonesian ? COLLECT_TRAVEL_DATE_OR_PERIOD_ID : COLLECT_TRAVEL_DATE_OR_PERIOD_EN;
    case "travellerCount":
      return indonesian ? COLLECT_TRAVELLER_COUNT_ID : COLLECT_TRAVELLER_COUNT_EN;
    case "detailedNeeds":
      return indonesian ? COLLECT_DETAILED_NEEDS_ID : COLLECT_DETAILED_NEEDS_EN;
    case "budgetRange":
      return indonesian ? COLLECT_BUDGET_ID : COLLECT_BUDGET_EN;
  }
}

/** Prompt yang tertunda pada state yang dilanjutkan setelah pesan penyela. */
function promptMenyela(next: FlowState, indonesian: boolean): string {
  switch (next.kind) {
    case "collecting":
      return promptForNextField(next.draft, indonesian);
    case "reasking-field":
      return promptBidang(next.sisa[0], indonesian);
    case "awaiting-consent":
      return indonesian ? CONSENT_REASK_ID : CONSENT_REASK_EN;
    case "awaiting-revision-consent":
      return revisiConsentPrompt(next.draft, indonesian);
    default:
      return "";
  }
}

/** Prompt state sebelumnya setelah seluruh bidang yang diulang dijawab. */
function promptKembali(next: FlowState, indonesian: boolean): string {
  switch (next.kind) {
    case "collecting":
      return promptForNextField(next.draft, indonesian);
    case "awaiting-consent":
      return consentPrompt(next.draft, indonesian);
    case "awaiting-revision-consent":
      return revisiConsentPrompt(next.draft, indonesian);
    case "reasking-field":
      return promptBidang(next.sisa[0], indonesian);
    default:
      return "";
  }
}

/**
 * Balasan perbaikan bidang: akui bidang yang dikosongkan dan minta ulang,
 * akui bidang yang memang belum terisi, lalu tampilkan prompt yang sesuai.
 */
function hasilPerbaikan(
  state: FlowState,
  bidang: readonly BidangKebutuhan[],
  next: FlowState,
  indonesian: boolean,
): StepResult {
  const draft = draftDari(state);
  const terisi = bidang.filter((b) => bidangTerisi(draft, b));
  const belum = bidang.filter((b) => !bidangTerisi(draft, b));
  const bagian: string[] = [];
  if (terisi.length > 0) {
    bagian.push(
      indonesian
        ? `Baik, bagian ${labelBidang(terisi, indonesian)} saya hapus. Silakan isi ulang jawabannya:`
        : `Alright, I've cleared the ${labelBidang(terisi, indonesian)} part. Please provide it again:`,
    );
  }
  if (belum.length > 0) {
    bagian.push(
      indonesian
        ? `Bagian ${labelBidang(belum, indonesian)} memang belum terisi.`
        : `The ${labelBidang(belum, indonesian)} part hasn't been filled in yet.`,
    );
  }
  const prompt =
    next.kind === "reasking-field"
      ? promptBidang(next.sisa[0], indonesian)
      : state.kind === "idle"
        ? promptForNextField(EMPTY_DRAFT, indonesian)
        : promptSetelahBasaBasi(state, indonesian);
  const kepala = bagian.join("\n\n");
  return {
    reply: prompt === "" ? kepala : balasanDenganPrompt(kepala, prompt),
    actions: [],
    next,
  };
}

/**
 * Langkah kelanjutan alur setelah basa-basi (tiket 06): ulangi bidang yang
 * sedang ditanya atau permintaan konfirmasi yang sedang menunggu. Kosong bila
 * memang tidak ada langkah berikut (Ringkasan Kebutuhan sudah terkirim).
 */
function promptSetelahBasaBasi(state: FlowState, indonesian: boolean): string {
  switch (state.kind) {
    case "collecting":
      return promptForNextField(state.draft, indonesian);
    case "awaiting-consent":
    case "awaiting-handoff-consent":
      return indonesian ? CONSENT_REASK_ID : CONSENT_REASK_EN;
    case "awaiting-revision-consent":
      return indonesian ? REVISI_REASK_ID : REVISI_REASK_EN;
    case "reasking-field":
      return promptBidang(state.sisa[0], indonesian);
    case "awaiting-question":
      return indonesian ? MINTA_PERTANYAAN_ID : MINTA_PERTANYAAN_EN;
    default:
      return "";
  }
}

/**
 * Satu langkah untuk pesan non-teks (lampiran): akui penerimaannya tanpa
 * menafsirkan isinya, catat sebagai lampiran, lalu ajukan langkah alur yang
 * sama seperti biasa — lampiran tidak pernah mengisi bidang kebutuhan.
 */
function stepLampiran(state: FlowState, language: Language): StepResult {
  const indonesian = language === "id";
  const next = nextStateLampiran(state);
  const akui = indonesian ? LAMPIRAN_DITERIMA_ID : LAMPIRAN_DITERIMA_EN;
  if (next.kind === "collecting") {
    return {
      reply: balasanDenganPrompt(akui, promptForNextField(next.draft, indonesian)),
      actions: [],
      next,
    };
  }
  if (next.kind === "awaiting-consent") {
    return {
      reply: balasanDenganPrompt(akui, consentPrompt(next.draft, indonesian)),
      actions: [],
      next,
    };
  }
  if (next.kind === "awaiting-revision-consent") {
    return {
      reply: balasanDenganPrompt(akui, revisiConsentPrompt(next.draft, indonesian)),
      actions: [],
      next,
    };
  }
  if (next.kind === "reasking-field") {
    return {
      reply: balasanDenganPrompt(akui, promptBidang(next.sisa[0], indonesian)),
      actions: [],
      next,
    };
  }
  if (state.kind === "awaiting-question") {
    return {
      reply: balasanDenganPrompt(
        akui,
        indonesian ? MINTA_PERTANYAAN_ID : MINTA_PERTANYAAN_EN,
      ),
      actions: [],
      next,
    };
  }
  if (next.kind === "admin-routed") {
    return { reply: akui, actions: [], next };
  }
  return {
    reply: balasanDenganPrompt(
      akui,
      indonesian ? HANDOFF_CONSENT_TAIL_ID : HANDOFF_CONSENT_TAIL_EN,
    ),
    actions: [],
    next,
  };
}

/**
 * Transisi state untuk penerimaan lampiran (pesan non-teks): penerimaannya
 * dicatat pada draft tanpa mengisi bidang mana pun. Pesan non-teks pertama
 * tetap mengarahkan ke pengumpulan seperti chat masuk lainnya (ADR-0009);
 * setelah ringkasan terkirim, lampiran menjadi bagian pembaruan (tiket 05).
 */
function nextStateLampiran(state: FlowState): FlowState {
  if (state.kind === "idle") {
    return { kind: "collecting", draft: denganLampiran(EMPTY_DRAFT) };
  }
  if (state.kind === "collecting") {
    return { kind: "collecting", draft: denganLampiran(state.draft) };
  }
  if (state.kind === "awaiting-consent") {
    return { kind: "awaiting-consent", draft: denganLampiran(state.draft) };
  }
  if (state.kind === "sent" || state.kind === "awaiting-revision-consent") {
    return { kind: "awaiting-revision-consent", draft: denganLampiran(state.draft) };
  }
  if (state.kind === "reasking-field") {
    return { ...state, draft: denganLampiran(state.draft) };
  }
  if (state.kind === "awaiting-question") {
    return { kind: "awaiting-question", resume: nextStateLampiran(state.resume) };
  }
  return state;
}

function denganLampiran(draft: FollowUpDraft): FollowUpDraft {
  return { ...draft, attachmentCount: draft.attachmentCount + 1 };
}

/**
 * Transisi state murni dari state saat ini dan teks calon jemaah.
 * `hasilKlasifikasi` dipakai bila klasifikasi pesan ini sudah dihitung
 * sebelumnya; selain itu (termasuk pemutaran ulang giliran riwayat tanpa
 * hasil tersimpan) memakai `classifyInbound()`.
 */
function nextState(
  state: FlowState,
  text: string,
  hasilKlasifikasi?: InboundRouting,
): FlowState {
  const routing = hasilKlasifikasi ?? classifyInbound(text);
  const mendesak = isUrgentHandoffRequest(text, routing);
  const penyela = mendesak ? null : deteksiPenyela(text);
  const pertanyaanHarga = routing.kind === "indicative-price" && isPertanyaan(text);

  // Penyela pengumpulan (`.scratch/penyela-pengumpulan`): pertanyaan berkata
  // kunci tidak pernah menjadi jawaban bidang — isinya dicatat ke Bagian
  // Pertanyaan — dan permintaan "hapus bagian X" mengosongkan bidang itu untuk
  // diulang jawabannya. Pertanyaan Harga Indikatif tetap dijawab dari materi.
  if (!mendesak) {
    if (state.kind === "awaiting-question") {
      if (penyela?.jenis === "perbaikan-bidang") {
        return nextStatePerbaikan(state, penyela.bidang);
      }
      if (penyela?.jenis === "pertanyaan-polos" || isBasaBasi(text)) {
        return state;
      }
      // Pesan apa pun (non-mendesak) berikutnya adalah isi pertanyaannya.
      // Isi berupa pertanyaan harga yang dijawab dari materi tidak dicatat ke
      // Bagian Pertanyaan (konsisten dengan jalur lain, `.scratch/harga-di-semua-fase`).
      if (routing.kind === "indicative-price" && isPertanyaan(text)) {
        return state.resume;
      }
      return catatKePertanyaan(state.resume, text);
    }
    if (penyela !== null && !pertanyaanHarga && stateMemilikiDraft(state)) {
      if (penyela.jenis === "perbaikan-bidang") {
        return nextStatePerbaikan(state, penyela.bidang);
      }
      return penyela.jenis === "pertanyaan-polos"
        ? { kind: "awaiting-question", resume: resumeDari(state) }
        : catatKePertanyaan(state, text);
    }
    if (penyela?.jenis === "perbaikan-bidang" && state.kind === "idle") {
      // Belum ada yang bisa dihapus; langsung arahkan ke pengumpulan.
      return { kind: "collecting", draft: EMPTY_DRAFT };
    }
  }

  const menungguPersetujuan =
    state.kind === "awaiting-consent" ||
    state.kind === "awaiting-handoff-consent" ||
    state.kind === "awaiting-revision-consent";
  // Pertanyaan apa pun (termasuk pertanyaan harga yang memuat kata penolakan
  // seperti "boleh cek gak harganya?") bukan jawaban persetujuan — konsisten
  // dengan guard yang sama pada `step`.
  const pertanyaanTercatat = isPertanyaanTercatat(text, routing);
  if (menungguPersetujuan && !pertanyaanTercatat && (CONSENT_NO.test(text) || isConsentYes(text))) {
    return setelahPersetujuan(state, text);
  }

  // Pemicu yang menuntut manusia selalu menyela, termasuk saat pengumpulan.
  if (routing.kind === "handoff" && URGENT_TRIGGERS.has(routing.trigger)) {
    return { kind: "awaiting-handoff-consent", reason: routing.trigger, resume: resumeDari(state) };
  }
  if (state.kind === "admin-routed") {
    // Pertanyaan Harga Indikatif dijawab tanpa mengubah state; kata kunci
    // ulangi mengembalikan percakapan ke awal (tiket 02 `.scratch/tujuan-chat`).
    if (pertanyaanHarga) return state;
    if (isRestartRequest(text)) return { kind: "idle" };
    return state;
  }

  // Basa-basi bukan jawaban bidang, pertanyaan, maupun perubahan kebutuhan
  // (tiket 06); dari idle tetap membuka pengumpulan seperti chat lain.
  if (state.kind !== "idle" && isBasaBasi(text)) {
    return state;
  }

  // Pembuka umum setelah pilihan Calon Jemaah belum menjawab bidang layanan;
  // perilakunya tetap sama dengan pembuka intake sebelum menu tujuan.
  if (
    state.kind === "collecting" &&
    state.draft.interestedServices === null &&
    /\b(konsultasi|consultation)\b/i.test(text)
  ) {
    return state;
  }

  if (state.kind === "reasking-field") {
    // Jawaban ulang bidang; pertanyaan yang menyela dicatat tanpa mengisi
    // bidang yang sedang diulang (invarian tiket 06).
    const pertanyaanMenyela = isPertanyaanTercatat(text, routing);
    if (pertanyaanMenyela) {
      return routing.kind === "indicative-price"
        ? state
        : { ...state, draft: catatPertanyaan(state.draft, text) };
    }
    return isiUlangBidang(state, text);
  }
  if (state.kind === "collecting") {
    const pertanyaanMenyela = isPertanyaanTercatat(text, routing);
    if (pertanyaanMenyela) {
      // Pertanyaan tidak menjadi jawaban bidang: Harga Indikatif dijawab oleh
      // `step`, pertanyaan non-harga dicatat apa adanya dan dibawa ke admin.
      return routing.kind === "indicative-price"
        ? state
        : { kind: "collecting", draft: catatPertanyaan(state.draft, text) };
    }
    // Selain itu klasifikasi diabaikan saat pengumpulan: jawaban bidang seperti
    // "Butuh kamar keluarga" tidak boleh salah jadi pemicu handoff atau FAQ.
    const draft = fillNextField(state.draft, text);
    return draft.budgetResolved
      ? { kind: "awaiting-consent", draft }
      : { kind: "collecting", draft };
  }
  if (state.kind === "sent" || state.kind === "awaiting-revision-consent") {
    // Setelah Ringkasan Kebutuhan terkirim (tiket 05): pesan berikutnya adalah
    // pembaruan kebutuhan. Pertanyaan non-harga dicatat sebagai bagian
    // kebutuhan, pertanyaan Harga Indikatif dijawab tanpa mengubah kebutuhan,
    // dan selain itu (termasuk pernyataan bermuatan kata harga) dicatat sebagai
    // perubahan — semuanya apa adanya.
    if (routing.kind === "indicative-price" && isPertanyaan(text)) {
      return state;
    }
    // Ulangi percakapan (tiket 02): state kembali ke idle; balasan pengulangan
    // memuat menu tujuan sehingga pemutaran riwayat berikutnya memulai
    // percakapan baru. Pesan pemicu tidak dicatat sebagai perubahan.
    if (isRestartRequest(text)) {
      return { kind: "idle" };
    }
    const diperbarui = isPertanyaanTercatat(text, routing)
      ? catatPertanyaan(state.draft, text)
      : catatPerubahan(state.draft, text);
    return { kind: "awaiting-revision-consent", draft: diperbarui };
  }
  if (menungguPersetujuan) {
    if (
      state.kind === "awaiting-consent" &&
      isPertanyaanTercatat(text, routing) &&
      routing.kind !== "indicative-price"
    ) {
      // Pertanyaan non-harga yang menyela konfirmasi dicatat sebagai bagian
      // kebutuhan, bukan dijawab dari materi (ADR-0009). Pertanyaan harga yang
      // dijawab dari materi tidak dicatat (konsisten dengan `collecting`/`sent`).
      return { kind: "awaiting-consent", draft: catatPertanyaan(state.draft, text) };
    }
    // Jawaban tidak jelas: tetap tunggu persetujuan (balasan meminta konfirmasi).
    return state;
  }

  if (routing.kind === "handoff" && !isPertanyaan(text)) {
    return { kind: "awaiting-handoff-consent", reason: routing.trigger, resume: resumeDari(state) };
  }
  if (routing.kind === "handoff") {
    // Tiket 10: pertanyaan yang harus diteruskan ke admin (topik tanpa materi,
    // penawaran/ketersediaan, booking/pembayaran) tetapi datang sebagai pesan
    // pertama tidak langsung meminta persetujuan handoff tanpa isi. Pesannya
    // dicatat sebagai bagian kebutuhan dan alur intake berlanjut, sehingga
    // admin menerima pertanyaannya pada Ringkasan Kebutuhan (ADR-0009).
    return { kind: "collecting", draft: catatPertanyaan(EMPTY_DRAFT, text) };
  }
  // ADR-0009: setiap pesan prospek yang tidak menyela ke handoff langsung
  // masuk pengumpulan Permintaan Tindak Lanjut, tanpa pola pembuka khusus.
  return {
    kind: "collecting",
    draft: routing.kind === "faq" ? catatPertanyaan(EMPTY_DRAFT, text) : EMPTY_DRAFT,
  };
}

/**
 * State setelah jawaban persetujuan (setuju/tidak). Pengiriman ringkasan
 * pertama dan handoff percakapan kembali ke idle; pengiriman ulang kembali ke
 * mode pembaruan agar riwayat ringkasan yang sudah terkirim tetap ada (tiket
 * 05), dan state yang terputus oleh handoff dipulihkan apa adanya.
 */
function setelahPersetujuan(state: FlowState, text: string): FlowState {
  if (state.kind === "awaiting-handoff-consent") {
    return state.resume;
  }
  if (state.kind === "awaiting-revision-consent") {
    // Penolakan pengiriman ulang tidak menghapus catatan perubahan; tidak ada
    // yang terkirim tanpa persetujuan.
    return { kind: "sent", draft: state.draft };
  }
  if (state.kind === "awaiting-consent") {
    return CONSENT_NO.test(text) ? { kind: "idle" } : { kind: "sent", draft: state.draft };
  }
  return { kind: "idle" };
}

/** State yang dipulihkan setelah handoff; tumpukan handoff diratakan. */
function resumeDari(state: FlowState): FlowState {
  return state.kind === "awaiting-handoff-consent" || state.kind === "awaiting-question"
    ? state.resume
    : state;
}

/** Catat perubahan kebutuhan apa adanya sebagai bagian Ringkasan Kebutuhan. */
function catatPerubahan(draft: FollowUpDraft, text: string): FollowUpDraft {
  return { ...draft, changeNotes: [...draft.changeNotes, text] };
}

/** Catat pertanyaan non-harga apa adanya sebagai bagian kebutuhan. */
function catatPertanyaan(draft: FollowUpDraft, text: string): FollowUpDraft {
  return { ...draft, notedQuestions: [...draft.notedQuestions, text] };
}

/**
 * Catat pertanyaan menyela ke Bagian Pertanyaan state yang sedang berjalan,
 * apa adanya, tanpa mengubah alur: pengumpulan berlanjut, konfirmasi tetap
 * menunggu, dan setelah ringkasan terkirim masuk alur pembaruan (tiket 05).
 */
function catatKePertanyaan(state: FlowState, text: string): FlowState {
  switch (state.kind) {
    case "collecting":
      return { kind: "collecting", draft: catatPertanyaan(state.draft, text) };
    case "awaiting-consent":
      return { kind: "awaiting-consent", draft: catatPertanyaan(state.draft, text) };
    case "sent":
    case "awaiting-revision-consent":
      return { kind: "awaiting-revision-consent", draft: catatPertanyaan(state.draft, text) };
    case "reasking-field":
      return { ...state, draft: catatPertanyaan(state.draft, text) };
    default:
      return state;
  }
}

/** State punya draft yang dapat diperbaiki/ditambahi Bagian Pertanyaan. */
function stateMemilikiDraft(state: FlowState): boolean {
  return (
    state.kind === "collecting" ||
    state.kind === "awaiting-consent" ||
    state.kind === "awaiting-revision-consent" ||
    state.kind === "sent" ||
    state.kind === "reasking-field"
  );
}

function draftDari(state: FlowState): FollowUpDraft {
  switch (state.kind) {
    case "collecting":
    case "awaiting-consent":
    case "awaiting-revision-consent":
    case "sent":
    case "reasking-field":
      return state.draft;
    case "awaiting-question":
      return draftDari(state.resume);
    default:
      return EMPTY_DRAFT;
  }
}

function bidangTerisi(draft: FollowUpDraft, bidang: BidangKebutuhan): boolean {
  switch (bidang) {
    case "interestedServices":
      return draft.interestedServices !== null;
    case "travelDateOrPeriod":
      return draft.travelDateOrPeriod !== null;
    case "travellerCount":
      return draft.travellerCount !== null;
    case "detailedNeeds":
      return draft.detailedNeeds !== null;
    case "budgetRange":
      return draft.budgetRange !== null;
  }
}

function kosongkanBidang(draft: FollowUpDraft, bidang: BidangKebutuhan): FollowUpDraft {
  switch (bidang) {
    case "interestedServices":
      return { ...draft, interestedServices: null };
    case "travelDateOrPeriod":
      return { ...draft, travelDateOrPeriod: null };
    case "travellerCount":
      return { ...draft, travellerCount: null };
    case "detailedNeeds":
      return { ...draft, detailedNeeds: null };
    case "budgetRange":
      return { ...draft, budgetRange: null, budgetResolved: false };
  }
}

/** Isi satu bidang yang sedang diulang jawabannya; anggaran tetap boleh dilewati. */
function isiBidang(draft: FollowUpDraft, bidang: BidangKebutuhan, text: string): FollowUpDraft {
  if (bidang === "budgetRange") {
    return {
      ...draft,
      budgetRange: SKIP_ANSWER.test(text) ? null : text,
      budgetResolved: true,
    };
  }
  switch (bidang) {
    case "interestedServices":
      return { ...draft, interestedServices: text };
    case "travelDateOrPeriod":
      return { ...draft, travelDateOrPeriod: text };
    case "travellerCount":
      return { ...draft, travellerCount: text };
    case "detailedNeeds":
      return { ...draft, detailedNeeds: text };
  }
}

/**
 * Transisi perbaikan bidang: kosongkan bidang yang disebut dan sudah terisi,
 * lalu minta ulang jawabannya satu per satu sebelum kembali ke state
 * sebelumnya. Bidang yang belum terisi tidak mengubah state.
 */
function nextStatePerbaikan(
  state: FlowState,
  bidang: readonly BidangKebutuhan[],
): FlowState {
  const draft = draftDari(state);
  const terisi = bidang.filter((b) => bidangTerisi(draft, b));
  if (terisi.length === 0) {
    return state.kind === "idle" ? { kind: "collecting", draft: EMPTY_DRAFT } : state;
  }
  const dikosongkan = terisi.reduce(kosongkanBidang, draft);
  const sisaSebelum = state.kind === "reasking-field" ? state.sisa : [];
  return {
    kind: "reasking-field",
    draft: dikosongkan,
    sisa: URUTAN_BIDANG.filter((b) => terisi.includes(b) || sisaSebelum.includes(b)),
    // Pengulangan yang belum selesai digabung; state yang dikembalikan tetap
    // yang sebelum pengulangan pertama.
    resume: state.kind === "reasking-field" ? state.resume : resumeDari(state),
  };
}

/**
 * Jawaban ulang satu bidang pada `sisa[0]`; bila sudah habis, kembali ke
 * state sebelumnya dengan draft yang sudah diperbarui.
 */
function isiUlangBidang(
  state: Extract<FlowState, { readonly kind: "reasking-field" }>,
  text: string,
): FlowState {
  const [pertama, ...sisa] = state.sisa;
  if (pertama === undefined) {
    return state;
  }
  const draft = isiBidang(state.draft, pertama, text);
  return sisa.length > 0
    ? { ...state, draft, sisa }
    : kembaliDariReask(state.resume, draft);
}

/** State sebelumnya yang dipulihkan setelah seluruh bidang diulang. */
function kembaliDariReask(resume: FlowState, draft: FollowUpDraft): FlowState {
  switch (resume.kind) {
    case "awaiting-consent":
      return { kind: "awaiting-consent", draft };
    case "sent":
    case "awaiting-revision-consent":
      return { kind: "awaiting-revision-consent", draft };
    default:
      return { kind: "collecting", draft };
  }
}

function isConsentYes(text: string): boolean {
  return CONSENT_YES.test(text) || CONSENT_YES_ANYWHERE.test(text);
}

/**
 * Isi bidang wajib berikutnya yang masih kosong. Kebutuhan detail adalah
 * bidang terakhir: begitu terisi, pengumpulan dianggap selesai (`budgetResolved`)
 * dan alur langsung ke persetujuan penerusan — kisaran anggaran tidak ditanya.
 */
function fillNextField(draft: FollowUpDraft, text: string): FollowUpDraft {
  if (draft.interestedServices === null) {
    return { ...draft, interestedServices: text };
  }
  if (draft.travelDateOrPeriod === null) {
    return { ...draft, travelDateOrPeriod: text };
  }
  if (draft.travellerCount === null) {
    return { ...draft, travellerCount: text };
  }
  if (draft.detailedNeeds === null) {
    return { ...draft, detailedNeeds: text, budgetResolved: true };
  }
  return { ...draft, budgetResolved: true };
}

/** Penjelasan singkat alasan handoff, lalu penjelasan tujuan penerusan + persetujuan. */
function promptHandoff(reason: HandOffReason, indonesian: boolean): string {
  return `${leadHandoff(reason, indonesian)} ${indonesian ? HANDOFF_CONSENT_TAIL_ID : HANDOFF_CONSENT_TAIL_EN}`;
}

function leadHandoff(reason: HandOffReason, indonesian: boolean): string {
  const leads: Record<HandOffReason, readonly [id: string, en: string]> = {
    "human-request": [
      "Baik, permintaan Anda untuk berbicara dengan tim kami dapat saya teruskan.",
      "Sure, your request to speak with our team can be forwarded.",
    ],
    "unsupported-question": [
      "Mohon maaf, pertanyaan tersebut belum dapat saya jawab dari informasi yang tersedia.",
      "I'm sorry, I cannot answer that question from the information available.",
    ],
    "custom-quote-or-availability": [
      "Penawaran khusus serta konfirmasi harga dan ketersediaan perlu ditangani tim kami.",
      "Special quotes and price/availability confirmations need to be handled by our team.",
    ],
    "agency-or-corporate": [
      "Pertanyaan dari agen atau korporasi akan ditangani langsung oleh tim kami.",
      "Enquiries from agencies or corporations are handled directly by our team.",
    ],
    "booking-or-payment": [
      "Transaksi booking dan pembayaran tidak ditangani oleh asisten ini.",
      "Booking and payment transactions are not handled by this assistant.",
    ],
    "active-trip": [
      "Untuk perjalanan yang sedang berlangsung, tim kami yang dapat membantu langsung.",
      "For trips already in progress, our team can assist you directly.",
    ],
    emergency: [
      "Untuk keadaan darurat, tim kami yang dapat menangani langsung.",
      "For emergencies, our team can handle this directly.",
    ],
    "follow-up-request": [
      "Permintaan Anda dapat ditindaklanjuti oleh tim kami.",
      "Your request can be followed up by our team.",
    ],
    vendor_mitra: [
      "Permintaan vendor atau mitra bisnis akan ditangani tim kami.",
      "Vendor or business partner enquiries will be handled by our team.",
    ],
    internal: [
      "Pesan untuk tim internal akan diteruskan kepada tim kami.",
      "Your message for the internal team will be forwarded to our team.",
    ],
    other: [
      "Keperluan Anda akan diteruskan kepada tim kami.",
      "Your request will be forwarded to our team.",
    ],
  };
  const entry = leads[reason];
  return indonesian ? entry[0] : entry[1];
}

function toFollowUpRequest(draft: FollowUpDraft): FollowUpRequest {
  return {
    interestedServices: draft.interestedServices ?? "",
    travelDateOrPeriod: draft.travelDateOrPeriod ?? "",
    travellerCount: draft.travellerCount ?? "",
    detailedNeeds: draft.detailedNeeds ?? "",
    budgetRange: draft.budgetRange,
    notedQuestions: [...draft.notedQuestions],
    attachmentCount: draft.attachmentCount,
    changeNotes: [...draft.changeNotes],
  };
}

function promptForNextField(draft: FollowUpDraft, indonesian: boolean): string {
  if (draft.interestedServices === null) {
    return indonesian ? COLLECT_INTERESTED_SERVICES_ID : COLLECT_INTERESTED_SERVICES_EN;
  }
  if (draft.travelDateOrPeriod === null) {
    return indonesian ? COLLECT_TRAVEL_DATE_OR_PERIOD_ID : COLLECT_TRAVEL_DATE_OR_PERIOD_EN;
  }
  if (draft.travellerCount === null) {
    return indonesian ? COLLECT_TRAVELLER_COUNT_ID : COLLECT_TRAVELLER_COUNT_EN;
  }
  if (draft.detailedNeeds === null) {
    return indonesian ? COLLECT_DETAILED_NEEDS_ID : COLLECT_DETAILED_NEEDS_EN;
  }
  // Semua bidang terisi: pengumpulan selesai dan alur berpindah ke
  // permintaan persetujuan penerusan. Kisaran anggaran tidak ditanyakan.
  return "";
}

/**
 * Penjelasan tujuan penerusan sekaligus permintaan persetujuan calon jemaah.
 * Ringkasan ditampilkan per bidang untuk diperiksa lebih dulu (tiket 03);
 * istilahnya mengikuti `CONTEXT.md`: Ringkasan Kebutuhan dari Permintaan
 * Tindak Lanjut. Teksnya bebas placeholder internal.
 */
function consentPrompt(draft: FollowUpDraft, indonesian: boolean): string {
  if (indonesian) {
    return (
      "Berikut Ringkasan Kebutuhan dari Permintaan Tindak Lanjut Anda:\n" +
      ringkasanKebutuhan(draft, true) +
      "\nAgar dapat ditindaklanjuti, informasi ini akan saya teruskan kepada tim customer service/penjualan MUTAWWIFMU. " +
      "Apakah Anda setuju informasi ini diteruskan?"
    );
  }
  return (
    "Here is the summary of your needs from this follow-up request:\n" +
    ringkasanKebutuhan(draft, false) +
    "\nTo allow follow-up, this information will be forwarded to the MUTAWWIFMU customer service/sales team. " +
    "Do you consent to this information being forwarded?"
  );
}

/**
 * Persetujuan pengiriman ulang setelah perubahan kebutuhan (tiket 05):
 * Ringkasan Kebutuhan yang diperbarui ditampilkan apa adanya, lalu dimintai
 * persetujuan khusus untuk pengiriman ulang sebagai PEMBARUAN — tidak pernah
 * dikirim ulang diam-diam.
 */
function revisiConsentPrompt(draft: FollowUpDraft, indonesian: boolean): string {
  if (indonesian) {
    return (
      "Berikut Ringkasan Kebutuhan yang diperbarui dari Permintaan Tindak Lanjut Anda:\n" +
      ringkasanKebutuhan(draft, true) +
      "\nRingkasan yang diperbarui ini akan saya kirim ulang kepada tim customer service/penjualan MUTAWWIFMU " +
      "sebagai PEMBARUAN atas ringkasan yang sudah dikirim sebelumnya. " +
      "Apakah Anda setuju pengiriman ulang ini?"
    );
  }
  return (
    "Here is the updated summary of your needs from this follow-up request:\n" +
    ringkasanKebutuhan(draft, false) +
    "\nThis updated summary will be re-sent to the MUTAWWIFMU customer service/sales team " +
    "as an update to the summary sent earlier. " +
    "Do you consent to this re-send?"
  );
}

/** Ringkasan Kebutuhan per bidang, nilai apa adanya dari calon jemaah. */
function ringkasanKebutuhan(draft: FollowUpDraft, indonesian: boolean): string {
  const value = (v: string | null): string => v ?? (indonesian ? "tidak disampaikan" : "not provided");
  const lampiran =
    draft.attachmentCount > 0
      ? [
          indonesian
            ? `- Lampiran: ${draft.attachmentCount} pesan non-teks diterima (isinya tidak ditafsirkan)`
            : `- Attachments: ${draft.attachmentCount} non-text message(s) received (contents not interpreted)`,
        ]
      : [];
  const pertanyaan = draft.notedQuestions.map((q) =>
    indonesian ? `- Pertanyaan yang dicatat: ${q}` : `- Noted question: ${q}`,
  );
  const perubahan = draft.changeNotes.map((catatan) =>
    indonesian ? `- Perubahan: ${catatan}` : `- Change: ${catatan}`,
  );
  if (indonesian) {
    return [
      `- Layanan yang diminati: ${value(draft.interestedServices)}`,
      `- Tanggal/periode: ${value(draft.travelDateOrPeriod)}`,
      `- Jumlah jemaah: ${value(draft.travellerCount)}`,
      `- Kebutuhan detail: ${value(draft.detailedNeeds)}`,
      ...perubahan,
      ...lampiran,
      ...pertanyaan,
    ].join("\n");
  }
  return [
    `- Services of interest: ${value(draft.interestedServices)}`,
    `- Travel date/period: ${value(draft.travelDateOrPeriod)}`,
    `- Number of travellers: ${value(draft.travellerCount)}`,
    `- Detailed needs: ${value(draft.detailedNeeds)}`,
    ...perubahan,
    ...lampiran,
    ...pertanyaan,
  ].join("\n");
}

function initialReplyFor(indonesian: boolean): string {
  return indonesian ? INITIAL_REPLY_ID : INITIAL_REPLY_EN;
}
