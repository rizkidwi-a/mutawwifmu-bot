/**
 * Tes keputusan tiket 10: 10 topik dari transkrip nyata yang tidak punya
 * padanan materi — Raudhah/Nusuk, siskopatuh, asuransi perjalanan,
 * refund/pembatalan, vaksin, kereta Haramain, metode pembayaran, T&C
 * DP/pelunasan, perlengkapan/konsumsi/zam-zam, dan konversi SAR→IDR —
 * diputuskan pemilik tetap `handoff` (bukan ditambahkan ke materi).
 *
 * Karena tetap handoff, pertanyaan nyatanya tidak boleh hilang di balik
 * persetujuan handoff tanpa isi: pesan apa adanya harus tercatat sebagai
 * bagian kebutuhan dan ikut pada Ringkasan Kebutuhan yang diterima admin.
 * Sejak ADR-0009 hal yang sama berlaku untuk pertanyaan non-urgent lain yang
 * menjadi pesan pertama percakapan — liputannya ada di `handOffToAdmin.test.ts`.
 *
 * Pesan diambil dari korpus `tests/korpus/transkrip-nyata.json` (kalimat jemaah
 * apa adanya, sudah dianonimkan) dan `tests/korpus/topik-gap.json` (varian
 * tanya, termasuk yang tanpa tanda tanya) agar korpusnya ikut dijaga `npm test`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  Percakapan,
  lengkapiPermintaanLaluSetujui,
  teksBalasan,
} from "./pembantuPercakapan.ts";
import { formatAdminHandoff } from "../../src/adminChannel.ts";

interface KasusKorpus {
  readonly pesan: string;
}

function muatKorpus(nama: string): readonly KasusKorpus[] {
  const isi = JSON.parse(
    readFileSync(new URL(`../korpus/${nama}`, import.meta.url), "utf8"),
  ) as { kasus: readonly KasusKorpus[] };
  return isi.kasus;
}

const TRANSKRIP = muatKorpus("transkrip-nyata.json");
const VARIAN = muatKorpus("topik-gap.json");

/** Pesan nyata dari transkrip berdasarkan potongan teks; gagal keras bila tak ada. */
function pesanNyata(potongan: string): string {
  const kasus = TRANSKRIP.find((k) => k.pesan.includes(potongan));
  if (kasus === undefined) {
    throw new Error(`Kasus korpus tidak ditemukan: ${potongan}`);
  }
  return kasus.pesan;
}

/** Sepuluh topik keputusan tiket 10 beserta kalimat nyata dari korpus. */
const KASUS: ReadonlyArray<readonly [topik: string, potongan: string]> = [
  ["Raudhah", "raudhah itu apakah perlu pesan2"],
  ["Nusuk", "nusuk card itu kebijakannya"],
  ["siskopatuh (biaya)", "Berapa biaya siskopatuhnya"],
  ["siskopatuh (wajib)", "Siskopatuh itu ga wajib ya"],
  ["asuransi perjalanan", "ada asuransi perjalanannya ga ya"],
  ["refund/pembatalan", "ada refund ga kalo misal batal berangkat"],
  ["vaksin (timing)", "vaksin nya h- berapa"],
  ["vaksin (di luar negeri)", "vaksin di malaysia apakah bisa"],
  ["kereta Haramain (ketepatan)", "harramain train itu sbnrnya on-time"],
  ["kereta Haramain (rute)", "dari stasiun HHR ke Jeddah airport"],
  ["metode pembayaran", "bisa bayar pakai link payment"],
  ["T&C DP", "Term & Condition kl kita sudah bayar DP"],
  ["pelunasan", "pelunasannya h-2minggu"],
  ["perlengkapan/konsumsi/zam-zam", "Konsumsi ga termasuk"],
  ["konversi SAR→IDR", "20 sar itu brp idr"],
];

/** Jalankan sebuah pesan sebagai pembuka, lalu pastikan tercatat untuk admin. */
function pastikanTercatatUntukAdmin(pesan: string): void {
  const percakapan = new Percakapan();
  const awal = percakapan.kirim(pesan);
  // Pertanyaan tidak dijawab dari materi dan tidak diteruskan tanpa isi:
  // pesannya dicatat lebih dahulu, alur pengumpulan kebutuhan berlanjut.
  assert.deepEqual(awal.actions, [], pesan);
  assert.match(teksBalasan(awal), /catat|noted/i, pesan);
  assert.doesNotMatch(teksBalasan(awal), /Harga Indikatif|Indicative price/, pesan);

  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.ok(request.notedQuestions.includes(pesan), `tidak tercatat: ${pesan}`);
  assert.equal(request.interestedServices, "Umrah premium, tujuan Mekkah", pesan);

  const teksAdmin = formatAdminHandoff({
    from: "628123456789",
    reason: "follow-up-request",
    request,
  });
  assert.ok(teksAdmin.includes(`- Pertanyaan yang dicatat: ${pesan}`), `tidak sampai ke admin: ${pesan}`);
}

for (const [topik, potongan] of KASUS) {
  test(`topik gap "${topik}" tetap handoff dan pertanyaannya tercatat untuk admin`, () => {
    pastikanTercatatUntukAdmin(pesanNyata(potongan));
  });
}

test("seluruh varian korpus topik-gap konsisten handoff dan tercatat untuk admin", () => {
  assert.ok(VARIAN.length > 0, "korpus topik-gap kosong");
  for (const kasus of VARIAN) {
    pastikanTercatatUntukAdmin(kasus.pesan);
  }
});

test("pernyataan berakhir bisa/dapat yang negatif atau sudah berjalan bukan pertanyaan", () => {
  for (const pesan of ["saya tidak bisa", "gak bisa", "ga bisa", "belum bisa", "sudah bisa"]) {
    const percakapan = new Percakapan();
    const awal = percakapan.kirim(pesan);
    assert.deepEqual(awal.actions, [], pesan);
    const request = lengkapiPermintaanLaluSetujui(percakapan);
    assert.ok(!request.notedQuestions.includes(pesan), pesan);
  }
});

test("pernyataan agen/korporasi dan permintaan penawaran tetap langsung ke persetujuan handoff", () => {
  for (const pesan of [
    "kami dari PT Maju Jaya, agen travel, ingin bekerja sama",
    "saya ingin minta penawaran khusus untuk rombongan 20 orang",
  ]) {
    const turn = new Percakapan().kirim(pesan);
    assert.deepEqual(turn.actions, [], pesan);
    assert.match(teksBalasan(turn), /setuju|consent/i, pesan);
  }
});
