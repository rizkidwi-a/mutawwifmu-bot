import { test } from "node:test";
import assert from "node:assert/strict";
import {
  faqAnswer,
  matchFaqTopic,
  type UmrahFaqTopic,
} from "../../src/knowledge/privatePremiumUmrahFaq.ts";

const SEMUA_TOPIK: readonly UmrahFaqTopic[] = [
  "land-arrangement",
  "mutawwif",
  "visa-documents",
  "hotel-accommodation",
  "transport-fleet",
  "airport-handling",
  "city-tour",
  "city-tour-makkah",
  "city-tour-madinah",
  "city-tour-thaif",
  "city-tour-alula",
];

test("setiap topik FAQ memiliki jawaban Bahasa Indonesia dan Inggris", () => {
  for (const topic of SEMUA_TOPIK) {
    assert.ok(faqAnswer(topic, "id").length > 0, `jawaban ID untuk ${topic}`);
    assert.ok(faqAnswer(topic, "en").length > 0, `jawaban EN untuk ${topic}`);
    assert.notEqual(faqAnswer(topic, "id"), faqAnswer(topic, "en"));
  }
});

test("jawaban tidak memuat angka harga yang dapat dianggap penawaran final", () => {
  for (const topic of SEMUA_TOPIK) {
    for (const language of ["id", "en"] as const) {
      const answer = faqAnswer(topic, language);
      assert.doesNotMatch(answer, /(SAR|IDR|Rp)\s?\d/i, `${topic}/${language} memuat angka harga`);
    }
  }
});

test("jawaban tidak mengarang rincian yang tidak ada di materi", () => {
  for (const topic of SEMUA_TOPIK) {
    for (const language of ["id", "en"] as const) {
      const answer = faqAnswer(topic, language);
      // Land Arrangement adalah layanan darat; jangan mengklaim tiket pesawat termasuk.
      assert.doesNotMatch(answer, /(tiket pesawat|flight ticket|tiket penerbangan|include(?:s)? flight)/i);
      // Materi tidak mencantumkan durasi paket.
      assert.doesNotMatch(answer, /\d+\s?(hari|days?|malam|nights?)/i);
      // Jangan menjanjikan harga final atau ketersediaan.
      assert.doesNotMatch(answer, /(harga final|final price|fixed price|dijamin tersedia|guaranteed availability)/i);
    }
  }
});

test("jawaban mutawwif hanya menyebut jenis mutawwif yang tercantum materi", () => {
  const id = faqAnswer("mutawwif", "id");
  assert.match(id, /bersertifikat/i);
  assert.match(id, /Mutawwif Reguler/);
  assert.match(id, /Mutawwif Bilingual/);
  const en = faqAnswer("mutawwif", "en");
  assert.match(en, /certified/i);
  assert.match(en, /Regular Mutawwif/);
  assert.match(en, /Bilingual Mutawwif/);
});

test("jawaban city tour menyebut fasilitas yang tercantum materi", () => {
  for (const topic of ["city-tour", "city-tour-makkah", "city-tour-madinah", "city-tour-thaif"] as const) {
    assert.match(faqAnswer(topic, "id"), /transportasi, mutawwif profesional, dan free snack/);
    assert.match(faqAnswer(topic, "en"), /transportation, a professional mutawwif, and a free snack/);
  }
});

test("matchFaqTopic mengenali pertanyaan berbahasa Indonesia dan Inggris", () => {
  assert.equal(matchFaqTopic("Apa itu Private Premium Umrah?"), "land-arrangement");
  assert.equal(matchFaqTopic("What is private premium umrah and land arrangement?"), "land-arrangement");
  assert.equal(matchFaqTopic("Apakah ada mutawwif yang bisa berbahasa Arab?"), "mutawwif");
  assert.equal(matchFaqTopic("Do you provide bilingual worship guides?"), "mutawwif");
  assert.equal(matchFaqTopic("MUTAWWIFMU mengurus visa tidak?"), "visa-documents");
  assert.equal(matchFaqTopic("Can you arrange travel insurance?"), "visa-documents");
  assert.equal(matchFaqTopic("Hotel di Mekkah seperti apa?"), "hotel-accommodation");
  assert.equal(matchFaqTopic("What room types do you have in Madinah?"), "hotel-accommodation");
  assert.equal(matchFaqTopic("Armada yang dipakai apa saja?"), "transport-fleet");
  assert.equal(matchFaqTopic("What vehicles do you use for transfers?"), "transport-fleet");
  assert.equal(matchFaqTopic("Apakah ada pendampingan di bandara?"), "airport-handling");
  assert.equal(matchFaqTopic("Do you handle airport pickup and drop-off?"), "airport-handling");
});

test("matchFaqTopic mengenali city tour per destinasi lebih dahulu", () => {
  assert.equal(matchFaqTopic("City tour di Madinah ke mana saja?"), "city-tour-madinah");
  assert.equal(matchFaqTopic("What does the Thaif city tour cover?"), "city-tour-thaif");
  assert.equal(matchFaqTopic("Wisata ziarah di Al Ula ada?"), "city-tour-alula");
  assert.equal(matchFaqTopic("Ziarah di Makkah ke mana saja?"), "city-tour-makkah");
  assert.equal(matchFaqTopic("Apakah ada city tour?"), "city-tour");
});

test("matchFaqTopic tidak mengenali pesan yang tidak didukung materi", () => {
  assert.equal(matchFaqTopic("Berapa harga paket umrah?"), null);
  assert.equal(matchFaqTopic("Apakah ada paket umrah 14 hari?"), null);
  assert.equal(matchFaqTopic("Halo"), null);
  assert.equal(matchFaqTopic("Hello, I would like to ask about umrah"), null);
});
