import { Transporter, createTransport } from "nodemailer";
import { MAIL_PASS, MAIL_USER } from "../../config/env.js";

import path from "path";
import fs from "fs/promises";
import handlebars from "handlebars";
import { fileURLToPath } from "url";

// ✅ ESM-safe __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      service: "gmail",
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });
  }

  private renderTemplate = async (templateName: string, context: any) => {
    const templateDir = path.join(__dirname, "templates");
    const templatePath = path.join(templateDir, `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, "utf-8");
    const compiledTemplate = handlebars.compile(templateSource);
    return compiledTemplate(context);
  };

  sendEmail = async (
    to: string,
    subject: string,
    templateName: string,
    context: any,
  ) => {
    const html = await this.renderTemplate(templateName, context);

    await this.transporter.sendMail({
      from: MAIL_USER, // ✅ penting biar ga aneh
      to,
      subject,
      html,
    });
  };
}
