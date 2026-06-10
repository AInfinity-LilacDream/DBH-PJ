import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";

const server = app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
