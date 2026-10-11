/**
 * Detektor pesan yang menyela alur Permintaan Tindak Lanjut
 * (`.scratch/penyela-pengumpulan/spec.md`):
 *
 * - **Pertanyaan menyela** — kata kunci niat bertanya ("ingin bertanya",
 *   "ada yang ingin ditanyakan", dan variannya). Pesannya tidak boleh menjadi
 *   jawaban bidang; isinya disimpan ke Bagian Pertanyaan. Kata kunci polos
 *   tanpa isi pertanyaan ("ingin bertanya" saja) ditandai terpisah agar bot
 *   dapat meminta isinya lebih dulu.
 * - **Perbaikan bidang** — kata kerja koreksi ("hapus bagian tanggal",
 *   "jumlah jemaah hapus") yang menyebut bidang Permintaan Tindak Lanjut
 *   secara spesifik; bidang yang disebut dikosongkan lalu diulang
 *   jawabannya.
 *
 * Semua pencocokan murni regex dan deterministik — state alur diturunkan dari
 * riwayat percakapan, jadi deteksi untuk pesan yang sama harus selalu
 * menghasilkan hasil yang sama. Frasa negasi ("tidak ada yang ingin
 * ditanyakan", "jangan hapus") tidak memicu. Pertanyaan Harga Indikatif tidak
 * ditangani di sini — pengecualiannya milik `handleInbound` agar jawaban dari
 * materi tetap berlaku.
 */

/** Bidang Permintaan Tindak Lanjut yang dapat diperbaiki secara terarah. */
export type BidangKebutuhan =
  | "interestedServices"
  | "travelDateOrPeriod"
  | "travellerCount"
  | "detailedNeeds"
  | "budgetRange";

/** Urutan pengumpulan bidang; dipakai untuk urutan ulang jawaban. */
export const URUTAN_BIDANG: readonly BidangKebutuhan[] = [
  "interestedServices",
  "travelDateOrPeriod",
  "travellerCount",
  "detailedNeeds",
  "budgetRange",
];

export type PenyelaPengumpulan =
  /** Pesan berkata kunci pertanyaan dengan isi pertanyaan di dalamnya. */
  | { readonly jenis: "pertanyaan-berisi" }
  /** Pesan berkata kunci pertanyaan polos; isi pertanyaan menyusul. */
  | { readonly jenis: "pertanyaan-polos" }
  /** Permintaan koreksi bidang tertentu, urut menurut `URUTAN_BIDANG`. */
  | { readonly jenis: "perbaikan-bidang"; readonly bidang: readonly BidangKebutuhan[] };

/**
 * Klasifikasi pesan penyela. Prioritas: kata kunci pertanyaan (sinyal meta
 * eksplisit) di atas perbaikan bidang, karena "ingin bertanya, bisa hapus
 * bagian tanggal?" adalah pertanyaan, bukan perintah.
 */
export function deteksiPenyela(text: string): PenyelaPengumpulan | null {
  const tanya = deteksiPertanyaanMenyela(text);
  if (tanya !== null) {
    return tanya;
  }
  const bidang = deteksiPerbaikanBidang(text);
  return bidang.length > 0 ? { jenis: "perbaikan-bidang", bidang } : null;
}

/**
 * Kata kunci niat bertanya: "ingin bertanya", "ingin menanyakan",
 * "ada yang ingin ditanyakan", "mau tanya", "mau nanya", serta bentuk
 * Inggrisnya. Dipakai untuk deteksi dan pembuangan frasa pembuka.
 */
const KATA_KUNCI_TANYA =
  /\b((ingin|mau|pingin|pengen)\s+(bertany\w*|menanyak\w*|ditany\w*|tany\w*|nany\w*)|ada\s+yang\s+((ingin|mau|pingin|perlu)\s+)?ditany\w*|(want|would\s+like)\s+to\s+ask\b|have\s+(a|some|any|few|beberapa)\s+questions?\b|got\s+a\s+question\b)/gi;

/** Negasi sebelum kata kunci (maksimal dua kata sisipan): "tidak ada yang ingin ditanyakan". */
const NEGASI_TANYA = /\b(tidak|tdk|tak|ngga|nggak|enggak|ndak|ga|gak|no|not|jangan|bukan|belum|sudah|udah)(\s+[\w-]+){0,2}\s*$/i;

