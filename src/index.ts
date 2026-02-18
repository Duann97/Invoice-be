import type { VercelRequest, VercelResponse } from "@vercel/node";
import { App } from "../src/app.js";

let server: any; // cache across invocations

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!server) {
      const appInstance = new App();
      server = appInstance.app; // express instance
    }
    return server(req as any, res as any);
  } catch (err) {
    console.error("[vercel handler error]", err);
    return res.status(500).json({
      message: "Server crashed",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
