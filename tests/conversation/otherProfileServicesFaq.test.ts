/**
 * Tes layanan lain dalam profil pada seam `handleInbound` (tiket 01, ADR-0009).
 * Sebelum tiket ini, pertanyaan yang didukung materi dijawab langsung dari
 * `businessFaq.ts`; kini jawaban non-harga dinonaktifkan dari jalur runtime dan
 * pertanyaannya dicatat sebagai bagian kebutuhan untuk admin. Penyesuaian sadar
 * atas tes tiket 04 tercatat di Comments tiket 01
 * (`.scratch/lead-intake/issues/01-intake-sebagai-alur-utama.md`).
 * Pertanyaan agen/korporasi, informasi yang tidak tersedia, serta pertanyaan
 * harga/ketersediaan tetap mengalir ke alur handoff tiket 02.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, lengkapiPermintaanLaluSetujui, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pertanyaan layanan lain dalam profil beserta kata kunci jawaban topiknya yang
 * tidak boleh lagi muncul pada balasan. Pertanyaan yang memuat kata "tersedia"
 * atau "penawaran" sengaja tidak dijadikan baris: keduanya adalah pertanyaan
 * ketersediaan/penawaran yang perlu konfirmasi admin (lihat tes penjaga di bawah).
 */
const PERTANYAAN_LAYANAN_LAIN: ReadonlyArray<
  readonly [pesan: string, topik: string, kataKunci: readonly RegExp[]]
> = [
  ["Apakah ada tour guide untuk ke luar negeri?", "tour-guide", [/190 negara/, /pemandu wisata/]],
  ["Bagaimana dengan charity program?", "charity-program", [/program sosial/, /komunitas lokal/]],
  ["Bahasa apa saja yang didukung?", "multi-language-support", [/Indonesia, Arab, Inggris/, /jemaah internasional/]],
  ["Apakah ada fotografer dan videografer?", "photographer-videographer", [/Masjidil Haram/, /editing/]],
  ["Apakah itinerary bisa disesuaikan?", "custom-itinerary", [/kebutuhan/, /anggaran/]],
];

for (const [pesan, , kataKunci] of PERTANYAAN_LAYANAN_LAIN) {
  test(`pertanyaan layanan lain "${pesan}" tidak dijawab dari materi dan diarahkan ke intake`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    for (const kunci of kataKunci) {
      assert.doesNotMatch(balasan, kunci, `${pesan}: balasan masih memuat jawaban materi ${kunci}`);
    }
    assert.match(balasan, /catat/i);
    assert.match(balasan, /layanan|tujuan/i);
    assert.deepEqual(turn.actions, []);
  });
}

test("pertanyaan layanan lain dalam Bahasa Inggris dibalas tanpa jawaban materi", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("Do you provide tour guides in other countries?"));
  assert.doesNotMatch(balasan, /190 countries/);
  assert.match(balasan, /noted/i);
});

test("pertanyaan layanan lain yang tidak tercantum materi tidak dijawab dengan karangan", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("Apakah ada tour guide untuk ke Jepang?"));
  // Destinasi tertentu tidak dicantumkan materi: bot tidak menyebutnya,
  // tidak menjanjikan ketersediaannya, dan tidak menjawab dari materi.
  assert.doesNotMatch(balasan, /Jepang|Japan/);
  assert.doesNotMatch(balasan, /pasti|dijamin|guaranteed/i);
  assert.match(balasan, /catat/i);
});

test("pertanyaan agen travel dan korporasi diteruskan ke admin, bukan sebagai Permintaan Tindak Lanjut calon jemaah", () => {
  for (const pesan of [
    "Kami dari agen travel ingin bekerja sama untuk layanan tour guide",
    "Kami dari korporasi ingin mengadakan study tour",
  ]) {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /teruskan|diteruskan/i);
    assert.match(balasan, /setuju/i);
    assert.deepEqual(turn.actions, []);

    const lanjut = percakapan.kirim("ya");
    assert.ok(lanjut.actions.some((aksi) => aksi.kind === "hand-off-to-admin"));
    const handoff = lanjut.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
    assert.ok(handoff && handoff.kind === "hand-off-to-admin");
    assert.equal(handoff.reason, "agency-or-corporate");
    assert.deepEqual(
      lanjut.actions.filter((aksi) => aksi.kind === "record-follow-up-request"),
      [],
    );
    assert.deepEqual(
      lanjut.actions.filter((aksi) => aksi.kind === "record-faq-answer"),
      [],
    );
  }
});

test("informasi yang tidak tersedia tetap ke alur admin dan tercatat pada Ringkasan Kebutuhan", () => {
  const pesan = "Apakah MUTAWWIFMU bisa mengurus paspor?";
  const percakapan = new Percakapan();
  const awal = percakapan.kirim(pesan);
  assert.deepEqual(awal.actions, []);
  assert.match(teksBalasan(awal), /catat|noted/i);
  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.ok(request.notedQuestions.includes(pesan));
});

test("pertanyaan angka harga layanan lain yang tercantum materi dijawab sebagai Harga Indikatif", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa harga fotografer?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /Harga Indikatif/);
  assert.match(balasan, /SAR 600/);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "price-photographer-videographer");
  assert.deepEqual(
    turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
    [],
  );
});

test("permintaan penawaran harga layanan lain tetap ke alur admin, bukan Harga Indikatif", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Saya ingin minta penawaran harga untuk fotografer");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
  assert.doesNotMatch(balasan, /Rp|SAR|USD|\d/);
  assert.deepEqual(turn.actions, []);

  const lanjut = percakapan.kirim("ya");
  const handoff = lanjut.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(handoff && handoff.kind === "hand-off-to-admin");
  assert.equal(handoff.reason, "custom-quote-or-availability");
});
