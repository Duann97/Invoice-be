import cron from "node-cron";
import { PrismaClient } from "../generated/prisma/client.js";
import { RecurringService } from "../modules/recurring/recurring.service.js";

export class RecurringCron {
  private task: any;

  constructor(private prisma: PrismaClient) {}

  start() {
    const service = new RecurringService(this.prisma);

    this.task = cron.schedule("* * * * *", async () => {
      try {
        await service.runDue();
      } catch (e) {
        console.error("[recurring-cron] runDue error:", e);
      }
    });

    this.task.start();
    console.log("[recurring-cron] started: every minute");
  }

  stop() {
    if (this.task) this.task.stop();
  }
}
