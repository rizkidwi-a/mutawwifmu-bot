import { test } from "node:test";
import assert from "node:assert/strict";
import { createFonnteInboundTransport } from "../../src/adapters/fonnte/webhook.ts";
import type { FonnteConfig } from "../../src/config.ts";

const config: FonnteConfig = {
  provider: "fonnte",
  senderNumber: "6289507003830",
  apiBaseUrl: "https://api.example.test",
  apiToken: "token-rahasia",
  webhookVerifyToken: "verify-token",
  countryCode: "62",
};

const urlWebhook = new URL("https://bot.example.test/webhook?token=verify-token");

/** Bentuk payload webhook Fonnte: datar, bukan amplop entry/changes seperti Cloud API. */
function payloadPesan(penyimpaan: Record<string, unknown> = {}): unknown {
  return {
    device: "6289507003830",
    sender: "628123456789",
    message: "Halo, saya ingin bertanya tentang umrah",
    name: "Budi",
    timestamp: "1727000000",
    inboxid: 12,
    ...penyimpaan,
  };
}

function request(body: unknown, url: URL = urlWebhook) {
  return { method: "POST", url, headers: {}, rawBody: Buffer.from(JSON.stringify(body), "utf8") };
}

test("payload webhook Fonnte dikonversi ke pesan masuk", async () => {
  const hasil = await createFonnteInboundTransport(config).readInbound(request(payloadPesan()));
  assert.deepEqual(hasil, {
    ok: true,
    messages: [
      {
        id: "12",
        from: "628123456789",
        timestamp: "1727000000",
        text: "Halo, saya ingin bertanya tentang umrah",
      },
    ],
  });
});

test("token webhook Fonnte yang tidak cocok ditolak tanpa memproses pesan", async () => {
  const urlSalah = new URL("https://bot.example.test/webhook?token=tebak-tebakan");
  const hasil = await createFonnteInboundTransport(config).readInbound(request(payloadPesan(), urlSalah));
  assert.deepEqual(hasil, { ok: false, status: 401, reason: "token webhook tidak sah" });
});

test("webhook tanpa token ditolak", async () => {
  const urlTanpaToken = new URL("https://bot.example.test/webhook");
  const hasil = await createFonnteInboundTransport(config).readInbound(request(payloadPesan(), urlTanpaToken));
  assert.equal(hasil.ok, false);
});

test("pesan non-teks Fonnte diteruskan tanpa isi teks", async () => {
  const hasil = await createFonnteInboundTransport(config).readInbound(
    request(payloadPesan({ message: undefined, location: "-7.98,112.62" })),
  );
  assert.deepEqual(hasil, {
    ok: true,
    messages: [{ id: "12", from: "628123456789", timestamp: "1727000000", text: null }],
  });
});

test("status perangkat dan status pengiriman Fonnte tidak menghasilkan pesan masuk", async () => {
  const transport = createFonnteInboundTransport(config);
  const statusPerangkat = await transport.readInbound(request({ device: "6289507003830", status: "CONNECTED" }));
  const statusPengiriman = await transport.readInbound(request({ id: "80367170", status: "DELIVERY" }));
  assert.deepEqual(statusPerangkat, { ok: true, messages: [] });
  assert.deepEqual(statusPengiriman, { ok: true, messages: [] });
});

test("pengirim grup dan pengirim tanpa nomor tidak dianggap calon jemaah", async () => {
  const transport = createFonnteInboundTransport(config);
  const grup = await transport.readInbound(request(payloadPesan({ sender: "1234567890-123456@g.us" })));
  const tanpaNomor = await transport.readInbound(request(payloadPesan({ sender: undefined })));
  assert.deepEqual(grup, { ok: true, messages: [] });
  assert.deepEqual(tanpaNomor, { ok: true, messages: [] });
});

test("Fonnte tidak punya handshake langganan webhook", () => {
  assert.equal(createFonnteInboundTransport(config).handleSubscription(urlWebhook), null);
});

test("badan webhook yang bukan JSON ditolak sebagai permintaan tidak sah", async () => {
  const hasil = await createFonnteInboundTransport(config).readInbound({
    method: "POST",
    url: urlWebhook,
    headers: {},
    rawBody: Buffer.from("<html>proxy error</html>", "utf8"),
  });
  assert.deepEqual(hasil, { ok: false, status: 400, reason: "badan permintaan bukan JSON" });
});
