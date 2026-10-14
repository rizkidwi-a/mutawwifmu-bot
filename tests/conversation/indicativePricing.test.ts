/**
 * Tes Harga Indikatif pada seam `handleInbound` (tiket 05): pertanyaan angka
 * harga yang tercantum materi dijawab sebagai Harga Indikatif dengan peringatan
 * yang jelas, sementara permintaan penawaran khusus, konfirmasi harga/
 * ketersediaan, satuan yang tidak tercantum materi, serta booking/pembayaran
 * tetap ke alur handoff tiket 02.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, lengkapiPermintaanLaluSetujui, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pertanyaan harga yang angkanya tercantum materi beserta kata kunci jawabannya.
 * Pesan sengaja tidak memuat kata "tersedia" atau "penawaran": keduanya adalah
 * permintaan konfirmasi/penawaran yang tetap ke alur admin (lihat tes di bawah).
 */
const PERTANYAAN_HARGA: ReadonlyArray<
  readonly [pesan: string, topik: string, kataKunci: readonly RegExp[]]
> = [
  ["Berapa harga mutawwif?", "price-mutawwif", [/SAR 300/, /SAR 400/, /per grup/]],
  ["Berapa biaya visa umrah?", "price-document-arrangement", [/IDR 2\.980\.000/, /IDR 100\.000/, /per pax/]],
  ["Berapa harga airport handling?", "price-airport-handling", [/Handling Bandara CGK/, /IDR 300\.000/, /SAR 300/, /SAR 900/, /2025–2026/]],
  ["Berapa harga transportasi dari Jeddah?", "price-transport", [/SAR 400/, /SAR 1\.550/, /per kendaraan/]],
  ["Berapa harga city tour Madinah?", "price-city-tour", [/SAR 820/, /SAR 1\.395/, /free snack/]],
  ["Berapa harga fotografer?", "price-photographer-videographer", [/SAR 600/, /SAR 4\.500/, /editing/, /Paket Spesial Ramadan/]],
  ["Berapa biaya tasreh raudhah?", "price-tasreh", [/IDR 300\.000 per pax/, /barcode/]],
];

for (const [pesan, topik, kataKunci] of PERTANYAAN_HARGA) {
  test(`pertanyaan harga "${pesan}" dijawab sebagai Harga Indikatif tanpa handoff`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /Harga Indikatif/);
    assert.match(balasan, /bukan penawaran final/);
    // Tiket 04: penegasan bahwa angka dapat berubah setelah diperiksa admin.
    assert.match(balasan, /dapat berubah[^.]*setelah diperiksa admin/i);
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
  // Tiket 04: penegasan bahwa angka dapat berubah setelah diperiksa admin.
  assert.match(balasan, /may change[^.]*after being reviewed by (our )?admin/i);
  assert.match(balasan, /SAR 300/);
  assert.match(balasan, /per group/);
  assert.doesNotMatch(balasan, /Harga Indikatif|penawaran/);
});

test("pertanyaan penawaran dalam intake dicatat tanpa dijawab dari materi", () => {
  // Pertanyaan penawaran dalam alur calon jemaah dicatat lebih dahulu; pilihan
  // non-calon-jemaah untuk handoff langsung diuji pada menu tujuan chat.
  const pesan = "Bisakah dibuatkan penawaran khusus untuk city tour Madinah?";
  const percakapan = new Percakapan();
  const awal = percakapan.kirim(pesan);
  assert.deepEqual(awal.actions, []);
  assert.doesNotMatch(teksBalasan(awal), /SAR|IDR|Rp|Harga Indikatif/);
  assert.match(teksBalasan(awal), /catat|noted/i);
  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.ok(request.notedQuestions.includes(pesan));
});

test("konfirmasi harga dan ketersediaan tidak dijawab sebagai Harga Indikatif dan tetap ke alur admin", () => {
  for (const pesan of [
    "Apakah city tour Madinah masih tersedia?",
    "Apakah harga hotel ini masih berlaku untuk Desember?",
  ]) {
    const percakapan = new Percakapan();
    const awal = percakapan.kirim(pesan);
    assert.deepEqual(awal.actions, [], pesan);
    assert.doesNotMatch(teksBalasan(awal), /Harga Indikatif|SAR|IDR/, pesan);
    assert.match(teksBalasan(awal), /catat|noted/i, pesan);
    const request = lengkapiPermintaanLaluSetujui(percakapan);
    assert.ok(request.notedQuestions.includes(pesan), pesan);
  }
});

test("pertanyaan harga dengan satuan yang tidak tercantum materi tidak ditafsirkan sendiri", () => {
  for (const pesan of ["Berapa harga hotel per malam?", "How much is the hotel per night?"]) {
    const percakapan = new Percakapan();
    const awal = percakapan.kirim(pesan);
    assert.deepEqual(awal.actions, [], pesan);
    assert.doesNotMatch(teksBalasan(awal), /per orang|per kamar|per person|per room/i, pesan);
    const request = lengkapiPermintaanLaluSetujui(percakapan);
    assert.ok(request.notedQuestions.includes(pesan), pesan);
  }
});

