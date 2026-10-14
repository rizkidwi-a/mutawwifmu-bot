/**
 * Harga layanan fotografer/videografer: data per sesi dan pencocokan kata
 * kunci lokasi (fitur harga-fotografi-tasreh-cgk).
 *
 * Sumber angka: `data/foto harga/WhatsApp Image 2026-10-12 at 13.54.15.md`
 * ("Professional Photographer & Videographer — Saudi Arabia"): 8 baris reguler
 * dan 5 baris Paket Spesial Ramadan. Angkanya sama dengan tabel Dokumentasi
 * Profesional BOOKLET, tetapi label bagian mengikuti materi terbaru — **Paket
 * Spesial Ramadan**, bukan "High season" — dan materi terbaru inilah yang
 * memuat rincian durasi, meeting point, Include/Exclude, dan Add-on
 * (keputusan pemilik, 2026-10-13). Satuan: SAR per sesi.
 *
 * Angka disimpan verbatim sebagai digit polos; pemisah ribuan hanya
 * ditambahkan saat render (id titik, en koma), tanpa menafsirkan nilai.
 *
 * Pencocokan deterministik (bukan LLM): lokasi yang disebut, periode
 * (kata "ramadan"/"puasa" memilih Paket Spesial Ramadan), serta segmen
 * (couple vs keluarga; kamera profesional vs iPhone) menentukan baris yang
 * ditampilkan — sejajar filter armada pada `transportRute.ts`. Pertanyaan
 * tanpa lokasi dijawab daftar harga lengkap; menu daftar lokasi tidak
 * diperlukan karena barisnya hanya 13 (keputusan pemilik, lihat spec).
 */
import type { Language } from "../conversation/language.ts";

/** Lokasi sesi foto yang dikenali kata kunci pesan, urut sesuai sumber. */
export type LokasiFoto =
  | "masjidilHaram"
  | "nabawi"
  | "jabalKudai"
  | "alUla"
  | "akad";

/** Segmen peserta yang menentukan baris mana yang tampil. */
export type SegmenFoto = "pasangan" | "keluarga" | "kameraProfesional" | "kameraIphone";

/** Periode harga pada materi: daftar reguler dan Paket Spesial Ramadan. */
export type PeriodeFoto = "reguler" | "ramadan";

export interface BarisFoto {
  readonly lokasi: LokasiFoto;
  readonly periode: PeriodeFoto;
  /** `null` untuk baris tanpa pembagian segmen (Paket Spesial Ramadan). */
  readonly segmen: SegmenFoto | null;
  readonly label: { readonly id: string; readonly en: string };
  /** Harga verbatim dari materi sumber, satuan SAR per sesi. */
  readonly harga: string;
  /** Rincian durasi dari materi; `null` bila sumber tidak mencantumkannya. */
  readonly rincian: { readonly id: string; readonly en: string } | null;
}

export const LOKASI_URUT = [
  "masjidilHaram",
  "nabawi",
  "jabalKudai",
  "alUla",
  "akad",
] as const;

export const LOKASI_LABEL: Readonly<Record<LokasiFoto, { readonly id: string; readonly en: string }>> = {
  masjidilHaram: { id: "Pelataran Masjidil Haram", en: "Courtyard of Masjidil Haram" },
  nabawi: { id: "Masjid Nabawi", en: "Masjid Nabawi" },
  jabalKudai: { id: "Jabal Kudai & Khandama", en: "Jabal Kudai & Khandama" },
  alUla: { id: "Al Ula", en: "Al Ula" },
  akad: { id: "Akad / momen spesial", en: "Akad (wedding) / special moments" },
};

/** Meeting point per lokasi — hanya lokasi yang dicantumkan materi sumber. */
const MEETING_POINT: Readonly<Partial<Record<LokasiFoto, { readonly id: string; readonly en: string }>>> = {
  masjidilHaram: { id: "Depan WC 3 / KFC Hilton Tower", en: "In front of WC 3 / KFC Hilton Tower" },
  nabawi: { id: "Depan Pintu 333", en: "In front of Gate 333" },
};

