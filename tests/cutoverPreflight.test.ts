/**
 * Tes perilaku terlihat pada antarmuka publik `evaluateCutoverReadiness` /
 * `formatCutoverReadiness`: penilaian kesiapan konfigurasi sebelum cutover ke
 * nomor produksi (tiket 06). Yang diuji adalah keluaran laporan yang dilihat
 * pemilik saat menjalankan `npm run cutover:check`, bukan struktur internal.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCutoverReadiness, formatCutoverReadiness } from "../src/cutoverPreflight.ts";

const envFonnteProduksi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 812 9000 1111",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

const envCloudProduksi: Record<string, string> = {
  WHATSAPP_PROVIDER: "whatsapp-cloud-api",
  WHATSAPP_SENDER_NUMBER: "+62 812 9000 1111",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_PHONE_NUMBER_ID: "PNID-PROD-9",
  WHATSAPP_API_TOKEN: "token-cloud",
  WHATSAPP_APP_SECRET: "app-secret",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

test("konfigurasi produksi yang lengkap dinyatakan siap dengan provider dan nomor pengirimnya", () => {
  const penilaian = evaluateCutoverReadiness(envFonnteProduksi);
  assert.equal(penilaian.ready, true);
  const detail = penilaian.checks.map((c) => c.detail).join("\n");
  assert.match(detail, /fonnte/);
  assert.match(detail, /6281290001111/);
});

test("konfigurasi produksi lengkap siap pada provider Cloud API", () => {
  const penilaian = evaluateCutoverReadiness(envCloudProduksi);
  assert.equal(penilaian.ready, true);
  const detail = penilaian.checks.map((c) => c.detail).join("\n");
  assert.match(detail, /whatsapp-cloud-api/);
});

test("nomor pengembangan yang tertinggal membuat cutover dinyatakan belum siap", () => {
  const penilaian = evaluateCutoverReadiness({
    ...envFonnteProduksi,
    WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  });
  assert.equal(penilaian.ready, false);
  const detail = penilaian.checks.map((c) => c.detail).join("\n");
  assert.match(detail, /nomor pengembangan/);
  assert.match(detail, /WHATSAPP_SENDER_NUMBER/);
});

test("konfigurasi provider yang tidak lengkap dinyatakan belum siap dengan variabel yang kurang", () => {
  const envTanpaToken: Record<string, string | undefined> = { ...envFonnteProduksi };
  delete envTanpaToken.WHATSAPP_API_TOKEN;
  const penilaian = evaluateCutoverReadiness(envTanpaToken);
  assert.equal(penilaian.ready, false);
  const detail = penilaian.checks.map((c) => c.detail).join("\n");
  assert.match(detail, /WHATSAPP_API_TOKEN/);
});

test("nomor pengembangan yang ditulis ulang formatnya tetap dikenali sebagai milik pengembangan", () => {
  const penilaian = evaluateCutoverReadiness({
    ...envCloudProduksi,
    WHATSAPP_SENDER_NUMBER: "62895-0700-3830",
  });
  assert.equal(penilaian.ready, false);
});

test("laporan kesiapan menyatakan siap dan menunjuk langkah manual di dokumen cutover", () => {
  const laporan = formatCutoverReadiness(evaluateCutoverReadiness(envFonnteProduksi));
  assert.match(laporan, /siap untuk uji end-to-end/);
  assert.match(laporan, /docs\/whatsapp-number-cutover\.md/);
  assert.match(laporan, /fonnte/);
});

test("laporan kesiapan menyatakan belum siap dengan pemeriksaan yang gagal", () => {
  const laporan = formatCutoverReadiness(
    evaluateCutoverReadiness({ ...envFonnteProduksi, WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830" }),
  );
  assert.match(laporan, /belum siap/);
  assert.match(laporan, /WHATSAPP_SENDER_NUMBER/);
  assert.match(laporan, /docs\/whatsapp-number-cutover\.md/);
});