test("permintaan booking dan pembayaran terkait harga tetap ditangani admin, bukan transaksi bot", () => {
  const pesan = "Saya mau pesan city tour Mekkah, cara pembayarannya bagaimana?";
  const percakapan = new Percakapan();
  const awal = percakapan.kirim(pesan);
  assert.deepEqual(awal.actions, []);
  assert.match(teksBalasan(awal), /catat|noted/i);
  assert.doesNotMatch(teksBalasan(awal), /Harga Indikatif|(pesan|bayar|booking) sekarang/i);
  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.ok(request.notedQuestions.includes(pesan));
});

/**
 * Harga transportasi per rute (fitur harga-transportasi-per-rute): hanya
 * baris rute yang terpicu kata kunci tujuan yang ditampilkan, dengan angka
 * tabel transport 2026-10-12 (SAR per kendaraan/per grup).
 */
test("pertanyaan harga fotografi hanya menampilkan baris lokasi yang disebut", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa harga foto di Masjid Nabawi?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /bukan penawaran final/);
  assert.match(balasan, /dapat berubah[^.]*setelah diperiksa admin/i);
  assert.match(balasan, /Masjid Nabawi — Sendiri \/ Couple: SAR 500/);
  assert.match(balasan, /Masjid Nabawi — Family \/ lebih dari 2 pax: SAR 800/);
  assert.match(balasan, /Meeting point Masjid Nabawi: Depan Pintu 333/);
  // Baris dan angka lokasi lain tidak bocor ke jawaban.
  assert.doesNotMatch(balasan, /Masjidil Haram|Jabal Kudai|Al-Ula/);
  assert.doesNotMatch(balasan, /SAR 4\.500|SAR 1\.000/);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-photographer-videographer");
  assert.deepEqual(turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"), []);
});

test("pertanyaan harga tasreh dijawab Harga Indikatif walau menyebut Raudhah", () => {
  for (const pesan of [
    "Berapa biaya tasreh raudhah?",
    "berapa harga tasreh untuk masuk raudhah per pax?",
  ]) {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /Harga Indikatif/);
    assert.match(balasan, /bukan penawaran final/);
    assert.match(balasan, /dapat berubah[^.]*setelah diperiksa admin/i);
    assert.match(balasan, /IDR 300\.000 per pax/, pesan);
    assert.match(balasan, /barcode/, pesan);
    const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
    assert.ok(catat && catat.kind === "record-faq-answer", pesan);
    assert.equal(catat.topic, "price-tasreh", pesan);
    assert.deepEqual(
      turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
      [],
      pesan,
    );
  }
});

test("jawaban airport handling memakai angka CGK terbaru tanpa angka BOOKLET", () => {
  const balasan = teksBalasan(new Percakapan().kirim("Berapa harga handling bandara CGK?"));
  assert.match(balasan, /Handling Bandara CGK/);
  assert.match(balasan, /IDR 300\.000/);
  assert.doesNotMatch(balasan, /350[.,]000/);
});

test("pertanyaan harga transportasi hanya menampilkan rute sesuai tujuan yang disebut", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa harga transportasi dari Jeddah Airport ke Makkah Hotel?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /bukan penawaran final/);
  assert.match(balasan, /dapat berubah[^.]*setelah diperiksa admin/i);
  assert.match(balasan, /Bandara Jeddah → Hotel Makkah/);
  assert.match(balasan, /SAR 400/);
  assert.match(balasan, /SAR 950/);
  // Rute dan angka lain tidak bocor ke jawaban.
  assert.doesNotMatch(balasan, /Hotel Makkah → Hotel Madinah/);
  assert.doesNotMatch(balasan, /SAR 1\.350/);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-transport");
  assert.deepEqual(turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"), []);
});

test("pertanyaan harga transportasi dapat menyaring armada yang disebut", () => {
  const balasan = teksBalasan(
    new Percakapan().kirim("Berapa harga transport ziarah madinah pakai hiace?"),
  );
  assert.match(balasan, /Ziarah Madinah: Hiace SAR 500/);
  assert.doesNotMatch(balasan, /Camry|Staria|GMC|Coaster/);
});

test("pertanyaan harga transportasi tanpa tujuan dikenali dibalas menu daftar rute", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa ongkos transport selama disana?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /Rute yang tersedia/);
  assert.doesNotMatch(balasan, /SAR \d/);
  assert.deepEqual(turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"), []);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-transport");
});

test("pertanyaan harga transportasi berbahasa Inggris dijawab per rute dalam Inggris", () => {
  const balasan = teksBalasan(
    new Percakapan("en").kirim("How much is the transfer from Jeddah Airport to Makkah Hotel?"),
  );
  assert.match(balasan, /Indicative Price/);
  assert.match(balasan, /not a final offer/);
  assert.match(balasan, /Jeddah Airport to Makkah Hotel/);
  assert.match(balasan, /SAR 400/);
  assert.doesNotMatch(balasan, /Harga Indikatif/);
});
