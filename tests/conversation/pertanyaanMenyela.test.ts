/**
 * Tes pertanyaan menyela berkata kunci (`.scratch/penyela-pengumpulan` tiket 01):
 * - "ingin bertanya" / "ada yang ingin ditanyakan" saat pengumpulan tidak
 *   menjadi jawaban bidang; isinya disimpan di Bagian Pertanyaan dan bot
 *   membalas bahwa pertanyaan akan dikonfirmasi admin;
 * - kata kunci polos meminta isi pertanyaan lebih dulu, lalu alur kembali ke
 *   state sebelumnya;
 * - frasa negasi tidak memicu; pertanyaan Harga Indikatif tetap dijawab dari
 *   materi walau memuat kata kunci.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/** Kumpulkan kebutuhan sampai Ringkasan Kebutuhan muncul (anggaran tidak ditanyakan). */
function kumpulkan(percakapan: Percakapan): void {
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
}

test("kata kunci dengan isi pertanyaan tidak mengisi bidang dan masuk Bagian Pertanyaan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const pertanyaan = "ingin bertanya, apakah bisa dapat kamar keluarga?";
  const selingan = percakapan.kirim(pertanyaan);
  const balasan = teksBalasan(selingan);
  assert.match(balasan, /bagian pertanyaan/i);
  assert.match(balasan, /dikonfirmasi admin/i);
  // Bidang tanggal/periode tetap menunggu jawaban, bukan terisi pertanyaan.
  assert.match(balasan, /tanggal|periode/i);
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const ringkasan = teksBalasan(percakapan.kirim("Butuh kamar keluarga"));
  assert.ok(ringkasan.includes(`Pertanyaan yang dicatat: ${pertanyaan}`));
  assert.match(ringkasan, /Tanggal\/periode: Rencana Desember 2025/);
  const setuju = percakapan.kirim("ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, [pertanyaan]);
  assert.equal(catat.request.travelDateOrPeriod, "Rencana Desember 2025");
});

test("'ada yang ingin ditanyakan' polos meminta isi pertanyaan lalu kembali ke state sebelumnya", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const polos = percakapan.kirim("ada yang ingin ditanyakan");
  assert.match(teksBalasan(polos), /sampaikan pertanyaannya/i);
  const isi = percakapan.kirim("apakah hotelnya dekat dengan Masjidil Haram?");
  const balasan = teksBalasan(isi);
  assert.match(balasan, /bagian pertanyaan/i);
  assert.match(balasan, /dikonfirmasi admin/i);
  // Kembali ke state sebelumnya: bidang yang tertunda diulang.
  assert.match(balasan, /tanggal|periode/i);
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const ringkasan = teksBalasan(percakapan.kirim("Butuh kamar keluarga"));
  assert.ok(
    ringkasan.includes("Pertanyaan yang dicatat: apakah hotelnya dekat dengan Masjidil Haram?"),
  );
});

test("kata kunci saat menunggu persetujuan dicatat tanpa mengubah permintaan konfirmasi", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  const pertanyaan = "ingin bertanya, apakah bisa refund?";
  const selingan = percakapan.kirim(pertanyaan);
  const balasan = teksBalasan(selingan);
  assert.match(balasan, /bagian pertanyaan/i);
  assert.match(balasan, /setuju/i);
  const setuju = percakapan.kirim("ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, [pertanyaan]);
});

test("frasa negasi tidak memicu pertanyaan menyela", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const negasi = percakapan.kirim("tidak ada yang ingin ditanyakan");
  // Bukan pertanyaan menyela: diperlakukan sebagai jawaban bidang biasa.
  assert.doesNotMatch(teksBalasan(negasi), /bagian pertanyaan/i);
  assert.match(teksBalasan(negasi), /jumlah jemaah/i);
});

test("pertanyaan Harga Indikatif tetap dijawab dari materi walau memuat kata kunci", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const balasan = teksBalasan(percakapan.kirim("mau tanya, berapa harga fotografer?"));
  assert.doesNotMatch(balasan, /bagian pertanyaan/i);
  assert.match(balasan, /SAR 600/);
});

test("pertanyaan menyela berbahasa Inggris memakai balasan Inggris", () => {
  const percakapan = new Percakapan("en");
  percakapan.kirim("Premium umrah to Makkah");
  const balasan = teksBalasan(percakapan.kirim("I have a question about the hotel rooms"));
  assert.match(balasan, /questions section/i);
  assert.match(balasan, /admin will confirm/i);
  assert.match(balasan, /date|period/i);
});

test("basa-basi saat menunggu isi pertanyaan tidak menjadi pertanyaan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("ingin bertanya");
  const basa = percakapan.kirim("makasi ya kak");
  assert.match(teksBalasan(basa), /sampaikan pertanyaannya/i);
  const isi = percakapan.kirim("berapa lama proses visanya?");
  assert.match(teksBalasan(isi), /bagian pertanyaan/i);
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const setuju = percakapan.kirim("ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, ["berapa lama proses visanya?"]);
});
