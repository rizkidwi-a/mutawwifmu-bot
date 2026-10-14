/**
 * Tes pertanyaan harga yang dijawab di semua fase percakapan
 * (`.scratch/harga-di-semua-fase`): di akhir percakapan (state `sent`),
 * setelah handoff ke admin (`admin-routed`), dan pada fase yang membalas
 * "Terima kasih atas pesan Anda." (`awaiting-question`, `awaiting-consent`).
 *
 * Debug: sebelum perbaikan, pertanyaan harga — termasuk yang angkanya ada di
 * materi — ditelan balasan pengakuan atau sekadar dicatat (bukti repro di
 * `.scratch/harga-di-semua-fase/debug.md`).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Percakapan,
  konteksMenungguTujuanChat,
  lengkapiPermintaanLaluSetujui,
  teksBalasan,
} from "./pembantuPercakapan.ts";
import { handleInbound } from "../../src/conversation/handleInbound.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { faqAnswer } from "../../src/knowledge/businessFaq.ts";
import type {
  BotTurn,
  ConversationTurn,
  FollowUpRequest,
  InboundMessage,
} from "../../src/conversation/types.ts";

/** Jawaban untuk pertanyaan harga tanpa angka materi (penawaran oleh tim). */
const HARGA_KE_TIM = /Materi kami belum memuat kepastian harga atau ketersediaan/;
const BASA_BASI = "Terima kasih atas pesan Anda.";

