/**
 * Tes perilaku terlihat pada port `AdminChannel` (ADR-0006): isi handoff
 * diterima admin sebagai pesan WhatsApp ke nomor admin yang dikonfigurasi,
 * dan kegagalan pengiriman provider diteruskan sebagai error — bukan ditelan.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { WhatsAppAdminChannel, type AdminHandoff } from "../src/adminChannel.ts";
import type { MessageSender } from "../src/messageSender.ts";

const NOMOR_ADMIN = "6282283886627";

const handoff: AdminHandoff = {
  from: "628123456789",
  reason: "follow-up-request",
  request: {
    interestedServices: "Umrah premium, tujuan Mekkah",
    travelDateOrPeriod: "Rencana Desember 2025",
    travellerCount: "4 orang",
    detailedNeeds: "Butuh kamar keluarga",
    budgetRange: "Sekitar 50 juta",
    notedQuestions: ["Apa itu land arrangement?"],
    attachmentCount: 0,
    changeNotes: [],
  },
};

/** Stub port MessageSender: mencatat pesan keluar, atau menolak bila diminta. */
function buatPengirim(opsi: { gagal?: boolean } = {}): {
  sender: MessageSender;
  terkirim: Array<{ readonly to: string; readonly text: string }>;
} {
  const terkirim: Array<{ readonly to: string; readonly text: string }> = [];
  const sender: MessageSender = {
    sendText: async (to: string, text: string): Promise<void> => {
      if (opsi.gagal) {
        throw new Error("provider menolak pengiriman");
      }
      terkirim.push({ to, text });
    },
  };
  return { sender, terkirim };
}

test("kanal admin menerima Ringkasan Kebutuhan sebagai pesan WhatsApp", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  assert.equal(terkirim.length, 1);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.equal(pesan.to, NOMOR_ADMIN);
  assert.match(pesan.text, /Umrah premium, tujuan Mekkah/);
  assert.match(pesan.text, /Rencana Desember 2025/);
  assert.match(pesan.text, /4 orang/);
  assert.match(pesan.text, /kamar keluarga/);
});

test("pertanyaan yang dicatat ikut dibawa ke ringkasan untuk admin", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /Pertanyaan yang dicatat: Apa itu land arrangement\?/);
});

test("kanal admin mengirim ringkasan kebutuhan tanpa riwayat percakapan", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /Ringkasan Kebutuhan:/);
  assert.match(pesan.text, /Umrah premium, tujuan Mekkah/);
  assert.doesNotMatch(pesan.text, /Konteks percakapan:|calon-jemaah:|asisten:/);
});

test("pesan untuk admin mempertahankan alasan dan identitas tanpa riwayat percakapan", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /follow-up-request/);
  assert.match(pesan.text, /628123456789/);
  assert.doesNotMatch(pesan.text, /Konteks percakapan:|calon-jemaah:|asisten:/);
});

test("baris kisaran anggaran tidak lagi dikirim ke admin", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.doesNotMatch(pesan.text, /Kisaran anggaran/);
});

test("pesan admin memuat ringkasan lengkap tanpa konteks percakapan", async () => {
  const { sender, terkirim } = buatPengirim();
  const request = handoff.request;
  assert.ok(request);
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver({
    ...handoff,
    request: { ...request, attachmentCount: 2 },
  });
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /Nomor calon jemaah: 628123456789/);
  assert.match(pesan.text, /Layanan yang diminati: Umrah premium, tujuan Mekkah/);
  assert.match(pesan.text, /Tanggal\/periode: Rencana Desember 2025/);
  assert.match(pesan.text, /Jumlah jemaah: 4 orang/);
  assert.match(pesan.text, /Kebutuhan detail: Butuh kamar keluarga/);
  assert.doesNotMatch(pesan.text, /Kisaran anggaran/);
  assert.match(pesan.text, /Lampiran: 2 pesan non-teks/);
  assert.doesNotMatch(pesan.text, /Konteks percakapan:|calon-jemaah:|asisten:/);
});

test("ringkasan untuk admin memakai istilah Ringkasan Kebutuhan", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /Ringkasan Kebutuhan:/);
});

test("lampiran hanya disebut pada ringkasan admin bila ada", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.doesNotMatch(pesan.text, /Lampiran/);
});

test("pengiriman ulang ditandai PEMBARUAN pada pesan admin sebagai revisi, bukan prospek baru", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver({
    ...handoff,
    revision: true,
  });
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /PEMBARUAN/);
  assert.match(pesan.text, /revisi/i);
  assert.match(pesan.text, /bukan prospek baru/i);
  // Penanda muncul di awal pesan agar terlihat saat dipindai admin.
  assert.ok(pesan.text.indexOf("PEMBARUAN") < pesan.text.indexOf("Ringkasan Kebutuhan:"));
});

test("pesan admin tanpa revisi tidak menyebut penanda PEMBARUAN", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.doesNotMatch(pesan.text, /PEMBARUAN/);
});

test("catatan perubahan ikut disebut pada Ringkasan Kebutuhan untuk admin", async () => {
  const { sender, terkirim } = buatPengirim();
  const request = handoff.request;
  assert.ok(request);
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver({
    ...handoff,
    revision: true,
    request: {
      ...request,
      changeNotes: ["Tambah airport handling", "Transportasi tidak jadi"],
    },
  });
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.match(pesan.text, /- Perubahan: Tambah airport handling/);
  assert.match(pesan.text, /- Perubahan: Transportasi tidak jadi/);
});

test("ringkasan tanpa catatan perubahan tidak menyebut perubahan", async () => {
  const { sender, terkirim } = buatPengirim();
  await new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff);
  const pesan = terkirim[0];
  assert.ok(pesan);
  assert.doesNotMatch(pesan.text, /Perubahan:/);
});

test("kegagalan pengiriman provider diteruskan sebagai error, bukan ditelan", async () => {
  const { sender, terkirim } = buatPengirim({ gagal: true });
  await assert.rejects(
    () => new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}).deliver(handoff),
    /provider menolak pengiriman/,
  );
  assert.deepEqual(terkirim, []);
});
