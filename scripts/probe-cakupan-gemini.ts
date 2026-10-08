/**
 * Ukur ulang cakupan dengan jalur Gemini + fallback (langkah 5).
 *
 * Memakai klasifikasi async yang sama dengan produksi:
 * Gemini dulu, gagal/ragu turun ke regex. Tanpa kunci (atau saat
 * --tanpa-gemini) murni mengukur regex sebagai baseline.
 *
 * Jalankan:
 *   node scripts/probe-cakupan-gemini.ts
 *   node scripts/probe-cakupan-gemini.ts --tanpa-gemini
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bacaKonfigGemini, pahamiDenganGemini } from "../src/knowledge/geminiPemaham.ts";
import { classifyDenganFallback } from "../src/conversation/classifyDenganFallback.ts";

const TANPA_GEMINI = process.argv.includes("--tanpa-gemini");
const konfig = TANPA_GEMINI ? null : bacaKonfigGemini(process.env);
if (!TANPA_GEMINI && konfig === null) {
  console.log("GEMINI_API_KEY kosong — mengukur baseline regex (sama seperti probe-cakupan.ts).");
}
function muatKorpus(dir: string) {
  const out: { pesan: string; jenis: string; topik?: string; grup: string }[] = [];
  for (const nama of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const daftar = JSON.parse(readFileSync(join(dir, nama), "utf8")).kasus;
    for (const e of daftar) out.push({ pesan: e.pesan, jenis: e.harapan.jenis, topik: e.harapan.topik, grup: e.grup ?? "lainnya" });
  }
  return out;
}
const korpus = muatKorpus("tests/korpus");
const jawab = (jenis: string) => jenis === "faq" || jenis === "indicative-price";
let ruteTepat = 0, topikTepat = 0, materiTerjawab = 0, materiTotal = 0;
const gagal: string[] = [];
for (const k of korpus) {
  const pemahaman = konfig ? await pahamiDenganGemini(k.pesan, konfig, { timeoutMs: 25000 }) : null;
  // Jeda antar panggilan agar tidak menabrak kuota gratis Gemini.
  if (konfig) await new Promise((r) => setTimeout(r, 4500));
  const r = await classifyDenganFallback(k.pesan, pemahaman === undefined ? {} : { pemahaman });
  const aktual = (r as { kind: string }).kind;
  const topik = (r as { topic?: string }).topic ?? null;
  const benar = k.jenis === "faq" ? jawab(aktual) : aktual === k.jenis;
  if (benar) ruteTepat++;
  if (k.jenis === "faq") {
    materiTotal++;
    if (jawab(aktual)) {
      materiTerjawab++;
      if (k.topik === undefined || k.topik === topik) topikTepat++;
      else gagal.push('[topik meleset] "'+k.pesan+'" harap:'+k.topik+' aktual:'+topik);
    } else gagal.push('[gagal paham] "'+k.pesan+'" harap:'+(k.topik ?? "faq")+' aktual:'+aktual);
  } else if (benar) topikTepat++;
}
console.log("=== CAKUPAN " + (konfig ? "GEMINI+FALLBACK" : "REGEX (baseline)") + " ===");
console.log('Rute tepat        : '+ruteTepat+'/'+korpus.length);
console.log('Pertanyaan materi terjawab: '+materiTerjawab+'/'+materiTotal+' (baseline regex: 24/33 = 73%)');
console.log('Topik tepat       : '+topikTepat+'/'+korpus.length);
if (gagal.length) { console.log(""); console.log("Sisa gagal:"); for (const g of gagal) console.log("- "+g); }
if (ruteTepat !== korpus.length) process.exitCode = 1;
