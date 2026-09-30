/**
 * Penilaian kesiapan konfigurasi sebelum cutover ke nomor produksi (tiket 06).
 * Dijalankan pemilik lewat `npm run cutover:check`; keluarannya adalah laporan
 * teks yang dilihat manusia. Yang dapat dinilai otomatis hanya konfigurasi
 * lokal — verifikasi nomor di provider, webhook, dan smoke test end-to-end
 * tetap langkah manual (lihat docs/whatsapp-number-cutover.md).
 *
 * Perilaku percakapan sengaja tidak tersentuh di sini: pergantian nomor hanya
 * mengubah konfigurasi (lihat src/config.ts), dan kesetaraan perilaku dijaga
 * tes di tests/config.test.ts serta tests/transport/cutoverParity.test.ts.
 */

import { loadConfig, type AppConfig } from "./config.ts";

/** Nomor pengembangan yang dikenal; jangan tertinggal setelah cutover. */
export const DEVELOPMENT_SENDER_NUMBER = "6289507003830";

/** Satu pemeriksaan kesiapan; `id` stabil untuk otomasi, `detail` untuk manusia. */
export interface CutoverCheck {
  readonly id: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface CutoverReadiness {
  /** true bila seluruh pemeriksaan lolos. */
  readonly ready: boolean;
  readonly checks: readonly CutoverCheck[];
}

export function evaluateCutoverReadiness(env: Record<string, string | undefined>): CutoverReadiness {
  const checks: CutoverCheck[] = [];

  let config: AppConfig | null = null;
  try {
    config = loadConfig(env);
    checks.push({
      id: "provider-config",
      ok: true,
      detail:
        `konfigurasi provider ${config.whatsapp.provider} lengkap ` +
        `(nomor pengirim ${config.whatsapp.senderNumber})`,
    });
  } catch (error) {
    checks.push({
      id: "provider-config",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  if (config !== null) {
    const senderIsNotDevelopment = config.whatsapp.senderNumber !== DEVELOPMENT_SENDER_NUMBER;
    checks.push({
      id: "production-sender-number",
      ok: senderIsNotDevelopment,
      detail: senderIsNotDevelopment
        ? `nomor pengirim ${config.whatsapp.senderNumber} bukan nomor pengembangan`
        : `konfigurasi masih memakai nomor pengembangan +62 895 0700 3830 — ganti WHATSAPP_SENDER_NUMBER ke nomor produksi`,
    });
  }

  return { ready: checks.every((c) => c.ok), checks };
}

/** Teks laporan untuk pemilik saat menjalankan `npm run cutover:check`. */
export function formatCutoverReadiness(readiness: CutoverReadiness): string {
  const lines = ["Kesiapan cutover nomor produksi:"];
  for (const check of readiness.checks) {
    lines.push(`[${check.ok ? "OK" : "GAGAL"}] ${check.id}: ${check.detail}`);
  }
  lines.push(
    readiness.ready
      ? "Status: siap untuk uji end-to-end pada nomor produksi."
      : "Status: belum siap — perbaiki pemeriksaan yang gagal di atas.",
  );
  lines.push(
    "Langkah manual tersisa (verifikasi nomor di provider, smoke test end-to-end, " +
      "informasi kontak publik, keputusan kanal admin): lihat docs/whatsapp-number-cutover.md.",
  );
  return lines.join("\n");
}
