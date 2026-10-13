/**
 * Tes Ringkasan Kebutuhan untuk admin (tiket 03) pada seam `handleInbound`:
 * ringkasan per bidang ditampilkan kepada calon jemaah sebelum persetujuan
 * tanpa placeholder internal, istilahnya konsisten dengan `CONTEXT.md`
 * (Permintaan Tindak Lanjut, Ringkasan Kebutuhan), dan pesan non-teks yang
 * diterima selama intake disebut sebagai lampiran tanpa menafsirkan isinya.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/** Jalankan pengumpulan lengkap sampai Ringkasan Kebutuhan (anggaran tidak ditanyakan). */
function kumpulkanSampaiRingkasan(percakapan: Percakapan): string {
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Mutawwif dan hotel");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  return teksBalasan(
    percakapan.kirim("yang butuh visa cuma bapak & ibu mertua, terbang dari Jakarta"),
  );
}

test("ringkasan sebelum persetujuan menampilkan setiap bidang Permintaan Tindak Lanjut", () => {
  const percakapan = new Percakapan();
  const ringkasan = kumpulkanSampaiRingkasan(percakapan);
  assert.match(ringkasan, /Layanan yang diminati: Mutawwif dan hotel/);
  assert.match(ringkasan, /Tanggal\/periode: Rencana Desember 2025/);
  assert.match(ringkasan, /Jumlah jemaah: 4 orang/);
  assert.match(
    ringkasan,
    /Kebutuhan detail: yang butuh visa cuma bapak & ibu mertua, terbang dari Jakarta/,
  );
  // Baris kisaran anggaran dihapus dari Ringkasan Kebutuhan.
  assert.doesNotMatch(ringkasan, /Kisaran anggaran/);
  assert.match(ringkasan, /setuju/i);
});

test("teks ringkasan bebas placeholder internal", () => {
  const ringkasan = kumpulkanSampaiRingkasan(new Percakapan());
  assert.doesNotMatch(ringkasan, /requestSummary/i);
  assert.doesNotMatch(ringkasan, /\{\{|\}\}|<%|%>|\bTODO\b|\[object\b/i);
});

test("istilah pada ringkasan konsisten dengan CONTEXT.md", () => {
  const ringkasan = kumpulkanSampaiRingkasan(new Percakapan());
  assert.match(ringkasan, /Ringkasan Kebutuhan/);
  assert.match(ringkasan, /Permintaan Tindak Lanjut/);
});

test("pesan non-teks diakui penerimaannya dan disebut sebagai lampiran pada ringkasan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Mutawwif dan hotel");
  percakapan.kirim("Rencana Desember 2025");
  const diakui = teksBalasan(percakapan.kirimLampiran());
  assert.match(diakui, /lampiran/i);
  percakapan.kirim("4 orang");
  const ringkasan = teksBalasan(percakapan.kirim("yang butuh visa cuma bapak & ibu mertua"));
  assert.match(ringkasan, /Lampiran: 1 pesan non-teks/i);
});

test("isi lampiran tidak ditafsirkan bot", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  const diakui = teksBalasan(percakapan.kirimLampiran());
  assert.match(diakui, /tidak (saya )?(tafsirkan|menafsirkan|membaca|tanggapi)/i);
});

test("lampiran tidak mengisi bidang kebutuhan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Mutawwif dan hotel");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirimLampiran();
  percakapan.kirim("4 orang");
  const ringkasan = percakapan.kirim("Butuh kamar keluarga");
  // Balasan atas lampiran tidak mengonsumsi bidang yang sedang ditanya.
  assert.match(teksBalasan(ringkasan), /setuju/i);
  assert.deepEqual(ringkasan.actions, []);
  const turn = percakapan.kirim("Ya, setuju");
  const catat = turn.actions.find((a) => a.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  assert.equal(catat.request.interestedServices, "Mutawwif dan hotel");
  assert.equal(catat.request.travelDateOrPeriod, "Rencana Desember 2025");
  assert.equal(catat.request.travellerCount, "4 orang");
  assert.equal(catat.request.detailedNeeds, "Butuh kamar keluarga");
  assert.equal(catat.request.attachmentCount, 1);
});

test("ringkasan tanpa lampiran tidak menyebut lampiran", () => {
  const ringkasan = kumpulkanSampaiRingkasan(new Percakapan());
  assert.doesNotMatch(ringkasan, /lampiran/i);
});

test("pesan non-teks saat menunggu persetujuan tetap muncul pada ringkasan sebelum persetujuan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Mutawwif dan hotel");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  const diperbarui = teksBalasan(percakapan.kirimLampiran());
  assert.match(diperbarui, /Lampiran: 1 pesan non-teks/i);
  assert.match(diperbarui, /setuju/i);
});

test("ringkasan Bahasa Inggris menyebut lampiran untuk pesan non-teks", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Hello, I would like a consultation about a private umrah trip");
  percakapan.kirim("Mutawwif and hotel");
  percakapan.kirim("December 2025");
  percakapan.kirimLampiran();
  percakapan.kirim("4 travellers");
  const ringkasan = teksBalasan(percakapan.kirim("Visa for my parents only"));
  assert.match(ringkasan, /summary of your needs/i);
  assert.match(ringkasan, /attachments?: 1 non-text/i);
  assert.doesNotMatch(ringkasan, /requestSummary/i);
});
