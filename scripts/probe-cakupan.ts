/**
 * Probe cakupan pemahaman bahasa Indonesia pada seam percakapan.
 *
 * Menjalankan korpus pesan realistis (bahasa sehari-hari, singkatan, typo,
 * campur Inggris) lewat `classifyInbound`, lalu melaporkan berapa pertanyaan
 * yang seharusnya dijawab dari materi benar-benar dikenali — dan berapa yang
 * jatuh ke handoff. Dipakai untuk membandingkan baseline regex dengan lapisan
 * pemaham berikutnya (lihat ADR yang mencatat perubahan itu).
 *
 * Korpus hidup di `tests/korpus/*.json` dan boleh ditambah pemilik tanpa
 * menyentuh berkas ini — lihat `tests/korpus/README.md`.
 *
 * Jalankan: node scripts/probe-cakupan.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyInbound } from "../src/conversation/classifyInbound.ts";

/** Hasil yang diharapkan untuk satu kasus. */
interface Harapan {
  readonly jenis: "faq" | "handoff" | "opener";
  readonly topik?: string;
}

interface Kasus {
  readonly pesan: string;
  readonly harapan: Harapan;
  /** Kelompok gaya bahasa, mis. "gaul", "typo", "parafrase", "campur-inggris". */
  readonly grup: string;
  /** Berkas sumber kasus ini, untuk pelaporan. */
  readonly sumber: string;
}

/** Muat seluruh korpus dari folder `tests/korpus/` (format lihat README di sana). */
function muatKorpus(direktori: string): Kasus[] {
  const berkas = readdirSync(direktori)
    .filter((nama) => nama.endsWith(".json"))
    .sort();
  const kasus: Kasus[] = [];
  for (const nama of berkas) {
    let terurai: unknown;
    try {
      terurai = JSON.parse(readFileSync(join(direktori, nama), "utf8"));
    } catch (error) {
      throw new Error(`Korpus ${nama} bukan JSON valid: ${String(error)}`);
    }
    const daftar = (terurai as { kasus?: unknown }).kasus;
    if (!Array.isArray(daftar)) {
      throw new Error(`Korpus ${nama} tidak punya array "kasus"`);
    }
    for (const entri of daftar) {
      const e = entri as { pesan?: unknown; harapan?: unknown; grup?: unknown };
      const h = (e.harapan ?? {}) as { jenis?: unknown; topik?: unknown };
      if (typeof e.pesan !== "string" || typeof h.jenis !== "string") {
        throw new Error(`Korpus ${nama} punya entri tanpa "pesan" atau "harapan.jenis"`);
      }
      if (!["faq", "handoff", "opener"].includes(h.jenis)) {
        throw new Error(`Korpus ${nama}: harapan.jenis "${h.jenis}" tidak dikenal`);
      }
      kasus.push({
        pesan: e.pesan,
        harapan: {
          jenis: h.jenis as Harapan["jenis"],
          ...(typeof h.topik === "string" ? { topik: h.topik } : {}),
        },
        grup: typeof e.grup === "string" ? e.grup : "lainnya",
        sumber: nama,
      });
    }
  }
  return kasus;
}

const KORPUS = muatKorpus("tests/korpus");

/**
 * Benar bila pertanyaan yang seharusnya dijawab dari materi memang terjawab
 * (`faq` atau `indicative-price`), atau yang layak handoff memang ke handoff.
 * Kecocokan topik dinilai terpisah, agar "paham maksud" tidak tertukar dengan
 * "tepat memilih topik".
 */
function terjawabDariMateri(aktual: string): boolean {
  return aktual === "faq" || aktual === "indicative-price";
}

function nilai(kasus: Kasus, aktual: string, topik: string | null): boolean {
  if (kasus.harapan.jenis === "faq") {
    return terjawabDariMateri(aktual);
  }
  return kasus.harapan.jenis === aktual;
}

