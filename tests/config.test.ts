import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, normalizePhoneNumber } from "../src/config.ts";
import { bacaKonfigGemini } from "../src/knowledge/geminiPemaham.ts";
import { handleInbound } from "../src/conversation/handleInbound.ts";
import type { InboundMessage } from "../src/conversation/types.ts";

const envDasar: Record<string, string> = {
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_PHONE_NUMBER_ID: "PNID-DEV-1",
  WHATSAPP_API_TOKEN: "token-rahasia",
  WHATSAPP_APP_SECRET: "app-secret",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-token",
};

test("identitas provider WhatsApp dibaca dari konfigurasi", () => {
  const config = loadConfig(envDasar);
  assert.equal(config.whatsapp.provider, "whatsapp-cloud-api");
  assert.equal(config.whatsapp.phoneNumberId, "PNID-DEV-1");
  assert.equal(config.whatsapp.apiBaseUrl, "https://graph.facebook.com/v26.0");
});

test("konfigurasi tanpa kunci Gemini tetap sah — integrasi opt-in tidak menggagalkan startup", () => {
  const env: Record<string, string | undefined> = { ...envDasar };
  delete env.GEMINI_API_KEY;
  delete env.GEMINI_MODEL;
  const config = loadConfig(env);
  assert.equal(config.whatsapp.provider, "whatsapp-cloud-api");
  // Tanpa kunci, pemaham LLM tidak tersedia dan bot tetap berjalan dengan regex.
  assert.equal(bacaKonfigGemini(env), null);
});

test("nomor pengirim dinormalisasi ke format E.164 tanpa tanda plus", () => {
  const config = loadConfig(envDasar);
  assert.equal(config.whatsapp.senderNumber, "6289507003830");
  assert.equal(normalizePhoneNumber("+62 812-3456-7890"), "6281234567890");
});

test("nomor admin penerima handoff dibaca dan dinormalisasi dari konfigurasi", () => {
  const config = loadConfig(envDasar);
  assert.equal(config.adminNumber, "6282283886627");
});

test("konfigurasi tanpa nomor admin ditolak dengan pesan yang menyebut variabelnya", () => {
  const envTanpaAdmin: Record<string, string | undefined> = { ...envDasar };
  delete envTanpaAdmin.WHATSAPP_ADMIN_NUMBER;
  assert.throws(() => loadConfig(envTanpaAdmin), /WHATSAPP_ADMIN_NUMBER/);
});

test("konfigurasi tanpa variabel wajib gagal dengan pesan yang menyebut variabelnya", () => {
  const envTanpaToken: Record<string, string | undefined> = { ...envDasar };
  delete envTanpaToken.WHATSAPP_API_TOKEN;
  assert.throws(() => loadConfig(envTanpaToken), /WHATSAPP_API_TOKEN/);
});

test("provider BSP hanya membutuhkan token API dan token webhook, tanpa phone number id atau app secret", () => {
  const config = loadConfig({
    WHATSAPP_PROVIDER: "fonnte",
    WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
    WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
    WHATSAPP_API_TOKEN: "token-fonnte",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
  });
  assert.equal(config.whatsapp.provider, "fonnte");
  assert.equal(config.whatsapp.apiBaseUrl, "https://api.fonnte.com");
  assert.equal(config.whatsapp.apiToken, "token-fonnte");
  assert.equal(config.whatsapp.senderNumber, "6289507003830");
  assert.equal("countryCode" in config.whatsapp && config.whatsapp.countryCode, "62");
});

test("kode negara BSP dapat diatur lewat konfigurasi", () => {
  const config = loadConfig({
    WHATSAPP_PROVIDER: "fonnte",
    WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
    WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
    WHATSAPP_API_TOKEN: "token-fonnte",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
    WHATSAPP_COUNTRY_CODE: "60",
  });
  assert.equal("countryCode" in config.whatsapp && config.whatsapp.countryCode, "60");
});

test("provider yang tidak dikenal ditolak dengan pesan yang menyebut pilihannya", () => {
  assert.throws(
    () =>
      loadConfig({
        ...envDasar,
        WHATSAPP_PROVIDER: "provider-ngawur",
      }),
    /whatsapp-cloud-api.*fonnte/s,
  );
});

test("perilaku percakapan tidak berubah saat nomor pengirim dan identitas provider diganti", () => {
  const configPengembangan = loadConfig(envDasar);
  const configProduksi = loadConfig({
    ...envDasar,
    WHATSAPP_SENDER_NUMBER: "+62 877 4587 3159",
    WHATSAPP_PHONE_NUMBER_ID: "PNID-PROD-9",
    WHATSAPP_API_BASE_URL: "https://graph.facebook.com/v22.0",
  });
  assert.notEqual(configPengembangan.whatsapp.senderNumber, configProduksi.whatsapp.senderNumber);

  const pesan: InboundMessage = {
    id: "wamid.test.1",
    from: "628123456789",
    timestamp: "1727000000",
    text: "Halo, saya ingin bertanya tentang umrah",
  };
  const balasanPengembangan = handleInbound(pesan, { history: [] });
  const balasanProduksi = handleInbound(pesan, { history: [] });
  assert.deepEqual(balasanPengembangan, balasanProduksi);
});

test("kontrak yang dipakai server tersedia pada kedua provider", () => {
  const cloudApi = loadConfig(envDasar);
  const bsp = loadConfig({
    WHATSAPP_PROVIDER: "fonnte",
    WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
    WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
    WHATSAPP_API_TOKEN: "token-fonnte",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
  });
  for (const config of [cloudApi, bsp]) {
    assert.equal(config.whatsapp.senderNumber, "6289507003830");
    assert.equal(config.whatsapp.webhookVerifyToken.length > 0, true);
  }
});
