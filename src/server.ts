import { createApp } from "./app.js";

const { app, config } = await createApp(process.env);

await app.listen({
  host: "0.0.0.0",
  port: config.PORT
});
