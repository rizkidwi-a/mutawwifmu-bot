/**
 * Tes perilaku transkrip di seam server (tiket 08): payload Fonnte masuk →
 * dua baris CSV (calon jemaah lalu asisten) dengan isi dan urutan benar,
 * termasuk pesan berkoma/kutip/baris baru. CSV adalah catatan tambahan:
 * kegagalan menulisnya tidak boleh menggagalkan balasan bot.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../../src/server.ts";
import { createTransport } from "../../src/adapters/factory.ts";
import { loadConfig } from "../../src/config.ts";
import { InMemoryConversationStore } from "../../src/conversationStore.ts";
import { InMemoryMetrics } from "../../src/metrics.ts";
import {
  CsvConversationTranscript,
  type ConversationTranscript,
} from "../../src/conversationTranscript.ts";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

function payloadWebhook(nomorPengirim: string, teks: string): string {
  return JSON.stringify({
    device: "6289507003830",
    sender: nomorPengirim,
    message: teks,
    name: "Budi",
    timestamp: "1727000000",
    inboxid: 7,
  });
}

interface PermintaanKeluar {
  body: Record<string, unknown>;
}

interface Lingkungan {
  appUrl: string;
  permintaanKeluar: PermintaanKeluar[];
  transkripPath: string;
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

/** Lingkungan transport penuh dengan API Fonnte palsu dan transkrip CSV sungguhan. */
async function buatLingkungan(opsi: { transcript?: ConversationTranscript } = {}): Promise<Lingkungan> {
  const permintaanKeluar: PermintaanKeluar[] = [];
  const apiFonntePalsu = createServer((req, res) => {
    const potongan: Buffer[] = [];
    req.on("data", (c: Buffer) => potongan.push(c));
    req.on("end", () => {
      permintaanKeluar.push({
        body: JSON.parse(Buffer.concat(potongan).toString("utf8")) as Record<string, unknown>,
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ detail: "success! message in queue", id: ["1"], status: true }));
    });
  });
  const portFonnte = await dengarkan(apiFonntePalsu);

  const transkripPath = join(mkdtempSync(join(tmpdir(), "transkrip-")), "transkrip-percakapan.csv");
  const transcript = opsi.transcript ?? new CsvConversationTranscript(transkripPath);
  const config = loadConfig({ ...envKonfigurasi, WHATSAPP_API_BASE_URL: `http://127.0.0.1:${portFonnte}` });
  const server = createAppServer({
    config,
    ...createTransport(config.whatsapp),
    conversations: new InMemoryConversationStore(),
    adminChannel: { deliver: () => {} },
    metrics: new InMemoryMetrics(),
    transcript,
  });
  const portApp = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${portApp}`,
    permintaanKeluar,
    transkripPath,
    tutup: async () => {
      await tutup(server);
      await tutup(apiFonntePalsu);
    },
  };
}

async function kirimWebhook(lingkungan: Lingkungan, badan: string): Promise<Response> {
  return fetch(`${lingkungan.appUrl}/webhook?token=token-webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: badan,
  });
}

/** Pembaca CSV kecil untuk tes: mendukung kutip dan baris baru di dalam field. */
function bacaCsv(raw: string): string[][] {
  const teks = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  const baris: string[][] = [];
  let barisSekarang: string[] = [];
  let field = "";
  let dalamKutip = false;

  for (let i = 0; i < teks.length; i += 1) {
    const karakter = teks[i]!;
    if (dalamKutip) {
      if (karakter === '"' && teks[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (karakter === '"') {
        dalamKutip = false;
      } else {
        field += karakter;
      }
      continue;
    }
    if (karakter === '"') {
      dalamKutip = true;
    } else if (karakter === ",") {
      barisSekarang.push(field);
      field = "";
    } else if (karakter === "\r") {
      // bagian dari CRLF; baris ditutup pada \n
    } else if (karakter === "\n") {
      barisSekarang.push(field);
      baris.push(barisSekarang);
      barisSekarang = [];
      field = "";
    } else {
      field += karakter;
    }
  }
  if (field.length > 0 || barisSekarang.length > 0) {
    barisSekarang.push(field);
    baris.push(barisSekarang);
  }
  return baris;
}

test("pesan teks Fonnte tercatat dua baris CSV: masuk lalu keluar sesuai balasan terkirim", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const pesanMasuk = "Halo, saya ingin bertanya tentang umrah";
    const respon = await kirimWebhook(lingkungan, payloadWebhook("628123456789", pesanMasuk));
    assert.equal(respon.status, 200);
    assert.equal(lingkungan.permintaanKeluar.length, 1);

    const raw = readFileSync(lingkungan.transkripPath, "utf8");
    assert.ok(raw.startsWith("\uFEFF"), "berkas diawali BOM");
    const baris = bacaCsv(raw);

    assert.deepEqual(baris[0], ["waktu", "nomor", "peran", "pesan"]);
    assert.equal(baris.length, 3, "header + pesan masuk + balasan");

    const masuk = baris[1]!;
    assert.match(masuk[0]!, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(masuk[1], "628123456789");
    assert.equal(masuk[2], "calon-jemaah");
    assert.equal(masuk[3], pesanMasuk);

    const keluar = baris[2]!;
    assert.equal(keluar[1], "628123456789");
    assert.equal(keluar[2], "asisten");
    assert.equal(keluar[3], String(lingkungan.permintaanKeluar[0]!.body.message));
    assert.match(keluar[3]!, /MUTAWWIFMU/);
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan dengan koma, tanda kutip, dan baris baru tetap utuh di CSV", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const pesanMasuk = 'Harga "hotel", untuk 2 orang\nbaris kedua';
    const respon = await kirimWebhook(lingkungan, payloadWebhook("628123456789", pesanMasuk));
    assert.equal(respon.status, 200);

    const raw = readFileSync(lingkungan.transkripPath, "utf8");
    assert.match(raw, /""hotel""/, "tanda kutip di dalam digandakan");
    const baris = bacaCsv(raw);
    assert.equal(baris.length, 3);
    assert.equal(baris[1]![3], pesanMasuk, "isi pesan kembali utuh setelah dibaca");
  } finally {
    await lingkungan.tutup();
  }
});

test("kegagalan menulis transkrip tidak menggagalkan balasan bot dan dicatat ke log", async (t) => {
  const errorLog = t.mock.method(console, "error", () => {});
  const transkripRusak: ConversationTranscript = {
    record: () => {
      throw new Error("berkas transkrip tidak dapat ditulis");
    },
  };
  const lingkungan = await buatLingkungan({ transcript: transkripRusak });
  try {
    const respon = await kirimWebhook(lingkungan, payloadWebhook("628123456789", "Halo"));
    assert.equal(respon.status, 200);
    assert.equal(lingkungan.permintaanKeluar.length, 1, "balasan tetap dikirim");
    assert.ok(errorLog.mock.calls.length >= 1, "kegagalan dicatat ke log");
    for (const panggilan of errorLog.mock.calls) {
      assert.match(String(panggilan.arguments[0]), /transkrip/i);
    }
  } finally {
    await lingkungan.tutup();
  }
});
