/**
 * Lapisan pengaman angka (ADR-0008, lapis 2–3).
 *
 * Dua aturan bisnis yang tidak bisa ditawar (spec baris 92: mengarang harga
 * = di luar cakupan/dilarang):
 *
 * 1. Setiap angka pada jawaban HARUS verbatim ada di materi. Karena jawaban
 *    selalu dari template manual `faqAnswer()`, pemeriksaan ini lolos secara
 *    konstruksi — dan akan menangkap bila kelak ada teks generatif yang lolos.
 * 2. Ambang keyakinan 0,6 — pemahaman di bawah itu dianggap ragu → handoff.
 */
import { faqAnswer, type FaqTopic } from "./businessFaq.ts";

/** Ambang keyakinan minimum agar hasil LLM dipakai (di bawahnya = ragu). */
export const AMBANG_KEYAKINAN = 0.6;

/** Ekstrak token angka (termasuk 3.200.000 / 1,250 / 2025–2026). */
export function ekstrakAngka(teks: string): readonly string[] {
  return teks.match(/\d[\d.,]*/g) ?? [];
}

/**
 * Benar bila setiap angka pada `jawaban` muncul verbatim di `materiGabungan`.
 * Perbandingan string apa adanya — tanpa normalisasi format — agar "1.250"
 * tidak disamakan dengan "1250".
 */
export function semuaAngkaAdaDiMateri(
  jawaban: string,
  materiGabungan: string,
): boolean {
  for (const angka of ekstrakAngka(jawaban)) {
    if (!materiGabungan.includes(angka)) return false;
  }
  return true;
}

/** Gabungan seluruh jawaban template = definisi "materi" yang dirender bot. */
export function materiGabunganDariTemplate(
  topik: readonly FaqTopic[],
  bahasa: "id" | "en" = "id",
): string {
  return topik.map((t) => faqAnswer(t, bahasa)).join("\n");
}
