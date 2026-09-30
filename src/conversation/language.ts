import type { ConversationTurn } from "./types.ts";

/**
 * Bahasa balasan bot untuk Calon Jemaah. Bot membalas dalam bahasa yang
 * digunakan Calon Jemaah — Bahasa Indonesia atau Inggris (spec user story 3–5)
 * — tanpa menu pemilihan bahasa.
 */
export type Language = "id" | "en";

/**
 * Penanda bahasa Indonesia pada pesan Calon Jemaah. Hanya kata fungsi/sapaan —
 * kata domain (umrah, harga, dll.) dipakai di kedua bahasa dan tidak menjadi
 * penanda yang baik. Pesan pendek yang ambigu mengikuti bahasa percakapan.
 */
const INDONESIAN_MARKERS =
  /\b(saya|aku|kami|ingin|mau|bertanya|tanya|tentang|untuk|bisa|dapat|apakah|bagaimana|berapa|kak|halo|assalamualaikum|terima kasih|tolong|ini|itu|sudah|belum|juga|adalah|dengan|yang|dan|atau|saja)\b/i;

const ENGLISH_MARKERS =
  /\b(i|we|my|our|want|would|like|please|hello|hi|hey|thanks|thank you|about|consultation|trip|travel|planning|can you|could you|how much|how many)\b/i;

/** Deteksi bahasa Calon Jemaah dari isi pesan. */
export function detectLanguage(text: string): Language {
  return INDONESIAN_MARKERS.test(text) ? "id" : "en";
}

/**
 * Bahasa balasan untuk sebuah giliran: bahasa pesan ini bila terdeteksi dari
 * penandanya, jika tidak bahasa percakapan sejauh ini (giliran Calon Jemaah
 * terakhir pada riwayat yang berpenanda). Bila tidak ada penanda sama sekali,
 * balasan memakai Bahasa Inggris.
 */
export function resolveReplyLanguage(
  history: readonly ConversationTurn[],
  text: string,
): Language {
  const current = detectTurnLanguage(text);
  if (current !== null) {
    return current;
  }
  for (const turn of [...history].reverse()) {
    if (turn.role !== "calon-jemaah") {
      continue;
    }
    const previous = detectTurnLanguage(turn.text);
    if (previous !== null) {
      return previous;
    }
  }
  return "en";
}

/** Bahasa sebuah giliran dari penanda; null bila pesan ambigu tanpa penanda. */
function detectTurnLanguage(text: string): Language | null {
  if (INDONESIAN_MARKERS.test(text)) {
    return "id";
  }
  if (ENGLISH_MARKERS.test(text)) {
    return "en";
  }
  return null;
}
