import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { handleInbound, turnForInbound } from "../../src/conversation/handleInbound.ts";
import type { ConversationTurn } from "../../src/conversation/types.ts";

const kasus: ReadonlyArray<readonly [topik: string, pesan: string]> = [
  ["raudhah", "Mba raudhah itu apakah perlu pesan2 gitu?"],
  ["raudhah-varian", "raudah perlu booking ga?"],
  ["nusuk", "Mas satu lg kl nusuk card itu kebijakannya gmn skrg?"],
  ["siskopatuh", "Berapa biaya siskopatuhnya mas?"],
  ["siskopatuh-varian", "siskapatuh wajib ga?"],
  ["siskopatuh-varian2", "siskopatuh itu ga wajib ya mas?"],
  ["asuransi", "Mas itu ada asuransi perjalanannya ga ya?"],
  ["asuransi-biaya", "berapa biaya asuransi perjalanan?"],
  ["refund", "ada refund ga kalo misal batal berangkat?"],
  ["pembatalan", "kalo pembatalan bagaimana?"],
  ["vaksin", "Untuk melakukan vaksin nya h- berapa ya?"],
  ["vaksin-luar", "Kl utk vaksin misalnya anak saya vaksin di malaysia apakah bisa ?"],
  ["haramain", "kalo harramain train itu sbnrnya on-time banget ga yah?"],
  ["haramain-rute", "ohh tapi kan dari stasiun HHR ke Jeddah airport itu langsung kan ya?"],
  ["bayar-link", "Mba btw next bisa bayar pakai link payment ga?"],
  ["bayar-kartu", "bisa pakai kartu kredit ga?"],
  ["dp", "Dp dan pelunasan aja boleh ga? Gausah 3x mba?"],
  ["tnc", "boleh minta info Term & Condition kl kita sudah bayar DP spt apa?"],
  ["pelunasan", "bisa dp nya 20% dulu dan pelunasannya h-2minggu sblm berangkat?"],
  ["perlengkapan", "Perlengkapan umrohnya dapat ga? kain ihram, buku doa, masker, sendal?"],
  ["zamzam", "dapat air zamzam ga?"],
  ["konsumsi", "1. Konsumsi ga termasuk ?"],
  ["sar-idr", "20 sar itu brp idr?"],
];

function awalBersih(): readonly ConversationTurn[] {
  return [];
}

for (const [topik, pesan] of kasus) {
  const routing = classifyInbound(pesan);
  const dariIdle = handleInbound(
    { id: "x", from: "628", timestamp: "1", text: pesan },
    { history: awalBersih() },
  );
  const aksiIdle = dariIdle.actions.map((a) => a.kind).join(",") || "-";
  const lead = (dariIdle.reply?.text ?? "").split("\n")[0]!.slice(0, 70);
  console.log(`[${topik}] routing=${routing.kind}${routing.kind === "handoff" ? "/" + routing.trigger : routing.kind === "faq" ? "/" + routing.topic : routing.kind === "indicative-price" ? "/" + routing.topic : ""}`);
  console.log(`   idle -> aksi=${aksiIdle} | balasan="${lead}"`);
}
