import { classifyInbound, type HandoffTrigger } from "./classifyInbound.ts";
import { resolveReplyLanguage, type Language } from "./language.ts";
import { faqAnswer } from "../knowledge/businessFaq.ts";
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
 * Pemicu yang menuntut penanganan manusia (spec: kasus yang diteruskan ke
 * admin); menyela alur apa pun, termasuk pengumpulan Permintaan Tindak Lanjut.
 */
const URGENT_TRIGGERS: ReadonlySet<HandoffTrigger> = new Set([
  "emergency",
  "active-trip",
  "human-request",
]);

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
  readonly actions: readonly InternalAction[];
  readonly next: FlowState;
}

/** Tindakan sebelum digabung konteks percakapan menjadi ConversationAction. */
type InternalAction =
  | { readonly kind: "record-faq-answer"; readonly topic: string }
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
  const language = resolveReplyLanguage(context.history, message.text);
  const result = step(state, message.text, language);
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

/** Satu langkah pemrosesan teks: balasan, tindakan, dan state berikutnya. */
function step(state: FlowState, text: string, language: Language): StepResult {
  const indonesian = language === "id";
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
  const routing = classifyInbound(text);
  if (routing.kind === "faq" || routing.kind === "indicative-price") {
    return {
      reply: faqAnswer(routing.topic, language),
      actions: [{ kind: "record-faq-answer", topic: routing.topic }],
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

  const routing = classifyInbound(text);

  // Pemicu yang menuntut manusia selalu menyela, termasuk saat pengumpulan.
  if (routing.kind === "handoff" && URGENT_TRIGGERS.has(routing.trigger)) {
    return { kind: "awaiting-handoff-consent", reason: routing.trigger };
  }

  if (state.kind === "collecting") {
    // Klasifikasi diabaikan saat pengumpulan: jawaban bidang seperti
    // "Butuh kamar keluarga" tidak boleh salah jadi pemicu handoff atau FAQ.
    const draft = fillNextField(state.draft, text);
    return draft.budgetResolved
      ? { kind: "awaiting-consent", draft }
      : { kind: "collecting", draft };
  }
  if (menungguPersetujuan) {
    // Jawaban tidak jelas: tetap tunggu persetujuan (balasan meminta konfirmasi).
    return state;
  }

  if (routing.kind === "handoff") {
    return { kind: "awaiting-handoff-consent", reason: routing.trigger };
  }
  if (FOLLOW_UP_START.test(text)) {
    return { kind: "collecting", draft: EMPTY_DRAFT };
  }
  // FAQ vs sapaan awal dibedakan saat menyusun balasan (lihat `step`).
  return state;
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
