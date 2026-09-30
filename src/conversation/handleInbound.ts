import type {
  BotTurn,
  ConversationAction,
  ConversationContext,
  FollowUpRequest,
  HandOffReason,
  InboundMessage,
} from "./types.ts";

const INITIAL_REPLY_ID =
  "Halo! Terima kasih sudah menghubungi MUTAWWIFMU. " +
  "Saya asisten otomatis yang tersedia kapan saja untuk membantu informasi awal tentang layanan kami. " +
  "Apa yang ingin Anda tanyakan?";

const INITIAL_REPLY_EN =
  "Hello! Thank you for contacting MUTAWWIFMU. " +
  "I'm an automated assistant available anytime to help with early information about our services. " +
  "What would you like to ask?";

/**
 * Penanda bahasa pada pesan Calon Jemaah. Hanya kata fungsi/sapaan — kata
 * domain (umrah, harga, dll.) dipakai di kedua bahasa dan tidak menjadi
 * penanda yang baik. Pesan pendek yang ambigu mengikuti bahasa percakapan.
 */
const INDONESIAN_MARKERS =
  /\b(saya|aku|kami|ingin|mau|bertanya|tanya|tentang|untuk|bisa|dapat|apakah|bagaimana|berapa|kak|halo|assalamualaikum|terima kasih|tolong|ini|itu|sudah|belum|juga|adalah|dengan|yang|dan|atau|saja)\b/i;

const ENGLISH_MARKERS =
  /\b(i|we|my|our|want|would|like|please|hello|hi|hey|thanks|thank you|about|consultation|trip|travel|planning|can you|could you|how much|how many)\b/i;

/**
 * Penanda permintaan konsultasi pra-pemesanan yang menjadi awal Permintaan
 * Tindak Lanjut (lihat spec "Implementation Decisions").
 */
const FOLLOW_UP_START =
  /\b(konsultasi|konsultasikan|tindak lanjut|tindaklanjut|ditindaklanjuti|hubungi saya|dihubungi|(mau|ingin) (daftar|berangkat|umrah|umroh|haji|pergi)|merencanakan (umrah|umroh|haji|perjalanan)|rencana (umrah|umroh|haji|perjalanan)|info(rmasi)? lebih lanjut|consultation|consult(ing)?|follow[- ]?up|get back to me|contact me|planning (a |an )?(trip|umrah|umroh|hajj|journey))\b/i;

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
  "untuk ditindaklanjuti. Waktu balasan dari tim belum dapat saya pastikan.";
const CONFIRM_FORWARDED_EN =
  "Thank you. Your request has been forwarded to the MUTAWWIFMU customer service/sales team " +
  "for follow-up. I cannot confirm when the team will respond.";

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

const COLLECT_SERVICE_OR_DESTINATION_ID =
  "Baik, saya bantu mencatat Permintaan Tindak Lanjut Anda. " +
  "Layanan atau tujuan apa yang Anda minati?";
const COLLECT_SERVICE_OR_DESTINATION_EN =
  "Sure, I can note down your follow-up request. " +
  "Which service or destination are you interested in?";

const COLLECT_TRAVEL_DATE_OR_PERIOD_ID = "Terima kasih. Kapan rencana tanggal atau periode perjalanan Anda?";
const COLLECT_TRAVEL_DATE_OR_PERIOD_EN = "Thank you. When is your planned travel date or period?";

const COLLECT_TRAVELLER_COUNT_ID = "Berapa jumlah jemaah yang akan berangkat?";
const COLLECT_TRAVELLER_COUNT_EN = "How many travellers will be going?";

const COLLECT_MAIN_NEEDS_ID = "Apa kebutuhan utama Anda untuk perjalanan ini?";
const COLLECT_MAIN_NEEDS_EN = "What are your main needs for this trip?";

const COLLECT_BUDGET_ID =
  "Apakah ada kisaran anggaran yang ingin disampaikan? Ini opsional — Anda boleh melewatinya.";
const COLLECT_BUDGET_EN =
  "Do you have a budget range you would like to share? This is optional — you may skip it.";

