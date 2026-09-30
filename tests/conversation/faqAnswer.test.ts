/**
 * Tes jawaban FAQ pada seam `handleInbound` (tiket 03): pertanyaan yang
 * didukung materi dijawab langsung dari materi, sementara pertanyaan harga dan
 * ketersediaan yang memerlukan konfirmasi mengalir ke alur handoff tiket 02.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pertanyaan yang didukung materi beserta kata kunci jawaban topiknya.
 * "Apakah tersedia city tour?" sengaja tidak dijadikan baris: kata "tersedia"
 * membuatnya menjadi pertanyaan ketersediaan yang perlu konfirmasi admin
 * (lihat tes ketersediaan di bawah), sama seperti pertanyaan harga.
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

for (const [pesan, topik, kataKunci] of PERTANYAAN_FAQ) {
  test(`pertanyaan FAQ "${pesan}" dijawab dari materi tanpa handoff`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    for (const kunci of kataKunci) {
      assert.match(balasan, kunci);
    }
    const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
    assert.ok(catat && catat.kind === "record-faq-answer");
    assert.equal(catat.topic, topik);
    assert.deepEqual(
      turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
      [],
    );
  });
}

test("pertanyaan FAQ dalam Bahasa Inggris dijawab dalam Bahasa Inggris", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("What is land arrangement?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Holy Land/);
  assert.doesNotMatch(balasan, /pengalaman ibadah/);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "land-arrangement");
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

test("jawaban FAQ tidak menjanjikan transaksi", () => {
  for (const [pesan] of PERTANYAAN_FAQ) {
    const percakapan = new Percakapan();
    const balasan = teksBalasan(percakapan.kirim(pesan));
    assert.doesNotMatch(balasan, /(pesan sekarang|bayar sekarang|booking sekarang)/i, pesan);
  }
});
