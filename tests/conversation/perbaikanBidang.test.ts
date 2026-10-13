/**
 * Tes perbaikan bidang terarah (`.scratch/penyela-pengumpulan` tiket 02):
 * - "hapus bagian tanggal" / "jumlah jemaah hapus" mengosongkan bidang yang
 *   disebut, bot meminta ulang jawaban bidang itu saja, lalu kembali ke state
 *   sebelumnya (ringkasan + konfirmasi, pengumpulan, atau alur PEMBARUAN);
 * - beberapa bidang sekaligus diulang dalam urutan pengumpulan;
 * - bidang yang belum terisi diakui singkat tanpa mengubah state;
 * - pesan yang bukan perbaikan bidang (tanpa sebutan bidang, negasi, atau
 *   pernyataan bermuatan kata harga) tidak memicu perilaku ini.
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

/** Kasus misfire historis dari `.scratch/eval-classify.txt` (HARGA/price-hotel). */
const PERNYATAAN_HARGA =
  "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation " +
  "to non refundable soalnya bedanya jauh";

test("hapus bagian tanggal saat menunggu persetujuan mengulang tanggal lalu kembali ke konfirmasi", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  const hapus = percakapan.kirim("hapus bagian tanggal");
  const balasanHapus = teksBalasan(hapus);
  assert.match(balasanHapus, /Tanggal\/periode/);
  assert.match(balasanHapus, /isi ulang/i);
  assert.match(balasanHapus, /kapan rencana tanggal/i);
  const ulang = percakapan.kirim("Rencana Februari 2026");
  const ringkasan = teksBalasan(ulang);
  assert.match(ringkasan, /Ringkasan Kebutuhan/);
  assert.match(ringkasan, /Tanggal\/periode: Rencana Februari 2026/);
  assert.match(ringkasan, /setuju/i);
  const setuju = percakapan.kirim("ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.equal(catat.request.travelDateOrPeriod, "Rencana Februari 2026");
  assert.equal(catat.request.travellerCount, "4 orang");
});

test("koreksi saat pengumpulan mengulang bidang lalu melanjutkan ke bidang berikutnya", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const hapus = percakapan.kirim("yang jumlah jemaahnya hapus ya");
  assert.match(teksBalasan(hapus), /Jumlah jemaah/);
  assert.match(teksBalasan(hapus), /berapa jumlah jemaah/i);
  const ulang = percakapan.kirim("6 orang");
  // Kembali ke state sebelumnya: pengumpulan berlanjut ke kebutuhan detail.
  assert.match(teksBalasan(ulang), /kebutuhan detail/i);
  const ringkasan = teksBalasan(percakapan.kirim("Butuh kamar keluarga"));
  assert.match(ringkasan, /Jumlah jemaah: 6 orang/);
  assert.match(ringkasan, /Tanggal\/periode: Rencana Desember 2025/);
});

test("beberapa bidang dalam satu pesan diulang dalam urutan pengumpulan", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  const hapus = percakapan.kirim("hapus bagian tanggal dan jumlah jemaah");
  const balasanHapus = teksBalasan(hapus);
  assert.match(balasanHapus, /Tanggal\/periode dan Jumlah jemaah/);
  assert.match(balasanHapus, /kapan rencana tanggal/i);
  const t1 = percakapan.kirim("13-24 Januari 2026");
  assert.match(teksBalasan(t1), /berapa jumlah jemaah/i);
  const t2 = percakapan.kirim("5 orang");
  const ringkasan = teksBalasan(t2);
  assert.match(ringkasan, /Ringkasan Kebutuhan/);
  assert.match(ringkasan, /Tanggal\/periode: 13-24 Januari 2026/);
  assert.match(ringkasan, /Jumlah jemaah: 5 orang/);
  assert.match(ringkasan, /setuju/i);
});