/**
 * Bidang Permintaan Tindak Lanjut yang sedang dikumpulkan. Nilai disimpan apa
 * adanya dari calon jemaah; `budgetResolved` menandai bidang opsional sudah
 * dijawab atau dilewati. Bidang null berarti belum terisi.
 */
interface FollowUpDraft {
  readonly serviceOrDestination: string | null;
  readonly travelDateOrPeriod: string | null;
  readonly travellerCount: string | null;
  readonly mainNeeds: string | null;
  readonly budgetRange: string | null;
  readonly budgetResolved: boolean;
}

/**
 * Pemicu handoff (spec: kasus yang diteruskan ke admin). Deteksi berbasis
 * penanda teks yang sengaja konservatif; keputusan akhir tetap pada manusia.
 */
const HUMAN_REQUEST =
  /\b((talk|speak|chat)\s+(to|with)\s+(a\s+|an\s+)?(human|person|someone|real person|staff|manager|admin|customer service|agent)|(bicara|ngobrol|ngomong|chat|telepon|kontak|hubungi|hubungkan|sambungkan)\s+(saya\s+|kami\s+)?(dengan|ke|kepada|to)?\s*(manusia|orang|admin|cs\b|customer service|staff|karyawan|human|person|agent|manager|tim)|(minta|tolong)\s+(bicara|dihubungi|ketemu|ditemui)\s+(dengan\s+)?(admin|cs|manusia|orang))\b/i;

const ACTIVE_TRIP =
  /\b((sedang|lagi|tengah|saat ini|currently)\s+(berada\s+)?(di|dalam)\s+(mekkah|makkah|madinah|jeddah|tanah suci|arab|saudi|bandara|hotel|perjalanan|penerbangan|pesawat)|(i am|i'm|we are|we're)\s+(currently\s+)?(in|on|at|traveling|travelling))\b/i;

const EMERGENCY =
  /\b(darurat|emergency|urgent|kecelakaan|musibah|kebakaran|banjir|gempa|bencana|sakit (berat|parah)|masuk (rs|rumah sakit)|meninggal|kecopetan|kehilangan (paspor|barang|dompet|dokumen|bagasi|uang)|terjebak|terdampar|ditipu)\b/i;

const BOOKING_OR_PAYMENT =
  /\b(booking|book|memesan|pesan|pemesanan|order|pembayaran|bayar|membayar|payment|pay|transfer (dana|uang|bank)|refund|pembatalan|batal|cancel|reschedule|ubah (jadwal|tanggal)|ganti (jadwal|tanggal)|invoice|kwitansi|down payment|\bdp\b)\b/i;

const AGENCY_OR_CORPORATE =
  /\b(agen travel|travel agent|agent travel|agency|agen\b|korporasi|corporate|institusi|institution|instansi|perusahaan|kantor|reseller|b2b|company|study tour|yayasan|kerja sama|partnership)\b/i;

const CUSTOM_QUOTE_OR_AVAILABILITY =
  /\b(penawaran (khusus|harga)|special (offer|price)|custom (price|quote)|quote|quotation|konfirmasi (harga|ketersediaan)|harga (final|pasti|fix|net)|diskon|discount|negosiasi|negotiate|ketersediaan|availability|available|masih (tersedia|ada|kosong|buka)|ready (stock|room)|kuota)\b/i;

/**
 * Pertanyaan eksplisit yang belum didukung materi pada tahap ini — diteruskan
 * ke admin (spec: informasi tidak tersedia/tidak pasti jangan dikarang).
 * "ingin bertanya" tanpa pertanyaan konkret sengaja tidak termasuk (pembuka).
 */
const STRONG_QUESTION =
  /\?|\b(berapa|bagaimana|gimana|kapan|dimana|di mana|siapa|kenapa|mengapa|bisakah|bolehkah|adakah|apa itu|apakah|what|how|when|where|why|who|can i|can we|can you|could i|could you|would you|do you|does it|is there|are there|tell me|jelaskan|ceritakan|want to know|would like to know)\b/i;

