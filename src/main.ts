/**
 * Entry point proses bot WhatsApp. Berjalan setiap saat; hentikan dengan SIGINT.
 */

import { createTransport } from "./adapters/factory.ts";
import { loadConfig } from "./config.ts";
import { createAppServer } from "./server.ts";

const config = loadConfig(process.env);
const { sender, inbound } = createTransport(config.whatsapp);
const server = createAppServer({ config, sender, inbound });

server.listen(config.port, () => {
  console.log(
    `Bot WhatsApp MUTAWWIFMU siap — provider ${config.whatsapp.provider}, ` +
      `nomor pengirim ${config.whatsapp.senderNumber}, port ${config.port}`,
  );
});
