import { test } from "node:test";
import assert from "node:assert/strict";
import { LoggingAdminChannel, type AdminHandoff } from "../src/adminChannel.ts";

const handoff: AdminHandoff = {
  from: "628123456789",
  reason: "follow-up-request",
  request: {
    serviceOrDestination: "Umrah premium, tujuan Mekkah",
    travelDateOrPeriod: "Rencana Desember 2025",
    travellerCount: "4 orang",
    mainNeeds: "Butuh kamar keluarga",
    budgetRange: "Sekitar 50 juta",
  },
  history: [
    { role: "calon-jemaah", text: "Umrah premium, tujuan Mekkah" },
    { role: "asisten", text: "Terima kasih. Kapan rencana tanggal atau periode perjalanan Anda?" },
  ],
};

test("kanal admin menerima ringkasan Permintaan Tindak Lanjut", () => {
  const diterima: string[] = [];
  new LoggingAdminChannel((text: string) => diterima.push(text)).deliver(handoff);
  assert.equal(diterima.length, 1);
  const teks = diterima[0];
  assert.ok(teks);
  assert.match(teks, /Umrah premium, tujuan Mekkah/);
  assert.match(teks, /Rencana Desember 2025/);
  assert.match(teks, /4 orang/);
  assert.match(teks, /kamar keluarga/);
  assert.match(teks, /50 juta/);
});

test("kanal admin menerima konteks percakapan dan alasan penerusan", () => {
  const diterima: string[] = [];
  new LoggingAdminChannel((text: string) => diterima.push(text)).deliver(handoff);
  const teks = diterima[0];
  assert.ok(teks);
  assert.match(teks, /calon-jemaah: Umrah premium, tujuan Mekkah/);
  assert.match(teks, /asisten: Terima kasih/);
  assert.match(teks, /follow-up-request/);
  assert.match(teks, /628123456789/);
});

test("anggaran yang tidak disampaikan ditandai apa adanya", () => {
  const diterima: string[] = [];
  const request = handoff.request;
  assert.ok(request);
  new LoggingAdminChannel((text: string) => diterima.push(text)).deliver({
    ...handoff,
    request: { ...request, budgetRange: null },
  });
  const teks = diterima[0];
  assert.ok(teks);
  assert.match(teks, /tidak disampaikan/);
});
