import { expect, test } from "bun:test";
import { sendEmailLoginLinkInputSchema, sendPasswordResetEmailInputSchema } from "@arrivo/contracts";
import { authLinkEmail } from "../src/auth/auth-link-email";

const link = "https://example.test/login?token=example&redirect=home";
for (const [purpose, schema, minutes] of [
  ["login", sendEmailLoginLinkInputSchema, 15],
  ["reset", sendPasswordResetEmailInputSchema, 30],
] as const) {
  test(`${purpose} sends the requested language and defaults to Chinese for existing clients`, () => {
    for (const language of [undefined, "zh", "en"] as const) {
      const input = schema.parse({ email: "reader@example.test", language });
      const mail = authLinkEmail(purpose, link, minutes, input.language);
      expect(mail.html).toContain(`lang="${language ?? "zh"}"`);
      expect(mail.text).toContain(link);
      expect(mail.html).toContain('href="https://example.test/login?token=example&amp;redirect=home"');
      expect(mail.text).toContain(language === "en" ? `${minutes} minutes` : `${minutes} 分钟`);
      expect(mail.subject).toBe(language === "en"
        ? (purpose === "login" ? "Sign in to Arrivo" : "Reset your Arrivo password")
        : (purpose === "login" ? "登录 Arrivo" : "Arrivo 密码找回"));
    }
  });
}
