import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { Percakapan, lengkapiPermintaanLaluSetujui, teksBalasan } from "./pembantuPercakapan.ts";

/**
 * Pesan yang langsung meminta persetujuan handoff (spec: "kasus diteruskan
 * kepada admin bila..."). Sejak tiket 10, pertanyaan non-urgent tidak ada di
 * daftar ini: pesannya masuk alur intake lebih dahulu agar tercatat pada
 * Ringkasan Kebutuhan (lihat `PERTANYAAN_HANDOFF` di bawah).
 */
const KASUS_HANDOFF: ReadonlyArray<readonly [pesan: string, alasan: string]> = [
  ["Saya mau bicara dengan manusia saja", "human-request"],
  ["tolong hubungkan saya dengan admin MUTAWWIFMU", "human-request"],
  ["saya ingin minta penawaran khusus untuk rombongan 20 orang", "custom-quote-or-availability"],
  ["kami dari PT Maju Jaya, agen travel, ingin bekerja sama", "agency-or-corporate"],
  ["kami sedang berada di Mekkah sekarang, jadwal hari ini berubah", "active-trip"],
  ["tolong, ada kecelakaan, ini keadaan darurat", "emergency"],
];

for (const [pesan, alasan] of KASUS_HANDOFF) {
  test(`pemicu ${alasan} meminta persetujuan untuk diteruskan ke admin`, () => {
    const percakapan = new Percakapan();
    const turn = percakapan.kirim(pesan);
    assert.deepEqual(turn.actions, []);
    const balasan = teksBalasan(turn);
    assert.match(balasan, /teruskan|diteruskan/i);
    assert.match(balasan, /setuju/i);
    assert.match(balasan, /customer service|penjualan|admin/i);
  });

  test(`pemicu ${alasan} diteruskan ke admin setelah persetujuan diberikan`, () => {
    const percakapan = new Percakapan();
    percakapan.kirim(pesan);
    const turn = percakapan.kirim("Ya, setuju");
    const handoff = turn.actions.find((a) => a.kind === "hand-off-to-admin");
    assert.ok(handoff && handoff.kind === "hand-off-to-admin");
    assert.equal(handoff.reason, alasan);
    assert.equal(handoff.request, null);
    assert.equal("history" in handoff, false);
    assert.match(teksBalasan(turn), /teruskan|diteruskan/i);
    assert.deepEqual(
      turn.actions.filter((a) => a.kind === "record-follow-up-request"),
      [],
    );
  });
}

test("penolakan persetujuan handoff tidak meneruskan informasi apa pun", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Saya mau bicara dengan manusia saja");
  const turn = percakapan.kirim("tidak, tidak usah");
  assert.deepEqual(turn.actions, []);
  assert.match(teksBalasan(turn), /tidak .{0,25}(diteruskan|teruskan)/i);
});

/**
 * Pertanyaan yang klasifikasinya tetap handoff (tervalidasi lewat
 * `classifyInbound`), tetapi datang sebagai pesan pertama: alurnya masuk
 * intake lebih dahulu supaya pesannya tercatat pada Ringkasan Kebutuhan
 * (tiket 10), bukan diteruskan ke admin tanpa isi.
 */
const PERTANYAAN_HANDOFF: ReadonlyArray<readonly [pesan: string, alasan: string]> = [
  ["berapa lama masa berlaku visa umrah?", "unsupported-question"],
  ["bisakah saya memesan paket umrah bulan depan?", "booking-or-payment"],
  ["apakah kamar hotel di Mekkah masih tersedia untuk Desember?", "custom-quote-or-availability"],
];

test("pertanyaan pemicu handoff dari awal masuk intake dan tercatat untuk admin", () => {
  for (const [pesan, alasan] of PERTANYAAN_HANDOFF) {
    assert.deepEqual(classifyInbound(pesan), { kind: "handoff", trigger: alasan }, pesan);
    const percakapan = new Percakapan();
    const awal = percakapan.kirim(pesan);
    assert.deepEqual(awal.actions, [], pesan);
    assert.match(teksBalasan(awal), /catat|noted/i, pesan);
    assert.doesNotMatch(teksBalasan(awal), /setuju|consent/i, pesan);

    const request = lengkapiPermintaanLaluSetujui(percakapan);
    assert.ok(request.notedQuestions.includes(pesan), pesan);
  }
});

test("konfirmasi handoff tidak menjanjikan waktu balasan admin", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Saya mau bicara dengan manusia saja");
  const balasan = teksBalasan(percakapan.kirim("ya"));
  assert.doesNotMatch(balasan, /(admin|tim)[^.]{0,30}(akan )?(membalas|menanggapi|merespon|respond)/i);
  assert.doesNotMatch(balasan, /dalam \d+ (jam|menit|hari)/i);
});

test("permintaan manusia saat pengumpulan tetap diminta persetujuan untuk diteruskan", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo, saya ingin konsultasi untuk merencanakan umrah");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  const menyela = percakapan.kirim("sebenarnya saya mau bicara dengan manusia saja");
  assert.deepEqual(menyela.actions, []);
  const balasan = teksBalasan(menyela);
  assert.match(balasan, /teruskan|diteruskan/i);
  assert.match(balasan, /setuju/i);
  const turn = percakapan.kirim("ya");
  const handoff = turn.actions.find((a) => a.kind === "hand-off-to-admin");
  assert.ok(handoff && handoff.kind === "hand-off-to-admin");
  assert.equal(handoff.reason, "human-request");
});

test("permintaan manusia dalam Bahasa Inggris dibalas dalam Bahasa Inggris", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Hello, I want to talk to a human please");
  const balasan = teksBalasan(turn);
  assert.match(balasan, /forward/i);
  assert.match(balasan, /consent/i);
  const lanjut = percakapan.kirim("yes");
  const handoff = lanjut.actions.find((a) => a.kind === "hand-off-to-admin");
  assert.ok(handoff && handoff.kind === "hand-off-to-admin");
  assert.equal(handoff.reason, "human-request");
});

test("sapaan biasa tetap dibalas sapaan tanpa handoff", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim("Halo, apa kabar?");
  assert.deepEqual(turn.actions, []);
  assert.match(teksBalasan(turn), /asisten otomatis/i);
});
