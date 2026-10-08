/**
 * Lapisan pemaham bahasa dengan LLM Gemini (ADR-0008).
 *
 * Peran modul ini sempit: mengubah pesan bebas Bahasa Indonesia
 * (gaul/typo/parafrase/campur-Inggris) menjadi `{ rute, topik, keyakinan }`
 * terstruktur. Modul ini TIDAK pernah menghasilkan kalimat jawaban —
 * jawaban selalu dari template manual `faqAnswer()` agar angka/harga
 * tidak bisa dikarang LLM.
 *
 * Transport memakai `fetch` global bawaan Node (ADR-0002) — nol dependency
 * npm baru. Setiap kegagalan (kunci hilang, timeout, respons tak valid)
 * mengembalikan `null` sebagai sinyal: pemanggil WAJIB fallback ke
 * `classifyInbound()` regex agar bot tidak diam (langkah 4).
 */
import type { FaqTopic } from "./businessFaq.ts";

/** Hasil pemahaman terstruktur dari Gemini. */
export interface Pemahaman {
  readonly rute: "faq" | "indicative-price" | "handoff" | "opener";
  readonly topik?: FaqTopic;
  /** 0..1 — di bawah ambang berarti "ragu" → handoff/fallback. */
  readonly keyakinan: number;
}

export interface KonfigGemini {
  readonly apiKey: string;
  readonly model: string;
}

/** Daftar topik valid — satu-satunya nilai `topik` yang boleh keluar dari LLM. */
const TOPIK_VALID: ReadonlySet<string> = new Set<string>([
  "land-arrangement",
  "tour-guide",
  "mutawwif",
  "multi-language-support",
  "visa-documents",
  "hotel-accommodation",
  "transport-fleet",
  "airport-handling",
  "charity-program",
  "photographer-videographer",
  "custom-itinerary",
  "city-tour",
  "city-tour-makkah",
  "city-tour-madinah",
  "city-tour-thaif",
  "city-tour-alula",
  "price-mutawwif",
  "price-document-arrangement",
  "price-airport-handling",
  "price-transport",
  "price-city-tour",
  "price-photographer-videographer",
  "price-hotel",
]);

function isFaqTopic(nilai: unknown): nilai is FaqTopic {
  return typeof nilai === "string" && TOPIK_VALID.has(nilai);
}

/** Model yang dipensiunkan Google untuk user baru, dipetakan ke pengganti. */
const MODEL_PENSIUN: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
};

/** Baca konfigurasi dari env; `null` bila kunci belum diisi → sinyal fallback. */
export function bacaKonfigGemini(
  env: Record<string, string | undefined>,
): KonfigGemini | null {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const diminta = env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const model = MODEL_PENSIUN[diminta] ?? diminta;
  return { apiKey, model };
}

export interface OpsiPemaham {
  /** Timeout per panggilan; default 8000 ms. */
  readonly timeoutMs?: number;
  /** Fetch yang dipakai — default global; diisi mock pada tes. */
  readonly fetchFn?: typeof fetch;
}

const RUTE_VALID: ReadonlySet<string> = new Set([
  "faq",
  "indicative-price",
  "handoff",
  "opener",
]);

/** Diekspor untuk tes/debug prompt; pemakaian normal lewat pahamiDenganGemini. */
export function bangunPrompt(pesan: string): string {
  return (
    "Kamu pemaham bahasa untuk chatbot layanan umrah MUTAWWIFMU. " +
    "Tugasmu HANYA memilih topik pertanyaan, bukan menjawab. " +
    "Balas HANYA JSON: {\"rute\": ..., \"topik\": ..., \"keyakinan\": ...}.\n" +
    'rute salah satu: "faq" | "indicative-price" | "handoff" | "opener".\n' +
    '"indicative-price" hanya bila pesan menanyakan angka harga yang tercantum materi. ' +
    '"handoff" untuk booking/pembayaran, minta manusia, agen/korporasi, darurat, ' +
    "perjalanan aktif, minta penawaran/konfirmasi/ketersediaan, atau pertanyaan di luar materi. " +
    '"opener" untuk sapaan tanpa pertanyaan.\n' +
    "topik wajib ada bila rute faq/indicative-price. PENTING: nilai topik " +
    "HARUS persis salah satu string berikut, dilarang membuat nilai baru " +
    "atau menerjemahkan ke Bahasa Indonesia: " +
    [...TOPIK_VALID].join(", ") +
    ". Hilangkan topik untuk rute handoff/opener.\n" +
    "Contoh gaya bahasa sehari-hari:\n" +
    '"kendaraannya apa aja ya" -> {"rute":"faq","topik":"transport-fleet","keyakinan":0.85}\n' +
    '"budget buat nginep di makkah kira-kira berapa" -> {"rute":"indicative-price","topik":"price-hotel","keyakinan":0.8}\n' +
    '"yang nemenin ibadah namanya apa ya" -> {"rute":"faq","topik":"mutawwif","keyakinan":0.8}\n' +
    "keyakinan angka 0..1 (di bawah 0,6 dianggap ragu).\n" +
    'Pesan: """' +
    pesan.slice(0, 1000) +
    '"""'
  );
}

