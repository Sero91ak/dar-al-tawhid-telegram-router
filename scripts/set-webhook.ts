import { Api } from "grammy";
import { loadConfig } from "../src/config/env.js";

async function main() {
  const config = loadConfig(process.env);
  if (!config.PUBLIC_BASE_URL) {
    throw new Error("PUBLIC_BASE_URL fehlt.");
  }

  const api = new Api(config.TELEGRAM_BOT_TOKEN);
  const baseUrl = config.PUBLIC_BASE_URL.replace(/\/$/, "");
  const webhookUrl = `${baseUrl}/telegram/webhook`;

  const result = await api.setWebhook(webhookUrl, {
    secret_token: config.WEBHOOK_SECRET,
    allowed_updates: ["message", "channel_post"]
  });

  if (!result) {
    throw new Error("Telegram setWebhook meldete keinen Erfolg.");
  }

  console.log(`Webhook gesetzt: ${webhookUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
