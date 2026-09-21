import { buildApp } from "./app.js";
import { config } from "./config.js";

async function main() {
  const app = await buildApp();
  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