function normalisasi(data: unknown): Pemahaman | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as { rute?: unknown; topik?: unknown; keyakinan?: unknown };
  if (typeof d.rute !== "string" || !RUTE_VALID.has(d.rute)) return null;
  const rute = d.rute as Pemahaman["rute"];
  let keyakinan =
    typeof d.keyakinan === "number" && Number.isFinite(d.keyakinan)
      ? d.keyakinan
      : 0.5;
  if (keyakinan < 0) keyakinan = 0;
  if (keyakinan > 1) keyakinan = 1;
  if (rute === "faq" || rute === "indicative-price") {
    if (!isFaqTopic(d.topik)) return null;
    return { rute, topik: d.topik, keyakinan };
  }
  return { rute, keyakinan };
}

/** Ambil JSON pertama dari teks respons (tahan terhadap pagar kode markdown). */
function ekstrakJson(teks: string): unknown | null {
  const mulai = teks.indexOf("{");
  const akhir = teks.lastIndexOf("}");
  if (mulai === -1 || akhir === -1 || akhir <= mulai) return null;
  try {
    return JSON.parse(teks.slice(mulai, akhir + 1)) as unknown;
  } catch {
    return null;
  }
}

/**
 * Pahami pesan lewat Gemini. Mengembalikan `null` pada SEMUA kegagalan
 * (kunci kosong, timeout, HTTP non-200, JSON tak valid) — pemanggil wajib
 * fallback ke regex. Tidak pernah melempar, kecuali sinyal abort yang juga
 * ditangkap menjadi `null`.
 */
export async function pahamiDenganGemini(
  pesan: string,
  konfig: KonfigGemini | null,
  opsi: OpsiPemaham = {},
): Promise<Pemahaman | null> {
  if (konfig === null || pesan.trim() === "") return null;
  const fetchFn = opsi.fetchFn ?? fetch;
  const timeoutMs = opsi.timeoutMs ?? 8000;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(konfig.model)}:generateContent`;
  const badan = JSON.stringify({
    contents: [{ parts: [{ text: bangunPrompt(pesan) }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });
  // Maksimal 3 percobaan; jeda mengikuti status sebelumnya: 429 (kuota)
  // tunggu 6 dtk, 503 (sibuk) tunggu 1 dtk. Gagal semua → null (fallback).
  let statusTerakhir = 0;
  for (let i = 0; i < 3; i++) {
    if (statusTerakhir === 429) await new Promise((r) => setTimeout(r, 6000));
    else if (statusTerakhir === 503) await new Promise((r) => setTimeout(r, 1000));
    let sinyal: AbortSignal | undefined;
    try {
      // Node >= 22 mendukung AbortSignal.timeout.
      sinyal = AbortSignal.timeout(timeoutMs);
    } catch {
      sinyal = undefined;
    }
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": konfig.apiKey,
        },
        body: badan,
        signal: sinyal,
      });
      if (res.status === 429 && i < 2) { statusTerakhir = 429; continue; }
      if (res.status === 503 && i < 2) { statusTerakhir = 503; continue; }
      if (!res.ok) return null;
      return uraikan(res);
    } catch {
      // Timeout/jaringan pada percobaan terakhir → sinyal fallback.
      if (i === 2) return null;
    }
  }
  return null;
}

/** Uraikan respons generateContent menjadi pemahaman, atau `null`. */
async function uraikan(res: Response): Promise<Pemahaman | null> {
  try {
    const badan = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const teks = badan.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof teks !== "string") return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(teks);
    } catch {
      parsed = ekstrakJson(teks);
    }
    if (parsed === null || parsed === undefined) return null;
    return normalisasi(parsed);
  } catch {
    return null;
  }
}
