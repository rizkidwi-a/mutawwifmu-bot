/**
 * Tes data dan matcher fotografi (fitur harga-fotografi-tasreh-cgk): angka
 * verbatim dari `data/foto harga/`, pemilihan baris per lokasi/periode/segmen,
 * serta invarian jawaban Harga Indikatif.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BARIS_FOTO,
  cocokkanFoto,
  susunJawabanFoto,
  susunMateriFoto,
} from "../../src/knowledge/fotoHarga.ts";
import { semuaAngkaAdaDiMateri } from "../../src/knowledge/pengamanAngka.ts";

test("materi memuat seluruh 13 baris beserta label periode dan rincian", () => {
  const id = susunMateriFoto("id");
  assert.equal(BARIS_FOTO.length, 13);
  // Baris reguler (8).
  for (const label of [
    "Pelataran Masjidil Haram — Sendiri / Couple",
    "Pelataran Masjidil Haram — Family / lebih dari 2 pax",
    "Masjid Nabawi — Sendiri / Couple",
    "Masjid Nabawi — Family / lebih dari 2 pax",
    "Jabal Kudai & Khandama — Sendiri / Couple",
    "Jabal Kudai & Khandama — Family / lebih dari 2 pax",
    "Paket Al-Ula — Kamera Profesional",
    "Paket Al-Ula — Kamera iPhone (min. 15 Pro)",
  ]) {
    assert.ok(id.includes(label), `materi tidak memuat: ${label}`);
  }
  // Paket Spesial Ramadan (5) — label pengganti "High season" BOOKLET.
  assert.match(id, /Paket Spesial Ramadan — Jabal Kudai & Khandama: SAR 1\.000/);
  assert.match(id, /Paket Spesial Ramadan — Masjid Nabawi: SAR 600/);
  assert.match(id, /Paket Spesial Ramadan — Masjidil Haram \(Mekkah\): SAR 750/);
  assert.match(id, /Paket Spesial Ramadan — Al Ula: SAR 4\.500/);
  assert.match(id, /Paket Spesial Ramadan — Akad \/ momen spesial: SAR 1\.250/);
  assert.doesNotMatch(id, /High season|Low season/);
  // Rincian durasi, meeting point, dan catatan biaya tambahan dari materi.
  assert.match(id, /\(1,5 jam, 1 video\)/);
  assert.match(id, /\(3 jam, 1 video\)/);
  assert.match(id, /Meeting point Pelataran Masjidil Haram: Depan WC 3 \/ KFC Hilton Tower/);
  assert.match(id, /Meeting point Masjid Nabawi: Depan Pintu 333/);
  assert.match(id, /opsional SAR 50/);
  assert.match(id, /overtime ba'da Maghrib SAR 100 per jam/);
  assert.match(id, /tambahan video edit SAR 300 per video/);
});

test("materi memenuhi invarian jawaban Harga Indikatif", () => {
  for (const bahasa of ["id", "en"] as const) {
    const materi = susunMateriFoto(bahasa);
    if (bahasa === "id") {
      assert.match(materi, /Harga Indikatif/);
      assert.match(materi, /bukan penawaran final/);
      assert.match(materi, /dapat berubah[^.]*setelah diperiksa admin/i);
      assert.match(materi, /tim kami/);
      assert.match(materi, /satuan SAR per sesi/);
    } else {
      assert.match(materi, /Indicative Price/);
      assert.match(materi, /not a final offer/);
      assert.match(materi, /may change[^.]*after being reviewed by (our )?admin/i);
      assert.match(materi, /our team/);
      assert.doesNotMatch(materi, /Harga Indikatif/);
    }
    // Tidak mengklaim harga final, ketersediaan, atau transaksi.
    assert.doesNotMatch(
      materi,
      /(harga final|final price|fixed price|dijamin tersedia|guaranteed availability|pasti tersedia)/i,
    );
  }
});

test("tanpa lokasi, jawaban memuat daftar harga lengkap", () => {
  const jawaban = susunJawabanFoto("Berapa harga fotografer?", "id");
  assert.match(jawaban, /SAR 600/);
  assert.match(jawaban, /SAR 4\.500/);
  assert.match(jawaban, /Paket Spesial Ramadan/);
  assert.match(jawaban, /Depan Pintu 333/);
  assert.equal(jawaban, susunMateriFoto("id"));
});

test("kata kunci lokasi hanya menampilkan baris lokasi itu", () => {
  const nabawi = susunJawabanFoto("Berapa harga foto di Masjid Nabawi?", "id");
  assert.match(nabawi, /Masjid Nabawi — Sendiri \/ Couple: SAR 500 \(1,5 jam, 1 video\)/);
  assert.match(nabawi, /Masjid Nabawi — Family \/ lebih dari 2 pax: SAR 800/);
  assert.match(nabawi, /Meeting point Masjid Nabawi: Depan Pintu 333/);
  // Baris lokasi lain tidak bocor.
  assert.doesNotMatch(nabawi, /Masjidil Haram|Jabal Kudai|Al-Ula/);
  assert.doesNotMatch(nabawi, /SAR 600|SAR 1\.000|SAR 4\.500|SAR 900/);

  const makkah = susunJawabanFoto("harga sesi foto di Makkah berapa?", "id");
  assert.match(makkah, /Pelataran Masjidil Haram — Sendiri \/ Couple: SAR 600/);
  assert.match(makkah, /Pelataran Masjidil Haram — Family \/ lebih dari 2 pax: SAR 1\.000/);
  assert.doesNotMatch(makkah, /Masjid Nabawi|SAR 500|SAR 800/);

  const alula = susunJawabanFoto("harga foto al ula", "id");
  assert.match(alula, /Paket Al-Ula — Kamera Profesional: SAR 1\.250/);
  assert.match(alula, /Paket Al-Ula — Kamera iPhone \(min\. 15 Pro\): SAR 900/);
  assert.doesNotMatch(alula, /Nabawi|Makkah|Jabal/);
});

test("kata ramadan memilih baris Paket Spesial Ramadan sesuai lokasi", () => {
  const ramadan = susunJawabanFoto("harga foto ramadan di Masjid Nabawi?", "id");
  assert.match(ramadan, /Paket Spesial Ramadan — Masjid Nabawi: SAR 600/);
  assert.doesNotMatch(ramadan, /SAR 800|Sendiri \/ Couple/);

  const semuaRamadan = susunJawabanFoto("harga paket ramadan puasa", "id");
  assert.match(semuaRamadan, /Paket Spesial Ramadan — Al Ula: SAR 4\.500/);
  assert.doesNotMatch(semuaRamadan, /SAR 900|min\. 15 Pro/);
});

test("segmen couple dan keluarga menyaring baris peserta", () => {
  const keluarga = susunJawabanFoto("foto keluarga di Masjid Nabawi berapa?", "id");
  assert.match(keluarga, /Family \/ lebih dari 2 pax: SAR 800/);
  assert.doesNotMatch(keluarga, /SAR 500/);

  const couple = susunJawabanFoto("foto couple di Pelataran Masjidil Haram", "id");
  assert.match(couple, /Sendiri \/ Couple: SAR 600/);
  assert.doesNotMatch(couple, /SAR 1\.000/);

  // Segmen yang tidak punya baris pada lokasi itu tidak mengosongkan jawaban.
  const iphone = susunJawabanFoto("foto iphone di Masjid Nabawi", "id");
  assert.match(iphone, /Masjid Nabawi — Sendiri \/ Couple: SAR 500/);
});

test("lokasi tanpa baris reguler (akad) memakai baris Ramadan", () => {
  const akad = susunJawabanFoto("harga foto akad nikah berapa?", "id");
  assert.match(akad, /Paket Spesial Ramadan — Akad \/ momen spesial: SAR 1\.250/);
  assert.doesNotMatch(akad, /SAR 600|SAR 750/);
});

test("setiap angka jawaban per pesan ada verbatim di materi", () => {
  for (const pesan of [
    "Berapa harga fotografer?",
    "Berapa harga foto di Masjid Nabawi?",
    "harga foto paket ramadan di Makkah",
    "harga foto akad nikah berapa?",
    "foto keluarga di jabal kudai",
  ]) {
    for (const bahasa of ["id", "en"] as const) {
      const jawaban = susunJawabanFoto(pesan, bahasa);
      assert.ok(
        semuaAngkaAdaDiMateri(jawaban, susunMateriFoto(bahasa)),
        `${pesan}/${bahasa} memuat angka di luar materi`,
      );
    }
  }
});

test("jawaban fotografi berbahasa Inggris memakai label dan satuan Inggris", () => {
  const en = susunJawabanFoto("how much for a photo session in Madinah?", "en");
  assert.match(en, /Indicative Prices/);
  assert.match(en, /not a final offer/);
  assert.match(en, /unit SAR per session/);
  assert.match(en, /Masjid Nabawi — Solo \/ Couple: SAR 500 \(1.5 hours, 1 video\)/);
  assert.match(en, /SAR 4,500|SAR 800/);
  assert.doesNotMatch(en, /Harga Indikatif|penawaran/);
});
