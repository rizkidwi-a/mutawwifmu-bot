/**
 * Tes perilaku pasca-handoff (`.scratch/pasca-handoff`): setelah Ringkasan
 * Kebutuhan terkirim, pesan apa pun harus memberi jalan keluar — memperbarui
 * bagian tertentu lewat kata kunci atau mengulang percakapan dari awal.
 *
 * Debug: sebelum perbaikan, basa-basi pada state `sent` hanya dibalas
 * "Terima kasih atas pesan Anda." tanpa langkah lanjutan sehingga terasa macet
 * (bukti transkrip nyata di `.scratch/pasca-handoff/debug.md`).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";
import type { BotTurn, FollowUpRequest } from "../../src/conversation/types.ts";

/** Pengumpulan lengkap + persetujuan: Ringkasan Kebutuhan pertama terkirim. */
function kirimRingkasanPertama(percakapan: Percakapan): BotTurn {
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

test("basa-basi pasca-handoff dibalas Menu Lanjutan, bukan balasan kosong", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  for (const basaBasi of ["halo", "terima kasih", "assalamualaikum"]) {
    const turn = percakapan.kirim(basaBasi);
    const balasan = teksBalasan(turn);
    assert.notEqual(balasan, "Terima kasih atas pesan Anda.");
    assert.match(balasan, /ulangi/i);
    assert.match(balasan, /perbarui|diubah|ubah/i);
    assert.deepEqual(turn.actions, []);
  }
});

test("basa-basi pasca-handoff tidak mengotori Ringkasan Kebutuhan", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  percakapan.kirim("halo");
  percakapan.kirim("terima kasih");

  const ubah = percakapan.kirim("Tambah airport handling");
  const balasan = teksBalasan(ubah);
  assert.ok(balasan.includes("- Perubahan: Tambah airport handling"));
  assert.doesNotMatch(balasan, /- Perubahan: halo/);
  assert.doesNotMatch(balasan, /- Perubahan: terima kasih/);

  const kirim = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(kirim).changeNotes, ["Tambah airport handling"]);
});

test("ulangi percakapan memulai intake baru dengan draft kosong", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const ulang = percakapan.kirim("ulangi percakapan");
  const pembuka = teksBalasan(ulang);
  // Pembuka baru memuat menu tujuan sehingga pesan berikutnya diproses sebagai
  // percakapan baru, bukan lanjutan ringkasan lama.
  assert.match(pembuka, /Calon jemaah \/ informasi paket/);
  assert.match(pembuka, /Vendor \/ mitra bisnis/);

  const pilih = percakapan.kirim("1");
  assert.match(teksBalasan(pilih), /Layanan apa saja/);

  percakapan.kirim("Visa dan hotel");
  percakapan.kirim("Januari 2026");
  percakapan.kirim("2 orang");
  percakapan.kirim("Tidak ada");
  const setuju = percakapan.kirim("Ya, setuju");
  const request = requestTercatat(setuju);
  assert.equal(request.interestedServices, "Visa dan hotel");
  assert.equal(request.travellerCount, "2 orang");
  // Ringkasan lama tidak terbawa ke percakapan baru.
  assert.doesNotMatch(teksBalasan(setuju), /kamar keluarga/i);
  assert.doesNotMatch(teksBalasan(setuju), /Umrah premium/i);
});

test("ulangi percakapan juga berlaku saat menunggu persetujuan pengiriman ulang", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  percakapan.kirim("Tambah airport handling");

  const ulang = percakapan.kirim("mulai dari awal");
  assert.match(teksBalasan(ulang), /Calon jemaah \/ informasi paket/);
});

test("perbaikan bidang setelah ringkasan terkirim tetap bekerja", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const mintaUlang = percakapan.kirim("ubah jumlah jemaah");
  assert.match(teksBalasan(mintaUlang), /Jumlah jemaah/);
  assert.match(teksBalasan(mintaUlang), /Berapa jumlah jemaah/);

  const jawab = percakapan.kirim("6 orang");
  assert.match(teksBalasan(jawab), /- Jumlah jemaah: 6 orang/);
});

test("'ulangi bagian tanggal' tetap perbaikan bidang, bukan ulangi percakapan", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);

  const balasan = teksBalasan(percakapan.kirim("ulangi bagian tanggal"));
  assert.match(balasan, /Tanggal\/periode/);
  assert.match(balasan, /hapus/i);
  assert.doesNotMatch(balasan, /Calon jemaah \/ informasi paket/);
});

test("penolakan pengiriman ulang diikuti Menu Lanjutan dan perubahan tetap tersimpan", () => {
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  percakapan.kirim("Tambah airport handling");

  const tolak = percakapan.kirim("Tidak, jangan dulu");
  const balasan = teksBalasan(tolak);
  assert.match(balasan, /tidak akan saya teruskan/i);
  assert.match(balasan, /ulangi/i);

  const lanjut = percakapan.kirim("Transportasi tetap dibutuhkan");
  assert.ok(teksBalasan(lanjut).includes("- Perubahan: Tambah airport handling"));
  assert.ok(teksBalasan(lanjut).includes("- Perubahan: Transportasi tetap dibutuhkan"));
});

test("basa-basi pasca-handoff berbahasa Inggris memakai Menu Lanjutan", () => {
  const percakapan = new Percakapan("en");
  percakapan.kirim("Private umrah, Makkah");
  percakapan.kirim("December 2025");
  percakapan.kirim("4 travellers");
  percakapan.kirim("Family room");
  percakapan.kirim("Yes, please");

  const turn = percakapan.kirim("Hello");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /start the conversation over/i);
  assert.match(balasan, /needs changing|mention the part|change number of travellers/i);
});

test("regresi transkrip nyata: 'halo' setelah penolakan pengiriman ulang dibalas Menu Lanjutan", () => {
  // Urutan nyata nomor 6285275258899 (data/transkrip-percakapan.csv):
  // ringkasan terkirim -> perubahan -> tolak kirim ulang -> "halo".
  const percakapan = new Percakapan();
  kirimRingkasanPertama(percakapan);
  percakapan.kirim("saya lupa bilang kalau tahun keberangkatannya untuk tahun depan");
  percakapan.kirim("tidak");

  const balasan = teksBalasan(percakapan.kirim("halo"));
  assert.notEqual(balasan, "Terima kasih atas pesan Anda.");
  assert.match(balasan, /ulangi/i);
});
