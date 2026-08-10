import { loadConfig } from "../src/config/env.js";

try {
  const config = loadConfig(process.env);
  const warnings: string[] = [];

  if (config.NODE_ENV === "production" && !config.PUBLIC_BASE_URL) {
    warnings.push("PUBLIC_BASE_URL fehlt fuer Produktionsbetrieb.");
  }

  if (!config.ADMIN_WEB_USERNAME || !config.ADMIN_WEB_PASSWORD) {
    warnings.push("Admin-Webzugang ist nicht konfiguriert.");
  }

  console.log("ENV OK");
  console.log(`SOURCE_CHANNEL_ID=${config.SOURCE_CHANNEL_ID}`);
  console.log(`TARGET_FORUM_ID=${config.TARGET_FORUM_ID}`);
  console.log(`ROUTING_MODE=${config.ROUTING_MODE}`);
  console.log(`ADMIN_USER_IDS=${config.adminUserIds.length} Eintraege`);

  if (warnings.length > 0) {
    console.log("");
    console.log("WARNUNGEN:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
} catch (error) {
  console.error("ENV FEHLER");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