/** Sapaan/pembuka tanpa pertanyaan substantif — dibalas sapaan seperti biasa. */
const PLEASANTRY = /apa kabar|how are you|gimana kabar|kabar (baik|saja)/i;
const GREETING_WORDS =
  /\b(halo|hai|hi\b|hello|hallo|pagi|siang|sore|malam|assalam|salam|permisi|tes|test)\b/i;

/** State alur percakapan; diturunkan dari riwayat sehingga seam tetap murni. */
type FlowState =
  | { readonly kind: "idle" }
  | { readonly kind: "collecting"; readonly draft: FollowUpDraft }
  | { readonly kind: "awaiting-consent"; readonly draft: FollowUpDraft }
  | { readonly kind: "awaiting-handoff-consent"; readonly reason: HandOffReason };

const EMPTY_DRAFT: FollowUpDraft = {
  serviceOrDestination: null,
  travelDateOrPeriod: null,
  travellerCount: null,
  mainNeeds: null,
  budgetRange: null,
  budgetResolved: false,
};

interface StepResult {
  readonly reply: string;
  readonly actions: readonly AksiInternal[];
  readonly next: FlowState;
}

/** Tindakan sebelum digabung konteks percakapan menjadi ConversationAction. */
type AksiInternal =
  | { readonly kind: "record-follow-up-request"; readonly request: FollowUpRequest }
  | {
      readonly kind: "hand-off-to-admin";
      readonly reason: HandOffReason;
      readonly request: FollowUpRequest | null;
    };

/**
 * Seam pemrosesan pesan masuk yang disepakati: menerima pesan beserta konteks
 * percakapan, menghasilkan balasan serta tindakan yang terlihat.
 */
export function handleInbound(message: InboundMessage, context: ConversationContext): BotTurn {
  if (message.text === null) {
    return { reply: null, actions: [] };
  }
  let state: FlowState = { kind: "idle" };
  for (const turn of context.history) {
    if (turn.role === "calon-jemaah") {
      state = nextState(state, turn.text);
    }
  }
  const indonesian = shouldReplyInIndonesian(context.history, message.text);
  const result = step(state, message.text, indonesian);
  const nextHistory = [
    ...context.history,
    { role: "calon-jemaah" as const, text: message.text },
    { role: "asisten" as const, text: result.reply },
  ];
  const actions: ConversationAction[] = result.actions.map((aksi) =>
    aksi.kind === "hand-off-to-admin"
      ? { kind: "hand-off-to-admin", reason: aksi.reason, request: aksi.request, history: nextHistory }
      : aksi,
  );
  return { reply: { text: result.reply }, actions };
}

