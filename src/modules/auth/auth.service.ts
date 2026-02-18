import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma/client.js";

import {
  BASE_URL_FE,
  JWT_SECRET,
  JWT_SECRET_VERIFY,
} from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { MailService } from "../mail/mail.service.js";

import { LoginDTO } from "./dto/login.dto.js";
import { RegisterDTO } from "./dto/register.dto.js";

type VerifyPayload = { id: string; type?: string };

export class AuthService {
  private mailService: MailService;

  constructor(private prisma: PrismaClient) {
    this.mailService = new MailService();
  }

  register = async (body: RegisterDTO) => {
    if (!JWT_SECRET_VERIFY)
      throw new ApiError("JWT_SECRET_VERIFY is not set", 500);
    if (!BASE_URL_FE) throw new ApiError("BASE_URL_FE is not set", 500);

    const exists = await this.prisma.user.findFirst({
      where: { email: body.email },
      select: { id: true },
    });

    if (exists) throw new ApiError("Email already exists", 400);

    const hashedPassword = await hashPassword(body.password);

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hashedPassword,
        isEmailVerified: false,
      },
      select: { id: true, email: true },
    });

    const token = jwt.sign(
      { id: user.id, type: "emailVerification" },
      JWT_SECRET_VERIFY,
      { expiresIn: "5h" },
    );

    await this.mailService.sendEmail(
      user.email,
      "Please verify your email",
      "verify-email",
      { verificationUrl: `${BASE_URL_FE}/verify-email/${token}` },
    );

    return { message: "Register success. Please verify your email." };
  };

  emailVerification = async (token: string) => {
    if (!JWT_SECRET_VERIFY)
      throw new ApiError("JWT_SECRET_VERIFY is not set", 500);
    if (!token) throw new ApiError("Token is required", 400);

    let payload: VerifyPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET_VERIFY) as VerifyPayload;
    } catch {
      throw new ApiError("Invalid token or expired token", 401);
    }

    if (!payload?.id) throw new ApiError("Invalid token payload", 400);

    const user = await this.prisma.user.findFirst({
      where: { id: payload.id },
      select: { id: true, isEmailVerified: true },
    });

    if (!user) throw new ApiError("User not found", 404);
    if (user.isEmailVerified) throw new ApiError("Email already verified", 400);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    return { message: "Email verified successfully" };
  };

  login = async (body: LoginDTO) => {
    if (!JWT_SECRET) throw new ApiError("JWT_SECRET is not set", 500);

    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) throw new ApiError("User not found", 404);
    if (!user.isEmailVerified) throw new ApiError("Email not verified", 401);

    const valid = await comparePassword(body.password, user.passwordHash);
    if (!valid) throw new ApiError("Invalid password", 401);

    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "2h",
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, accessToken };
  };
}
