/**
 * Tes Harga Indikatif pada seam `handleInbound` (tiket 05): pertanyaan angka
 * harga yang tercantum materi dijawab sebagai Harga Indikatif dengan peringatan
 * yang jelas, sementara permintaan penawaran khusus, konfirmasi harga/
 * ketersediaan, satuan yang tidak tercantum materi, serta booking/pembayaran
 * tetap ke alur handoff tiket 02.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pertanyaan harga yang angkanya tercantum materi beserta kata kunci jawabannya.
 * Pesan sengaja tidak memuat kata "tersedia" atau "penawaran": keduanya adalah
 * permintaan konfirmasi/penawaran yang tetap ke alur admin (lihat tes di bawah).
 */
const PERTANYAAN_HARGA: ReadonlyArray<
  readonly [pesan: string, topik: string, kataKunci: readonly RegExp[]]
> = [
  ["Berapa harga mutawwif?", "price-mutawwif", [/SAR 300/, /SAR 400/, /per grup/]],
  ["Berapa biaya visa umrah?", "price-document-arrangement", [/IDR 3\.200\.000/, /IDR 100\.000/, /per pax/]],
  ["Berapa harga airport handling?", "price-airport-handling", [/IDR 350\.000/, /SAR 300/, /SAR 900/, /2025–2026/]],
  ["Berapa harga transportasi dari Jeddah?", "price-transport", [/SAR 500/, /SAR 1\.650/, /per grup/]],
  ["Berapa harga city tour Madinah?", "price-city-tour", [/SAR 820/, /SAR 1\.395/, /free snack/]],
  ["Berapa harga fotografer?", "price-photographer-videographer", [/SAR 600/, /SAR 4\.500/, /editing/]],
];

for (const [pesan, topik, kataKunci] of PERTANYAAN_HARGA) {
  test(`pertanyaan harga "${pesan}" dijawab sebagai Harga Indikatif tanpa handoff`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /Harga Indikatif/);
    assert.match(balasan, /bukan penawaran final/);
    for (const kunci of kataKunci) {
      assert.match(balasan, kunci, `${pesan}: jawaban tidak memuat ${kunci}`);
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

test("jawaban Harga Indikatif tidak menyatakan harga final, tidak menjanjikan ketersediaan, dan tidak bertransaksi", () => {
  for (const [pesan] of PERTANYAAN_HARGA) {
    const balasan = teksBalasan(new Percakapan().kirim(pesan));
    assert.doesNotMatch(
      balasan,
      /(harga final|final price|fixed price|dijamin tersedia|guaranteed availability|pasti tersedia)/i,
      pesan,
    );
    assert.doesNotMatch(balasan, /(pesan sekarang|bayar sekarang|booking sekarang|lakukan transaksi)/i, pesan);
  }
});

test("harga hotel menyatakan konflik satuan materi dan mengarahkan konfirmasi ke admin", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa harga hotel di Mekkah?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /per orang/);
  assert.match(balasan, /per kamar/);
  assert.match(balasan, /bertentangan/);
  assert.match(balasan, /belum terverifikasi/i);
  assert.match(balasan, /admin|tim kami/);
  // Satuan yang bertentangan tidak ditafsirkan sendiri pada angkanya.
  assert.doesNotMatch(balasan, /(SAR|IDR|Rp)\s?[\d.,]+\s*(per|\/)\s*(orang|kamar)/i);
  assert.doesNotMatch(balasan, /(harga final|final price|dijamin tersedia)/i);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-hotel");
  assert.deepEqual(
    turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
    [],
  );
});

test("pertanyaan harga dalam Bahasa Inggris dijawab sebagai Indicative Price dalam Bahasa Inggris", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("How much is the mutawwif?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Indicative Price/);
  assert.match(balasan, /not a final offer/);
  assert.match(balasan, /SAR 300/);
  assert.match(balasan, /per group/);
  assert.doesNotMatch(balasan, /Harga Indikatif|penawaran/);
});

test("permintaan penawaran khusus tetap ke alur admin meski angkanya tercantum materi", () => {
  for (const pesan of [
    "Saya ingin minta penawaran harga untuk fotografer",
    "Bisakah dibuatkan penawaran khusus untuk city tour Madinah?",
  ]) {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /teruskan|diteruskan/i);
    assert.match(balasan, /setuju/i);
    assert.doesNotMatch(balasan, /SAR|IDR|Rp/);
    assert.deepEqual(turn.actions, []);

    const lanjut = percakapan.kirim("ya");
    const handoff = lanjut.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
    assert.ok(handoff && handoff.kind === "hand-off-to-admin");
    assert.equal(handoff.reason, "custom-quote-or-availability");
  }
});

test("konfirmasi harga dan ketersediaan tetap ke alur admin, bukan Harga Indikatif", () => {
  for (const pesan of [
    "Apakah city tour Madinah masih tersedia?",
    "Apakah harga hotel ini masih berlaku untuk Desember?",
  ]) {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /teruskan|diteruskan/i);
    assert.match(balasan, /setuju/i);
    assert.doesNotMatch(balasan, /Harga Indikatif|SAR|IDR/);
    assert.deepEqual(turn.actions, []);
  }
});

test("pertanyaan harga dengan satuan yang tidak tercantum materi tidak ditafsirkan sendiri", () => {
  for (const pesan of ["Berapa harga hotel per malam?", "How much is the hotel per night?"]) {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /teruskan|diteruskan|forward/i);
    assert.match(balasan, /setuju|consent/i);
    assert.doesNotMatch(balasan, /per orang|per kamar|per person|per room/i);
    assert.deepEqual(turn.actions, []);

    const lanjut = percakapan.kirim("ya");
    const handoff = lanjut.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
    assert.ok(handoff && handoff.kind === "hand-off-to-admin");
    assert.equal(handoff.reason, "custom-quote-or-availability");
  }
});

test("permintaan booking dan pembayaran terkait harga tetap ditangani admin, bukan transaksi bot", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Saya mau pesan city tour Mekkah, cara pembayarannya bagaimana?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
  assert.deepEqual(turn.actions, []);

  const lanjut = percakapan.kirim("ya");
  const handoff = lanjut.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(handoff && handoff.kind === "hand-off-to-admin");
  assert.equal(handoff.reason, "booking-or-payment");
});
