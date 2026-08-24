import { Api } from "grammy";
import { loadConfig } from "../src/config/env.js";

async function main() {
  const config = loadConfig(process.env);
  const api = new Api(config.TELEGRAM_BOT_TOKEN);
  const result = await api.deleteWebhook({
    drop_pending_updates: false
  });

  if (!result) {
    throw new Error("Telegram deleteWebhook meldete keinen Erfolg.");
  }

  console.log("Webhook entfernt.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
