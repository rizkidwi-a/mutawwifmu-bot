import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createAppServer } from "../../src/server.ts";
import { createTransport } from "../../src/adapters/factory.ts";
import { loadConfig } from "../../src/config.ts";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
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
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface Lingkungan {
  appUrl: string;
  permintaanKeluar: PermintaanKeluar[];
  /** Balasan yang dikirim API Fonnte palsu; dipakai untuk mensimulasikan penolakan. */
  aturBalasanFonnte: (body: unknown) => void;
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

/** Lingkungan transport penuh: server aplikasi + API Fonnte palsu sebagai kanal keluar. */
async function buatLingkungan(balasanFonnte: unknown = { detail: "success! message in queue", id: ["1"], status: true }): Promise<Lingkungan> {
  const permintaanKeluar: PermintaanKeluar[] = [];
  let balasan = balasanFonnte;
  const apiFonntePalsu = createServer((req, res) => {
    const potongan: Buffer[] = [];
    req.on("data", (c: Buffer) => potongan.push(c));
    req.on("end", () => {
      permintaanKeluar.push({
        url: req.url ?? "",
        headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v ?? "")])),
        body: JSON.parse(Buffer.concat(potongan).toString("utf8")) as Record<string, unknown>,
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(balasan));
    });
  });
  const portFonnte = await dengarkan(apiFonntePalsu);

  const config = loadConfig({ ...envKonfigurasi, WHATSAPP_API_BASE_URL: `http://127.0.0.1:${portFonnte}` });
  const server = createAppServer({ config, ...createTransport(config.whatsapp) });
  const portApp = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${portApp}`,
    permintaanKeluar,
    aturBalasanFonnte: (body: unknown) => {
      balasan = body;
    },
    tutup: async () => {
      await tutup(server);
      await tutup(apiFonntePalsu);
    },
  };
}

async function kirimWebhook(lingkungan: Lingkungan, token: string, badan: string) {
  return fetch(`${lingkungan.appUrl}/webhook?token=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: badan,
  });
}

test("pesan masuk Fonnte menghasilkan balasan keluar melalui API Fonnte", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await kirimWebhook(
      lingkungan,
      "token-webhook",
      payloadWebhook("628123456789", "Halo, saya ingin bertanya tentang umrah"),
    );

    assert.equal(respon.status, 200);
    assert.equal(lingkungan.permintaanKeluar.length, 1);
    const keluar = lingkungan.permintaanKeluar[0]!;
    assert.equal(keluar.url, "/send");
    assert.equal(keluar.headers.authorization, "token-fonnte");
    assert.equal(keluar.body.target, "628123456789");
    assert.equal(keluar.body.countryCode, "62");
    assert.match(String(keluar.body.message), /asisten otomatis/i);
    assert.match(String(keluar.body.message), /MUTAWWIFMU/);
  } finally {
    await lingkungan.tutup();
  }
});

test("webhook Fonnte dengan token salah ditolak tanpa membalas", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await kirimWebhook(lingkungan, "tebak-tebakan", payloadWebhook("628123456789", "Halo"));
    assert.equal(respon.status, 401);
    assert.equal(lingkungan.permintaanKeluar.length, 0);
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan dari nomor pengirim bot sendiri diabaikan tanpa balasan", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await kirimWebhook(lingkungan, "token-webhook", payloadWebhook("6289507003830", "Halo"));
    assert.equal(respon.status, 200);
    assert.equal(lingkungan.permintaanKeluar.length, 0);
  } finally {
    await lingkungan.tutup();
  }
});

test("Fonnte tidak menyediakan handshake webhook sehingga GET tidak dioli", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await fetch(`${lingkungan.appUrl}/webhook?token=token-webhook`);
    assert.equal(respon.status, 404);
  } finally {
    await lingkungan.tutup();
  }
});

test("penolakan Fonnte saat pengiriman menghasilkan 500 tanpa membocorkan isi ke pemanggil", async () => {
  const lingkungan = await buatLingkungan({ status: false, reason: "token invalid" });
  try {
    const respon = await kirimWebhook(
      lingkungan,
      "token-webhook",
      payloadWebhook("628123456789", "Halo, saya ingin bertanya tentang umrah"),
    );
    assert.equal(respon.status, 500);
    assert.deepEqual(await respon.json(), { error: "internal" });
    // Permintaan tetap dikirim ke Fonnte meski ditolak, sehingga penyebabnya terlihat di log server.
    assert.equal(lingkungan.permintaanKeluar.length, 1);
  } finally {
    await lingkungan.tutup();
  }
});
