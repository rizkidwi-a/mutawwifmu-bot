/**
 * Tes pertanyaan FAQ non-harga pada seam `handleInbound` (tiket 01, ADR-0009).
 * Sebelum tiket ini, pertanyaan yang didukung materi dijawab langsung dari
 * `businessFaq.ts`. Kini jawaban non-harga dinonaktifkan dari jalur runtime:
 * pertanyaannya tidak dijawab dari materi, melainkan dicatat apa adanya sebagai
 * bagian kebutuhan dan diteruskan ke admin bersama Ringkasan Kebutuhan.
 * Penyesuaian sadar atas tes tiket 03 tercatat di Comments tiket 01
 * (`.scratch/lead-intake/issues/01-intake-sebagai-alur-utama.md`).
 * Pertanyaan harga dan ketersediaan yang memerlukan konfirmasi tetap mengalir
 * ke alur handoff; pertanyaan angka harga yang tercantum materi dijawab sebagai
 * Harga Indikatif (lihat `indicativePricing.test.ts`).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pertanyaan yang didukung materi beserta kata kunci jawaban topiknya yang
 * tidak boleh lagi muncul pada balasan. "Apakah tersedia city tour?" sengaja
 * tidak dijadikan baris: kata "tersedia" membuatnya menjadi pertanyaan
 * ketersediaan yang perlu konfirmasi admin (lihat tes ketersediaan di bawah).
 */
const PERTANYAAN_FAQ: ReadonlyArray<
  readonly [pesan: string, topik: string, kataKunci: readonly RegExp[]]
> = [
  ["Apa itu land arrangement?", "land-arrangement", [/Private Premium Umrah/, /Land Arrangement/]],
  ["Ceritakan tentang mutawwif Anda", "mutawwif", [/Mutawwif Reguler/, /Mutawwif Bilingual/]],
  ["Apakah bisa urus visa umrah?", "visa-documents", [/Visa Umrah Reguler/, /Asuransi Perjalanan/]],
  ["Kamar hotel tipe apa saja?", "hotel-accommodation", [/Double/, /Junior Suite/]],
  ["Apa saja jenis armada transportasinya?", "transport-fleet", [/Hiace/, /Coaster/]],
  ["Bagaimana layanan airport handling?", "airport-handling", [/imigrasi/, /bagasi/]],
  ["Apakah ada city tour?", "city-tour", [/City Tour Basic/, /Al Ula/]],
  ["Apa itu city tour di Mekkah?", "city-tour-makkah", [/Jabal Tsur/, /Arafah/]],
];

for (const [pesan, , kataKunci] of PERTANYAAN_FAQ) {
  test(`pertanyaan FAQ non-harga "${pesan}" tidak dijawab dari materi dan diarahkan ke intake`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    for (const kunci of kataKunci) {
      assert.doesNotMatch(balasan, kunci, `${pesan}: balasan masih memuat jawaban materi ${kunci}`);
    }
    assert.match(balasan, /catat/i);
    assert.match(balasan, /layanan|tujuan/i);
    assert.deepEqual(turn.actions, []);
  });
}

test("pertanyaan FAQ non-harga dalam Bahasa Inggris dibalas tanpa jawaban materi", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("What is land arrangement?"));
  assert.doesNotMatch(balasan, /Holy Land/);
  assert.match(balasan, /noted/i);
  assert.deepEqual(
    percakapan.konteks.history.filter((t) => t.role === "asisten" && /Holy Land/.test(t.text)),
    [],
  );
});

test("pertanyaan non-harga dicatat dan dibawa ke Ringkasan Kebutuhan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Apa itu land arrangement?");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const ringkasan = teksBalasan(percakapan.kirim("tidak usah"));
  assert.match(ringkasan, /Apa itu land arrangement\?/);
  const turn = percakapan.kirim("Ya, setuju");
  const catat = turn.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, ["Apa itu land arrangement?"]);
});

test("permintaan penawaran harga tidak dijawab sebagai penawaran dan mengalir ke persetujuan handoff", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Saya ingin minta penawaran harga hotel di Mekkah");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
  // Balasan persetujuan tidak memuat angka harga apa pun.
  assert.doesNotMatch(balasan, /Rp|USD|\d/);
  assert.deepEqual(turn.actions, []);
});

test("pertanyaan ketersediaan tidak dijawab sebagai FAQ dan mengalir ke persetujuan handoff", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Apakah tersedia city tour?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
  assert.deepEqual(turn.actions, []);
});

test("balasan atas pertanyaan non-harga tidak menjanjikan transaksi", () => {
  for (const [pesan] of PERTANYAAN_FAQ) {
    const percakapan = new Percakapan();
    const balasan = teksBalasan(percakapan.kirim(pesan));
    assert.doesNotMatch(balasan, /(pesan sekarang|bayar sekarang|booking sekarang)/i, pesan);
  }
});
