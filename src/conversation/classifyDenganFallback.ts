/**
 * Klasifikasi dengan fallback (langkah 4: ADR-0008 lapis 4).
 *
 * Urutan:
 * 1. Coba `pahamiDenganGemini()` (atau `pahamiFn` pada tes).
 * 2. Bila hasilnya `null` (kunci hilang / error / timeout / tak valid) →
 *    turun ke `classifyInbound()` regex. Bot tidak boleh diam hanya karena
 *    LLM mati.
 * 3. Pemicu handoff berisiko tinggi yang dikenali regex (lihat
 *    `PEMICU_BERISIKO`) tetap menang atas hasil LLM beserta alasan handoff
 *    spesifiknya.
 * 4. Bila keyakinan < AMBANG_KEYAKINAN → abaikan LLM, pakai regex.
 * 5. Bila LLM menunjuk topik faq/indicative-price → validasi grounding angka
 *    pada jawaban template; bila gagal → handoff `custom-quote-or-availability`.
 *
 * Fungsi ini async dan TIDAK menggantikan `classifyInbound()` sync —
 * baseline regex 73% tetap hidup sebagai pembanding dan sebagai fallback.
 */
import {
  classifyInbound,
  type HandoffTrigger,
  type InboundRouting,
} from "./classifyInbound.ts";
import {
  faqAnswer,
  isPriceTopic,
  type FaqTopic,
} from "../knowledge/businessFaq.ts";
import type { Pemahaman } from "../knowledge/geminiPemaham.ts";
import {
  AMBANG_KEYAKINAN,
  ekstrakAngka,
  semuaAngkaAdaDiMateri,
} from "../knowledge/pengamanAngka.ts";

// Re-ekspor agar pemanggil cukup impor dari satu modul.
export type { Pemahaman };

export interface OpsiFallback {
  /** Bila null/undefined → langsung ke regex (mode "LLM tidak tersedia"). */
  readonly pemahaman?: Pemahaman | null;
  /** Fungsi pemaham yang dipakai; default dipasok pemanggil async. */
  readonly pahami?: () => Promise<Pemahaman | null>;
  /** Materi acuan grounding; default jawaban template topik yang ditunjuk. */
  readonly materiAcuan?: string;
}

function handoffAngkaTidakTerjaga(): InboundRouting {
  return { kind: "handoff", trigger: "custom-quote-or-availability" };
}

/**
 * Pemicu handoff berisiko tinggi yang sudah dikenali regex (tiket 01).
 * Regex harus tetap menang atas klasifikasi model untuk kelompok ini: model
 * tidak boleh menurunkan permintaan manusia/darurat, booking/pembayaran,
 * permintaan penawaran/ketersediaan, atau pesan korporasi menjadi FAQ/opener,
 * dan alasan handoff spesifik dari regex dipertahankan apa adanya.
 */
const PEMICU_BERISIKO: ReadonlySet<HandoffTrigger> = new Set([
  "emergency",
  "active-trip",
  "human-request",
  "agency-or-corporate",
  "booking-or-payment",
  "custom-quote-or-availability",
]);

/**
 * Terapkan pengaman pada satu hasil pemahaman. `fallback` adalah hasil regex
 * yang dipakai bila LLM tidak usable. Murni/sync agar mudah dites.
 */
export function putuskanDenganPengaman(
  pemahaman: Pemahaman | null | undefined,
  fallback: InboundRouting,
  materiAcuan?: string,
): InboundRouting {
  if (fallback.kind === "handoff" && PEMICU_BERISIKO.has(fallback.trigger)) {
    return fallback;
  }
  if (pemahaman === null || pemahaman === undefined) return fallback;
  if (pemahaman.keyakinan < AMBANG_KEYAKINAN) return fallback;
  if (pemahaman.rute === "handoff") {
    return { kind: "handoff", trigger: "unsupported-question" };
  }
  if (pemahaman.rute === "opener") return { kind: "opener" };
  const topik = pemahaman.topik as FaqTopic | undefined;
  if (topik === undefined) return fallback;
  // Lapis grounding: jawaban template untuk topik ini harus tidak memuat
  // angka di luar materi acuan. Acuan default = jawaban itu sendiri sehingga
  // lolos konstruksi; penguji/pemanggil boleh mempersempit acuannya.
  const jawaban = faqAnswer(topik, "id");
  const acuan = materiAcuan ?? jawaban;
  if (!semuaAngkaAdaDiMateri(jawaban, acuan)) {
    return handoffAngkaTidakTerjaga();
  }
  // Topik harga tanpa angka (mis. template berubah) jangan dijawab ngawur.
  if (isPriceTopic(topik) && ekstrakAngka(jawaban).length === 0) {
    return handoffAngkaTidakTerjaga();
  }
  if (pemahaman.rute === "indicative-price") {
    if (!isPriceTopic(topik)) return fallback;
    return { kind: "indicative-price", topic: topik };
  }
  return { kind: "faq", topic: topik };
}

/** Varian async: jalankan pemaham lalu terapkan pengaman + fallback. */
export async function classifyDenganFallback(
  teks: string,
  opsi: OpsiFallback = {},
): Promise<InboundRouting> {
  const fallback = classifyInbound(teks);
  let pemahaman: Pemahaman | null | undefined = opsi.pemahaman;
  if (opsi.pahami !== undefined && opsi.pemahaman === undefined) {
    try {
      pemahaman = await opsi.pahami();
    } catch {
      pemahaman = null;
    }
  }
  return putuskanDenganPengaman(pemahaman, fallback, opsi.materiAcuan);
}
