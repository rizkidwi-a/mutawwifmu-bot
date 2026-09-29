import type { BotTurn, ConversationContext, InboundMessage } from "./types.ts";

const INITIAL_REPLY_ID =
  "Halo! Terima kasih sudah menghubungi MUTAWWIFMU. " +
  "Saya asisten otomatis yang tersedia kapan saja untuk membantu informasi awal tentang layanan kami. " +
  "Apa yang ingin Anda tanyakan?";

const INITIAL_REPLY_EN =
  "Hello! Thank you for contacting MUTAWWIFMU. " +
  "I'm an automated assistant available anytime to help with early information about our services. " +
  "What would you like to ask?";

/**
 * Penanda bahasa Indonesia pada pesan Calon Jemaah. Hanya kata fungsi/sapaan —
 * kata domain (umrah, harga, dll.) dipakai di kedua bahasa dan tidak menjadi
 * penanda yang baik.
 */
const INDONESIAN_MARKERS =
  /\b(saya|aku|kami|ingin|mau|bertanya|tanya|tentang|untuk|bisa|dapat|apakah|bagaimana|berapa|kak|halo|assalamualaikum|terima kasih)\b/i;

/**
 * Seam pemrosesan pesan masuk yang disepakati: menerima pesan beserta konteks
 * percakapan, menghasilkan balasan serta tindakan yang terlihat.
 */
export function handleInbound(message: InboundMessage, _context: ConversationContext): BotTurn {
  if (message.text === null) {
    return { reply: null, actions: [] };
  }
  return {
    reply: { text: initialReplyFor(message.text) },
    actions: [],
  };
}

function initialReplyFor(text: string): string {
  return INDONESIAN_MARKERS.test(text) ? INITIAL_REPLY_ID : INITIAL_REPLY_EN;
}
