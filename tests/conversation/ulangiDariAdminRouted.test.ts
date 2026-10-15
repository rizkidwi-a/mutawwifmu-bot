/**
 * Tes tiket 02 `.scratch/tujuan-chat`: sebelum perbaikan, memilih tujuan
 * vendor/mitra (2), tim internal (3), atau keperluan lain (4) mengunci
 * percakapan pada state `admin-routed` — setiap pesan dibalas "Terima kasih
 * atas pesan Anda." tanpa jalan keluar sampai proses di-restart. Kata kunci
 * ulangi harus mengembalikan percakapan ke pembuka layanan + menu tujuan,
 * tanpa menyingkirkan jalur mendesak dan pertanyaan harga yang sudah ada.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { handleInbound } from "../../src/conversation/handleInbound.ts";
import { konteksMenungguTujuanChat, teksBalasan } from "./pembantuPercakapan.ts";
import type {
  BotTurn,
  ConversationTurn,
  InboundMessage,
} from "../../src/conversation/types.ts";

const BASA_BASI = "Terima kasih atas pesan Anda.";

/** Driver riwayat mentah untuk percakapan yang memilih tujuan selain "1". */
class PercakapanMentah {
  private riwayat: readonly ConversationTurn[];

  constructor(awal: readonly ConversationTurn[] = []) {
    this.riwayat = awal;
  }

  kirim(text: string): BotTurn {
    const pesan: InboundMessage = {
      id: `wamid.test.${this.riwayat.length}`,
      from: "628123456789",
      timestamp: "1727000000",
      text,
    };
    const turn = handleInbound(pesan, { history: this.riwayat });
    const berikut: ConversationTurn[] = [...this.riwayat, { role: "calon-jemaah", text }];
    if (turn.reply) berikut.push({ role: "asisten", text: turn.reply.text });
    this.riwayat = berikut;
    return turn;
  }
}

/** Percakapan pada state `admin-routed` setelah memilih tujuan 2/3/4. */
function percakapanAdminRouted(pilihan: string): PercakapanMentah {
  const p = new PercakapanMentah(konteksMenungguTujuanChat().history);
  p.kirim(pilihan);
  return p;
}

for (const pilihan of ["2", "3", "4"]) {
  test(`"ulangi percakapan" dari admin-routed (menu ${pilihan}) membalas pembuka + menu tujuan`, () => {
    const p = percakapanAdminRouted(pilihan);
    const turn = p.kirim("ulangi percakapan");
    const balasan = teksBalasan(turn);
    assert.notEqual(balasan, BASA_BASI);
    assert.match(balasan, /Terima kasih telah menghubungi Mutawwifmu/);
    assert.match(balasan, /1\. Calon jemaah \/ informasi paket/);
    assert.match(balasan, /2\. Vendor \/ mitra bisnis/);
    assert.match(balasan, /3\. Tim internal Mutawwifmu/);
    assert.match(balasan, /4\. Keperluan lain \/ ingin menghubungi admin/);
    assert.deepEqual(turn.actions, []);
  });
}

test("pesan setelah ulangi dari admin-routed diproses sebagai percakapan baru dengan draft kosong", () => {
  const p = percakapanAdminRouted("3");
  p.kirim("ulangi percakapan");

  const pilih = p.kirim("1");
  assert.match(teksBalasan(pilih), /Layanan apa saja yang Anda minati/);

  p.kirim("Visa dan hotel");
  p.kirim("Januari 2026");
  p.kirim("2 orang");
  p.kirim("Tidak ada");
  const setuju = p.kirim("Ya, setuju");
  const catat = setuju.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  // Draft baru terisi dari awal, bukan lanjutan percakapan sebelumnya.
  assert.equal(catat.request.interestedServices, "Visa dan hotel");
  assert.equal(catat.request.travellerCount, "2 orang");
});

test("basa-basi biasa pada admin-routed tetap pengakuan singkat, bukan pembuka + menu", () => {
  const p = percakapanAdminRouted("4");
  const turn = p.kirim("halo");
  assert.equal(teksBalasan(turn), BASA_BASI);
});

test("pertanyaan Harga Indikatif pada admin-routed tetap dijawab lebih dulu", () => {
  const p = percakapanAdminRouted("4");
  const turn = p.kirim("berapa harga fotografer?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.doesNotMatch(balasan, /Calon jemaah \/ informasi paket/);
});

test("pesan berisi harga sekaligus kata ulangi tetap dijawab sebagai pertanyaan harga", () => {
  const p = percakapanAdminRouted("4");
  const turn = p.kirim("ulangi, berapa harga fotografer?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.doesNotMatch(balasan, /Calon jemaah \/ informasi paket/);
});

for (const [teks, lead] of [
  ["Saya ingin bicara dengan admin", /berbicara dengan tim kami/],
  ["ada keadaan darurat di Mekkah", /keadaan darurat/],
  // Pemicu mendesak menang atas kata kunci ulangi (prioritas ADR-0014).
  ["ulangi, saya ingin bicara dengan admin", /berbicara dengan tim kami/],
  ["ulangi, ada keadaan darurat", /keadaan darurat/],
] as const) {
  test(`pemicu mendesak "${teks}" dari admin-routed tetap menyela ke handoff, bukan menu ulangi`, () => {
    const p = percakapanAdminRouted("3");
    const turn = p.kirim(teks);
    const balasan = teksBalasan(turn);
    assert.match(balasan, lead);
    assert.doesNotMatch(balasan, /Calon jemaah \/ informasi paket/);
  });
}