function topikTepat(kasus: Kasus, aktual: string, topik: string | null): boolean {
  if (kasus.harapan.jenis !== "faq") return true;
  if (!terjawabDariMateri(aktual)) return false;
  if (kasus.harapan.topik === undefined) return true;
  return kasus.harapan.topik === topik;
}

const hasil: {
  kasus: Kasus;
  aktual: string;
  topik: string | null;
  benar: boolean;
  topikOk: boolean;
}[] = [];
for (const kasus of KORPUS) {
  const routing = classifyInbound(kasus.pesan) as {
    kind: string;
    topic?: string | null;
  };
  const aktual = routing.kind;
  const topik = routing.topic ?? null;
  hasil.push({
    kasus,
    aktual,
    topik,
    benar: nilai(kasus, aktual, topik),
    topikOk: topikTepat(kasus, aktual, topik),
  });
}

// --- Laporan ---
const total = hasil.length;
const benar = hasil.filter((h) => h.benar).length;
const topikOk = hasil.filter((h) => h.topikOk).length;
const seharusnyaFaq = hasil.filter((h) => h.kasus.harapan.jenis === "faq");
const faqTerjawab = seharusnyaFaq.filter((h) => terjawabDariMateri(h.aktual)).length;

function kasusGrup(h: (typeof hasil)[number]): string {
  return h.kasus.grup;
}

console.log("=== RINGKASAN CAKUPAN PEMAHAMAN ===");
const berkas = [...new Set(hasil.map((h) => h.kasus.sumber))];
console.log(`Korpus: ${berkas.length} berkas (${berkas.join(", ")}) — ${total} kasus`);
console.log(`Rute tepat        : ${benar}/${total} (${((benar / total) * 100).toFixed(0)}%)`);
console.log(`Topik tepat       : ${topikOk}/${total} (${((topikOk / total) * 100).toFixed(0)}%)`);
console.log(
  `Pertanyaan materi terjawab: ${faqTerjawab}/${seharusnyaFaq.length} ` +
    `(${((faqTerjawab / seharusnyaFaq.length) * 100).toFixed(0)}%) — inilah ukuran "leluasa memahami"`,
);
console.log("");
console.log("Per kelompok gaya bahasa (rute tepat):");
for (const grup of [...new Set(hasil.map(kasusGrup))].sort()) {
  const subset = hasil.filter((h) => kasusGrup(h) === grup);
  const ok = subset.filter((h) => h.benar).length;
  console.log(`  ${grup.padEnd(16)} ${String(ok).padStart(2)}/${subset.length}`);
}

console.log("");
console.log("=== KASUS GAGAL DIPAHAMI (jatuh ke handoff padahal ada materinya) ===");
const gagalPaham = hasil.filter(
  (h) => h.kasus.harapan.jenis === "faq" && !terjawabDariMateri(h.aktual),
);
if (gagalPaham.length === 0) console.log("(tidak ada)");
for (const h of gagalPaham) {
  console.log(`- [${h.kasus.grup}] "${h.kasus.pesan}"`);
  console.log(
    `    harap: ${h.kasus.harapan.topik ?? "faq"}  |  aktual: ${h.aktual}${h.topik ? ":" + h.topik : ""}`,
  );
}

console.log("");
console.log("=== TERJAWAB TAPI TOPIK MELESET ===");
const meleset = hasil.filter(
  (h) => h.kasus.harapan.jenis === "faq" && terjawabDariMateri(h.aktual) && !h.topikOk,
);
if (meleset.length === 0) console.log("(tidak ada)");
for (const h of meleset) {
  console.log(`- [${h.kasus.grup}] "${h.kasus.pesan}"`);
  console.log(`    harap: ${h.kasus.harapan.topik}  |  aktual: ${h.topik}`);
}

// Keluar dengan kode 1 bila ada kegagalan, agar bisa dipakai sebagai gate.
if (benar !== total) {
  process.exitCode = 1;
}
