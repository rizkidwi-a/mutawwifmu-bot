import type { BotTurn, ConversationContext, InboundMessage } from "./types.ts";

const BALASAN_AWAL_ID =
  "Halo! Terima kasih sudah menghubungi MUTAWWIFMU. " +
  "Saya asisten otomatis yang tersedia kapan saja untuk membantu informasi awal tentang layanan kami. " +
  "Apa yang ingin Anda tanyakan?";

const BALASAN_AWAL_EN =
  "Hello! Thank you for contacting MUTAWWIFMU. " +
  "I'm an automated assistant available anytime to help with early information about our services. " +
  "What would you like to ask?";

/**
 * Penanda bahasa Indonesia pada pesan Calon Jemaah. Hanya kata fungsi/sapaan —
 * kata domain (umrah, harga, dll.) dipakai di kedua bahasa dan tidak menjadi
 * penanda yang baik.
 */
const PENANDA_BAHASA_INDONESIA =
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
    reply: { text: balasanAwalUntuk(message.text) },
    actions: [],
  };
}

function balasanAwalUntuk(text: string): string {
  return PENANDA_BAHASA_INDONESIA.test(text) ? BALASAN_AWAL_ID : BALASAN_AWAL_EN;
}