/** Driver riwayat mentah untuk percakapan yang tidak memilih "1" (calon jemaah). */
class PercakapanMentah {
  private riwayat: readonly ConversationTurn[] = [];
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

/** Percakapan yang sudah berada pada state `admin-routed` (pilihan menu tujuan). */
function percakapanAdminRouted(pilihan: string): PercakapanMentah {
  const p = new PercakapanMentah(konteksMenungguTujuanChat().history);
  p.kirim(pilihan);
  return p;
}

/** Percakapan calon jemaah yang Ringkasan Kebutuhan pertamanya sudah terkirim. */
function percakapanSetelahRingkasan(): Percakapan {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("Ya, setuju");
  return percakapan;
}

function requestTercatat(turn: BotTurn): FollowUpRequest {
  const catat = turn.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  assert.ok(catat && catat.kind === "record-follow-up-request");
  return catat.request;
}

// ---------------------------------------------------------------------------
// admin-routed: fase "Terima kasih atas pesan Anda." setelah handoff
// ---------------------------------------------------------------------------

for (const pilihan of ["2", "3", "4"]) {
  test(`admin-routed (menu ${pilihan}) menjawab pertanyaan Harga Indikatif, bukan BASA_BASI`, () => {
    const p = percakapanAdminRouted(pilihan);
    const turn = p.kirim("Berapa harga fotografer?");
    const balasan = teksBalasan(turn);
    assert.match(balasan, /Harga Indikatif/);
    assert.match(balasan, /SAR 600/);
    assert.notEqual(balasan, BASA_BASI);
    assert.deepEqual(turn.actions, [{ kind: "record-faq-answer", topic: "price-photographer-videographer" }]);
  });
}

for (const pilihan of ["2", "4"]) {
  test(`admin-routed (menu ${pilihan}) menjawab pertanyaan harga tanpa materi dengan penawaran tim`, () => {
    const p = percakapanAdminRouted(pilihan);
    const turn = p.kirim("kisaran harga paket umrah berapa?");
    const balasan = teksBalasan(turn);
    assert.match(balasan, HARGA_KE_TIM);
    assert.match(balasan, /customer service\/penjualan/);
    assert.notEqual(balasan, BASA_BASI);
    // Tanpa angka dan tanpa istilah Harga Indikatif (bukan jawaban materi).
    assert.doesNotMatch(balasan, /Harga Indikatif|SAR|IDR|Rp/);
    assert.deepEqual(turn.actions, []);
  });
}

test("admin-routed: pertanyaan harga tidak mengubah state; pesan non-harga tetap pengakuan singkat", () => {
  const p = percakapanAdminRouted("4");
  p.kirim("Berapa harga fotografer?");
  const setelah = p.kirim("halo");
  assert.equal(teksBalasan(setelah), BASA_BASI);
});

test("admin-routed: pernyataan bermuatan kata harga tetap pengakuan singkat", () => {
  const p = percakapanAdminRouted("4");
  const turn = p.kirim(
    "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation",
  );
  assert.equal(teksBalasan(turn), BASA_BASI);
});

// ---------------------------------------------------------------------------
// sent: akhir percakapan setelah Ringkasan Kebutuhan terkirim
// ---------------------------------------------------------------------------

test("pertanyaan harga tanpa materi setelah ringkasan terkirim dijawab, dicatat, lalu minta persetujuan kirim ulang", () => {
  const percakapan = percakapanSetelahRingkasan();
  const tanya = percakapan.kirim("kisaran harga paket umrah berapa?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, HARGA_KE_TIM);
  // Pertanyaan yang butuh tindak lanjut admin tetap dicatat (invarian tiket 10).
  assert.match(balasan, /catat/i);
  assert.match(balasan, /setuju/i);
  assert.deepEqual(
    tanya.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
    [],
  );

  const kirimUlang = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(kirimUlang).notedQuestions, [
    "kisaran harga paket umrah berapa?",
  ]);
});

test("pertanyaan pricelist dari transkrip nyata dijawab, bukan sekadar dicatat", () => {
  const percakapan = percakapanSetelahRingkasan();
  const tanya = percakapan.kirim("saya ingin bertanya, apakah ada pricelistnya?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, HARGA_KE_TIM);
  assert.match(balasan, /catat/i);
});

test("pertanyaan harga bermateri setelah ringkasan terkirim tetap dijawab tanpa pencatatan", () => {
  const percakapan = percakapanSetelahRingkasan();
  const tanya = percakapan.kirim("Berapa harga fotografer?");
  assert.match(teksBalasan(tanya), /Harga Indikatif/);
  assert.deepEqual(tanya.actions, [{ kind: "record-faq-answer", topic: "price-photographer-videographer" }]);
});

// ---------------------------------------------------------------------------
// awaiting-consent: menunggu persetujuan penerusan ringkasan
// ---------------------------------------------------------------------------

test("pertanyaan harga bermateri saat menunggu persetujuan dijawab lalu konfirmasi diulang", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  const konfirmasi = percakapan.kirim("Butuh kamar keluarga");
  assert.match(teksBalasan(konfirmasi), /setuju/i);

  const tanya = percakapan.kirim("Berapa harga fotografer?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /setuju/i);
  // Dijawab dari materi berarti tidak dicatat sebagai pertanyaan kebutuhan.
  const setuju = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(setuju).notedQuestions, []);
});

test("pertanyaan harga tanpa materi saat menunggu persetujuan dijawab dan tetap dicatat", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");

  const tanya = percakapan.kirim("apakah ada pricelistnya?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, HARGA_KE_TIM);
  assert.match(balasan, /catat/i);
  assert.match(balasan, /setuju/i);

  const setuju = percakapan.kirim("Ya, setuju");
  assert.deepEqual(requestTercatat(setuju).notedQuestions, ["apakah ada pricelistnya?"]);
});

test("pertanyaan harga berisi kata penolakan bukan jawaban persetujuan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");

  const tanya = percakapan.kirim("boleh cek gak harganya?");
  const balasan = teksBalasan(tanya);
  // Bukan penolakan ("Baik, informasi Anda tidak akan saya teruskan").
  assert.doesNotMatch(balasan, /tidak akan saya teruskan/);
  assert.match(balasan, /setuju/i);
});

// ---------------------------------------------------------------------------
// awaiting-question: isi pertanyaan setelah "mau tanya"
// ---------------------------------------------------------------------------

test("isi pertanyaan berupa harga bermateri langsung dijawab, bukan disimpan dulu", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const minta = percakapan.kirim("mau tanya");
  assert.match(teksBalasan(minta), /silakan sampaikan pertanyaannya/i);

  const tanya = percakapan.kirim("Berapa harga fotografer?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, /Harga Indikatif/);
  assert.doesNotMatch(balasan, /simpan di bagian pertanyaan/);
  assert.deepEqual(tanya.actions, [{ kind: "record-faq-answer", topic: "price-photographer-videographer" }]);
});

test("isi pertanyaan berupa harga tanpa materi dijawab penawaran tim", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("mau tanya");
  const tanya = percakapan.kirim("kisaran harga paket umrah berapa?");
  assert.match(teksBalasan(tanya), HARGA_KE_TIM);
});

