import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

test("calon jemaah yang meminta konsultasi diminta layanan yang diminati dari menu", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /layanan|tujuan/i);
  assert.match(balasan, /minati/i);
  assert.deepEqual(turn.actions, []);
});

test("permintaan konsultasi dalam Bahasa Inggris dibalas dalam Bahasa Inggris", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Hello, I would like a consultation about a private umrah trip");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /service|destination/i);
  assert.match(balasan, /interested/i);
});

test("bot mengumpulkan bidang Permintaan Tindak Lanjut secara berurutan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  assert.match(teksBalasan(percakapan.kirim("Umrah premium, tujuan Mekkah dan Madinah")), /tanggal|periode/i);
  assert.match(teksBalasan(percakapan.kirim("Rencana Desember 2025")), /jumlah jemaah/i);
  assert.match(teksBalasan(percakapan.kirim("4 orang")), /kebutuhan detail/i);
});

test("setelah kebutuhan detail, kisaran anggaran ditawarkan secara opsional", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const balasan = teksBalasan(percakapan.kirim("Butuh kamar keluarga dan mutawwif berbahasa Indonesia"));
  assert.match(balasan, /anggaran/i);
  assert.match(balasan, /opsional|lewati/i);
});

test("sebelum meneruskan, bot menjelaskan tujuan penerusan dan meminta persetujuan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const balasan = teksBalasan(percakapan.kirim("Sekitar 50 juta"));
  assert.match(balasan, /ditindaklanjuti/i);
  assert.match(balasan, /customer service|penjualan/i);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
});

test("ringkasan persetujuan memuat bidang yang dikumpulkan termasuk anggaran bila diberikan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const balasan = teksBalasan(percakapan.kirim("Sekitar 50 juta"));
  assert.match(balasan, /Umrah premium/);
  assert.match(balasan, /Desember 2025/);
  assert.match(balasan, /4 orang/);
  assert.match(balasan, /kamar keluarga/);
  assert.match(balasan, /50 juta/);
});

test("anggaran yang dilewati dicatat sebagai tidak disampaikan tanpa menghalangi persetujuan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const balasan = teksBalasan(percakapan.kirim("tidak usah"));
  assert.match(balasan, /anggaran/i);
  assert.match(balasan, /tidak disampaikan/i);
  assert.match(balasan, /setuju/i);
});

test("persetujuan diberikan: permintaan dicatat dan diteruskan beserta konfirmasi", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("Sekitar 50 juta");
  const turn = percakapan.kirim("Ya, setuju");

  const catat = turn.actions.find((a) => a.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.deepEqual(catat.request, {
    interestedServices: "Umrah premium, tujuan Mekkah",
    travelDateOrPeriod: "Rencana Desember 2025",
    travellerCount: "4 orang",
    detailedNeeds: "Butuh kamar keluarga",
    budgetRange: "Sekitar 50 juta",
    notedQuestions: [],
  });

  const teruskan = turn.actions.find((a) => a.kind === "hand-off-to-admin");
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.reason, "follow-up-request");
  assert.deepEqual(teruskan.request, catat.request);
  assert.ok(teruskan.history.some((t) => t.text === "Umrah premium, tujuan Mekkah"));

  assert.match(teksBalasan(turn), /teruskan|diteruskan/i);
});

test("konfirmasi penerusan tidak menjanjikan waktu balasan admin", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("Sekitar 50 juta");
  const balasan = teksBalasan(percakapan.kirim("Ya, setuju"));
  assert.doesNotMatch(balasan, /(admin|tim)[^.]{0,30}(akan )?(membalas|menanggapi|merespon|respond)/i);
  assert.doesNotMatch(balasan, /dalam \d+ (jam|menit|hari)/i);
});

test("persetujuan ditolak: informasi tidak diteruskan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("Sekitar 50 juta");
  const turn = percakapan.kirim("Tidak, jangan diteruskan");
  assert.deepEqual(turn.actions, []);
  assert.match(teksBalasan(turn), /tidak .{0,25}(diteruskan|teruskan)/i);
});

test("jawaban persetujuan yang tidak jelas membuat bot meminta konfirmasi ulang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("Sekitar 50 juta");
  const turn = percakapan.kirim("mungkin seperti itu ya");
  assert.deepEqual(turn.actions, []);
  assert.match(teksBalasan(turn), /setuju/i);
});

test("bot tidak meminta paspor atau informasi kesehatan untuk konsultasi awal", () => {
  const percakapan = new Percakapan();
  const balasanBot: string[] = [];
  for (const pesan of [
    "Halo, saya ingin konsultasi untuk merencanakan umrah",
    "Umrah premium, tujuan Mekkah",
    "Rencana Desember 2025",
    "4 orang",
    "Butuh kamar keluarga",
    "tidak usah",
  ]) {
    balasanBot.push(teksBalasan(percakapan.kirim(pesan)));
  }
  for (const balasan of balasanBot) {
    assert.doesNotMatch(balasan, /paspor|passport/i);
    assert.doesNotMatch(balasan, /kesehatan|medical|health|riwayat penyakit/i);
  }
});
