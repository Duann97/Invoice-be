import { PrismaClient } from "../../generated/prisma/index.js";
import { UpdateProfileDTO } from "./dto/update-profile.dto.js";
import { CloudinaryService } from "../../utils/cloudinary.service.js";

export class ProfileService {
  private cloudinary = new CloudinaryService();

  constructor(private prisma: PrismaClient) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return await this.prisma.userProfile.create({
      data: { userId },
    });
  }

  async update(
    userId: string,
    dto: UpdateProfileDTO,
    avatarFile?: Express.Multer.File,
  ) {
    const current = await this.getOrCreate(userId);

    let avatarUrl = current.avatarUrl ?? undefined;

    if (avatarFile) {
      const uploadedUrl = await this.cloudinary.upload(
        avatarFile,
        "invoice-app/avatars",
      );

      if (avatarUrl) {
        try {
          await this.cloudinary.remove(avatarUrl);
        } catch {}
      }

      avatarUrl = uploadedUrl;
    }

    return await this.prisma.userProfile.update({
      where: { userId },
      data: {
        fullName: dto.fullName ?? current.fullName,
        companyName: dto.companyName ?? current.companyName,
        companyAddress: dto.address ?? current.companyAddress,
        avatarUrl,
      },
    });
  }
}
