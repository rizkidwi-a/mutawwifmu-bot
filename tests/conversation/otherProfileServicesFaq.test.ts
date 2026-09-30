/**
 * Tes FAQ layanan lain dalam profil pada seam `handleInbound` (tiket 04):
 * pertanyaan yang didukung materi dijawab langsung dari materi, sementara
 * pertanyaan agen/korporasi, informasi yang tidak tersedia, serta pertanyaan
 * harga/ketersediaan tetap mengalir ke alur handoff tiket 02.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pertanyaan layanan lain dalam profil beserta kata kunci jawaban topiknya.
 * Pertanyaan yang memuat kata "tersedia" atau "harga" sengaja tidak dijadikan
 * baris: keduanya adalah pertanyaan ketersediaan/harga yang perlu konfirmasi
 * admin (lihat tes penjaga di bawah), bukan FAQ.
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

for (const [pesan, topik, kataKunci] of PERTANYAAN_LAYANAN_LAIN) {
  test(`pertanyaan layanan lain "${pesan}" dijawab dari materi tanpa handoff`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    const balasan = teksBalasan(turn);
    for (const kunci of kataKunci) {
      assert.match(balasan, kunci);
    }
    const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
    assert.ok(catat && catat.kind === "record-faq-answer");
    assert.equal(catat.topic, topik);
    assert.deepEqual(
      turn.actions.filter((aksi) => aksi.kind === "hand-off-to-admin"),
      [],
    );
  });
}

test("pertanyaan layanan lain dalam Bahasa Inggris dijawab dalam Bahasa Inggris", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Do you provide tour guides in other countries?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /190 countries/);
  assert.doesNotMatch(balasan, /negara/);
  const catat = turn.actions.find((aksi) => aksi.kind === "record-faq-answer");
  assert.ok(catat && catat.kind === "record-faq-answer");
  assert.equal(catat.topic, "tour-guide");
});

test("jawaban layanan lain tidak menjanjikan destinasi atau ketersediaan di luar materi", () => {
  const percakapan = new Percakapan();
  const balasan = teksBalasan(percakapan.kirim("Apakah ada tour guide untuk ke Jepang?"));
  // Destinasi tertentu tidak dicantumkan materi: bot tidak menyebutnya,
  // tidak menjanjikan ketersediaannya, dan mengarahkan konfirmasi ke tim.
  assert.doesNotMatch(balasan, /Jepang|Japan/);
  assert.doesNotMatch(balasan, /pasti|dijamin|guaranteed/i);
  assert.match(balasan, /dikonfirmasi/);
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

test("informasi yang tidak tersedia memakai alur handoff tiket 02", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Apakah MUTAWWIFMU bisa mengurus paspor?");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
  assert.deepEqual(turn.actions, []);

  const lanjut = percakapan.kirim("ya");
  const handoff = lanjut.actions.find((aksi) => aksi.kind === "hand-off-to-admin");
  assert.ok(handoff && handoff.kind === "hand-off-to-admin");
  assert.equal(handoff.reason, "unsupported-question");
});

test("pertanyaan harga layanan lain tidak dijawab sebagai FAQ dan tetap ke alur admin", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Berapa harga fotografer?");
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
