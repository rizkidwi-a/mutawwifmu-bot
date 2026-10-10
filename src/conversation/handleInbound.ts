import {
  BENTUK_TANYA_SEHARI_HARI,
  classifyInbound,
  type HandoffTrigger,
  type InboundRouting,
} from "./classifyInbound.ts";
import { resolveReplyLanguage, type Language } from "./language.ts";
import { faqAnswer } from "../knowledge/businessFaq.ts";
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

const COLLECT_TRAVEL_DATE_OR_PERIOD_ID = "Terima kasih. Kapan rencana tanggal atau periode perjalanan Anda?";
const COLLECT_TRAVEL_DATE_OR_PERIOD_EN = "Thank you. When is your planned travel date or period?";

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
 * adanya dari calon jemaah; `budgetResolved` menandai bidang opsional sudah
 * dijawab atau dilewati. Bidang null berarti belum terisi.
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

/** State alur percakapan; diturunkan dari riwayat sehingga seam tetap murni. */
type FlowState =
  | { readonly kind: "idle" }
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
  | { readonly kind: "awaiting-revision-consent"; readonly draft: FollowUpDraft };

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
export function turnForInbound(message: InboundMessage): ConversationTurn {
  return message.text === null
    ? { role: "calon-jemaah", text: SEBUTAN_LAMPIRAN, attachment: true }
    : { role: "calon-jemaah", text: message.text };
}

/**
 * Seam pemrosesan pesan masuk yang disepakati: menerima pesan beserta konteks
 * percakapan, menghasilkan balasan serta tindakan yang terlihat.
 */
export function handleInbound(message: InboundMessage, context: ConversationContext): BotTurn {
  let state: FlowState = { kind: "idle" };
  for (const turn of context.history) {
    if (turn.role !== "calon-jemaah") {
      continue;
    }
    // Lampiran tidak pernah menjadi jawaban bidang; penerimaannya dicatat
    // terpisah oleh `nextStateLampiran`.
    state = turn.attachment === true ? nextStateLampiran(state) : nextState(state, turn.text);
  }
  const language = resolveReplyLanguage(context.history, message.text ?? "");
  const result =
    message.text === null ? stepLampiran(state, language) : step(state, message.text, language);
  return { reply: { text: result.reply }, actions: result.actions };
}

