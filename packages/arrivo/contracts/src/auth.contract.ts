import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(6);

export const phoneNumberLoginInputSchema = z.object({
  phoneNumber: z.string().min(1),
  phoneNumberCode: z.string().min(1)
});

export const sendSmsCodeInputSchema = z.object({
  phoneNumber: z.string().min(1)
});

export const emailPasswordLoginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const emailPasswordSignInInputSchema = emailPasswordLoginInputSchema;
export const emailPasswordRegisterInputSchema = emailPasswordLoginInputSchema;

export const sendPasswordResetEmailInputSchema = z.object({
  email: emailSchema
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema
});

export const sendEmailLoginLinkInputSchema = z.object({
  email: emailSchema,
  redirect: z.string().url().optional()
});

export const emailLinkLoginQuerySchema = z.object({
  token: z.string().min(20),
  redirect: z.string().url().optional()
});

export type PhoneNumberLoginInput = z.infer<typeof phoneNumberLoginInputSchema>;
export type SendSmsCodeInput = z.infer<typeof sendSmsCodeInputSchema>;
export type EmailPasswordLoginInput = z.infer<typeof emailPasswordLoginInputSchema>;
export type EmailPasswordSignInInput = z.infer<typeof emailPasswordSignInInputSchema>;
export type EmailPasswordRegisterInput = z.infer<typeof emailPasswordRegisterInputSchema>;
export type SendPasswordResetEmailInput = z.infer<typeof sendPasswordResetEmailInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type SendEmailLoginLinkInput = z.infer<typeof sendEmailLoginLinkInputSchema>;
export type EmailLinkLoginQuery = z.infer<typeof emailLinkLoginQuerySchema>;

export type AuthUserDto = {
  id: string;
  name: string;
  role: "guest" | "user";
  email?: string | null;
  mobile?: string | null;
  tenant?: string | null;
  teamId?: string | null;
  nickname?: string | null;
  headimgurl?: string | null;
  access?: string | null;
  lastLoginTime?: Date | string | null;
  createTime?: Date | string | null;
};

export type LoginResultDto = {
  payload: AuthUserDto;
  accessToken: string;
  refreshToken: string;
};