const RINCIAN_DUA_JAM = { id: "1,5 jam, 1 video", en: "1.5 hours, 1 video" };
const RINCIAN_TIGA_JAM = { id: "3 jam, 1 video", en: "3 hours, 1 video" };

/**
 * 13 baris harga materi foto (8 reguler + 5 Paket Spesial Ramadan), urut
 * sesuai sumber. Angka disimpan sebagai digit polos.
 */
export const BARIS_FOTO: readonly BarisFoto[] = [
  {
    lokasi: "masjidilHaram",
    periode: "reguler",
    segmen: "pasangan",
    label: { id: "Pelataran Masjidil Haram — Sendiri / Couple", en: "Courtyard of Masjidil Haram — Solo / Couple" },
    harga: "600",
    rincian: RINCIAN_DUA_JAM,
  },
  {
    lokasi: "masjidilHaram",
    periode: "reguler",
    segmen: "keluarga",
    label: { id: "Pelataran Masjidil Haram — Family / lebih dari 2 pax", en: "Courtyard of Masjidil Haram — Family / more than 2 pax" },
    harga: "1000",
    rincian: RINCIAN_TIGA_JAM,
  },
  {
    lokasi: "nabawi",
    periode: "reguler",
    segmen: "pasangan",
    label: { id: "Masjid Nabawi — Sendiri / Couple", en: "Masjid Nabawi — Solo / Couple" },
    harga: "500",
    rincian: RINCIAN_DUA_JAM,
  },
  {
    lokasi: "nabawi",
    periode: "reguler",
    segmen: "keluarga",
    label: { id: "Masjid Nabawi — Family / lebih dari 2 pax", en: "Masjid Nabawi — Family / more than 2 pax" },
    harga: "800",
    rincian: RINCIAN_TIGA_JAM,
  },
  {
    lokasi: "jabalKudai",
    periode: "reguler",
    segmen: "pasangan",
    label: { id: "Jabal Kudai & Khandama — Sendiri / Couple", en: "Jabal Kudai & Khandama — Solo / Couple" },
    harga: "500",
    rincian: null,
  },
  {
    lokasi: "jabalKudai",
    periode: "reguler",
    segmen: "keluarga",
    label: { id: "Jabal Kudai & Khandama — Family / lebih dari 2 pax", en: "Jabal Kudai & Khandama — Family / more than 2 pax" },
    harga: "750",
    rincian: null,
  },
  {
    lokasi: "alUla",
    periode: "reguler",
    segmen: "kameraProfesional",
    label: { id: "Paket Al-Ula — Kamera Profesional", en: "Al-Ula Package — Professional Camera" },
    harga: "1250",
    rincian: null,
  },
  {
    lokasi: "alUla",
    periode: "reguler",
    segmen: "kameraIphone",
    label: { id: "Paket Al-Ula — Kamera iPhone (min. 15 Pro)", en: "Al-Ula Package — iPhone Camera (minimum 15 Pro)" },
    harga: "900",
    rincian: null,
  },
  // Paket Spesial Ramadan — harga per sesi.
  {
    lokasi: "jabalKudai",
    periode: "ramadan",
    segmen: null,
    label: { id: "Paket Spesial Ramadan — Jabal Kudai & Khandama", en: "Special Ramadan Package — Jabal Kudai & Khandama" },
    harga: "1000",
    rincian: null,
  },
  {
    lokasi: "nabawi",
    periode: "ramadan",
    segmen: null,
    label: { id: "Paket Spesial Ramadan — Masjid Nabawi", en: "Special Ramadan Package — Masjid Nabawi" },
    harga: "600",
    rincian: null,
  },
  {
    lokasi: "masjidilHaram",
    periode: "ramadan",
    segmen: null,
    label: { id: "Paket Spesial Ramadan — Masjidil Haram (Mekkah)", en: "Special Ramadan Package — Masjidil Haram (Makkah)" },
    harga: "750",
    rincian: null,
  },
  {
    lokasi: "alUla",
    periode: "ramadan",
    segmen: null,
    label: { id: "Paket Spesial Ramadan — Al Ula", en: "Special Ramadan Package — Al Ula" },
    harga: "4500",
    rincian: null,
  },
  {
    lokasi: "akad",
    periode: "ramadan",
    segmen: null,
    label: { id: "Paket Spesial Ramadan — Akad / momen spesial", en: "Special Ramadan Package — Akad (wedding) / special moments" },
    harga: "1250",
    rincian: null,
  },
];

