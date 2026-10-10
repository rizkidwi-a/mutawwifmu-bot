/**
 * Tes alur utama Permintaan Tindak Lanjut pada seam `handleInbound` (tiket 01,
 * ADR-0009):
 * - setiap chat prospek diarahkan ke pengumpulan kebutuhan tanpa harus cocok
 *   pola pembuka khusus;
 * - pertanyaan non-harga tidak dijawab dari `businessFaq.ts`, melainkan dicatat
 *   apa adanya sebagai bagian kebutuhan dan dibawa ke Ringkasan Kebutuhan;
 * - pertanyaan Harga Indikatif tetap dijawab, termasuk saat pengumpulan;
 * - pemicu darurat, perjalanan aktif, dan permintaan manusia menyela langsung
 *   ke handoff tanpa menunggu pengumpulan selesai.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/** Jalankan pengumpulan sampai Ringkasan Kebutuhan (anggaran dilewati). */
function kumpulkanSampaiRingkasan(percakapan: Percakapan): string {
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  return teksBalasan(percakapan.kirim("tidak usah"));
}

test("pembuka tanpa pola konsultasi langsung diarahkan ke pengumpulan kebutuhan", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Halo");
  assert.deepEqual(turn.actions, []);
  assert.match(teksBalasan(turn), /layanan|tujuan/i);
  assert.match(teksBalasan(turn), /minati/i);
});

test("pengumpulan berjalan setelah pembuka tanpa pola konsultasi", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  assert.match(teksBalasan(percakapan.kirim("Umrah premium, tujuan Mekkah")), /tanggal|periode/i);
  assert.match(teksBalasan(percakapan.kirim("Rencana Desember 2025")), /jumlah jemaah/i);
  assert.match(teksBalasan(percakapan.kirim("4 orang")), /kebutuhan detail/i);
  assert.match(teksBalasan(percakapan.kirim("Butuh kamar keluarga")), /anggaran/i);
  const ringkasan = teksBalasan(percakapan.kirim("tidak usah"));
  assert.match(ringkasan, /Umrah premium/);
  assert.match(ringkasan, /setuju/i);
});

test("pembuka berbahasa Inggris diarahkan ke pengumpulan dalam Bahasa Inggris", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("Hello"));
  assert.match(balasan, /service|destination/i);
  assert.match(balasan, /interested/i);
});

test("pertanyaan non-harga tidak dijawab dari materi, dicatat, dan dibawa ke ringkasan", () => {
  const percakapan = new Percakapan();
  const pembuka = percakapan.kirim("Apa itu land arrangement?");
  const balasan = teksBalasan(pembuka);
  // Jawaban FAQ non-harga tidak lagi keluar dari materi (ADR-0009).
  assert.doesNotMatch(balasan, /Private Premium Umrah/);
  assert.match(balasan, /catat/i);
  assert.match(balasan, /layanan|tujuan/i);
  assert.deepEqual(pembuka.actions, []);

  const ringkasan = kumpulkanSampaiRingkasan(percakapan);
  assert.match(ringkasan, /Apa itu land arrangement\?/);

  const turn = percakapan.kirim("Ya, setuju");
  const catat = turn.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, ["Apa itu land arrangement?"]);
  const teruskan = turn.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.deepEqual(teruskan.request, catat.request);
});

test("pertanyaan non-harga berbahasa Inggris tidak dijawab dari materi dan dicatat", () => {
  const percakapan = new Percakapan("en");
  const balasan = teksBalasan(percakapan.kirim("What is land arrangement?"));
  assert.doesNotMatch(balasan, /Holy Land/);
  assert.match(balasan, /noted/i);
  assert.match(balasan, /service|destination/i);
});

test("pertanyaan non-harga saat pengumpulan dicatat tanpa mengisi bidang yang ditanya", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  const selingan = percakapan.kirim("Apakah bisa urus visa umrah?");
  const balasan = teksBalasan(selingan);
  assert.doesNotMatch(balasan, /Visa Umrah Reguler/);
  assert.match(balasan, /catat/i);
  // Bidang yang sedang ditanya tetap menunggu jawaban.
  assert.match(balasan, /layanan|tujuan/i);
  assert.match(teksBalasan(percakapan.kirim("Umrah premium")), /tanggal|periode/i);
});

test("pertanyaan Harga Indikatif tetap terjawab dan dilanjutkan ke pengumpulan", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa harga fotografer?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /SAR 600/);
  assert.match(balasan, /layanan|tujuan/i);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-photographer-videographer");
  assert.match(teksBalasan(percakapan.kirim("Fotografi untuk keluarga")), /tanggal|periode/i);
});

test("pertanyaan harga saat pengumpulan dijawab tanpa mengisi bidang yang ditanya", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  const selingan = percakapan.kirim("Berapa harga city tour Madinah?");
  const balasan = teksBalasan(selingan);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /SAR 820/);
  assert.match(balasan, /layanan|tujuan/i);
  assert.match(teksBalasan(percakapan.kirim("Ziarah city tour")), /tanggal|periode/i);
});

test("jawaban bidang yang memuat kata harga tetap dicatat sebagai jawaban bidang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("Hotel di Mekkah");
  percakapan.kirim("Desember 2025");
  percakapan.kirim("4 orang");
  assert.match(teksBalasan(percakapan.kirim("biaya hotel ditanggung kami, visa diurus sendiri")), /anggaran/i);
});

test("pertanyaan non-harga saat menunggu persetujuan dicatat tanpa menggagalkan konfirmasi", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("tidak usah");

  const selingan = percakapan.kirim("Kamar hotel tipe apa saja?");
  assert.match(teksBalasan(selingan), /catat/i);
  assert.match(teksBalasan(selingan), /setuju/i);
  assert.deepEqual(selingan.actions, []);

  const turn = percakapan.kirim("Ya, setuju");
  const catat = turn.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request.notedQuestions, ["Kamar hotel tipe apa saja?"]);
});

const PENCELAH: ReadonlyArray<readonly [pesan: string, alasan: string]> = [
  ["tolong, ada kecelakaan, ini keadaan darurat", "emergency"],
  ["kami sedang berada di Mekkah sekarang, jadwal hari ini berubah", "active-trip"],
  ["sebenarnya saya mau bicara dengan manusia saja", "human-request"],
];

for (const [pesan, alasan] of PENCELAH) {
  test(`pemicu ${alasan} menyela pengumpulan dan langsung meminta persetujuan handoff`, () => {
    const percakapan = new Percakapan();
    percakapan.kirim("Halo");
    percakapan.kirim("Umrah premium, tujuan Mekkah");
    const menyela = percakapan.kirim(pesan);
    assert.deepEqual(menyela.actions, []);
    const balasan = teksBalasan(menyela);
    assert.match(balasan, /teruskan|diteruskan/i);
    assert.match(balasan, /setuju/i);
    const turn = percakapan.kirim("ya");
    const handoff = turn.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
    assert.ok(handoff && handoff.kind === "hand-off-to-admin");
    assert.equal(handoff.reason, alasan);
  });
}