/** Satu langkah pemrosesan teks: balasan, tindakan, dan state berikutnya. */
function step(state: FlowState, text: string, language: Language): StepResult {
  const indonesian = language === "id";
  const next = nextState(state, text);
  const routing = classifyInbound(text);
  const leadPertanyaan = indonesian ? CATAT_PERTANYAAN_ID : CATAT_PERTANYAAN_EN;
  const menolak = CONSENT_NO.test(text);
  const menjawabPersetujuan = menolak || isConsentYes(text);
  const ditolak = {
    reply: indonesian ? CONSENT_REFUSED_ID : CONSENT_REFUSED_EN,
    actions: [],
    next,
  };

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
      return ditolak;
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

  // Basa-basi (tiket 06) dibalas singkat: tidak mengisi bidang, tidak mencatat
  // perubahan, dan tidak memicu jawaban template — alur yang sedang berjalan
  // (bidang yang ditanya, konfirmasi, atau penutup) tetap dilanjutkan.
  if (state.kind !== "idle" && isBasaBasi(text)) {
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
    const jawaban = faqAnswer(routing.topic, language);
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

  if (next.kind === "awaiting-handoff-consent") {
    return {
      reply: promptHandoff(next.reason, indonesian),
      actions: [],
      next,
    };
  }
  if (next.kind === "awaiting-consent") {
    const reask = indonesian ? CONSENT_REASK_ID : CONSENT_REASK_EN;
    if (state.kind !== "awaiting-consent") {
      return { reply: consentPrompt(next.draft, indonesian), actions: [], next };
    }
    // Pertanyaan non-harga yang menyela konfirmasi dicatat apa adanya; balasan
    // tetap meminta konfirmasi persetujuan.
    const dicatat = isPertanyaanTercatat(text, routing);
    return { reply: dicatat ? balasanDenganPrompt(leadPertanyaan, reask) : reask, actions: [], next };
  }

  const menyela = state.kind === "collecting" && isPertanyaanTercatat(text, routing);

  if (next.kind === "collecting") {
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
        reply: balasanDenganPrompt(faqAnswer(routing.topic, language), prompt),
        actions: [{ kind: "record-faq-answer", topic: routing.topic }],
        next,
      };
    }
    // Pertanyaan non-harga (apa pun routing-nya) dicatat apa adanya dan dibawa
    // ke admin (tiket 06); pesan tanpa tanda pertanyaan diperlakukan sebagai
    // informasi/kebutuhan dan tetap membuka pengumpulan dari state idle.
    const dicatat = isPertanyaanTercatat(text, routing);
    return {
      reply: balasanDenganPrompt(dicatat ? leadPertanyaan : initialReplyFor(indonesian), prompt),
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
      reply: balasanDenganPrompt(lead, revisiConsentPrompt(next.draft, indonesian)),
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
  return state;
}

function denganLampiran(draft: FollowUpDraft): FollowUpDraft {
  return { ...draft, attachmentCount: draft.attachmentCount + 1 };
}

/** Transisi state murni dari state saat ini dan teks calon jemaah. */
function nextState(state: FlowState, text: string): FlowState {
  const menungguPersetujuan =
    state.kind === "awaiting-consent" ||
    state.kind === "awaiting-handoff-consent" ||
    state.kind === "awaiting-revision-consent";
  if (menungguPersetujuan && (CONSENT_NO.test(text) || isConsentYes(text))) {
    return setelahPersetujuan(state, text);
  }

  const routing = classifyInbound(text);

  // Pemicu yang menuntut manusia selalu menyela, termasuk saat pengumpulan.
  if (routing.kind === "handoff" && URGENT_TRIGGERS.has(routing.trigger)) {
    return { kind: "awaiting-handoff-consent", reason: routing.trigger, resume: resumeDari(state) };
  }

  // Basa-basi bukan jawaban bidang, pertanyaan, maupun perubahan kebutuhan
  // (tiket 06); dari idle tetap membuka pengumpulan seperti chat lain.
  if (state.kind !== "idle" && isBasaBasi(text)) {
    return state;
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
    const diperbarui = isPertanyaanTercatat(text, routing)
      ? catatPertanyaan(state.draft, text)
      : catatPerubahan(state.draft, text);
    return { kind: "awaiting-revision-consent", draft: diperbarui };
  }
  if (menungguPersetujuan) {
    if (state.kind === "awaiting-consent" && isPertanyaanTercatat(text, routing)) {
      // Pertanyaan non-harga yang menyela konfirmasi dicatat sebagai bagian
      // kebutuhan, bukan dijawab dari materi (ADR-0009).
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
  return state.kind === "awaiting-handoff-consent" ? state.resume : state;
}

/** Catat perubahan kebutuhan apa adanya sebagai bagian Ringkasan Kebutuhan. */
function catatPerubahan(draft: FollowUpDraft, text: string): FollowUpDraft {
  return { ...draft, changeNotes: [...draft.changeNotes, text] };
}

/** Catat pertanyaan non-harga apa adanya sebagai bagian kebutuhan. */
function catatPertanyaan(draft: FollowUpDraft, text: string): FollowUpDraft {
  return { ...draft, notedQuestions: [...draft.notedQuestions, text] };
}

function isConsentYes(text: string): boolean {
  return CONSENT_YES.test(text) || CONSENT_YES_ANYWHERE.test(text);
}

/** Isi bidang wajib berikutnya yang masih kosong, lalu bidang opsional anggaran. */
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
    return { ...draft, detailedNeeds: text };
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
  return indonesian ? COLLECT_BUDGET_ID : COLLECT_BUDGET_EN;
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
      `- Kisaran anggaran: ${value(draft.budgetRange)}`,
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
    `- Budget range: ${value(draft.budgetRange)}`,
    ...perubahan,
    ...lampiran,
    ...pertanyaan,
  ].join("\n");
}

function initialReplyFor(indonesian: boolean): string {
  return indonesian ? INITIAL_REPLY_ID : INITIAL_REPLY_EN;
}
