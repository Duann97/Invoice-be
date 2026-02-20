import { PrismaClient } from "../generated/prisma/client.js";
import { RecurringService } from "../modules/recurring/recurring.service.js";

export class RecurringCron {
  private timer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaClient) {}

  start() {
    const service = new RecurringService(this.prisma);

    // run once at boot
    service.runDue().catch(() => {});

    // run every 60 seconds
    this.timer = setInterval(async () => {
      try {
        await service.runDue();
      } catch (e) {
        // jangan crash app
      }
    }, 60_000);

    console.log("[cron] recurring cron started (every 60s)");
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
