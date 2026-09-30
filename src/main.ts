/**
 * Entry point proses bot WhatsApp. Berjalan setiap saat; hentikan dengan SIGINT.
 */

import { createTransport } from "./adapters/factory.ts";
import { LoggingAdminChannel } from "./adminChannel.ts";
import { loadConfig } from "./config.ts";
import { InMemoryConversationStore } from "./conversationStore.ts";
import { InMemoryMetrics } from "./metrics.ts";
import { createAppServer } from "./server.ts";

const config = loadConfig(process.env);
const { sender, inbound } = createTransport(config.whatsapp);

// Kanal admin masih sementara (logging). Gate pra-produksi: kanal penerimaan
// admin harus dikonfirmasi pemilik (dicatat sebagai ADR) sebelum handoff
// dipakai di produksi — lihat tiket 06 cutover produksi.
const adminChannel = new LoggingAdminChannel();
const conversations = new InMemoryConversationStore();
const metrics = new InMemoryMetrics();

const server = createAppServer({ config, sender, inbound, conversations, adminChannel, metrics });

server.listen(config.port, () => {
  console.log(
    `Bot WhatsApp MUTAWWIFMU siap — provider ${config.whatsapp.provider}, ` +
      `nomor pengirim ${config.whatsapp.senderNumber}, port ${config.port}`,
  );
});
