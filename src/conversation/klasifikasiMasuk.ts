/**
 * Klasifikator pesan masuk untuk jalur webhook (tiket 01: pemaham Gemini
 * opsional, ADR-0008).
 *
 * Modul ini adalah titik pasang `pahamiDenganGemini()` + `classifyDenganFallback()`
 * ke pemrosesan pesan masuk: satu pesan teks → satu hasil `InboundRouting` yang
 * kemudian dipakai untuk SEMUA keputusan percakapan pesan itu. Gemini hanya
 * memilih rute/topik; balasan tetap dari template manual.
 *
 * Aturan yang dipegang di sini:
 * - Tanpa `GEMINI_API_KEY` (konfig null) tidak ada request jaringan sama sekali;
 *   hasil regex menjadi default.
 * - Pesan kosong tidak dikirim ke pemaham.
 * - Kegagalan apa pun (jaringan, HTTP, JSON/rute/topik tak valid, keyakinan di
 *   bawah ambang) jatuh ke `classifyInbound()` — bot tidak boleh diam.
 * - Pemicu handoff berisiko tinggi yang dikenali regex tetap menang atas hasil
 *   model (lihat `putuskanDenganPengaman`).
 * - Batas total waktu tunggu pemahaman (`tenggatMs`): bila tenggat habis, hasil
 *   regex dipakai segera dan request lanjutan dari percobaan latar belakang
 *   dihentikan, agar webhook tidak tertahan oleh timeout/retry Gemini.
 *
 * Tidak ada yang dicatat ke log dari modul ini: tidak ada API key, header
 * autentikasi, prompt, maupun isi pesan (batasan tiket 01).
 */
import { classifyInbound, type InboundRouting } from "./classifyInbound.ts";
import { classifyDenganFallback } from "./classifyDenganFallback.ts";
import { pahamiDenganGemini, type KonfigGemini } from "../knowledge/geminiPemaham.ts";

/** Klasifikator satu pesan teks; async karena pemaham LLM berjalan lewat jaringan. */
export type KlasifikasiPesan = (teks: string) => Promise<InboundRouting>;

export interface OpsiKlasifikatorPesan {
  /** Fetch yang dipakai pemaham; default global, diisi mock pada tes. */
  readonly fetchFn?: typeof fetch;
  /** Timeout per percobaan pemaham (default mengikuti `pahamiDenganGemini`). */
  readonly timeoutMs?: number;
  /** Batas total waktu tunggu pemahaman sebelum jatuh ke regex (default 10000 ms). */
  readonly tenggatMs?: number;
}

const TENGGAT_DEFAULT_MS = 10_000;

/**
 * Bangun klasifikator pesan masuk. `konfig` null berarti integrasi nonaktif
 * (opt-in hanya bila `GEMINI_API_KEY` dikonfigurasi) — kembalikan jalur regex
 * tanpa menyentuh jaringan.
 */
export function buatKlasifikatorPesan(
  konfig: KonfigGemini | null,
  opsi: OpsiKlasifikatorPesan = {},
): KlasifikasiPesan {
  if (konfig === null) {
    return async (teks) => classifyInbound(teks);
  }
  const fetchFn = opsi.fetchFn ?? fetch;
  const tenggatMs = opsi.tenggatMs ?? TENGGAT_DEFAULT_MS;
  return async (teks) => {
    if (teks.trim() === "") return classifyInbound(teks);
    // Tenggat total: setelah lewat, tidak ada request lanjutan yang keluar
    // (percobaan ulang dari `pahamiDenganGemini` ditolak sebelum menyentuh
    // jaringan), dan pemanggil sudah lebih dulu jatuh ke regex.
    let lewatTenggat = false;
    const penandaTenggat = setTimeout(() => {
      lewatTenggat = true;
    }, tenggatMs);
    const fetchBertenggat: typeof fetch = (input, init) =>
      lewatTenggat
        ? Promise.reject(new Error("tenggat pemahaman terlampaui"))
        : fetchFn(input, init);
    try {
      const pemahaman = await denganTenggat(
        pahamiDenganGemini(teks, konfig, { fetchFn: fetchBertenggat, timeoutMs: opsi.timeoutMs }),
        tenggatMs,
      );
      return classifyDenganFallback(teks, { pemahaman });
    } finally {
      clearTimeout(penandaTenggat);
    }
  };
}

/**
 * Balut janji pemahaman dengan tenggat: bila tenggat habis lebih dulu,
 * segera kembalikan `null` (sinyal fallback ke regex) tanpa menunggu sisa
 * percobaan pemaham.
 */
function denganTenggat<T>(janji: Promise<T>, tenggatMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const penanda = setTimeout(() => resolve(null), tenggatMs);
    janji.then(
      (nilai) => {
        clearTimeout(penanda);
        resolve(nilai);
      },
      () => {
        clearTimeout(penanda);
        resolve(null);
      },
    );
  });
}
