/**
 * Tes pesan yang menyela pengumpulan Permintaan Tindak Lanjut (tiket 06):
 * - basa-basi dibalas singkat dengan mengulang bidang yang sedang ditanya,
 *   tanpa mengisi bidang atau mencemari Ringkasan Kebutuhan;
 * - pernyataan bermuatan kata harga diperlakukan sebagai informasi/kebutuhan,
 *   tidak dijawab template Harga Indikatif (misfire kasus HARGA/price-hotel);
 * - pertanyaan yang tidak didukung terbawa ke admin sebagai "Pertanyaan yang
 *   dicatat", bukan mengisi bidang yang sedang ditanya;
 * - pertanyaan hasil penyempitan tiket 08 saat pengumpulan tetap dicatat dan
 *   tidak mengisi bidang (invarian tiket 06 yang dijaga lintas-tiket).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";
import { templateDalamBalasan } from "../regresi/deteksiMisfire.ts";
import { DI_LUAR_MATERI } from "./kasusDiLuarMateri.ts";

/** Kasus misfire historis dari `.scratch/eval-classify.txt` (HARGA/price-hotel). */
const PERNYATAAN_HARGA =
  "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation " +
  "to non refundable soalnya bedanya jauh";

/** Kumpulkan kebutuhan sampai Ringkasan Kebutuhan muncul (anggaran dilewati). */
function kumpulkan(percakapan: Percakapan): void {
  percakapan.kirim("Halo");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("tidak usah");
}

test("basa-basi saat pengumpulan dibalas singkat dan mengulang bidang yang ditanya", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const balasan = teksBalasan(percakapan.kirim("makasi ya kak"));
  const [lead, ...sisa] = balasan.split("\n\n");
  assert.ok(lead && lead.length < 120, `balasan basa-basi harus singkat, dapat: ${lead}`);
  assert.match(sisa.join("\n\n"), /tanggal|periode/i);
  // Alur intake tidak rusak: bidang tetap menunggu jawaban yang sebenarnya.
  assert.match(teksBalasan(percakapan.kirim("Rencana Desember 2025")), /jumlah jemaah/i);
});

test("basa-basi tidak mengisi bidang dan tidak mencemari Ringkasan Kebutuhan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("makasi ya kak");
  percakapan.kirim("assalamualaikum kak..");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("oke iya betul kak..");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const ringkasan = teksBalasan(percakapan.kirim("tidak usah"));
  assert.match(ringkasan, /Layanan yang diminati: Umrah premium, tujuan Mekkah/);
  assert.match(ringkasan, /Tanggal\/periode: Rencana Desember 2025/);
  assert.match(ringkasan, /Jumlah jemaah: 4 orang/);
  assert.match(ringkasan, /Kebutuhan detail: Butuh kamar keluarga/);
  assert.doesNotMatch(ringkasan, /makasi ya kak|assalamualaikum|oke iya betul/i);
});

test("basa-basi saat menunggu persetujuan tetap meminta konfirmasi tanpa mencatat apa pun", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  const basaBasi = percakapan.kirim("makasi ya kak");
  assert.deepEqual(basaBasi.actions, []);
  assert.match(teksBalasan(basaBasi), /konfirmasi|setuju/i);
  const setuju = percakapan.kirim("Ya, setuju");
  assert.ok(setuju.actions.some((aksi) => aksi.kind === "hand-off-to-admin"));
});

test("basa-basi setelah ringkasan terkirim tidak menjadi perubahan kebutuhan", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  percakapan.kirim("Ya, setuju");
  const basaBasi = percakapan.kirim("makasi ya kak");
  assert.deepEqual(basaBasi.actions, []);
  assert.doesNotMatch(teksBalasan(basaBasi), /Ringkasan Kebutuhan yang diperbarui|PEMBARUAN/);
  // Perubahan yang sebenarnya tetap memicu ringkasan pembaruan.
  assert.match(teksBalasan(percakapan.kirim("Tambah airport handling")), /diperbarui|PEMBARUAN/i);
});

