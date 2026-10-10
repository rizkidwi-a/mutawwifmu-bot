import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { DI_LUAR_MATERI } from "./kasusDiLuarMateri.ts";

test("pertanyaan yang didukung materi diklasifikasikan sebagai FAQ", () => {
  assert.deepEqual(classifyInbound("Apa itu land arrangement?"), {
    kind: "faq",
    topic: "land-arrangement",
  });
  assert.deepEqual(classifyInbound("Ceritakan tentang mutawwif Anda"), {
    kind: "faq",
    topic: "mutawwif",
  });
  assert.deepEqual(classifyInbound("Apakah bisa urus visa umrah?"), {
    kind: "faq",
    topic: "visa-documents",
  });
  assert.deepEqual(classifyInbound("Kamar hotel tipe apa saja?"), {
    kind: "faq",
    topic: "hotel-accommodation",
  });
});

test("pertanyaan harga tidak dijawab sebagai FAQ dan diteruskan ke handoff", () => {
  for (const text of [
    "Berapa harga paket umrah?",
    "How much is the hotel per night?",
    "Apakah ada diskon?",
    "Saya ingin minta penawaran harga",
  ]) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "custom-quote-or-availability",
    }, text);
  }
});

test("pemeriksaan ketersediaan diteruskan ke handoff", () => {
  for (const text of [
    "Apakah hotel di Makkah tersedia untuk Desember?",
    "Is the Thaif city tour available next month?",
    "Masih ada kuota untuk bulan depan?",
  ]) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "custom-quote-or-availability",
    }, text);
  }
});

test("permintaan booking dan pembayaran diteruskan ke handoff", () => {
  for (const text of [
    "Saya mau pesan paket untuk 2 orang",
    "I want to book a room for next week",
    "Bagaimana cara pembayaran DP?",
    "Can I pay by transfer?",
  ]) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "booking-or-payment",
    }, text);
  }
});

test("permintaan berbicara dengan manusia diteruskan ke handoff", () => {
  for (const text of [
    "Saya mau bicara dengan admin",
    "Can I talk to a human?",
    "Tolong sambungkan ke customer service",
  ]) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "human-request",
    }, text);
  }
});

test("pertanyaan dari agen travel dan korporasi diteruskan ke handoff", () => {
  for (const text of [
    "Saya dari agen travel, mau kerja sama",
    "Our company is looking for a corporate trip partner",
    "Kami dari institusi ingin mengadakan study tour",
  ]) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "agency-or-corporate",
    }, text);
  }
});

test("kasus perjalanan aktif dan keadaan darurat diteruskan ke handoff", () => {
  const perjalananAktif = ["Saya sedang di Madinah, hotel saya bermasalah", "We are currently in Makkah and need help"];
  for (const text of perjalananAktif) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "active-trip",
    }, text);
  }
  assert.deepEqual(classifyInbound("Ini keadaan darurat, tolong bantu"), {
    kind: "handoff",
    trigger: "emergency",
  });
});

test("pertanyaan dengan rincian yang tidak ada di materi diteruskan ke handoff", () => {
  for (const text of [
    "Berapa lama proses visa umrah?",
    "Apa syarat dokumen untuk umrah?",
    "Do you arrange passports?",
    "Apakah bisa umrah tanpa vaksin?",
  ]) {
    assert.deepEqual(classifyInbound(text), {
      kind: "handoff",
      trigger: "unsupported-question",
    }, text);
  }
});

test("sapaan dan pembuka percakapan tetap menjadi opener", () => {
  for (const text of [
    "Halo",
    "Hello",
    "Halo, saya ingin bertanya tentang umrah",
    "Hello, I would like to ask about umrah",
    "Assalamualaikum",
    "Terima kasih infonya",
  ]) {
    assert.deepEqual(classifyInbound(text), { kind: "opener" }, text);
  }
});

test("pertanyaan harga tidak terjawab sebagai FAQ meski memuat kata topik", () => {
  const routing = classifyInbound("Berapa harga hotel di Mekkah?");
  assert.notEqual(routing.kind, "faq");
});

test("sapaan basa-basi tetap menjadi opener", () => {
  for (const text of ["Halo, apa kabar?", "Hello, how are you?"]) {
    assert.deepEqual(classifyInbound(text), { kind: "opener" }, text);
  }
});

test("permintaan menghubungkan ke admin diteruskan ke handoff", () => {
  assert.deepEqual(classifyInbound("tolong hubungkan saya dengan admin MUTAWWIFMU"), {
    kind: "handoff",
    trigger: "human-request",
  });
});

test("kata kerja memesan diperlakukan sebagai booking", () => {
  assert.deepEqual(classifyInbound("bisakah saya memesan paket umrah bulan depan?"), {
    kind: "handoff",
    trigger: "booking-or-payment",
  });
});

test("pertanyaan di luar materi diteruskan ke handoff, bukan diklasifikasi FAQ", () => {
  for (const [kelompok, pesan] of DI_LUAR_MATERI) {
    assert.equal(classifyInbound(pesan).kind, "handoff", `${kelompok}: ${pesan}`);
  }
});

test("penyempitan tiket 08 tidak menyeret pertanyaan yang didukung materi", () => {
  // Pertanyaan yang materinya tersedia tetap di jalur materi.
  const hargaHotel = classifyInbound("Berapa harga hotel di Mekkah?");
  assert.equal(hargaHotel.kind, "indicative-price", "harga hotel tetap Harga Indikatif");
  assert.deepEqual(classifyInbound("Apakah bisa urus visa umrah?"), {
    kind: "faq",
    topic: "visa-documents",
  });
  assert.deepEqual(classifyInbound("ada pemandu ibadah gak?"), {
    kind: "faq",
    topic: "mutawwif",
  });
  // "kereta gantung" adalah rincian materi city tour, bukan kereta Haramain.
  assert.deepEqual(classifyInbound("kereta gantung termasuk dalam paket city tour?"), {
    kind: "faq",
    topic: "city-tour",
  });
  // Penambahan layanan sebagai pernyataan biasa bukan permintaan penawaran.
  assert.notEqual(classifyInbound("Tambah airport handling").kind, "handoff");
  // Pernyataan perubahan hotel (kasus misfire harga) bukan ganti-hotel kebijakan.
  assert.notEqual(
    classifyInbound(
      "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation " +
        "to non refundable soalnya bedanya jauh",
    ).kind,
    "handoff",
  );
});
