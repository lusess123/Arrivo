import type { Context, Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import {
  emailLinkLoginQuerySchema,
  emailPasswordLoginInputSchema,
  emailPasswordRegisterInputSchema,
  emailPasswordSignInInputSchema,
  resetPasswordInputSchema,
  sendEmailLoginLinkInputSchema,
  sendPasswordResetEmailInputSchema,
} from "@arrivo/contracts";
import {
  emailLinkLogin,
  emailPasswordLogin,
  emailPasswordSignIn,
  registerEmailPassword,
  resetPassword,
  sendEmailLoginLink,
  sendPasswordResetEmail,
} from "@arrivo/application";
import { createResendEmailClient } from "@arrivo/infra";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { getOptionalUser } from "../middleware/auth.middleware";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

function cookieOptions(c: Parameters<typeof setCookie>[0]) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "None" as const,
    path: "/",
    domain: c.env.COOKIE_DOMAIN,
    maxAge: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
  };
}

function setAuthCookies(
  c: Context<AppEnv>,
  result: Awaited<ReturnType<typeof emailPasswordLogin>>,
) {
  setCookie(c, "Authentication", result.accessToken, cookieOptions(c));
  setCookie(c, "Refresh", result.refreshToken, cookieOptions(c));
  setCookie(c, "AuthenticationRole", result.payload.role, cookieOptions(c));
}

function emailClient(c: Context<AppEnv>) {
  return createResendEmailClient({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.EMAIL_FROM,
  });
}

function safeRedirect(c: Context<AppEnv>, redirect?: string) {
  if (!redirect) return c.env.WEB_ORIGIN;
  const allowedOrigins = [c.env.WEB_ORIGIN, c.env.MANAGE_ORIGIN]
    .filter(Boolean)
    .map((origin) => new URL(origin!).origin);
  try {
    const target = new URL(redirect, c.env.WEB_ORIGIN);
    return allowedOrigins.includes(target.origin)
      ? target.toString()
      : c.env.WEB_ORIGIN;
  } catch {
    return c.env.WEB_ORIGIN;
  }
}

export function registerAuthRoutes(app: Hono<AppEnv>, prefix = "") {
  app.get(route(prefix, "/auth"), async (c) => {
    const user = await getOptionalUser(c);
    return ok(c, user ?? {});
  });

  app.post(
    route(prefix, "/auth/emailPasswordLogin"),
    zValidator("json", emailPasswordLoginInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await emailPasswordLogin({
        input,
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
      });
      setAuthCookies(c, result);
      return ok(c, result);
    },
  );

  app.post(
    route(prefix, "/auth/emailPasswordSignIn"),
    zValidator("json", emailPasswordSignInInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await emailPasswordSignIn({
        input,
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
      });
      setAuthCookies(c, result);
      return ok(c, result);
    },
  );

  app.post(
    route(prefix, "/auth/registerEmailPassword"),
    zValidator("json", emailPasswordRegisterInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await registerEmailPassword({
        input,
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
      });
      setAuthCookies(c, result);
      return ok(c, result);
    },
  );

  app.post(
    route(prefix, "/auth/sendPasswordResetEmail"),
    zValidator("json", sendPasswordResetEmailInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await sendPasswordResetEmail({
        input,
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
        apiBaseUrl: c.env.API_BASE_URL,
        webOrigin: c.env.WEB_ORIGIN,
        emailClient: emailClient(c),
      });
      return ok(c, result);
    },
  );

  app.post(
    route(prefix, "/auth/resetPassword"),
    zValidator("json", resetPasswordInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await resetPassword({
        input,
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
      });
      setAuthCookies(c, result);
      return ok(c, result);
    },
  );

  app.post(
    route(prefix, "/auth/sendEmailLoginLink"),
    zValidator("json", sendEmailLoginLinkInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await sendEmailLoginLink({
        input: {
          ...input,
          redirect: safeRedirect(c, input.redirect),
        },
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
        apiBaseUrl: c.env.API_BASE_URL,
        webOrigin: c.env.WEB_ORIGIN,
        emailClient: emailClient(c),
      });
      return ok(c, result);
    },
  );

  app.get(
    route(prefix, "/auth/emailLinkLogin"),
    zValidator("query", emailLinkLoginQuerySchema),
    async (c) => {
      const input = c.req.valid("query");
      const result = await emailLinkLogin({
        token: input.token,
        jwtSecret: c.env.JWT_SECRET,
        jwtExpiresSeconds: Number(c.env.JWT_EXPIRES_SECONDS || 604800),
        defaultTenantId: c.env.DEFAULT_TENANT_ID,
      });
      setAuthCookies(c, result);
      return c.redirect(
        safeRedirect(
          c,
          input.redirect || result.payload.lastVisitedPath || undefined,
        ),
        302,
      );
    },
  );

  app.post(route(prefix, "/auth/signout"), (c) => {
    deleteCookie(c, "Authentication", {
      path: "/",
      domain: c.env.COOKIE_DOMAIN,
    });
    deleteCookie(c, "Refresh", { path: "/", domain: c.env.COOKIE_DOMAIN });
    deleteCookie(c, "AuthenticationRole", {
      path: "/",
      domain: c.env.COOKIE_DOMAIN,
    });
    return ok(c, { message: "Logout Success" });
  });
}
