import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { handleInbound } from "../../src/conversation/handleInbound.ts";

const pesan = [
  "perlengkapan umrohnya dapat ga",
  "dapat air zamzam ga",
  "konsumsi termasuk ga",
  "siskopatuh wajib ga",
  "vaksin di malaysia bisa",
  "refund bisa ga",
  "haramain on time ga",
  "raudhah perlu booking ga",
  "kereta haramain bagus ga",
  "20 sar berapa idr",
  "bayar cicilan bisa",
  "asuransi perjalanan ketentuannya apa",
  "insurance nya include ga",
];
for (const p of pesan) {
  const r = classifyInbound(p);
  const label = r.kind === "handoff" ? `${r.kind}/${r.trigger}` : r.kind === "faq" || r.kind === "indicative-price" ? `${r.kind}/${r.topic}` : r.kind;
  const turn = handleInbound({ id: "x", from: "628", timestamp: "1", text: p }, { history: [] });
  const view = (turn.reply?.text ?? "").slice(0, 60).replace(/\n/g, " ");
  console.log(`${label.padEnd(38)} | ${p}\n      balasan: ${view}`);
}
