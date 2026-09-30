/**
 * Bahasa balasan bot untuk Calon Jemaah. Bot membalas dalam bahasa yang
 * digunakan Calon Jemaah — Bahasa Indonesia atau Inggris (spec user story 3–5)
 * — tanpa menu pemilihan bahasa.
 */
export type Language = "id" | "en";

/**
 * Penanda bahasa Indonesia pada pesan Calon Jemaah. Hanya kata fungsi/sapaan —
 * kata domain (umrah, harga, dll.) dipakai di kedua bahasa dan tidak menjadi
 * penanda yang baik.
 */
const INDONESIAN_MARKERS =
  /\b(saya|aku|kami|ingin|mau|bertanya|tanya|tentang|untuk|bisa|dapat|apakah|bagaimana|berapa|kak|halo|assalamualaikum|terima kasih)\b/i;

/** Deteksi bahasa Calon Jemaah dari isi pesan. */
export function detectLanguage(text: string): Language {
  return INDONESIAN_MARKERS.test(text) ? "id" : "en";
}
