import { PrismaClient } from "../../generated/prisma/index.js";
import { UpdateProfileDTO } from "./dto/update-profile.dto.js";
import { CloudinaryService } from "../../utils/cloudinary.service.js";

export class ProfileService {
  private cloudinary = new CloudinaryService();

  constructor(private prisma: PrismaClient) {}

  // ✅ helper: bikin response FE-friendly (address = companyAddress)
  private toResponse(profile: any) {
    if (!profile) return profile;
    return {
      ...profile,
      address: profile.companyAddress ?? profile.address ?? null,
    };
  }

  async getOrCreate(userId: string) {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (existing) return this.toResponse(existing);

    const created = await this.prisma.userProfile.create({
      data: { userId },
    });

    return this.toResponse(created);
  }

  async update(
    userId: string,
    dto: UpdateProfileDTO,
    avatarFile?: Express.Multer.File,
  ) {
    const currentRaw = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const current = currentRaw
      ? currentRaw
      : await this.prisma.userProfile.create({ data: { userId } });

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

    // ✅ simpan ke field DB yang bener: companyAddress
    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        fullName: dto.fullName ?? current.fullName,
        companyName: dto.companyName ?? current.companyName,
        companyAddress: dto.address ?? current.companyAddress,
        avatarUrl,
      },
    });

    // ✅ balikkan dengan alias "address" biar FE kamu kebaca dan gak ilang pas refresh
    return this.toResponse(updated);
  }
}