// ---------------------------------------------------------------------------
// collecting/penyela: jawaban digabung dengan alur berjalan
// ---------------------------------------------------------------------------

test("pertanyaan harga tanpa materi yang menyela pengumpulan dijawab lalu pengumpulan berlanjut", () => {
  const percakapan = new Percakapan();
  const tanya = percakapan.kirim("mau tanya, kisaran harga paket umrah berapa?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, HARGA_KE_TIM);
  assert.match(balasan, /simpan di bagian pertanyaan/i);
  assert.match(balasan, /minati|layanan/i);

  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.ok(request.notedQuestions.includes("mau tanya, kisaran harga paket umrah berapa?"));
});

// ---------------------------------------------------------------------------
// Prioritas dan batas (invarian)
// ---------------------------------------------------------------------------

test("pemicu mendesak tetap didahulukan daripada jawaban harga", () => {
  assert.deepEqual(classifyInbound("tolong hubungi admin, harga paket berapa?"), {
    kind: "handoff",
    trigger: "human-request",
  });
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("tolong hubungi admin, harga paket berapa?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.doesNotMatch(balasan, HARGA_KE_TIM);
  assert.doesNotMatch(balasan, /Harga Indikatif/);
});

test("booking/pembayaran tetap ke alur admin, bukan jawaban harga", () => {
  const routing = classifyInbound("saya mau bayar DP untuk booking, harganya berapa?");
  assert.equal(routing.kind, "handoff");
  assert.ok(routing.kind === "handoff" && routing.trigger !== "custom-quote-or-availability");
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("saya mau bayar DP untuk booking, harganya berapa?");
  assert.doesNotMatch(teksBalasan(turn), HARGA_KE_TIM);
});

test("pertanyaan di luar kata penanda harga tetap dicatat, bukan dijawab harga", () => {
  // Transkrip nyata: pertanyaan tentang istilah "kisaran anggaran" bukan
  // pertanyaan harga dan tidak boleh memperoleh jawaban penawaran.
  const percakapan = new Percakapan();
  const tanya = percakapan.kirim("Apa maksudnya dari kisaran anggaran?");
  const balasan = teksBalasan(tanya);
  assert.doesNotMatch(balasan, HARGA_KE_TIM);
  assert.doesNotMatch(balasan, /Harga Indikatif/);
  assert.match(balasan, /catat/i);
});

test("pernyataan bermuatan kata harga tetap informasi kebutuhan, bukan pertanyaan harga", () => {
  const percakapan = percakapanSetelahRingkasan();
  const perubahan = percakapan.kirim(
    "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation",
  );
  const balasan = teksBalasan(perubahan);
  assert.match(balasan, /perubahan kebutuhan Anda saya catat/i);
  assert.doesNotMatch(balasan, HARGA_KE_TIM);
  assert.doesNotMatch(balasan, /Harga Indikatif/);
});

test("jawaban harga tanpa materi tidak memuat angka, klaim harga final, atau janji ketersediaan", () => {
  const percakapan = percakapanAdminRouted("4");
  const balasan = teksBalasan(percakapan.kirim("harganya berapa ya kak?"));
  assert.doesNotMatch(balasan, /\d/);
  assert.doesNotMatch(
    balasan,
    /(harga final|final price|fixed price|dijamin tersedia|guaranteed availability|pasti tersedia)/i,
  );
  assert.doesNotMatch(balasan, /(pesan sekarang|bayar sekarang|booking sekarang|lakukan transaksi)/i);
  assert.doesNotMatch(balasan, /dalam \d+ (jam|menit|hari)/i);
});

test("pertanyaan harga dalam Bahasa Inggris dijawab tanpa jawaban materi yang dibuat-buat", () => {
  const percakapan = new Percakapan("en");
  const tanya = percakapan.kirim("How much is the package?");
  const balasan = teksBalasan(tanya);
  assert.match(balasan, /Special quotes and price\/availability confirmations/);
  assert.doesNotMatch(balasan, /Harga Indikatif/);
  assert.match(balasan, /noted/i);
});

test("jawaban Harga Indikatif tetap persis template manual, bukan teks buatan lain", () => {
  const percakapan = percakapanAdminRouted("2");
  const balasan = teksBalasan(percakapan.kirim("Berapa biaya mutawwif?"));
  assert.ok(balasan.startsWith(faqAnswer("price-mutawwif", "id")));
});