test("koreksi setelah ringkasan terkirim masuk alur PEMBARUAN dengan persetujuan baru", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  percakapan.kirim("ya, setuju");
  const hapus = percakapan.kirim("hapus bagian jumlah jemaah");
  assert.match(teksBalasan(hapus), /Jumlah jemaah/);
  const ulang = percakapan.kirim("6 orang");
  const revisi = teksBalasan(ulang);
  assert.match(revisi, /diperbarui/);
  assert.match(revisi, /PEMBARUAN/);
  assert.match(revisi, /Jumlah jemaah: 6 orang/);
  const setuju = percakapan.kirim("ya");
  const teruskan = setuju.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.revision, true);
  assert.equal(teruskan.request?.travellerCount, "6 orang");
});

test("bidang anggaran tidak lagi ditanyakan sehingga tidak dapat dikoreksi", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  // Pertanyaan anggaran dihapus: kebutuhan detail langsung ke Ringkasan Kebutuhan.
  const ringkasan = teksBalasan(percakapan.kirim("ganti bagian anggaran"));
  assert.match(ringkasan, /belum terisi/i);
  assert.match(ringkasan, /setuju/i);
});

test("bidang yang belum terisi diakui singkat tanpa mengubah state", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const hapus = percakapan.kirim("hapus bagian anggaran");
  const balasan = teksBalasan(hapus);
  assert.match(balasan, /belum terisi/i);
  // State tidak berubah: bidang yang sedang ditanya tetap tanggal/periode.
  assert.match(balasan, /tanggal|periode/i);
  const isi = percakapan.kirim("Rencana Desember 2025");
  assert.match(teksBalasan(isi), /jumlah jemaah/i);
});

test("penyela selama pengulangan tidak membatalkan bidang yang sedang diulang", () => {
  const percakapan = new Percakapan();
  kumpulkan(percakapan);
  percakapan.kirim("hapus bagian tanggal");
  const basa = percakapan.kirim("makasi ya kak");
  assert.match(teksBalasan(basa), /tanggal|periode/i);
  const tanya = percakapan.kirim("ada yang ingin ditanyakan soal hotel");
  const balasanTanya = teksBalasan(tanya);
  assert.match(balasanTanya, /bagian pertanyaan/i);
  assert.match(balasanTanya, /tanggal|periode/i);
  const ulang = percakapan.kirim("Rencana Februari 2026");
  assert.match(teksBalasan(ulang), /Ringkasan Kebutuhan/);
  assert.match(teksBalasan(ulang), /Tanggal\/periode: Rencana Februari 2026/);
});

test("pesan tanpa sebutan bidang dan frasa negasi bukan perbaikan bidang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const tanpaBidang = percakapan.kirim("hapus ya");
  // Diperlakukan sebagai jawaban bidang biasa, bukan perbaikan.
  assert.doesNotMatch(teksBalasan(tanpaBidang), /isi ulang/i);
  assert.match(teksBalasan(tanpaBidang), /jumlah jemaah/i);

  const percakapanKedua = new Percakapan();
  percakapanKedua.kirim("Umrah premium, tujuan Mekkah");
  const negasi = percakapanKedua.kirim("jangan hapus bagian tanggal, maksud saya 13 Januari");
  assert.doesNotMatch(teksBalasan(negasi), /isi ulang/i);
  assert.match(teksBalasan(negasi), /jumlah jemaah/i);
});

test("pernyataan bermuatan kata harga dan 'ganti hotel' tidak salah jadi perbaikan bidang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const pernyataan = percakapan.kirim(PERNYATAAN_HARGA);
  // Menjadi jawaban kebutuhan detail, lalu langsung ke Ringkasan Kebutuhan.
  const ringkasan = teksBalasan(pernyataan);
  assert.match(ringkasan, /Ringkasan Kebutuhan/);
  assert.ok(ringkasan.includes(`Kebutuhan detail: ${PERNYATAAN_HARGA}`));
});
