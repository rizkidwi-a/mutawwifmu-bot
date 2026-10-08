/**
 * Tes bidang kebutuhan Permintaan Tindak Lanjut (tiket 02) pada seam
 * `handleInbound`: menu layanan pada langkah pertama, pertanyaan berurutan
 * dengan jawaban bebas, kebutuhan detail dalam satu jawaban panjang, dan
 * penyimpanan nilai bidang secara verbatim.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/** Item menu Layanan MUTAWWIFMU yang wajib ditampilkan pada langkah pertama. */
const MENU_LAYANAN = [
  "mutawwif",
  "visa & dokumen",
  "hotel",
  "transportasi",
  "airport handling",
  "ziarah/city tour",
  "tasreh",
  "fotografi",
  "lainnya",
];

test("langkah pertama menampilkan menu layanan MUTAWWIFMU", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah"));
  for (const item of MENU_LAYANAN) {
    assert.match(balasan, new RegExp(item, "i"), `menu memuat ${item}`);
  }
});

test("menu layanan juga ditampilkan untuk calon jemaah berbahasa Inggris", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("Hello, I would like a consultation about a private umrah trip"));
  for (const item of ["mutawwif", "visa", "hotel", "transportation", "airport handling", "ziarah/city tour", "tasreh", "photography", "others"]) {
    assert.match(balasan, new RegExp(item, "i"), `menu memuat ${item}`);
  }
});

test("jawaban layanan bebas diterima tanpa dipaksa memilih menu", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  const balasan = teksBalasan(percakapan.kirim("lainnya: umrah keluarga sambil city tour"));
  assert.match(balasan, /tanggal|periode/i);
});

test("pertanyaan kebutuhan detail menyebut rincian yang boleh disampaikan sekaligus", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Mutawwif dan hotel");
  percakapan.kirim("Rencana Desember 2025");
  const balasan = teksBalasan(percakapan.kirim("4 orang"));
  assert.match(balasan, /kebutuhan detail/i);
  assert.match(balasan, /visa/i);
  assert.match(balasan, /rute|asal/i);
  assert.match(balasan, /hotel/i);
  assert.match(balasan, /catatan/i);
  // Larangan meminta data paspor/kesehatan tetap berlaku pada prompt bidang.
  assert.doesNotMatch(balasan, /paspor|passport/i);
  assert.doesNotMatch(balasan, /kesehatan|medical|health|riwayat penyakit/i);
});

test("kebutuhan detail dapat diisi dalam satu jawaban panjang dan disimpan utuh verbatim", () => {
  const layanan = "lainnya: umrah keluarga sambil city tour";
  const detail =
    "yang butuh visa cuma bapak & ibu mertua, terbang dari Jakarta, hotel pesan sendiri, mohon kamar dekat masjid";
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim(layanan);
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim(detail);

  // Ringkasan sebelum persetujuan memuat jawaban panjang apa adanya.
  const ringkasan = teksBalasan(percakapan.kirim("tidak usah"));
  assert.ok(ringkasan.includes(detail), "ringkasan memuat kebutuhan detail utuh");

  const turn = percakapan.kirim("Ya, setuju");
  const catat = turn.actions.find((a) => a.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request, {
    interestedServices: layanan,
    travelDateOrPeriod: "Rencana Desember 2025",
    travellerCount: "4 orang",
    detailedNeeds: detail,
    budgetRange: null,
    notedQuestions: [],
    attachmentCount: 0,
    changeNotes: [],
  });
});
