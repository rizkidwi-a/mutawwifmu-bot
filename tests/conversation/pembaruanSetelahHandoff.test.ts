/**
 * Tes pembaruan kebutuhan setelah Ringkasan Kebutuhan terkirim (tiket 05) pada
 * seam `handleInbound` (keputusan pemilik, opsi a):
 * - calon jemaah masih dapat menambah/mengubah kebutuhan setelah ringkasan
 *   terkirim; perubahannya dikumpulkan apa adanya dan ditampilkan pada
 *   Ringkasan Kebutuhan yang diperbarui;
 * - pengiriman ulang ke admin selalu meminta persetujuan calon jemaah dan
 *   ditandai "PEMBARUAN" agar admin tahu ini revisi, bukan prospek baru;
 * - riwayat ringkasan yang sudah terkirim tidak tertimpa diam-diam: catatan
 *   perubahan terdahulu ikut dibawa pada setiap pengiriman berikutnya.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";
import type { BotTurn, FollowUpRequest } from "../../src/conversation/types.ts";

/** Pengumpulan lengkap + persetujuan: Ringkasan Kebutuhan pertama terkirim. */
function kirimRingkasanPertama(percakapan: Percakapan): BotTurn {
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  return percakapan.kirim("Ya, setuju");
}

/** Ambil `FollowUpRequest` dari tindakan pencatatan pada satu giliran bot. */
function requestTercatat(turn: BotTurn): FollowUpRequest {
  const catat = turn.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  return catat.request;
}

test("perubahan kebutuhan setelah ringkasan terkirim ditampilkan pada Ringkasan Kebutuhan yang diperbarui", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const ubah = percakapan.kirim("Tambah airport handling, transport tidak jadi");
  // Belum ada pengiriman sebelum persetujuan calon jemaah.
  assert.deepEqual(ubah.actions, []);
  const balasan = teksBalasan(ubah);
  assert.match(balasan, /Ringkasan Kebutuhan yang diperbarui/);
  assert.ok(balasan.includes("- Perubahan: Tambah airport handling, transport tidak jadi"));
  assert.match(balasan, /setuju/i);
});

test("Ringkasan Kebutuhan yang diperbarui mempertahankan nilai bidang yang sudah terkirim apa adanya", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const balasan = teksBalasan(percakapan.kirim("Tambah airport handling"));
  assert.ok(balasan.includes("- Layanan yang diminati: Umrah premium, tujuan Mekkah"));
  assert.ok(balasan.includes("- Tanggal/periode: Rencana Desember 2025"));
  assert.ok(balasan.includes("- Jumlah jemaah: 4 orang"));
  assert.ok(balasan.includes("- Kebutuhan detail: Butuh kamar keluarga"));
  // Baris kisaran anggaran dihapus dari Ringkasan Kebutuhan yang diperbarui.
  assert.doesNotMatch(balasan, /Kisaran anggaran/);
});

test("pengiriman ulang hanya terjadi setelah persetujuan calon jemaah dan ditandai sebagai revisi", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  percakapan.kirim("Tambah airport handling");

  const setuju = percakapan.kirim("Ya, setuju");
  const request = requestTercatat(setuju);
  assert.deepEqual(request.changeNotes, ["Tambah airport handling"]);

  const teruskan = setuju.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.reason, "follow-up-request");
  assert.equal(teruskan.revision, true);
  assert.match(teksBalasan(setuju), /teruskan|diteruskan/i);
});

test("Ringkasan Kebutuhan pertama tidak ditandai sebagai revisi", () => {
  const percakapan = new Percakapan();
  const kirim = kirimRingkasanPertama(percakapan);
  const teruskan = kirim.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.revision, undefined);
  assert.deepEqual(requestTercatat(kirim).changeNotes, []);
});

test("setiap pengiriman ulang meminta persetujuan baru", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  percakapan.kirim("Tambah airport handling");
  percakapan.kirim("Ya, setuju");

  // Perubahan berikutnya tidak dikirim otomatis — persetujuan diminta lagi.
  const putaranKedua = percakapan.kirim("Hotelnya dekat Masjidil Haram");
  assert.deepEqual(putaranKedua.actions, []);
  assert.match(teksBalasan(putaranKedua), /setuju/i);
  const kirimUlang = percakapan.kirim("Ya, setuju");
  const teruskan = kirimUlang.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.revision, true);
});

test("riwayat ringkasan yang sudah terkirim tidak tertimpa: catatan perubahan terdahulu ikut dibawa", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  percakapan.kirim("Tambah airport handling");
  const kirimKedua = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(kirimKedua).changeNotes, ["Tambah airport handling"]);

  percakapan.kirim("Hotelnya dekat Masjidil Haram");
  const kirimKetiga = percakapan.kirim("Ya, setuju");
  const request = requestTercatat(kirimKetiga);
  assert.deepEqual(request.changeNotes, ["Tambah airport handling", "Hotelnya dekat Masjidil Haram"]);
  // Nilai bidang hasil pengumpulan pertama tetap utuh, tidak tertimpa.
  assert.equal(request.interestedServices, "Umrah premium, tujuan Mekkah");
  assert.equal(request.detailedNeeds, "Butuh kamar keluarga");
});

