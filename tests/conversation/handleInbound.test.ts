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

test("calon jemaah berbahasa Indonesia menerima pembuka layanan dan menu tujuan", () => {
  const turn = handleInbound(pesanDariCalonJemaah("Halo, saya ingin bertanya tentang umrah"), percakapanAwal);
  assert.match(teksBalasan(turn), /^Halo!/);
  assert.match(teksBalasan(turn), /Travel Partner Top #1 Personalized Land Arrangement/);
  assert.match(teksBalasan(turn), /1\. Calon jemaah \/ informasi paket/);
});

test("calon jemaah berbahasa Inggris menerima sapaan dan menu berbahasa Inggris", () => {
  const turn = handleInbound(pesanDariCalonJemaah("Hello, I would like to ask about umrah"), percakapanAwal);
  assert.match(teksBalasan(turn), /^Hello!/);
  assert.match(teksBalasan(turn), /Travel Partner Top #1 Personalized Land Arrangement/);
  assert.match(teksBalasan(turn), /1\. Prospective pilgrim \/ package information/);
});

test("sapaan netral tidak menggunakan balasan salam", () => {
  const id = handleInbound(pesanDariCalonJemaah("Halo"), percakapanAwal);
  assert.match(teksBalasan(id), /^Halo!/);
  assert.doesNotMatch(teksBalasan(id), /Waalaikumsalam Wr\. Wb/);
  const en = handleInbound(pesanDariCalonJemaah("Hello"), percakapanAwal);
  assert.match(teksBalasan(en), /^Hello!/);
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

test("pesan non-teks diakui penerimaannya sebagai lampiran", () => {
  const nonTeks: InboundMessage = { ...pesanDariCalonJemaah("Halo"), text: null };
  // Bahasa balasan mengikuti bahasa percakapan; lampiran tanpa teks tidak
  // membawa penanda bahasa sendiri.
  const konteks: ConversationContext = {
    history: [{ role: "calon-jemaah", text: "Halo, saya ingin bertanya tentang umrah" }],
  };
  const turn = handleInbound(nonTeks, konteks);
  const balasan = teksBalasan(turn);
  assert.match(balasan, /lampiran/i);
  assert.deepEqual(turn.actions, []);
});

test("balasan awal tidak menghasilkan tindakan terlihat", () => {
  const turn = handleInbound(pesanDariCalonJemaah("Halo"), percakapanAwal);
  assert.deepEqual(turn.actions, []);
});
