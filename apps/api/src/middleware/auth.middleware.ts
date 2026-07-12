import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { httpError, verifyUserJwt } from "@arrivo/runtime";
import type { AppEnv } from "../context";

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, "Authentication");
  if (!token) throw httpError.unauthorized();
  const user = await verifyUserJwt(token, c.env.JWT_SECRET);
  if (user.role === "guest") throw httpError.unauthorized();
  c.set("user", user);
  await next();
};

export async function getOptionalUser(c: Parameters<MiddlewareHandler<AppEnv>>[0]) {
  const token = getCookie(c, "Authentication");
  if (!token) return undefined;
  try {
    const user = await verifyUserJwt(token, c.env.JWT_SECRET);
    c.set("user", user);
    return user;
  } catch {
    return undefined;
  }
}