// ---------------------------------------------------------------------------
// Pencocokan kata kunci
// ---------------------------------------------------------------------------

const POLOK_LOKASI: ReadonlyArray<readonly [LokasiFoto, RegExp]> = [
  ["masjidilHaram", /\b(masjidil\s*haram|pelataran masjid|ka'?bah|kaabah|makkah|mekah|mekkah|haram)\b/i],
  ["nabawi", /\b(masjid\s*nabawi|nabawi|madinah|medinah)\b/i],
  ["jabalKudai", /\b(jabal\s*(?:kudai|khandama)|kudai|khandama)\b/i],
  ["alUla", /\b(al[\s-]?ula|ula)\b/i],
  ["akad", /\b(akad|nikah|wedding|momen spesial|special moment)\b/i],
];

/** Kata penanda Paket Spesial Ramadan; tanpa ini, jawaban memakai daftar reguler. */
export const KATA_RAMADAN = /\b(ramadan|ramadhan|bulan puasa|puasa)\b/i;

const POLOK_SEGMEN: ReadonlyArray<readonly [SegmenFoto, RegExp]> = [
  ["pasangan", /\b(couple|berdua|dua orang|dua pax|pasangan|sendiri|2 orang|2 pax)\b/i],
  ["keluarga", /\b(family|keluarga|anak|orang tua|rombongan|rombong|group|grup|lebih dari 2)\b/i],
  ["kameraIphone", /\b(iphone|ipone)\b/i],
  ["kameraProfesional", /\b(kamera profesional|kamera professional|profesional|professional)\b/i],
];

/**
 * Baris foto yang cocok dengan kata kunci pesan, dalam urutan materi.
 *
 * - Tanpa lokasi dan tanpa kata ramadan → seluruh 13 baris (daftar lengkap).
 * - Lokasi disebut → baris reguler lokasi itu; bila tidak ada (mis. akad yang
 *   hanya punya baris Ramadan) → baris Ramadan lokasi itu.
 * - Kata ramadan → baris Paket Spesial Ramadan (bersama lokasi bila disebut).
 * - Segmen disebut → baris segmen itu, asalkan menyisakan minimal satu baris.
 */
export function cocokkanFoto(pesan: string): readonly BarisFoto[] {
  const lokasiDisebut = new Set(
    POLOK_LOKASI.filter(([, pola]) => pola.test(pesan)).map(([lokasi]) => lokasi),
  );
  const ramadan = KATA_RAMADAN.test(pesan);

  if (lokasiDisebut.size === 0 && !ramadan) return BARIS_FOTO;

  let hasil: BarisFoto[] = BARIS_FOTO.filter(
    (baris) =>
      (lokasiDisebut.size === 0 || lokasiDisebut.has(baris.lokasi)) &&
      (ramadan ? baris.periode === "ramadan" : baris.periode === "reguler"),
  );
  if (hasil.length === 0 && lokasiDisebut.size > 0) {
    hasil = BARIS_FOTO.filter(
      (baris) => lokasiDisebut.has(baris.lokasi) && baris.periode === "ramadan",
    );
  }

  const segmenDisebut = POLOK_SEGMEN.filter(([, pola]) => pola.test(pesan)).map(
    ([segmen]) => segmen,
  );
  if (segmenDisebut.length > 0) {
    const menyaring = hasil.filter(
      (baris) => baris.segmen !== null && segmenDisebut.includes(baris.segmen),
    );
    if (menyaring.length > 0) hasil = menyaring;
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// Render jawaban dan materi
// ---------------------------------------------------------------------------

const JUDUL_ID =
  "Harga Indikatif layanan fotografer/videografer — bukan penawaran final, satuan SAR per sesi:";
const PENUTUP_ID =
  "Angka dapat berubah setelah diperiksa admin — mohon konfirmasi sesi dan harga terkini kepada tim kami.";
const CATATAN_ID =
  "Sudah termasuk editing foto dan video profesional: 1 video edit, beberapa foto edit, " +
  "serta seluruh file original (mentah). " +
  "Belum termasuk transportasi; teh, kurma & karpet bersifat opsional SAR 50. " +
  "Add-on: overtime ba'da Maghrib SAR 100 per jam dan tambahan video edit SAR 300 per video.";

const JUDUL_EN =
  "Indicative Prices for our photographer/videographer service — not a final offer, unit SAR per session:";
const PENUTUP_EN =
  "Figures may change after being reviewed by our admin — please confirm the session and current price with our team.";
const CATATAN_EN =
  "Prices include professional photo and video editing: 1 edited video, several edited photos, " +
  "and all original (raw) files. " +
  "Transportation is not included; tea, dates & carpet are optional at SAR 50. " +
  "Add-ons: overtime after Maghrib at SAR 100 per hour and an extra edited video at SAR 300 per video.";

/**
 * Format angka untuk tampilan: pemisah ribuan titik (id) atau koma (en).
 * Nilai tersimpan verbatim; hanya format yang berubah.
 */
function formatNilai(nilai: string, bahasa: Language): string {
  return nilai.replace(/\B(?=(\d{3})+(?!\d))/g, bahasa === "id" ? "." : ",");
}

function barisFoto(baris: BarisFoto, bahasa: Language): string {
  const rincian = baris.rincian === null ? "" : ` (${baris.rincian[bahasa]})`;
  return `• ${baris.label[bahasa]}: SAR ${formatNilai(baris.harga, bahasa)}${rincian}`;
}

/** Baris meeting point untuk lokasi yang barisnya ikut tampil. */
function barisMeetingPoint(baris: readonly BarisFoto[], bahasa: Language): string[] {
  const lokasiTampil = new Set(baris.map((b) => b.lokasi));
  const hasil: string[] = [];
  for (const lokasi of LOKASI_URUT) {
    const titik = MEETING_POINT[lokasi];
    if (titik !== undefined && lokasiTampil.has(lokasi)) {
      hasil.push(`Meeting point ${LOKASI_LABEL[lokasi][bahasa]}: ${titik[bahasa]}`);
    }
  }
  return hasil;
}

function susun(
  baris: readonly BarisFoto[],
  bahasa: Language,
): string {
  const judul = bahasa === "id" ? JUDUL_ID : JUDUL_EN;
  const catatan = bahasa === "id" ? CATATAN_ID : CATATAN_EN;
  const penutup = bahasa === "id" ? PENUTUP_ID : PENUTUP_EN;
  return [
    judul,
    ...baris.map((b) => barisFoto(b, bahasa)),
    ...barisMeetingPoint(baris, bahasa),
    catatan,
    penutup,
  ].join("\n");
}

/**
 * Materi lengkap topik `price-photographer-videographer`: seluruh 13 baris
 * sebagai acuan grounding angka (`pengamanAngka`), sekaligus jawaban utuh
 * bila pertanyaan tidak menyebut lokasi tertentu.
 */
export function susunMateriFoto(bahasa: Language): string {
  return susun(BARIS_FOTO, bahasa);
}

/**
 * Jawaban Harga Indikatif fotografi untuk sebuah pesan: hanya baris yang
 * terpicu kata kunci lokasi/periode/segmen. Pertanyaan umum tanpa lokasi
 * memperoleh daftar harga lengkap.
 */
export function susunJawabanFoto(pesan: string, bahasa: Language): string {
  return susun(cocokkanFoto(pesan), bahasa);
}