/** Satu current pemrosesan teks: balasan, tindakan, dan state berikutnya. */
function step(state: FlowState, text: string, indonesian: boolean): StepResult {
  const next = nextState(state, text);

  if (state.kind === "awaiting-handoff-consent" && next.kind === "idle") {
    if (CONSENT_NO.test(text)) {
      return {
        reply: indonesian ? CONSENT_REFUSED_ID : CONSENT_REFUSED_EN,
        actions: [],
        next,
      };
    }
    return {
      reply: indonesian ? CONFIRM_HANDOFF_FORWARDED_ID : CONFIRM_HANDOFF_FORWARDED_EN,
      actions: [{ kind: "hand-off-to-admin", reason: state.reason, request: null }],
      next,
    };
  }

  if (state.kind === "awaiting-consent" && next.kind === "idle") {
    if (CONSENT_NO.test(text)) {
      return {
        reply: indonesian ? CONSENT_REFUSED_ID : CONSENT_REFUSED_EN,
        actions: [],
        next,
      };
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

  if (next.kind === "awaiting-handoff-consent") {
    return {
      reply: promptHandoff(next.reason, indonesian),
      actions: [],
      next,
    };
  }
  if (next.kind === "collecting") {
    return { reply: promptForNextField(next.draft, indonesian), actions: [], next };
  }
  if (next.kind === "awaiting-consent") {
    return {
      reply:
        state.kind === "awaiting-consent"
          ? indonesian
            ? CONSENT_REASK_ID
            : CONSENT_REASK_EN
          : consentPrompt(next.draft, indonesian),
      actions: [],
      next,
    };
  }
  return { reply: initialReplyFor(indonesian), actions: [], next };
}

/** Transisi state murni dari state saat ini dan teks calon jemaah. */
function nextState(state: FlowState, text: string): FlowState {
  const menungguPersetujuan =
    state.kind === "awaiting-consent" || state.kind === "awaiting-handoff-consent";
  if (menungguPersetujuan && (CONSENT_NO.test(text) || isConsentYes(text))) {
    return { kind: "idle" };
  }

  // Kasus yang menuntut manusia selalu menyela, termasuk saat pengumpulan.
  const alasanMendesak = detectUrgentReason(text);
  if (alasanMendesak !== null) {
    return { kind: "awaiting-handoff-consent", reason: alasanMendesak };
  }

  if (state.kind === "collecting") {
    const draft = fillNextField(state.draft, text);
    return draft.budgetResolved
      ? { kind: "awaiting-consent", draft }
      : { kind: "collecting", draft };
  }
  if (menungguPersetujuan) {
    // Jawaban tidak jelas: tetap tunggu persetujuan (balasan meminta konfirmasi).
    return state;
  }

  const alasan = detectHandOffReason(text);
  if (alasan !== null) {
    return { kind: "awaiting-handoff-consent", reason: alasan };
  }
  if (FOLLOW_UP_START.test(text)) {
    return { kind: "collecting", draft: EMPTY_DRAFT };
  }
  if (PLEASANTRY.test(text) || (GREETING_WORDS.test(text) && !STRONG_QUESTION.test(text))) {
    return state;
  }
  if (STRONG_QUESTION.test(text)) {
    return { kind: "awaiting-handoff-consent", reason: "unsupported-question" };
  }
  return state;
}

/** Pemicu yang menuntut penanganan manusia; menyela alur apa pun. */
function detectUrgentReason(text: string): HandOffReason | null {
  if (HUMAN_REQUEST.test(text)) {
    return "human-request";
  }
  if (ACTIVE_TRIP.test(text)) {
    return "active-trip";
  }
  if (EMERGENCY.test(text)) {
    return "emergency";
  }
  return null;
}

/** Pemicu handoff lain; hanya ditangani di luar alur pengumpulan. */
function detectHandOffReason(text: string): HandOffReason | null {
  if (BOOKING_OR_PAYMENT.test(text)) {
    return "booking-or-payment";
  }
  if (AGENCY_OR_CORPORATE.test(text)) {
    return "agency-or-corporate";
  }
  if (CUSTOM_QUOTE_OR_AVAILABILITY.test(text)) {
    return "custom-quote-or-availability";
  }
  return null;
}

function isConsentYes(text: string): boolean {
  return CONSENT_YES.test(text) || CONSENT_YES_ANYWHERE.test(text);
}

/** Isi bidang wajib berikutnya yang masih kosong, lalu bidang opsional anggaran. */
function fillNextField(draft: FollowUpDraft, text: string): FollowUpDraft {
  if (draft.serviceOrDestination === null) {
    return { ...draft, serviceOrDestination: text };
  }
  if (draft.travelDateOrPeriod === null) {
    return { ...draft, travelDateOrPeriod: text };
  }
  if (draft.travellerCount === null) {
    return { ...draft, travellerCount: text };
  }
  if (draft.mainNeeds === null) {
    return { ...draft, mainNeeds: text };
  }
  return {
    ...draft,
    budgetRange: SKIP_ANSWER.test(text) ? null : text,
    budgetResolved: true,
  };
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
  };
  const entry = leads[reason];
  return indonesian ? entry[0] : entry[1];
}

function toFollowUpRequest(draft: FollowUpDraft): FollowUpRequest {
  return {
    serviceOrDestination: draft.serviceOrDestination ?? "",
    travelDateOrPeriod: draft.travelDateOrPeriod ?? "",
    travellerCount: draft.travellerCount ?? "",
    mainNeeds: draft.mainNeeds ?? "",
    budgetRange: draft.budgetRange,
  };
}

function promptForNextField(draft: FollowUpDraft, indonesian: boolean): string {
  if (draft.serviceOrDestination === null) {
    return indonesian ? COLLECT_SERVICE_OR_DESTINATION_ID : COLLECT_SERVICE_OR_DESTINATION_EN;
  }
  if (draft.travelDateOrPeriod === null) {
    return indonesian ? COLLECT_TRAVEL_DATE_OR_PERIOD_ID : COLLECT_TRAVEL_DATE_OR_PERIOD_EN;
  }
  if (draft.travellerCount === null) {
    return indonesian ? COLLECT_TRAVELLER_COUNT_ID : COLLECT_TRAVELLER_COUNT_EN;
  }
  if (draft.mainNeeds === null) {
    return indonesian ? COLLECT_MAIN_NEEDS_ID : COLLECT_MAIN_NEEDS_EN;
  }
  return indonesian ? COLLECT_BUDGET_ID : COLLECT_BUDGET_EN;
}

/** Penjelasan tujuan penerusan sekaligus permintaan persetujuan calon jemaah. */
function consentPrompt(draft: FollowUpDraft, indonesian: boolean): string {
  if (indonesian) {
    return (
      "Berikut requestSummary Permintaan Tindak Lanjut Anda:\n" +
      requestSummary(draft, true) +
      "\nAgar dapat ditindaklanjuti, informasi ini akan saya teruskan kepada tim customer service/penjualan MUTAWWIFMU. " +
      "Apakah Anda setuju informasi ini diteruskan?"
    );
  }
  return (
    "Here is the summary of your follow-up request:\n" +
    requestSummary(draft, false) +
    "\nTo allow follow-up, this information will be forwarded to the MUTAWWIFMU customer service/sales team. " +
    "Do you consent to this information being forwarded?"
  );
}

function requestSummary(draft: FollowUpDraft, indonesian: boolean): string {
  const value = (v: string | null): string => v ?? (indonesian ? "tidak disampaikan" : "not provided");
  if (indonesian) {
    return [
      `- Layanan/tujuan: ${value(draft.serviceOrDestination)}`,
      `- Tanggal/periode: ${value(draft.travelDateOrPeriod)}`,
      `- Jumlah jemaah: ${value(draft.travellerCount)}`,
      `- Kebutuhan utama: ${value(draft.mainNeeds)}`,
      `- Kisaran anggaran: ${value(draft.budgetRange)}`,
    ].join("\n");
  }
  return [
    `- Service/destination: ${value(draft.serviceOrDestination)}`,
    `- Travel date/period: ${value(draft.travelDateOrPeriod)}`,
    `- Number of travellers: ${value(draft.travellerCount)}`,
    `- Main needs: ${value(draft.mainNeeds)}`,
    `- Budget range: ${value(draft.budgetRange)}`,
  ].join("\n");
}

function initialReplyFor(indonesian: boolean): string {
  return indonesian ? INITIAL_REPLY_ID : INITIAL_REPLY_EN;
}

/** Bahasa balasan: current ini bila terdeteksi, jika tidak bahasa percakapan sejauh ini. */
function shouldReplyInIndonesian(
  history: ConversationContext["history"],
  text: string,
): boolean {
  const current = detectTurnLanguage(text);
  if (current !== null) {
    return current === "id";
  }
  for (const turn of [...history].reverse()) {
    if (turn.role !== "calon-jemaah") {
      continue;
    }
    const previous = detectTurnLanguage(turn.text);
    if (previous !== null) {
      return previous === "id";
    }
  }
  return false;
}

function detectTurnLanguage(text: string): "id" | "en" | null {
  if (INDONESIAN_MARKERS.test(text)) {
    return "id";
  }
  if (ENGLISH_MARKERS.test(text)) {
    return "en";
  }
  return null;
}
