import { Request, Response } from "express";
import { ProfileService } from "./profile.service.js";

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  getProfile = async (_req: Request, res: Response) => {
    const userId = (res.locals.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const profile = await this.profileService.getOrCreate(userId);
    return res.status(200).json({ data: profile });
  };

  updateProfile = async (req: Request, res: Response) => {
    const userId = (res.locals.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;

    const body = (req.body ?? {}) as any;

    const profile = await this.profileService.update(userId, body, file);
    return res.status(200).json({ message: "Profile updated", data: profile });
  };
}