test("pengiriman ulang yang ditolak tidak mengirim apa pun dan perubahan tetap tersimpan", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  percakapan.kirim("Tambah airport handling");
  const tolak = percakapan.kirim("Tidak, jangan dulu");
  assert.deepEqual(tolak.actions, []);

  // Perubahan yang ditolak tidak hilang: ikut muncul pada putaran berikutnya.
  const balasan = teksBalasan(percakapan.kirim("Transportasi tetap dibutuhkan"));
  assert.ok(balasan.includes("- Perubahan: Tambah airport handling"));
  assert.ok(balasan.includes("- Perubahan: Transportasi tetap dibutuhkan"));

  const kirimUlang = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(kirimUlang).changeNotes, [
    "Tambah airport handling",
    "Transportasi tetap dibutuhkan",
  ]);
});

test("pertanyaan non-harga setelah ringkasan terkirim dicatat sebagai bagian kebutuhan", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const tanya = percakapan.kirim("Kamar hotel tipe apa saja?");
  assert.deepEqual(tanya.actions, []);
  const balasan = teksBalasan(tanya);
  assert.match(balasan, /catat/i);
  assert.match(balasan, /setuju/i);

  const kirimUlang = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(kirimUlang).notedQuestions, ["Kamar hotel tipe apa saja?"]);
});

test("pertanyaan Harga Indikatif setelah ringkasan terkirim dijawab tanpa memicu pengiriman ulang", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const tanya = percakapan.kirim("Berapa harga fotografer?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, /Harga Indikatif/);
  const catat = tanya.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-photographer-videographer");
  assert.deepEqual(
    tanya.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
    [],
  );

  // Percakapan tetap dalam mode pembaruan: perubahan berikutnya tetap ditangani.
  const balasanBerikut = teksBalasan(percakapan.kirim("Tambah fotografi ya"));
  assert.ok(balasanBerikut.includes("- Perubahan: Tambah fotografi ya"));
});

test("pesan non-teks setelah ringkasan terkirim menambah lampiran pada ringkasan yang diperbarui", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const lampiran = percakapan.kirimLampiran();
  assert.deepEqual(lampiran.actions, []);
  const balasan = teksBalasan(lampiran);
  assert.match(balasan, /lampiran/i);
  assert.ok(balasan.includes("- Lampiran: 1 pesan non-teks diterima"));
  assert.match(balasan, /setuju/i);

  const kirimUlang = percakapan.kirim("Ya, setuju");
  const request = requestTercatat(kirimUlang);
  assert.equal(request.attachmentCount, 1);
  assert.equal(
    kirimUlang.actions.find((aksi) => aksi.kind === "hand-off-to-admin")?.revision,
    true,
  );
});

test("pembaruan tetap berjalan sebagai revisi setelah handoff darurat menyela", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const darurat = percakapan.kirim("tolong, ada kecelakaan, ini keadaan darurat");
  assert.match(teksBalasan(darurat), /teruskan|diteruskan/i);
  const teruskan = percakapan.kirim("ya");
  const handoff = teruskan.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(handoff && handoff.kind === "hand-off-to-admin");
  assert.equal(handoff.reason, "emergency");

  // Riwayat ringkasan yang sudah terkirim tidak hilang oleh handoff: pesan
  // berikutnya tetap diproses sebagai pembaruan, bukan prospek baru.
  const balasan = teksBalasan(percakapan.kirim("Tambah airport handling"));
  assert.ok(balasan.includes("- Perubahan: Tambah airport handling"));
  assert.ok(balasan.includes("Umrah premium, tujuan Mekkah"));
  assert.match(balasan, /Ringkasan Kebutuhan yang diperbarui/);

  const kirimUlang = percakapan.kirim("Ya, setuju");
  assert.equal(
    kirimUlang.actions.find((aksi) => aksi.kind === "hand-off-to-admin")?.revision,
    true,
  );
});

test("ringkasan yang diperbarui bebas placeholder internal", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  const balasan = teksBalasan(percakapan.kirim("Tambah airport handling"));
  assert.doesNotMatch(balasan, /requestSummary/i);
  assert.doesNotMatch(balasan, /\{\{|\}\}|<%|%>|\bTODO\b|\[object\b/i);
  assert.match(balasan, /Ringkasan Kebutuhan/);
  assert.match(balasan, /Permintaan Tindak Lanjut/);
});

test("pembaruan berbahasa Inggris memakai ringkasan yang diperbarui dan persetujuan pengiriman ulang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Hello, I would like a consultation about a private umrah trip");
  percakapan.kirim("Mutawwif and hotel");
  percakapan.kirim("December 2025");
  percakapan.kirim("4 travellers");
  percakapan.kirim("Visa for my parents only");
  percakapan.kirim("Yes, please");

  const ubah = percakapan.kirim("Please add airport handling");
  const balasan = teksBalasan(ubah);
  assert.match(balasan, /updated summary of your needs/i);
  assert.ok(balasan.includes("- Change: Please add airport handling"));
  assert.match(balasan, /consent/i);
  assert.deepEqual(ubah.actions, []);

  const kirimUlang = percakapan.kirim("Yes, please");
  const teruskan = kirimUlang.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.revision, true);
  assert.equal(requestTercatat(kirimUlang).changeNotes[0], "Please add airport handling");
});
