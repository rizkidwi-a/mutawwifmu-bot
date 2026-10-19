/**
 * Probe sementara tiket 06: replay transkrip nyata lewat handleInbound dan
 * laporkan calon misfire (jawaban template topik lain), balasan basa-basi,
 * dan isi ringkasan admin.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { handleInbound, turnForInbound } from "../../src/conversation/handleInbound.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { faqAnswer, type FaqTopic } from "../../src/knowledge/businessFaq.ts";
import type {
  BotTurn,
  ConversationTurn,
  InboundMessage,
  FollowUpRequest,
} from "../../src/conversation/types.ts";

interface Pesan {
  readonly pengirim: string;
  readonly teks: string;
}

function parseTranskrip(jalur: string): Pesan[] {
  const baris = readFileSync(jalur, "utf8").split(/\r?\n/);
  const pesan: Pesan[] = [];
  let sekarang: { pengirim: string; baris: string[] } | null = null;
  const tutup = () => {
    if (sekarang) {
      pesan.push({ pengirim: sekarang.pengirim, teks: sekarang.baris.join("\n").trim() });
      sekarang = null;
    }
  };
  for (const barisPesan of baris) {
    const kepala = /^\[(\d{1,2}\.\d{2})\] \*\*(.+?):\*\*\s?(.*)$/.exec(barisPesan);
    if (kepala) {
      tutup();
      sekarang = { pengirim: kepala[2], baris: [kepala[3]] };
      continue;
    }
    if (/^\[\d{1,2}\.\d{2}\]/.test(barisPesan) || /^(## |---)/.test(barisPesan)) {
      tutup();
      continue;
    }
    if (sekarang) sekarang.baris.push(barisPesan);
  }
  tutup();
  return pesan
    .map((p) => {
      const hasil: string[] = [];
      let dalamKutip = false;
      for (const baris of p.teks.split("\n")) {
        if (baris.startsWith(">")) {
          dalamKutip = !baris.trimEnd().endsWith("_");
          continue;
        }
        if (dalamKutip) {
          if (baris.trimEnd().endsWith("_")) dalamKutip = false;
          continue;
        }
        hasil.push(baris);
      }
      return { pengirim: p.pengirim, teks: hasil.join("\n").trim() };
    })
    .filter(
      (p) =>
        p.teks.length > 0 &&
        !/^_{2}/.test(p.teks) &&
        !/deleted this message/.test(p.teks) &&
        !/doesn't support it/.test(p.teks),
    );
}

const TOPICS = [
  "land-arrangement",
  "tour-guide",
  "mutawwif",
  "multi-language-support",
  "visa-documents",
  "hotel-accommodation",
  "transport-fleet",
  "airport-handling",
  "charity-program",
  "photographer-videographer",
  "custom-itinerary",
  "city-tour",
  "city-tour-makkah",
  "city-tour-madinah",
  "city-tour-thaif",
  "city-tour-alula",
  "price-mutawwif",
  "price-document-arrangement",
  "price-hotel",
  "price-transport",
  "price-airport-handling",
  "price-city-tour",
  "price-photographer-videographer",
] as readonly FaqTopic[];

function deteksiTemplate(balasan: string): string[] {
  const kena: string[] = [];
  for (const topik of TOPICS) {
    for (const bahasa of ["id", "en"] as const) {
      if (balasan.includes(faqAnswer(topik, bahasa))) kena.push(`${topik}/${bahasa}`);
    }
  }
  return kena;
}

class Percakapan {
  riwayat: ConversationTurn[] = [];
  kirim(teks: string): BotTurn {
    const pesan: InboundMessage = {
      id: `wamid.test.${this.riwayat.length}`,
      from: "628123456789",
      timestamp: "1727000000",
      text: teks,
    };
    const turn = handleInbound(pesan, { history: this.riwayat });
    this.riwayat.push(turnForInbound(pesan));
    if (turn.reply) this.riwayat.push({ role: "asisten", text: turn.reply.text });
    return turn;
  }
}

const DATA = "data";
const folder = readdirSync(DATA, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const nama of folder) {
  const jalur = join(DATA, nama, "chat.md");
  if (!existsSync(jalur)) continue;
  const jemaah = parseTranskrip(jalur).filter((p) => p.pengirim !== "You");
  console.log(`\n===== ${nama}: ${jemaah.length} pesan jemaah =====`);
  const percakapan = new Percakapan();
  const ringkasan: FollowUpRequest[] = [];
  jemaah.forEach((p, i) => {
    const routing = classifyInbound(p.teks);
    const turn = percakapan.kirim(p.teks);
    for (const aksi of turn.actions) {
      if (aksi.kind === "record-follow-up-request") ringkasan.push(aksi.request);
    }
    const balasan = turn.reply?.text ?? "";
    const template = deteksiTemplate(balasan);
    const tanda =
      template.length > 0
        ? `TEMPLATE[${template.join(",")}]`
        : routing.kind === "handoff"
          ? `handoff/${routing.trigger}`
          : routing.kind;
    const potong = p.teks.replace(/\s+/g, " ").slice(0, 90);
    console.log(`${String(i).padStart(2)} ${tanda.padEnd(30)} | ${potong}`);
    if (template.length > 0) {
      console.log(`   >> balasan: ${balasan.replace(/\s+/g, " ").slice(0, 150)}`);
    }
    if (turn.actions.some((a) => a.kind === "hand-off-to-admin")) {
      console.log("   >> AKSI hand-off-to-admin");
    }
  });
  if (ringkasan.length > 0) {
    console.log("--- ringkasan terakhir ---");
    console.log(JSON.stringify(ringkasan.at(-1), null, 1));
  }
}

console.log("\n===== eval-classify.txt (konteks segar + tengah pengumpulan) =====");
const evalText = readFileSync(".scratch/eval-classify.txt", "utf8");
const kasus = evalText
  .split("\n")
  .filter((l) => /^\w+\//.test(l) || /^OPENER\s/.test(l))
  .map((l) => {
    const [label, ...sisa] = l.split("|");
    return { label: label.trim(), teks: sisa.join("|").trim() };
  });
console.log(`jumlah kasus: ${kasus.length}`);
for (const kasusItem of kasus) {
  const segar = new Percakapan();
  const t1 = segar.kirim(kasusItem.teks);
  const p2 = new Percakapan();
  p2.kirim("Umrah premium, tujuan Mekkah");
  const t2 = p2.kirim(kasusItem.teks);
  const m1 = deteksiTemplate(t1.reply?.text ?? "");
  const m2 = deteksiTemplate(t2.reply?.text ?? "");
  if (m1.length > 0 || m2.length > 0) {
    console.log(`MISFIRE ${kasusItem.label} segar=[${m1}] tengah=[${m2}] | ${kasusItem.teks.slice(0, 70)}`);
    console.log(`   segar: ${(t1.reply?.text ?? "").replace(/\s+/g, " ").slice(0, 150)}`);
    console.log(`   tengah: ${(t2.reply?.text ?? "").replace(/\s+/g, " ").slice(0, 150)}`);
  }
}
