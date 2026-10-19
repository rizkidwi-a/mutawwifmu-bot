import { classifyInbound as baru } from "../../src/conversation/classifyInbound.ts";
import { classifyInbound as lama } from "./head/src/conversation/classifyInbound.ts";
const pesan = [
  "anak saya sudah bisa","nanti saya kabari kalau sudah bisa","sudah bisa","ga bisa","ga bisa bayar dp",
  "jadwal keberangkatan bisa diatur","saya sudah pemesanan","khusus bisa", "minta tolong dibantu booking",
  "perlengkapan umrohnya dapat ga","dapat air zamzam ga","konsumsi termasuk ga","vaksin di malaysia bisa",
  "bayar cicilan bisa","20 sar itu brp idr?","asuransi perjalanan ketentuannya apa?","insurance nya include ga?",
  "berapa biaya asuransi perjalanan?","nanti saya kabari","saya sudah transfer uang","totalnya sudah termasuk apa saja",
  "apakah boleh bantu cari hotel","visit madinah bisa?","kereta haramain bagus ga","siskopatuh itu ga wajib ya",
];
for (const p of pesan) {
  const a = baru(p); const b = lama(p);
  const fa = a.kind + (a.kind === "faq" ? "/" + a.topic : a.kind === "handoff" ? "/" + a.trigger : "");
  const fb = b.kind + (b.kind === "faq" ? "/" + b.topic : b.kind === "handoff" ? "/" + b.trigger : "");
  console.log((fa === fb ? "SAMA " : "BEDA "), JSON.stringify(p), "lama:", fb, "| baru:", fa);
}
