import "reflect-metadata";
import { App } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { RecurringCron } from "./cron/recurring.cron.js";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

const main = async () => {
  const app = new App();
  app.start();

  // ===== START RECURRING CRON =====
  try {
    const recurringCron = new RecurringCron(prisma);
    recurringCron.start();
  } catch (err) {
    console.error("[cron] Failed to start recurring cron:", err);
  }
};

main();
