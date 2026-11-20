import type { SendEmailLoginLinkInput } from "@arrivo/contracts";

const copy = {
  zh: {
    reset: { subject: "Arrivo 密码找回", intro: "你正在找回 Arrivo 密码。", action: "点击这里设置新密码" },
    login: { subject: "登录 Arrivo", intro: "你正在登录 Arrivo。", action: "点击这里完成登录" },
  },
  en: {
    reset: { subject: "Reset your Arrivo password", intro: "You requested a new password for Arrivo.", action: "Set a new password" },
    login: { subject: "Sign in to Arrivo", intro: "Here’s your sign-in link for Arrivo.", action: "Sign in to Arrivo" },
  },
};

export function authLinkEmail(
  purpose: "reset" | "login",
  link: string,
  minutes: number,
  language: SendEmailLoginLinkInput["language"] = "zh",
) {
  const { subject, intro, action } = copy[language][purpose];
  const footer = language === "en"
    ? `This link expires in ${minutes} minutes. If you didn’t request it, you can ignore this email.`
    : `链接 ${minutes} 分钟内有效。如果不是你本人操作，请忽略这封邮件。`;
  const href = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return {
    subject,
    text: `${intro}\n\n${action}\n${link}\n\n${footer}`,
    html: `<div lang="${language}"><p>${intro}</p><p><a href="${href}">${action}</a></p><p>${footer}</p></div>`,
  };
}
