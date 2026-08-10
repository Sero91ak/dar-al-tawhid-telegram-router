import { ROUTE_DEFINITIONS } from "../config/routing.js";
import type { TopicRouteRecord } from "../types/domain.js";

export function renderAdminHtml(input: {
  botStatus: "aktiv" | "inaktiv";
  telegramStatus: "verbunden" | "fehler";
  sourceConfigured: boolean;
  targetConfigured: boolean;
  routes: TopicRouteRecord[];
  activity: Array<{
    when: string;
    sourceMessageId: number;
    categories: string[];
    result: string;
  }>;
}) {
  const routeRows = ROUTE_DEFINITIONS.map((route) => {
    const current = input.routes.find((item) => item.category === route.category);
    return `
      <tr>
        <td>${route.title}</td>
        <td>${route.hashtags.map((tag) => `#${tag}`).join(", ")}</td>
        <td>${current?.threadId ?? "—"}</td>
        <td>${current ? "registriert" : "nicht registriert"}</td>
      </tr>
    `;
  }).join("");

  const activityRows = input.activity
    .map(
      (item) => `
      <tr>
        <td>${item.when}</td>
        <td>${item.sourceMessageId}</td>
        <td>${item.categories.join(", ")}</td>
        <td>${item.result}</td>
      </tr>
    `
    )
    .join("");

  return `<!doctype html>
  <html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DAR AL TAWḤĪD Telegram Router</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; }
      h1, h2 { margin-bottom: 8px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }
      .card { background: #111c33; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; }
      table { width: 100%; border-collapse: collapse; background: #111c33; border-radius: 16px; overflow: hidden; }
      th, td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; vertical-align: top; }
      th { background: #14213d; }
    </style>
  </head>
  <body>
    <h1>DAR AL TAWḤĪD<br />Telegram Router</h1>
    <div class="grid">
      <div class="card"><strong>BOT</strong><br />${input.botStatus}</div>
      <div class="card"><strong>TELEGRAM</strong><br />${input.telegramStatus}</div>
      <div class="card"><strong>HAUPTKANAL</strong><br />${input.sourceConfigured ? "konfiguriert" : "nicht konfiguriert"}</div>
      <div class="card"><strong>BIBLIOTHEK</strong><br />${input.targetConfigured ? "konfiguriert" : "nicht konfiguriert"}</div>
    </div>

    <h2>Routing-Tabelle</h2>
    <table>
      <thead>
        <tr><th>Fachbereich</th><th>Hashtags</th><th>Thread-ID</th><th>Status</th></tr>
      </thead>
      <tbody>${routeRows}</tbody>
    </table>

    <h2 style="margin-top: 24px;">Letzte Aktivitäten</h2>
    <table>
      <thead>
        <tr><th>Zeit</th><th>Quellnachricht</th><th>Kategorien</th><th>Ergebnis</th></tr>
      </thead>
      <tbody>${activityRows || `<tr><td colspan="4">Keine Aktivität</td></tr>`}</tbody>
    </table>
  </body>
  </html>`;
}
