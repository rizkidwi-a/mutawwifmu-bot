import { readFileSync } from "node:fs";
import { handleInbound } from "../../src/conversation/handleInbound.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { faqAnswer, matchFaqTopic, isPriceTopic } from "../../src/knowledge/businessFaq.ts";

const lines = readFileSync(new URL("../../.scratch/eval-classify.txt", import.meta.url), "utf8").split(/\r?\n/);
const kasus = [];
for (const line of lines) {
  const m = line.match(/^(\S+)\s*\|\s*(.*)$/);
  if (!m || m[1] === "==") continue;
  kasus.push({ label: m[1], text: m[2] });
}

// Kumpulkan teks jawaban materi untuk deteksi kebocoran
const topikSemua = ["land-arrangement","tour-guide","mutawwif","multi-language-support","visa-documents","hotel-accommodation","transport-fleet","airport-handling","charity-program","photographer-videographer","custom-itinerary","city-tour","city-tour-makkah","city-tour-madinah","city-tour-thaif","city-tour-alula","price-mutawwif","price-document-arrangement","price-airport-handling","price-transport","price-city-tour","price-photographer-videographer","price-hotel"];

function bocor(reply) {
  const b = [];
  for (const t of topikSemua) {
    const ans = faqAnswer(t, "id");
    // potongan khas: 40 char pertama jawaban
    if (reply.includes(ans.slice(0, 40))) b.push(t);
  }
  return b;
}

function ringkas(t) { return t.replace(/\s+/g, " ").slice(0, 90); }

console.log("=== FRESH (idle) ===");
for (const k of kasus) {
  const routing = classifyInbound(k.text);
  const turn = handleInbound({ id: "x", from: "62", timestamp: "1", text: k.text }, { history: [] });
  const aksi = turn.actions.map((a) => a.kind + (a.topic ? ":" + a.topic : "") + (a.reason ? ":" + a.reason : "")).join(",");
  const leak = bocor(turn.reply?.text ?? "");
  const flag = leak.length ? "MISFIRE-LEAK[" + leak.join("+") + "]" : "";
  console.log(`${k.label.padEnd(32)} route=${routing.kind}${routing.topic ? ":" + routing.topic : ""}${routing.trigger ? ":" + routing.trigger : ""} aksi=[${aksi}] ${flag}`);
  if (leak.length || (routing.kind === "indicative-price")) console.log("    balasan: " + ringkas(turn.reply?.text ?? ""));
}

console.log("");
console.log("=== MID-COLLECTING (setelah 2 jawaban bidang) ===");
for (const k of kasus) {
  const riwayat = [
    { role: "calon-jemaah", text: "Halo" },
    { role: "asisten", text: "..." },
    { role: "calon-jemaah", text: "Umrah premium" },
    { role: "asisten", text: "..." },
    { role: "calon-jemaah", text: "Desember 2025" },
    { role: "asisten", text: "..." },
  ];
  const routing = classifyInbound(k.text);
  const turn = handleInbound({ id: "x", from: "62", timestamp: "1", text: k.text }, { history: riwayat });
  const aksi = turn.actions.map((a) => a.kind + (a.topic ? ":" + a.topic : "")).join(",");
  const leak = bocor(turn.reply?.text ?? "");
  const flag = leak.length ? "MISFIRE-LEAK[" + leak.join("+") + "]" : "";
  if (leak.length || routing.kind === "indicative-price" || routing.kind === "handoff") {
    console.log(`${k.label.padEnd(32)} route=${routing.kind}${routing.topic ? ":" + routing.topic : ""}${routing.trigger ? ":" + routing.trigger : ""} aksi=[${aksi}] ${flag}`);
    if (leak.length) console.log("    balasan: " + ringkas(turn.reply?.text ?? ""));
  }
}
