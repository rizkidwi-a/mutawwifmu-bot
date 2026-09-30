import { test } from "node:test";
import assert from "node:assert/strict";
import { createFonnteSender } from "../../src/adapters/fonnte/sender.ts";
import type { FonnteConfig } from "../../src/config.ts";

const config: FonnteConfig = {
  provider: "fonnte",
  senderNumber: "6289507003830",
  apiBaseUrl: "https://api.example.test",
  apiToken: "token-rahasia",
  webhookVerifyToken: "verify-token",
  countryCode: "62",
};

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function stubFetch(status: number, muatan: unknown) {
  const requests: RecordedRequest[] = [];
  const fetchStub: typeof fetch = async (url, init) => {
    requests.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(JSON.stringify(muatan), { status });
  };
  return { requests, fetchStub };
}

const sukses = { detail: "success! message in queue", id: ["80367170"], process: "pending", status: true };

test("pesan keluar dikirim ke endpoint Fonnte dengan token dan kode negara dari konfigurasi", async () => {
  const { requests, fetchStub } = stubFetch(200, sukses);
  const sender = createFonnteSender(config, fetchStub);

  await sender.sendText("628123456789", "Halo dari MUTAWWIFMU");

  assert.equal(requests.length, 1);
  const req = requests[0]!;
  assert.equal(req.url, "https://api.example.test/send");
  assert.equal(req.method, "POST");
  assert.equal(req.headers.authorization, "token-rahasia");
  assert.deepEqual(req.body, {
    target: "628123456789",
    message: "Halo dari MUTAWWIFMU",
    countryCode: "62",
  });
});

test("Fonnte menolak pengiriman dengan status false dan alasannya dilaporkan", async () => {
  const { fetchStub } = stubFetch(200, { status: false, reason: "token invalid" });
  const sender = createFonnteSender(config, fetchStub);
  await assert.rejects(() => sender.sendText("628123456789", "Halo"), /token invalid/);
});

test("Fonnte menolak dengan huruf kapital pada field status tetap dianggap gagal", async () => {
  const { fetchStub } = stubFetch(200, { Status: false, reason: "target invalid" });
  const sender = createFonnteSender(config, fetchStub);
  await assert.rejects(() => sender.sendText("628123456789", "Halo"), /target invalid/);
});

test("respons HTTP gagal dari Fonnte menghasilkan error yang dapat dikenali", async () => {
  const { fetchStub } = stubFetch(500, { status: false, reason: "server error" });
  const sender = createFonnteSender(config, fetchStub);
  await assert.rejects(() => sender.sendText("628123456789", "Halo"), /500/);
});

test("respons Fonnte yang tidak dapat dibaca tidak dianggap terkirim", async () => {
  const fetchBukanJson: typeof fetch = async () => new Response("bukan json", { status: 200 });
  const sender = createFonnteSender(config, fetchBukanJson);
  await assert.rejects(() => sender.sendText("628123456789", "Halo"), /tidak dikenali/);
});
