import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  isSignatureValid,
  parseInboundMessages,
  verifySubscriptionQuery,
} from "../../src/adapters/whatsapp-cloud/webhook.ts";

const appSecret = "app-secret-untuk-tanda-tangan";

function tandaTangan(rawBody: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

/** Bentuk payload webhook WhatsApp Cloud API sesungguhnya. */
function payloadWebhook(messages: unknown[], statuses?: unknown[]): unknown {
  return {
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
              contacts: [{ profile: { name: "Budi" }, wa_id: "628123456789" }],
              ...(statuses ? { statuses } : {}),
              messages,
            },
          },
        ],
      },
    ],
  };
}

const pesanTeks = {
  from: "628123456789",
  id: "wamid.ABC",
  timestamp: "1727000000",
  type: "text",
  text: { body: "Halo, saya ingin bertanya tentang umrah" },
};

test("handshake webhook mengembalikan challenge saat verify token cocok", () => {
  const query = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": "verify-token",
    "hub.challenge": "12345",
  });
  assert.equal(verifySubscriptionQuery(query, "verify-token"), "12345");
});

test("handshake webhook ditolak saat verify token tidak cocok", () => {
  const query = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": "token-salah",
    "hub.challenge": "12345",
  });
  assert.equal(verifySubscriptionQuery(query, "verify-token"), null);
});

test("tanda tangan webhook yang sah diterima dan yang dipalsukan ditolak", () => {
  const rawBody = JSON.stringify(payloadWebhook([pesanTeks]));
  assert.equal(isSignatureValid(rawBody, tandaTangan(rawBody, appSecret), appSecret), true);
  assert.equal(isSignatureValid(rawBody, tandaTangan(rawBody, "secret-lain"), appSecret), false);
  assert.equal(isSignatureValid(rawBody + " ", tandaTangan(rawBody, appSecret), appSecret), false);
  assert.equal(isSignatureValid(rawBody, undefined, appSecret), false);
});

test("payload webhook dikonversi ke pesan masuk", () => {
  assert.deepEqual(parseInboundMessages(payloadWebhook([pesanTeks])), [
    {
      id: "wamid.ABC",
      from: "628123456789",
      timestamp: "1727000000",
      text: "Halo, saya ingin bertanya tentang umrah",
    },
  ]);
});

test("pesan non-teks diteruskan sebagai pesan tanpa isi teks", () => {
  const pesanGambar = { from: "628123456789", id: "wamid.IMG", timestamp: "1727000001", type: "image", image: {} };
  assert.deepEqual(parseInboundMessages(payloadWebhook([pesanGambar])), [
    { id: "wamid.IMG", from: "628123456789", timestamp: "1727000001", text: null },
  ]);
});

test("status pengiriman dan payload yang tidak dikenal tidak menghasilkan pesan masuk", () => {
  const payloadStatus = payloadWebhook([], [{ id: "wamid.ABC", status: "delivered" }]);
  assert.deepEqual(parseInboundMessages(payloadStatus), []);
  assert.deepEqual(parseInboundMessages({ object: "halaman-lain" }), []);
  assert.deepEqual(parseInboundMessages(null), []);
});
