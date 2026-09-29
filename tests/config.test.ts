import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, normalizePhoneNumber } from "../src/config.ts";
import { handleInbound } from "../src/conversation/handleInbound.ts";
import type { InboundMessage } from "../src/conversation/types.ts";

const envDasar: Record<string, string> = {
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_PHONE_NUMBER_ID: "PNID-DEV-1",
  WHATSAPP_API_TOKEN: "token-rahasia",
  WHATSAPP_APP_SECRET: "app-secret",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-token",
};

test("identitas provider WhatsApp dibaca dari konfigurasi", () => {
  const config = loadConfig(envDasar);
  assert.equal(config.whatsapp.provider, "whatsapp-cloud-api");
  assert.equal(config.whatsapp.phoneNumberId, "PNID-DEV-1");
  assert.equal(config.whatsapp.apiBaseUrl, "https://graph.facebook.com/v21.0");
});

test("nomor pengirim dinormalisasi ke format E.164 tanpa tanda plus", () => {
  const config = loadConfig(envDasar);
  assert.equal(config.whatsapp.senderNumber, "6289507003830");
  assert.equal(normalizePhoneNumber("+62 812-3456-7890"), "6281234567890");
});

test("konfigurasi tanpa variabel wajib gagal dengan pesan yang menyebut variabelnya", () => {
  const envTanpaToken: Record<string, string | undefined> = { ...envDasar };
  delete envTanpaToken.WHATSAPP_API_TOKEN;
  assert.throws(() => loadConfig(envTanpaToken), /WHATSAPP_API_TOKEN/);
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
