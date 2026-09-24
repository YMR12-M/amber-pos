import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./config/db";

async function start() {
  // Fail loudly at boot rather than on the first request.
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  } catch (err) {
    console.error("فشل الاتصال بقاعدة البيانات:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`POS backend running on http://localhost:${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("فشل تشغيل السيرفر:", err);
  process.exit(1);
});
