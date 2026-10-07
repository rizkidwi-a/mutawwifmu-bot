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

/**
 * Graph API selalu menyertakan badan error berisi kode dan subkode yang
 * menentukan penyebab (mis. 131030 = penerima tidak ada di daftar uji).
 * Tanpa itu, semua kegagalan tampak sama sebagai "HTTP 400" dan sulit
 * ditelusuri di log proses.
 */
function fetchPerekamBody(status: number, body: unknown) {
  const permintaan: PermintaanTerekam[] = [];
  const fetchPalsu: typeof fetch = async (url, init) => {
    permintaan.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(JSON.stringify(body), { status });
  };
  return { permintaan, fetchPalsu };
}

test("kegagalan Graph API memuat kode dan alasan Meta, bukan hanya status HTTP", async () => {
  const { fetchPalsu } = fetchPerekamBody(400, {
    error: {
      message: "(#131030) Recipient phone number not in allowed list",
      type: "OAuthException",
      code: 131030,
      error_subcode: 2655007,
      fbtrace_id: "AbCdEf123",
    },
  });
  const sender = createCloudApiSender(config, fetchPalsu);

  await assert.rejects(
    () => sender.sendText("628123456789", "Halo"),
    (error: unknown) => {
      const pesan = error instanceof Error ? error.message : String(error);
      assert.match(pesan, /HTTP 400/);
      assert.match(pesan, /131030/);
      assert.match(pesan, /Recipient phone number not in allowed list/);
      return true;
    },
  );
});

test("badan error non-JSON tidak membuat errorhandling melempar", async () => {
  const fetchPalsu: typeof fetch = async () => new Response("<html>502 Bad Gateway</html>", { status: 502 });
  const sender = createCloudApiSender(config, fetchPalsu);

  await assert.rejects(
    () => sender.sendText("628123456789", "Halo"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /HTTP 502/);
      return true;
    },
  );
});

test("token dan isi pesan tidak bocor ke pesan error", async () => {
  const { fetchPalsu } = fetchPerekamBody(401, {
    error: { message: "Invalid OAuth access token", code: 190 },
  });
  const sender = createCloudApiSender(config, fetchPalsu);

  await assert.rejects(
    () => sender.sendText("628123456789", "rahasia-jemaah-1234"),
    (error: unknown) => {
      const pesan = error instanceof Error ? error.message : String(error);
      assert.doesNotMatch(pesan, /token-rahasia/);
      assert.doesNotMatch(pesan, /rahasia-jemaah-1234/);
      return true;
    },
  );
});
