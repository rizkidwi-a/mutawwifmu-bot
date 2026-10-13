import { test } from "node:test";
import assert from "node:assert/strict";
import {
  faqAnswer,
  isPriceTopic,
  matchFaqTopic,
  type FaqTopic,
} from "../../src/knowledge/businessFaq.ts";

const SEMUA_TOPIK: readonly FaqTopic[] = [
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
  "tour-guide",
  "charity-program",
  "multi-language-support",
  "photographer-videographer",
  "custom-itinerary",
  "price-mutawwif",
  "price-document-arrangement",
  "price-airport-handling",
  "price-transport",
  "price-city-tour",
  "price-photographer-videographer",
  "price-hotel",
];

/** Topik Harga Indikatif (tiket 05) — jawabannya justru memuat angka harga materi. */
const TOPIK_HARGA: readonly FaqTopic[] = [
  "price-mutawwif",
  "price-document-arrangement",
  "price-airport-handling",
  "price-transport",
  "price-city-tour",
  "price-photographer-videographer",
  "price-hotel",
];

/** Topik layanan lain dalam profil perusahaan (tiket 04). */
const LAYANAN_LAIN: readonly FaqTopic[] = [
  "tour-guide",
  "charity-program",
  "multi-language-support",
  "photographer-videographer",
  "custom-itinerary",
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
    // Invarian dilonggarkan untuk topik harga (tiket 05): jawaban Harga
    // Indikatif justru memuat angka materi, dijaga tes Harga Indikatif di bawah.
    if (isPriceTopic(topic)) {
      assert.ok(TOPIK_HARGA.includes(topic), `${topic} bukan topik harga yang terdaftar`);
      continue;
    }
    for (const language of ["id", "en"] as const) {
      const answer = faqAnswer(topic, language);
      assert.doesNotMatch(answer, /(SAR|IDR|Rp)\s?\d/i, `${topic}/${language} memuat angka harga`);
    }
  }
});

test("jawaban Harga Indikatif menyebut statusnya dan tidak mengklaim harga final", () => {
  for (const topic of TOPIK_HARGA) {
    assert.ok(isPriceTopic(topic), `${topic} harus diakui sebagai topik harga`);
    assert.match(faqAnswer(topic, "id"), /Harga Indikatif/i, `${topic}/id`);
    assert.match(faqAnswer(topic, "en"), /Indicative Price/i, `${topic}/en`);
    assert.match(faqAnswer(topic, "id"), /bukan penawaran final/i, `${topic}/id`);
    assert.match(faqAnswer(topic, "en"), /not a final offer/i, `${topic}/en`);
  }
});

test("jawaban Harga Indikatif menyatakan angka dapat berubah setelah diperiksa admin", () => {
  // Tiket 04 (ADR-0009): setiap jawaban harga menegaskan bahwa angka bersifat
  // indikatif dan dapat berubah setelah diperiksa admin, sambil mempertahankan
  // penegasan yang sudah ada ("bukan penawaran final", arahan konfirmasi tim).
  for (const topic of TOPIK_HARGA) {
    const id = faqAnswer(topic, "id");
    assert.match(id, /dapat berubah[^.]*setelah diperiksa admin/i, `${topic}/id`);
    assert.match(id, /bukan penawaran final/i, `${topic}/id`);
    assert.match(id, /tim kami/i, `${topic}/id`);
    const en = faqAnswer(topic, "en");
    assert.match(en, /may change[^.]*after being reviewed by (our )?admin/i, `${topic}/en`);
    assert.match(en, /not a final offer/i, `${topic}/en`);
    assert.match(en, /our team/i, `${topic}/en`);
  }
});

