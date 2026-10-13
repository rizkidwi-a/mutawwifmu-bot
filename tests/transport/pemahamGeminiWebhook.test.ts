/**
 * Jalur webhook dengan pemaham Gemini aktif (tiket 01): satu pesan teks calon
 * jemaah memakai hasil klasifikasi valid dengan paling banyak satu request,
 * sementara pesan non-teks, pesan admin, dan kontak yang dijeda tidak
 * mengirim request apa pun. Seluruh request memakai fetch tiruan.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { createAppServer } from "../../src/server.ts";
import { createTransport } from "../../src/adapters/factory.ts";
import { loadConfig } from "../../src/config.ts";
import { buatKlasifikatorPesan } from "../../src/conversation/klasifikasiMasuk.ts";
import { InMemoryConversationStore, type ConversationStore } from "../../src/conversationStore.ts";
import { faqAnswer } from "../../src/knowledge/businessFaq.ts";
import { InMemoryMetrics } from "../../src/metrics.ts";
import { JedaStorePalsu, type OpsiJedaPalsu } from "../pembantuJeda.ts";
import { Percakapan } from "../conversation/pembantuPercakapan.ts";

const appSecret = "app-secret-untuk-tanda-tangan";
const NOMOR_CALON_JEMAAH = "628123456789";
const NOMOR_ADMIN = "6282283886627";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_PHONE_NUMBER_ID: "PNID-DEV-1",
  WHATSAPP_API_TOKEN: "token-rahasia",
  WHATSAPP_APP_SECRET: appSecret,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-token",
};

interface ItemPesan {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string };
}

function payloadWebhook(item: ItemPesan): string {
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
              messages: [item],
            },
          },
        ],
      },
    ],
  });
}

function pesanTeks(teks: string): ItemPesan {
  return {
    from: NOMOR_CALON_JEMAAH,
    id: "wamid.IN.1",
    timestamp: "1727000000",
    type: "text",
    text: { body: teks },
  };
}

function tandaTangan(rawBody: string): string {
  return "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
}

interface Lingkungan {
  appUrl: string;
  /** Pesan keluar yang dikirim ke provider (untuk memeriksa balasan). */
  balasanTerkirim: string[];
  fetchDipanggil: string[];
  conversations: ConversationStore;
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

interface OpsiLingkungan {
  readonly responsModel?: string;
  readonly jeda?: OpsiJedaPalsu;
  readonly mulaiDariPercakapanAktif?: boolean;
}

/** Lingkungan webhook dengan pemaham Gemini tiruan (fetch mock) yang aktif. */
async function buatLingkungan(opsi: OpsiLingkungan = {}): Promise<Lingkungan> {
  const balasanTerkirim: string[] = [];
  const fetchDipanggil: string[] = [];
  const apiProviderPalsu = createServer((req, res) => {
    const potongan: Buffer[] = [];
    req.on("data", (c: Buffer) => potongan.push(c));
    req.on("end", () => {
      const badan = JSON.parse(Buffer.concat(potongan).toString("utf8")) as {
        text?: { body?: string };
      };
      if (typeof badan.text?.body === "string") balasanTerkirim.push(badan.text.body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ messages: [{ id: "wamid.OUT" }] }));
    });
  });
  const portProvider = await dengarkan(apiProviderPalsu);

  const config = loadConfig({
    ...envKonfigurasi,
    WHATSAPP_API_BASE_URL: `http://127.0.0.1:${portProvider}/v21.0`,
  });
  const conversations = new InMemoryConversationStore();
  if (opsi.mulaiDariPercakapanAktif === true) {
    // Setelah pembuka dan menu tujuan: seam sedang mengumpulkan Permintaan
    // Tindak Lanjut, sehingga hasil klasifikasi pesan berikutnya terlihat.
    conversations.save(NOMOR_CALON_JEMAAH, new Percakapan().konteks);
  }
  const klasifikasiPesan = buatKlasifikatorPesan(
    { apiKey: "kunci-tes", model: "model-tes" },
    {
      fetchFn: (async (url: unknown) => {
        fetchDipanggil.push(String(url));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text:
                        opsi.responsModel ??
                        '{"rute":"indicative-price","topik":"price-hotel","keyakinan":0.85}',
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      }) as typeof fetch,
      timeoutMs: 500,
      tenggatMs: 2000,
    },
  );
  const server = createAppServer({
    config,
    ...createTransport(config.whatsapp),
    conversations,
    adminChannel: { deliver: () => {} },
    metrics: new InMemoryMetrics(),
    transcript: { record: () => {} },
    jeda: new JedaStorePalsu(opsi.jeda),
    klasifikasiPesan,
  });
  const portApp = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${portApp}`,
    balasanTerkirim,
    fetchDipanggil,
    conversations,
    tutup: async () => {
      await tutup(server);
      await tutup(apiProviderPalsu);
    },
  };
}

async function kirimWebhook(lingkungan: Lingkungan, item: ItemPesan): Promise<Response> {
  const rawBody = payloadWebhook(item);
  return fetch(`${lingkungan.appUrl}/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": tandaTangan(rawBody) },
    body: rawBody,
  });
}