test("pernyataan bermuatan kata harga tidak dijawab template Harga Indikatif", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim(PERNYATAAN_HARGA);
  const balasan = teksBalasan(turn);
  assert.deepEqual(templateDalamBalasan(balasan), []);
  assert.doesNotMatch(balasan, /Harga Indikatif/);
  // Pernyataan menjadi jawaban bidang pertama pada intake yang sudah dipilih.
  assert.match(balasan, /tanggal|periode/i);
});

test("pernyataan bermuatan kata harga saat pengumpulan menjadi jawaban bidang apa adanya", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const turn = percakapan.kirim(PERNYATAAN_HARGA);
  assert.deepEqual(templateDalamBalasan(teksBalasan(turn)), []);
  percakapan.kirim("tidak usah");
  const setuju = percakapan.kirim("Ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.equal(catat.request.detailedNeeds, PERNYATAAN_HARGA);
});

test("pernyataan bermuatan kata harga setelah ringkasan terkirim menjadi perubahan kebutuhan", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  percakapan.kirim("Ya, setuju");
  const turn = percakapan.kirim(PERNYATAAN_HARGA);
  const balasan = teksBalasan(turn);
  assert.deepEqual(templateDalamBalasan(balasan), []);
  assert.match(balasan, /perubahan kebutuhan Anda saya catat/i);
  const setuju = percakapan.kirim("Ya, setuju");
  const teruskan = setuju.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.revision, true);
  assert.ok(teruskan.request);
  assert.deepEqual(teruskan.request.changeNotes, [PERNYATAAN_HARGA]);
});

test("pertanyaan yang tidak didukung terbawa ke admin, bukan mengisi bidang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const pertanyaan = "kak, mau tanya: kalo handling buat di soekarno hatta belum termasuk berarti ya?";
  const selingan = percakapan.kirim(pertanyaan);
  assert.deepEqual(templateDalamBalasan(teksBalasan(selingan)), []);
  // Bidang yang sedang ditanya tetap menunggu jawaban.
  assert.match(teksBalasan(selingan), /tanggal|periode/i);
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const ringkasan = teksBalasan(percakapan.kirim("tidak usah"));
  assert.ok(ringkasan.includes(`Pertanyaan yang dicatat: ${pertanyaan}`));
  const setuju = percakapan.kirim("Ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, [pertanyaan]);
  assert.equal(catat.request.travelDateOrPeriod, "Rencana Desember 2025");
});

test("pertanyaan tiket 08 saat pengumpulan tetap tercatat, bukan mengisi bidang", () => {
  for (const [kelompok, pesan] of DI_LUAR_MATERI) {
    const percakapan = new Percakapan();
    percakapan.kirim("Halo");
    percakapan.kirim("Umrah premium, tujuan Mekkah");
    const selingan = percakapan.kirim(pesan);
    assert.deepEqual(
      templateDalamBalasan(teksBalasan(selingan)),
      [],
      `${kelompok}: tidak boleh dijawab template materi`,
    );
    // Bidang yang sedang ditanya (tanggal/periode) tetap menunggu jawaban.
    assert.match(teksBalasan(selingan), /tanggal|periode/i, kelompok);
    percakapan.kirim("Rencana Desember 2025");
    percakapan.kirim("4 orang");
    percakapan.kirim("Butuh kamar keluarga");
    const ringkasan = teksBalasan(percakapan.kirim("tidak usah"));
    assert.ok(
      ringkasan.includes(`Pertanyaan yang dicatat: ${pesan}`),
      `${kelompok}: pertanyaan tidak terbawa ke Ringkasan Kebutuhan`,
    );
    const setuju = percakapan.kirim("Ya, setuju");
    const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
    assert.ok(catat && catat.kind === "record-follow-up-request", kelompok);
    assert.deepEqual(catat.request.notedQuestions, [pesan], kelompok);
    assert.equal(catat.request.travelDateOrPeriod, "Rencana Desember 2025", kelompok);
  }
});
