/**
 * Reproduksi: pertanyaan harga tidak dijawab di akhir percakapan / setelah
 * handoff (balasan "Terima kasih atas pesan Anda.").
 *
 * Jalankan: node .scratch/harga-pasca-handoff/repro.ts
 */

import { Percakapan } from "../../tests/conversation/pembantuPercakapan.ts";

const PERTANYAAN_HARGA = [
  "kisaran harga paket umrah berapa?",
  "berapa harga hotel di Makkah?",
  "harganya berapa ya kak?",
  "harga transport dari Jeddah ke Makkah berapa?",
  "biaya mutawwif berapa?",
  "berapa ongkos airport handling?",
  "kisaran harga fotografer?",
  "harga visa berapa?",
  "berapa harganya?",
];

function ringkas(teks: string): string {
  return teks.replace(/\s+/g, " ").slice(0, 110);
}

function lapor(label: string, jalankan: (p: Percakapan) => void): void {
  console.log(`\n=== ${label} ===`);
  jalankan(new Percakapan());
}

function ujiHarga(p: Percakapan, keterangan: string): void {
  for (const tanya of PERTANYAAN_HARGA) {
    const turn = p.kirim(tanya);
    const balasan = turn.reply?.text ?? "(tanpa balasan)";
    const aksi = turn.actions.map((a) => a.kind).join(",") || "-";
    const kena = /Terima kasih atas pesan Anda\./.test(balasan)
      ? "!! BASA_BASI"
      : /Harga Indikatif/.test(balasan)
        ? "ok harga"
        : "?? lain";
    console.log(`[${kena}] (${keterangan}) "${tanya}" -> ${ringkas(balasan)} | aksi: ${aksi}`);
  }
}

// A. State `sent`: Ringkasan Kebutuhan sudah terkirim ke admin.
lapor("A. sent (ringkasan terkirim)", (p) => {
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("Rencana Desember 2025");
  p.kirim("4 orang");
  p.kirim("Butuh kamar keluarga");
  p.kirim("Ya, setuju");
  ujiHarga(p, "sent");
});

// B. State `admin-routed`: memilih "4. Keperluan lain" (handoff ke admin).
lapor("B. admin-routed (keperluan lain)", (p) => {
  p.kirim("4");
  ujiHarga(p, "admin-routed");
});

// C. State `admin-routed`: memilih "2. Vendor / mitra bisnis".
lapor("C. admin-routed (vendor)", (p) => {
  p.kirim("2");
  ujiHarga(p, "admin-routed");
});

// D. State `admin-routed`: pesan agen/korporasi dari menu tujuan.
lapor("D. admin-routed (agency)", (p) => {
  p.kirim("saya dari travel agent ingin kerja sama");
  ujiHarga(p, "admin-routed");
});

// E. Setelah handoff mendesak (bicara dengan admin) disetujui -> resume idle.
lapor("E. setelah handoff disetujui (idle)", (p) => {
  p.kirim("ingin bicara dengan admin");
  p.kirim("ya, setuju");
  ujiHarga(p, "setelah-handoff");
});

// F. State `awaiting-question` (sesudah "mau tanya").
lapor("F. awaiting-question (mau tanya)", (p) => {
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("mau tanya");
  ujiHarga(p, "awaiting-question");
});

// G. State `sent` + basa-basi lalu harga (loop "Terima kasih atas pesan Anda").
lapor("G. sent: basa-basi dulu lalu harga", (p) => {
  p.kirim("Umrah premium, tujuan Mekkah");
  p.kirim("Rencana Desember 2025");
  p.kirim("4 orang");
  p.kirim("Butuh kamar keluarga");
  p.kirim("Ya, setuju");
  for (const basa of ["halo", "terima kasih", "oke"]) {
    const t = p.kirim(basa);
    console.log(`[basa] "${basa}" -> ${ringkas(t.reply?.text ?? "(tanpa balasan)")}`);
  }
  ujiHarga(p, "sent");
});
