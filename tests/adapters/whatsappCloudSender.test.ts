import { test } from "node:test";
import assert from "node:assert/strict";
import { createCloudApiSender } from "../../src/adapters/whatsapp-cloud/sender.ts";
import type { WhatsAppConfig } from "../../src/config.ts";

const config: WhatsAppConfig = {
  provider: "whatsapp-cloud-api",
  senderNumber: "6289507003830",
  phoneNumberId: "PNID-DEV-1",
  apiBaseUrl: "https://graph.example.test/v21.0",
  apiToken: "token-rahasia",
  appSecret: "app-secret",
  webhookVerifyToken: "verify-token",
};

interface PermintaanTerekam {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function fetchPerekam(status: number) {
  const permintaan: PermintaanTerekam[] = [];
  const fetchPalsu: typeof fetch = async (url, init) => {
    permintaan.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.OUT" }] }), { status });
  };
  return { permintaan, fetchPalsu };
}

test("pesan keluar dikirim ke endpoint pesan provider dengan identitas yang dikonfigurasi", async () => {
  const { permintaan, fetchPalsu } = fetchPerekam(200);
  const sender = createCloudApiSender(config, fetchPalsu);

  await sender.sendText("628123456789", "Halo dari MUTAWWIFMU");

  assert.equal(permintaan.length, 1);
  const req = permintaan[0]!;
  assert.equal(req.url, "https://graph.example.test/v21.0/PNID-DEV-1/messages");
  assert.equal(req.method, "POST");
  assert.equal(req.headers.authorization, "Bearer token-rahasia");
  assert.deepEqual(req.body, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "628123456789",
    type: "text",
    text: { preview_url: false, body: "Halo dari MUTAWWIFMU" },
  });
});

test("gagal kirim dari provider menghasilkan error yang dapat dikenali", async () => {
  const { fetchPalsu } = fetchPerekam(500);
  const sender = createCloudApiSender(config, fetchPalsu);
  await assert.rejects(() => sender.sendText("628123456789", "Halo"), /500/);
});
