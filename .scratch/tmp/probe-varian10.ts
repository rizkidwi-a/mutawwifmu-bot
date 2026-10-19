import { classifyInbound } from "../../src/conversation/classifyInbound.ts";

const varian: ReadonlyArray<readonly [topik: string, pesan: string]> = [
  ["1 raudhah", "raudhah itu apakah perlu pesan2 gitu?"],
  ["1 raudhah", "mba raudah itu gimana caranya?"],
  ["1 raudhah", "raudhoh perlu booking ga?"],
  ["1 raudhah", "rawdhah masuknya jam berapa?"],
  ["1 nusuk", "nusuk card itu kebijakannya gmn skrg?"],
  ["1 nusuk", "tips apply via nusuk dong"],
  ["1 raudhah-anak", "anak umur 3 tahun boleh masuk raudhah ga?"],
  ["2 siskopatuh", "berapa biaya siskopatuhnya mas?"],
  ["2 siskopatuh", "siskapatuh itu ga wajib ya?"],
  ["2 siskopatuh", "siskopatuh wajib ga?"],
  ["2 siskopatuh", "apa itu siskopatuh?"],
  ["3 asuransi", "ada asuransi perjalanannya ga ya?"],
  ["3 asuransi", "asuransi perjalanan ketentuannya apa?"],
  ["3 asuransi", "insurance nya include ga?"],
  ["3 asuransi", "berapa biaya asuransi perjalanan?"],
  ["4 refund", "ada refund ga kalo batal berangkat?"],
  ["4 refund", "kalau pembatalan bagaimana kebijakannya?"],
  ["4 refund", "bisa refund dp ga?"],
  ["4 refund", "pengembalian dana bisa ga?"],
  ["5 vaksin", "vaksin nya h-berapa ya?"],
  ["5 vaksin", "vaksin di malaysia bisa?"],
  ["5 vaksin", "vaksinasi meningitis wajib ga?"],
  ["6 haramain", "harramain train on time banget ga yah?"],
  ["6 haramain", "haramain dari stasiun ke jeddah airport langsung kan?"],
  ["6 haramain", "kereta haramain berapa lama perjalanannya?"],
  ["6 haramain", "tiket haramain brp?"],
  ["7 pembayaran", "bisa bayar pakai link payment ga?"],
  ["7 pembayaran", "bisa pakai kartu kredit ga?"],
  ["7 pembayaran", "ada cicilan ga?"],
  ["7 pembayaran", "metode pembayarannya apa saja?"],
  ["8 tnc", "info term and condition dp dong"],
  ["8 tnc", "t&c pelunasan bagaimana?"],
  ["8 tnc", "pelunasan h-2 minggu bisa ga?"],
  ["9 perlengkapan", "perlengkapan umrohnya dapat ga?"],
  ["9 perlengkapan", "dapat kain ihram ga?"],
  ["9 perlengkapan", "dapat air zam-zam ga?"],
  ["9 perlengkapan", "konsumsi termasuk ga?"],
  ["10 kurs", "20 sar itu berapa idr?"],
  ["10 kurs", "kurs sar ke idr berapa ya?"],
  ["10 kurs", "harga dalam rupiah atau sar?"],
];

for (const [topik, pesan] of varian) {
  const r = classifyInbound(pesan);
  const label = r.kind === "handoff" ? `${r.kind}/${r.trigger}` : r.kind === "faq" || r.kind === "indicative-price" ? `${r.kind}/${r.topic}` : r.kind;
  const ok = r.kind === "handoff" ? "OK " : "!! ";
  console.log(`${ok}[${topik}] ${pesan}  =>  ${label}`);
}