test("jawaban Harga Indikatif hanya memuat angka yang tercantum materi", () => {
  // Angka di bawah dikutip dari BOOKLET MUTAWWIFMU.md / HOTEL RATES MUTAWWIFMU (2).md,
  // kecuali price-transport yang memakai tabel transport 2026-10-12
  // (SAR per kendaraan/per grup — lihat `src/knowledge/transportRute.ts`).
  assert.match(faqAnswer("price-mutawwif", "id"), /SAR 300/);
  assert.match(faqAnswer("price-mutawwif", "id"), /SAR 350/);
  assert.match(faqAnswer("price-mutawwif", "id"), /SAR 400/);
  assert.match(faqAnswer("price-document-arrangement", "id"), /IDR 2\.980\.000/);
  assert.match(faqAnswer("price-document-arrangement", "id"), /IDR 100\.000/);
  assert.match(faqAnswer("price-airport-handling", "id"), /IDR 350\.000/);
  assert.match(faqAnswer("price-airport-handling", "id"), /SAR 300/);
  assert.match(faqAnswer("price-airport-handling", "id"), /SAR 900/);
  assert.match(faqAnswer("price-transport", "id"), /SAR 400/);
  assert.match(faqAnswer("price-transport", "id"), /SAR 1\.950/);
  assert.match(faqAnswer("price-city-tour", "id"), /SAR 820/);
  assert.match(faqAnswer("price-city-tour", "id"), /SAR 1\.705/);
  assert.match(faqAnswer("price-city-tour", "id"), /SAR 2\.095/);
  assert.match(faqAnswer("price-photographer-videographer", "id"), /SAR 600/);
  assert.match(faqAnswer("price-photographer-videographer", "id"), /SAR 4\.500/);
  // Visa Umrah Express tidak memuat angka di materi — jangan dikarang.
  assert.doesNotMatch(faqAnswer("price-document-arrangement", "id"), /Express[\s\S]*?IDR/);
});

test("jawaban harga hotel menyatakan konflik satuan materi dan tidak memilih satuan sendiri", () => {
  for (const language of ["id", "en"] as const) {
    const answer = faqAnswer("price-hotel", language);
    assert.match(answer, /per orang|per person/i, `${language} tidak menyebut klaim sampul`);
    assert.match(answer, /per kamar|per room/i, `${language} tidak menyebut klaim tabel`);
    assert.match(answer, /bertentangan|berbeda|conflict|contradict/i, `${language} tidak menyatakan konflik`);
    assert.match(answer, /belum terverifikasi|not (yet )?verified/i, `${language} tidak menyatakan status verifikasi`);
    assert.match(answer, /admin|tim kami|our team/i, `${language} tidak mengarahkan konfirmasi admin`);
    // Angka tidak boleh dilabeli sendiri sebagai per orang atau per kamar.
    assert.doesNotMatch(
      answer,
      /(SAR|IDR|Rp)\s?[\d.,]+\s*(per|\/)\s*(orang|kamar|person|room)/i,
      `${language} melabeli angka dengan satuan yang belum terverifikasi`,
    );
  }
});

test("matchFaqTopic mengenali pertanyaan harga yang tercantum materi sebagai topik harga", () => {
  assert.equal(matchFaqTopic("Berapa harga fotografer?"), "price-photographer-videographer");
  assert.equal(matchFaqTopic("Berapa harga dokumentasi perjalanan?"), "price-photographer-videographer");
  assert.equal(matchFaqTopic("Berapa harga hotel di Mekkah?"), "price-hotel");
  assert.equal(matchFaqTopic("How much is the mutawwif per group?"), "price-mutawwif");
  assert.equal(matchFaqTopic("Biaya visa umrah berapa?"), "price-document-arrangement");
  assert.equal(matchFaqTopic("Berapa harga city tour Madinah?"), "price-city-tour");
  assert.equal(matchFaqTopic("Berapa tarif transportasi dari Jeddah?"), "price-transport");
  assert.equal(matchFaqTopic("Berapa harga airport handling di Jeddah?"), "price-airport-handling");
  // Harga yang tidak tercantum materi tidak menjadi topik harga.
  assert.equal(matchFaqTopic("Berapa harga tour guide ke Jepang?"), "tour-guide");
});

