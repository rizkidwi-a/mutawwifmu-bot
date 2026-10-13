/**
 * Hasil klasifikasi yang sudah dihitung (`InboundRouting`) disuntikkan ke seam
 * `handleInbound` (tiket 01): semua keputusan percakapan untuk pesan itu memakai
 * hasil yang sama, termasuk saat riwayat diputar ulang untuk pesan berikutnya.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Percakapan, lengkapiPermintaanLaluSetujui, teksBalasan } from "./pembantuPercakapan.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { faqAnswer } from "../../src/knowledge/businessFaq.ts";

const PERTANYAAN_HARGA = "yang di makkah semalamnya berapa ya";
const PERTANYAAN_LAYANAN = "yang jagain jamaah selama ibadah namanya apa ya";

test("hasil klasifikasi yang dihitung dipakai untuk jawaban Harga Indikatif", () => {
  // Regex tidak mengenali pesan ini sebagai pertanyaan harga; hasil klasifikasi
  // yang sudah dihitung mengarahkannya ke template Harga Indikatif.
  assert.equal(classifyInbound(PERTANYAAN_HARGA).kind, "handoff");
  const percakapan = new Percakapan();
  const turn = percakapan.kirim(PERTANYAAN_HARGA, {
    kind: "indicative-price",
    topic: "price-hotel",
  });
  assert.ok(
    teksBalasan(turn).startsWith(faqAnswer("price-hotel", "id")),
    "jawaban harus persis template manual, bukan teks model",
  );
  assert.deepEqual(turn.actions, [{ kind: "record-faq-answer", topic: "price-hotel" }]);
});

test("pertanyaan non-harga yang dikenali hasil klasifikasi tetap dicatat untuk admin", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim(PERTANYAAN_LAYANAN, {
    kind: "faq",
    topic: "mutawwif",
  });
  assert.match(teksBalasan(turn), /pertanyaan Anda saya catat/);
  // Lengkapi Permintaan Tindak Lanjut; pertanyaannya harus terbawa apa adanya.
  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.deepEqual(request.notedQuestions, [PERTANYAAN_LAYANAN]);
});

test("riwayat memakai hasil klasifikasi giliran itu, bukan klasifikasi ulang", () => {
  // Pertanyaan harga dijawab dari template dan tidak dicatat sebagai pertanyaan.
  // Bila riwayat diklasifikasi ulang dengan regex, pesan ini justru akan muncul
  // sebagai pertanyaan yang dicatat pada Ringkasan Kebutuhan.
  const percakapan = new Percakapan();
  percakapan.kirim(PERTANYAAN_HARGA, {
    kind: "indicative-price",
    topic: "price-hotel",
  });
  const request = lengkapiPermintaanLaluSetujui(percakapan);
  assert.deepEqual(request.notedQuestions, []);
  assert.deepEqual(request.changeNotes, []);
});

test("tanpa hasil klasifikasi, seam tetap sinkron dan deterministik memakai regex", () => {
  const percakapan = new Percakapan();
  const turn = percakapan.kirim(PERTANYAAN_LAYANAN);
  assert.deepEqual(classifyInbound(PERTANYAAN_LAYANAN), {
    kind: "handoff",
    trigger: "unsupported-question",
  });
  assert.match(teksBalasan(turn), /pertanyaan Anda saya catat/);
});