test("pesan teks memakai hasil Gemini yang valid dengan satu request saja", async () => {
  const lingkungan = await buatLingkungan({ mulaiDariPercakapanAktif: true });
  try {
    const respon = await kirimWebhook(lingkungan, pesanTeks("yang di makkah semalamnya berapa ya"));
    assert.equal(respon.status, 200);
    assert.equal(lingkungan.fetchDipanggil.length, 1, "paling satu request Gemini per pesan");
    // Regex menjawab pesan ini sebagai handoff; hasil model mengarahkannya ke
    // template Harga Indikatif — membuktikan hasil klasifikasi yang dipakai.
    assert.equal(lingkungan.balasanTerkirim.length, 1);
    assert.ok(lingkungan.balasanTerkirim[0]!.startsWith(faqAnswer("price-hotel", "id")));
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan non-teks tidak mengirim request ke pemaham", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await kirimWebhook(lingkungan, {
      from: NOMOR_CALON_JEMAAH,
      id: "wamid.IN.2",
      timestamp: "1727000000",
      type: "image",
      image: { id: "media-1" },
    });
    assert.equal(respon.status, 200);
    assert.deepEqual(lingkungan.fetchDipanggil, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan admin tidak mengirim request ke pemaham", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await kirimWebhook(lingkungan, { ...pesanTeks("halo"), from: NOMOR_ADMIN });
    assert.equal(respon.status, 200);
    // Pesan dari nomor admin non-perintah memang diproses seam, tetapi tidak
    // pernah dikirim ke pemaham.
    assert.deepEqual(lingkungan.fetchDipanggil, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan dari kontak yang dijeda tidak mengirim request ke pemaham", async () => {
  const lingkungan = await buatLingkungan({ jeda: { dijeda: [NOMOR_CALON_JEMAAH] } });
  try {
    const respon = await kirimWebhook(lingkungan, pesanTeks("yang di makkah semalamnya berapa ya"));
    assert.equal(respon.status, 200);
    assert.deepEqual(lingkungan.fetchDipanggil, []);
    assert.deepEqual(lingkungan.balasanTerkirim, [], "gerbang jeda tetap menahan balasan");
  } finally {
    await lingkungan.tutup();
  }
});

test("kegagalan pemaham tidak menahan webhook: balasan tetap dari hasil regex", async () => {
  const lingkungan = await buatLingkungan({
    mulaiDariPercakapanAktif: true,
    responsModel: "bukan json sama sekali",
  });
  try {
    const respon = await kirimWebhook(lingkungan, pesanTeks("yang jagain jamaah selama ibadah namanya apa ya"));
    assert.equal(respon.status, 200);
    assert.equal(lingkungan.balasanTerkirim.length, 1);
    assert.match(lingkungan.balasanTerkirim[0]!, /pertanyaan Anda saya catat/);
  } finally {
    await lingkungan.tutup();
  }
});