test("matchFaqTopic mengenali varian ejaan sebelum pencocokan topik", () => {
  assert.equal(matchFaqTopic("Mutowwif nya harganya berapa?"), "price-mutawwif");
  assert.equal(matchFaqTopic("kl kita mau tambah pakai muthowif itu biayanya berapa ?"), "price-mutawwif");
  assert.equal(matchFaqTopic("Mutthowif nya ini mendampingi kami, tarifnya berapa?"), "price-mutawwif");
  assert.equal(matchFaqTopic("Paspor nya apakah halaman depan aja atau semuanya?"), "visa-documents");
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

test("matchFaqTopic mengenali layanan lain dalam profil", () => {
  assert.equal(matchFaqTopic("Apakah ada tour guide untuk ke luar negeri?"), "tour-guide");
  assert.equal(matchFaqTopic("Do you provide tour guides in other countries?"), "tour-guide");
  assert.equal(matchFaqTopic("Bagaimana dengan charity program?"), "charity-program");
  assert.equal(matchFaqTopic("Do you run a charity program during the trip?"), "charity-program");
  assert.equal(matchFaqTopic("Bahasa apa saja yang didukung?"), "multi-language-support");
  assert.equal(matchFaqTopic("What languages do you support?"), "multi-language-support");
  assert.equal(matchFaqTopic("Apakah ada fotografer dan videografer?"), "photographer-videographer");
  assert.equal(matchFaqTopic("Do you provide a photographer and videographer?"), "photographer-videographer");
  assert.equal(matchFaqTopic("Apakah itinerary bisa disesuaikan?"), "custom-itinerary");
  assert.equal(matchFaqTopic("Can you build a custom itinerary for us?"), "custom-itinerary");
});

test("jawaban layanan lain hanya memuat fakta yang tercantum materi", () => {
  // Tour guide: jaringan 190 negara dan pemahaman budaya/bahasa ada di materi.
  assert.match(faqAnswer("tour-guide", "id"), /190 negara/);
  assert.match(faqAnswer("tour-guide", "id"), /budaya, bahasa/);
  assert.match(faqAnswer("tour-guide", "en"), /190 countries/);
  // Charity program: program sosial yang memberdayakan komunitas lokal.
  assert.match(faqAnswer("charity-program", "id"), /program sosial/);
  assert.match(faqAnswer("charity-program", "id"), /komunitas lokal/);
  assert.match(faqAnswer("charity-program", "en"), /local communities/);
  // Multibahasa: hanya bahasa yang tercantum materi.
  assert.match(faqAnswer("multi-language-support", "id"), /Indonesia, Arab, Inggris/);
  assert.match(faqAnswer("multi-language-support", "en"), /Indonesian, Arabic, English/);
  // Fotografer/videografer: lokasi sesi yang tercantum materi + editing.
  assert.match(faqAnswer("photographer-videographer", "id"), /Masjidil Haram/);
  assert.match(faqAnswer("photographer-videographer", "id"), /Masjid Nabawi/);
  assert.match(faqAnswer("photographer-videographer", "id"), /editing profesional/);
  // Custom itinerary: personal sesuai kebutuhan, preferensi, dan anggaran.
  assert.match(faqAnswer("custom-itinerary", "id"), /sesuai kebutuhan, preferensi, dan anggaran/);
  assert.match(faqAnswer("custom-itinerary", "en"), /needs, preferences, and budget/);
});

test("jawaban layanan lain tidak menjanjikan ketersediaan atau mengarang destinasi", () => {
  for (const topic of LAYANAN_LAIN) {
    for (const language of ["id", "en"] as const) {
      const answer = faqAnswer(topic, language);
      assert.doesNotMatch(
        answer,
        /(pasti tersedia|selalu tersedia|dijamin|guaranteed|always available|available (in|for) all)/i,
        `${topic}/${language} menjanjikan ketersediaan`,
      );
      // Destinasi tertentu tidak dicantumkan materi — jangan dikarang.
      assert.doesNotMatch(answer, /(Jepang|Japan|Eropa|Europe|Korea|Turki|Turkey)/i, `${topic}/${language} mengarang destinasi`);
    }
  }
});

test("matchFaqTopic tidak mengenali pesan yang tidak didukung materi", () => {
  assert.equal(matchFaqTopic("Berapa harga paket umrah?"), null);
  assert.equal(matchFaqTopic("Apakah ada paket umrah 14 hari?"), null);
  assert.equal(matchFaqTopic("Halo"), null);
  assert.equal(matchFaqTopic("Hello, I would like to ask about umrah"), null);
});
