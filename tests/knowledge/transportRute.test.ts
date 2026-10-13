/**
 * Tes data rute transportasi dan pencocokan kata kunci tujuan (fitur
 * harga-transportasi-per-rute). Sumber angka: tabel
 * `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`
 * (23 rute × 6 armada, SAR per kendaraan/per grup) yang menggantikan angka
 * BOOKLET (keputusan pemilik, 2026-10-13).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARMADA_URUT,
  RUTE_TRANSPORT,
  cocokkanRuteTransport,
  deteksiArmada,
  susunJawabanTransport,
  susunMateriTransport,
} from "../../src/knowledge/transportRute.ts";

function nomorRute(pesan: string): readonly string[] {
  return cocokkanRuteTransport(pesan).map((r) => r.nomor);
}

/**
 * Setiap kata kunci tujuan memicu tepat rute yang benar: sadar arah
 * ("dari X ke Y"), varian ejaan, rute komposit (via Badar, PP), serta rute
 * khusus (Taif, Ayesha/Jurana/Qarn Al Manzil, stasiun, ziarah, per jam).
 */
const KASUS_RUTE: ReadonlyArray<readonly [pesan: string, harapan: readonly string[]]> = [
  ["Berapa harga transportasi dari Jeddah Airport ke Makkah Hotel?", ["01"]],
  ["ongkos dari hotel makkah ke bandara jeddah berapa?", ["02"]],
  ["biaya transport dari mekkah ke madinah?", ["03"]],
  ["dari madinah ke mekkah berapa ongkos transportnya?", ["04"]],
  ["harga antar jemput dari bandara madinah ke hotel?", ["05"]],
  ["dari hotel madinah ke bandara madinah berapa?", ["06"]],
  ["transport dari bandara jeddah ke hotel madinah?", ["07"]],
  ["dari hotel madinah ke bandara jeddah berapa?", ["08"]],
  ["transportasi ziarah taif dari jeddah?", ["09"]],
  ["harga transport ke taif dari makkah?", ["10"]],
  ["berapa ongkos dari bandara jeddah ke hotel di jeddah?", ["11"]],
  ["dari hotel jeddah ke bandara jeddah?", ["12"]],
  ["transport dari makkah ke madinah lewat badar?", ["13"]],
  ["transport dari madinah ke mekkah lewat badar?", ["14"]],
  ["ongkos ziarah badar dari madinah?", ["14", "15"]],
  ["transport ke masjid ayesha dari hotel makkah?", ["16"]],
  ["berapa ongkos transport ke masjid jurana?", ["17"]],
  ["transport ke qarn al manzil berapa?", ["18"]],
  ["harga transport ke stasiun haramain dari hotel madinah?", ["19"]],
  ["dari stasiun kereta ke hotel di mekkah?", ["20"]],
  ["berapa harga transport ziarat makkah?", ["21"]],
  ["harga transport ziarah madinah?", ["22"]],
  ["harga sewa mobil per jam di makkah?", ["23"]],
  // Sebutan polos tanpa arah memunculkan seluruh rute yang memungkinkan.
  ["Berapa harga transportasi dari Jeddah?", ["01", "07", "11", "12"]],
  ["harga transportasi makkah madinah berapa?", ["03", "04"]],
  // Tanpa tujuan yang dikenali → tidak ada rute (jawabannya menu daftar rute).
  ["berapa ongkos transport selama disana?", []],
  ["berapa harga transportasi?", []],
  // Multi-kota dalam satu pertanyaan tidak dipaksakan ke satu rute.
  ["transport ke Jeddah-Makkah-Madinah-Jeddah berapa?", []],
];

for (const [pesan, harapan] of KASUS_RUTE) {
  test(`kata kunci "${pesan}" memicu rute ${harapan.join(",") || "(menu)"}`, () => {
    assert.deepEqual(nomorRute(pesan), harapan);
  });
}

