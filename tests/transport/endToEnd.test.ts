import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { createAppServer } from "../../src/server.ts";
import { createTransport } from "../../src/adapters/factory.ts";
import { loadConfig } from "../../src/config.ts";
import { InMemoryConversationStore } from "../../src/conversationStore.ts";
import { InMemoryMetrics } from "../../src/metrics.ts";

const appSecret = "app-secret-untuk-tanda-tangan";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_PHONE_NUMBER_ID: "PNID-DEV-1",
  WHATSAPP_API_TOKEN: "token-rahasia",
  WHATSAPP_APP_SECRET: appSecret,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-token",
};

function payloadWebhookDari(nomorPengirim: string, teks: string): string {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "6289507003830", phone_number_id: "PNID-DEV-1" },
              messages: [
                {
                  from: nomorPengirim,
                  id: "wamid.IN.1",
                  timestamp: "1727000000",
                  type: "text",
                  text: { body: teks },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

function tandaTangan(rawBody: string): string {
  return "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
}

interface PermintaanKeluar {
  url: string;
  body: Record<string, unknown>;
}

interface Lingkungan {
  appUrl: string;
  permintaanKeluar: PermintaanKeluar[];
  tutup: () => Promise<void>;
}

async function dengarkan(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const alamat = server.address();
  assert.ok(alamat && typeof alamat === "object");
  return alamat.port;
}

async function tutup(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

/** Lingkungan transport penuh: server aplikasi + API provider palsu sebagai kanal keluar. */
async function buatLingkungan(): Promise<Lingkungan> {
  const permintaanKeluar: PermintaanKeluar[] = [];
  const apiProviderPalsu = createServer((req, res) => {
    const potongan: Buffer[] = [];
    req.on("data", (c: Buffer) => potongan.push(c));
    req.on("end", () => {
      permintaanKeluar.push({
        url: req.url ?? "",
        body: JSON.parse(Buffer.concat(potongan).toString("utf8")) as Record<string, unknown>,
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ messages: [{ id: "wamid.OUT" }] }));
    });
  });
  const portProvider = await dengarkan(apiProviderPalsu);

  const config = loadConfig({
    ...envKonfigurasi,
    WHATSAPP_API_BASE_URL: `http://127.0.0.1:${portProvider}/v21.0`,
  });
  const server = createAppServer({
    config,
    ...createTransport(config.whatsapp),
    conversations: new InMemoryConversationStore(),
    adminChannel: { deliver: () => {} },
    metrics: new InMemoryMetrics(),
    transcript: { record: () => {} },
  });
  const portApp = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${portApp}`,
    permintaanKeluar,
    tutup: async () => {
      await tutup(server);
      await tutup(apiProviderPalsu);
    },
  };
}

test("pesan masuk melalui kanal provider menghasilkan balasan keluar melalui kanal provider", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const rawBody = payloadWebhookDari("628123456789", "Halo, saya ingin bertanya tentang umrah");
    const respon = await fetch(`${lingkungan.appUrl}/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hub-signature-256": tandaTangan(rawBody) },
      body: rawBody,
    });

    assert.equal(respon.status, 200);
    assert.equal(lingkungan.permintaanKeluar.length, 1);
    const keluar = lingkungan.permintaanKeluar[0]!;
    assert.equal(keluar.url, "/v21.0/PNID-DEV-1/messages");
    assert.equal(keluar.body.to, "628123456789");
    const isi = keluar.body.text as { body: string };
    assert.match(isi.body, /Travel Partner Top #1 Personalized Land Arrangement/);
    assert.match(isi.body, /1\. Calon jemaah \/ informasi paket/);
    assert.match(isi.body, /4\. Keperluan lain \/ ingin menghubungi admin/);
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan dari nomor pengirim bot sendiri diabaikan tanpa balasan", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const rawBody = payloadWebhookDari("6289507003830", "Halo");
    const respon = await fetch(`${lingkungan.appUrl}/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hub-signature-256": tandaTangan(rawBody) },
      body: rawBody,
    });
    assert.equal(respon.status, 200);
    assert.equal(lingkungan.permintaanKeluar.length, 0);
  } finally {
    await lingkungan.tutup();
  }
});

test("webhook dengan tanda tangan salah ditolak tanpa membalas", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const rawBody = payloadWebhookDari("628123456789", "Halo");
    const respon = await fetch(`${lingkungan.appUrl}/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hub-signature-256": tandaTangan("badan-lain") },
      body: rawBody,
    });
    assert.equal(respon.status, 401);
    assert.equal(lingkungan.permintaanKeluar.length, 0);
  } finally {
    await lingkungan.tutup();
  }
});

test("handshake verifikasi webhook berjalan lewat server", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await fetch(
      `${lingkungan.appUrl}/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=999`,
    );
    assert.equal(respon.status, 200);
    assert.equal(await respon.text(), "999");

    const responSalah = await fetch(
      `${lingkungan.appUrl}/webhook?hub.mode=subscribe&hub.verify_token=salah&hub.challenge=999`,
    );
    assert.equal(responSalah.status, 403);
  } finally {
    await lingkungan.tutup();
  }
});
