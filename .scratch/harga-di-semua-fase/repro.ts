/**
 * Reproduksi v2: pertanyaan harga di fase yang membalas
 * "Terima kasih atas pesan Anda." (admin-routed, sent, awaiting-question,
 * awaiting-consent) — driver mentah tanpa auto-pilih menu tujuan.
 *
 * Jalankan: node .scratch/harga-di-semua-fase/repro.ts
 */

import { handleInbound, turnForInbound } from "../../src/conversation/handleInbound.ts";
import type { BotTurn, ConversationTurn, InboundMessage } from "../../src/conversation/types.ts";

class PercakapanMentah {
  private riwayat: readonly ConversationTurn[] = [];
  kirim(text: string): BotTurn {
    const pesan: InboundMessage = {
      id: `wamid.test.${this.riwayat.length}`,
      from: "628123456789",
      timestamp: "1727000000",
      text,
    };
    const turn = handleInbound(pesan, { history: this.riwayat });
    const berikut: ConversationTurn[] = [...this.riwayat, turnForInbound(pesan)];
    if (turn.reply) berikut.push({ role: "asisten", text: turn.reply.text });
    this.riwayat = berikut;
    return turn;
  }
}

function ringkas(teks: string): string {
  return teks.replace(/\s+/g, " ").slice(0, 120);
}

function uji(p: PercakapanMentah, label: string, pesan: string): void {
  const turn = p.kirim(pesan);
  const balasan = turn.reply?.text ?? "(tanpa balasan)";
  const kena = /Terima kasih atas pesan Anda\./.test(balasan)
    ? "!! BASA_BASI"
    : /Harga Indikatif|Indicative/.test(balasan)
      ? "ok harga-materi"
      : /tim customer service|penjualan/.test(balasan)
        ? "ok harga-tim"
        : "?? lain";
  console.log(`[${kena}] (${label}) "${pesan}"`);
  console.log(`    -> ${ringkas(balasan)}`);
  console.log(`    aksi: ${turn.actions.map((a) => a.kind).join(",") || "-"}`);
}

const HARGA = [
  "kisaran harga paket umrah berapa?",
  "Berapa harga fotografer?",
  "apakah ada pricelistnya?",
  "harganya berapa ya kak?",
];

console.log("=== 1. admin-routed (menu tujuan 4. Keperluan lain) ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  const menu = p.kirim("4");
  console.log("  (konfirmasi handoff:", ringkas(menu.reply?.text ?? ""), ")");
  for (const t of HARGA) uji(p, "admin-routed", t);
  uji(p, "admin-routed", "halo");
}

console.log("\n=== 2. admin-routed (2. Vendor / mitra bisnis) ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("2");
  for (const t of HARGA) uji(p, "admin-routed", t);
}

console.log("\n=== 3. sent (Ringkasan terkirim) ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("Rencana Desember 2025");
  p.kirim("4 orang");
  p.kirim("Butuh kamar keluarga");
  p.kirim("Ya, setuju");
  for (const t of HARGA) uji(p, "sent", t);
}

console.log("\n=== 4. awaiting-question ('mau tanya' lalu pertanyaan harga) ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("mau tanya");
  uji(p, "awaiting-question", "Berapa harga fotografer?");
}
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("mau tanya");
  uji(p, "awaiting-question", "kisaran harga paket umrah berapa?");
}

console.log("\n=== 5. awaiting-consent (menunggu persetujuan kirim ringkasan) ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("Rencana Desember 2025");
  p.kirim("4 orang");
  p.kirim("Butuh kamar keluarga"); // -> meminta persetujuan
  uji(p, "awaiting-consent", "Berapa harga fotografer?");
}
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("Rencana Desember 2025");
  p.kirim("4 orang");
  p.kirim("Butuh kamar keluarga");
  uji(p, "awaiting-consent", "kisaran harga paket umrah berapa?");
}

console.log("\n=== 6. collecting: penyela 'mau tanya, ...' harga tanpa materi ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  uji(p, "collecting", "mau tanya, kisaran harga paket umrah berapa?");
  uji(p, "collecting", "apakah ada pricelistnya?");
}

console.log("\n=== 7. awaiting-handoff-consent (menunggu persetujuan handoff) ===");
{
  const p = new PercakapanMentah();
  p.kirim("Halo");
  p.kirim("1");
  p.kirim("ingin bicara dengan admin");
  uji(p, "awaiting-handoff-consent", "Berapa harga fotografer?");
}