test("tidak ada angka rute lain yang bocor ke jawaban rute terpicu", () => {
  const jawaban = susunJawabanTransport(
    "Berapa harga transportasi dari Jeddah Airport ke Makkah Hotel?",
    "id",
  );
  assert.match(jawaban, /Bandara Jeddah → Hotel Makkah/);
  assert.match(jawaban, /SAR 400/);
  assert.match(jawaban, /SAR 950/);
  // Rute dan angka lain tidak boleh muncul.
  assert.doesNotMatch(jawaban, /Hotel Makkah → Hotel Madinah/);
  assert.doesNotMatch(jawaban, /SAR 1\.350/);
  assert.doesNotMatch(jawaban, /SAR 1\.550/);
});

test("armada yang disebut pada pesan menyaring kolom harga", () => {
  assert.deepEqual(deteksiArmada("harga transport ziarah madinah pakai hiace?"), ["hiace"]);
  assert.deepEqual(deteksiArmada("transport makkah madinah pakai bus atau coaster?"), [
    "coaster",
    "bus",
  ]);
  const jawaban = susunJawabanTransport("harga transport ziarah madinah pakai hiace?", "id");
  assert.match(jawaban, /Ziarah Madinah: Hiace SAR 500/);
  assert.doesNotMatch(jawaban, /Camry|Staria|GMC|Coaster|Bus/);
});

test("jawaban per-rute memuat invarian Harga Indikatif pada kedua bahasa", () => {
  const kasus = [
    ["Berapa harga transportasi dari Jeddah Airport ke Makkah Hotel?", "id"],
    ["berapa harga transportasi?", "id"],
    ["How much is the transfer from Jeddah Airport to Makkah Hotel?", "en"],
    ["How much is transportation?", "en"],
  ] as const;
  for (const [pesan, bahasa] of kasus) {
    const jawaban = susunJawabanTransport(pesan, bahasa);
    if (bahasa === "id") {
      assert.match(jawaban, /Harga Indikatif/i, pesan);
      assert.match(jawaban, /bukan penawaran final/i, pesan);
      assert.match(jawaban, /dapat berubah[^.]*setelah diperiksa admin/i, pesan);
      assert.match(jawaban, /tim kami/i, pesan);
    } else {
      assert.match(jawaban, /Indicative Price/i, pesan);
      assert.match(jawaban, /not a final offer/i, pesan);
      assert.match(jawaban, /may change[^.]*after being reviewed by (our )?admin/i, pesan);
      assert.match(jawaban, /our team/i, pesan);
    }
    assert.doesNotMatch(jawaban, /(harga final|final price|fixed price|guaranteed availability)/i, pesan);
  }
});

test("pesan tanpa tujuan dikenali dibalas menu daftar rute, bukan seluruh angka", () => {
  for (const bahasa of ["id", "en"] as const) {
    const jawaban = susunJawabanTransport("berapa harga transportasi?", bahasa);
    assert.match(jawaban, /Rute yang tersedia|Available routes/);
    assert.doesNotMatch(jawaban, /SAR \d/);
    assert.match(jawaban, bahasa === "id" ? /bukan penawaran final/ : /not a final offer/);
  }
});

test("materi price-transport memuat seluruh 23 rute dengan angka tabel sumber", () => {
  assert.equal(RUTE_TRANSPORT.length, 23);
  const materiId = susunMateriTransport("id");
  const materiEn = susunMateriTransport("en");
  for (const rute of RUTE_TRANSPORT) {
    assert.ok(materiId.includes(`${rute.nomor}. ${rute.label.id}`), rute.nomor);
    assert.ok(materiEn.includes(`${rute.nomor}. ${rute.label.en}`), rute.nomor);
    for (const armada of ARMADA_URUT) {
      assert.ok(
        materiId.includes(`SAR ${rute.harga[armada].replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`),
        `${rute.nomor}/${armada}`,
      );
    }
  }
  // Spot check angka tabel sumber (2026-10-12).
  const r01 = RUTE_TRANSPORT[0];
  const r23 = RUTE_TRANSPORT[22];
  assert.ok(r01);
  assert.ok(r23);
  assert.deepEqual(r01.harga, { camry: "400", staria: "500", gmc: "650", hiace: "550", coaster: "800", bus: "950" });
  assert.deepEqual(r23.harga, { camry: "250", staria: "270", gmc: "350", hiace: "300", coaster: "350", bus: "350" });
  assert.match(materiId, /SAR 1\.950/);
  assert.match(materiEn, /SAR 1,950/);
});
