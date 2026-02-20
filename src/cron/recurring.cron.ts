import cron from "node-cron";
import { PrismaClient } from "../generated/prisma/client.js";
import { RecurringService } from "../modules/recurring/recurring.service.js";

export class RecurringCron {
  private service: RecurringService;

  constructor(private prisma: PrismaClient) {
    this.service = new RecurringService(prisma);
  }

  start() {
    // setiap menit untuk testing
    cron.schedule("* * * * *", async () => {
      try {
        const r = await this.service.runDueRules();
        console.log("[recurring-cron] processed:", r.processed);
      } catch (e) {
        console.error("[recurring-cron] error:", e);
      }
    });
  }
}