function deteksiPertanyaanMenyela(
  text: string,
): { readonly jenis: "pertanyaan-berisi" | "pertanyaan-polos" } | null {
  let adaKunci = false;
  for (const cocok of text.matchAll(KATA_KUNCI_TANYA)) {
    if (cocok.index === undefined) {
      continue;
    }
    if (NEGASI_TANYA.test(text.slice(0, cocok.index))) {
      continue;
    }
    adaKunci = true;
    break;
  }
  if (!adaKunci) {
    return null;
  }
  // Sisa pesan setelah frasa kata kunci dibuang: bila masih ada muatan
  // (bukan sekadar sapaan/partikel), pesannya sudah memuat pertanyaannya.
  const sisa = text.replace(KATA_KUNCI_TANYA, " ");
  return semuaKataPengisi(sisa) ? { jenis: "pertanyaan-polos" } : { jenis: "pertanyaan-berisi" };
}

/**
 * Kata yang tidak membawa muatan pertanyaan: sapaan, partikel, kata ganti,
 * dan kata sambung. Seluruh kata sisa yang berasal dari daftar ini berarti
 * pesannya belum memuat isi pertanyaan.
 */
const KATA_PENGISI: ReadonlySet<string> = new Set([
  "kak", "kakak", "ka", "mba", "mbak", "mas", "pak", "bu", "ibu", "bapak", "bang",
  "bro", "sis", "om", "tante", "gan", "bos", "cuy", "admin",
  "nih", "sih", "dong", "deh", "lah", "kok", "koq", "kan", "ya", "yaa", "yah",
  "yuk", "yok", "aja", "saja", "juga", "lagi", "dong",
  "saya", "aku", "kami", "kita", "anda", "sy", "aq", "nya",
  "mau", "ingin", "pingin", "pengen", "mohon", "tolong", "boleh", "bisa",
  "ada", "yang", "apa", "ini", "itu", "gini", "gitu",
  "soal", "tentang", "ttg", "about",
  "halo", "hai", "hi", "assalamualaikum", "salam",
  "terima", "kasih", "makasi", "makasih", "thanks", "maaf",
  "oke", "ok", "baik", "siap", "benar", "betul",
]);

function semuaKataPengisi(text: string): boolean {
  const kata = text
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((k) => k.length > 0);
  return kata.every((k) => KATA_PENGISI.has(k));
}

/**
 * Kata kerja koreksi perbaikan bidang: "hapus bagian tanggal", "jumlah jemaah
 * hapus ya", "kebutuhan detailnya salah". Awalan dan akhiran kata diakui
 * ("dihapus", "mengganti", "salahnya").
 */
const KATA_KOREKSI =
  /\b((meng|mem|me|di|ter)?(hapus|hilangkan|ganti|ulang|reset|edit|sunting|koreksi|perbaiki|ubah|rubah|salah|keliru)|revisi)\w*/gi;

/** Negasi sebelum kata kerja koreksi: "tidak usah hapus", "jangan hapus", "tidak salah". */
const NEGASI_KOREKSI =
  /\b(tidak|tdk|tak|ngga|nggak|enggak|ndak|ga|gak|no|not|jangan|bukan|belum|sudah|udah)(\s+[\w-]+){0,2}\s*$/i;

/**
 * Sebutan bidang pada permintaan koreksi. Sengaja tidak mencakup nama
 * layanan (hotel, transport, dll.) dan kata "harga" agar permintaan harga
 * atau pernyataan kebutuhan tidak salah jadi perbaikan bidang.
 */
const POLA_BIDANG: readonly (readonly [BidangKebutuhan, RegExp])[] = [
  ["interestedServices", /\b(layanan|servis|service|services)\w*/i],
  [
    "travelDateOrPeriod",
    /\b(tanggal|periode|jadwal|keberangkatan|kepulangan|departure|date|schedule|period)\w*/i,
  ],
  ["travellerCount", /\b(jumlah|jemaah|jamaah|peserta|pax|traveller|travellers|pax)\w*/i],
  ["detailedNeeds", /\b(kebutuhan|detail|rincian|catatan|notes?)\w*/i],
  ["budgetRange", /\b(anggaran|budget|dana|biaya|kisaran)\w*/i],
];

export function deteksiPerbaikanBidang(text: string): readonly BidangKebutuhan[] {
  const adaKoreksi = [...text.matchAll(KATA_KOREKSI)].some((cocok) => {
    if (cocok.index === undefined) {
      return false;
    }
    return !NEGASI_KOREKSI.test(text.slice(0, cocok.index));
  });
  if (!adaKoreksi) {
    return [];
  }
  const bidang = new Set<BidangKebutuhan>();
  for (const [nama, pola] of POLA_BIDANG) {
    if (pola.test(text)) {
      bidang.add(nama);
    }
  }
  return URUTAN_BIDANG.filter((nama) => bidang.has(nama));
}
