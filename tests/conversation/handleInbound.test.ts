import { test } from "node:test";
import assert from "node:assert/strict";
import { handleInbound } from "../../src/conversation/handleInbound.ts";
import type { BotTurn, ConversationContext, InboundMessage } from "../../src/conversation/types.ts";

const percakapanAwal: ConversationContext = { history: [] };

function pesanDariCalonJemaah(text: string): InboundMessage {
  return {
    id: "wamid.test.1",
    from: "628123456789",
    timestamp: "1727000000",
    text,
  };
}

function teksBalasan(turn: BotTurn): string {
  assert.ok(turn.reply, "pesan teks harus menghasilkan balasan");
  return turn.reply.text;
}

test("calon jemaah berbahasa Indonesia memperoleh balasan awal dalam Bahasa Indonesia", () => {
  const turn = handleInbound(pesanDariCalonJemaah("Halo, saya ingin bertanya tentang umrah"), percakapanAwal);
  assert.match(teksBalasan(turn), /asisten otomatis/i);
  assert.match(teksBalasan(turn), /MUTAWWIFMU/);
});

test("calon jemaah berbahasa Inggris memperoleh balasan awal dalam Bahasa Inggris", () => {
  const turn = handleInbound(pesanDariCalonJemaah("Hello, I would like to ask about umrah"), percakapanAwal);
  assert.match(teksBalasan(turn), /automated assistant/i);
  assert.match(teksBalasan(turn), /MUTAWWIFMU/);
});

test("balasan awal menyatakan ketersediaan di luar jam kerja admin", () => {
  const id = handleInbound(pesanDariCalonJemaah("Halo"), percakapanAwal);
  assert.match(teksBalasan(id), /kapan saja/i);
  const en = handleInbound(pesanDariCalonJemaah("Hello"), percakapanAwal);
  assert.match(teksBalasan(en), /anytime/i);
});

test("balasan awal tidak menjanjikan waktu balasan admin", () => {
  const id = handleInbound(pesanDariCalonJemaah("Halo"), percakapanAwal);
  assert.doesNotMatch(teksBalasan(id), /admin (akan )?(membalas|menanggapi)/i);
  const en = handleInbound(pesanDariCalonJemaah("Hello"), percakapanAwal);
  assert.doesNotMatch(teksBalasan(en), /admin will (reply|respond)/i);
});

test("balasan awal tidak membuka pembicaraan tentang transaksi", () => {
  const id = handleInbound(pesanDariCalonJemaah("Halo"), percakapanAwal);
  assert.doesNotMatch(teksBalasan(id), /(booking|pembayaran|payment)/i);
  const en = handleInbound(pesanDariCalonJemaah("Hello"), percakapanAwal);
  assert.doesNotMatch(teksBalasan(en), /(booking|payment)/i);
});

test("pesan non-teks tidak menghasilkan balasan", () => {
  const nonTeks: InboundMessage = { ...pesanDariCalonJemaah("Halo"), text: null };
  assert.equal(handleInbound(nonTeks, percakapanAwal).reply, null);
});

test("balasan awal tidak menghasilkan tindakan terlihat", () => {
  const turn = handleInbound(pesanDariCalonJemaah("Halo"), percakapanAwal);
  assert.deepEqual(turn.actions, []);
});
