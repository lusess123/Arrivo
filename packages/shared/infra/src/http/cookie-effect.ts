export type CookieSameSite = "Strict" | "Lax" | "None";

export type SetCookieEffect = {
  type: "set";
  name: string;
  value: string;
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: CookieSameSite;
};

export type ClearCookieEffect = {
  type: "clear";
  name: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: CookieSameSite;
};

export type CookieEffect = SetCookieEffect | ClearCookieEffect;

export type SetCookieInput = Omit<SetCookieEffect, "type">;
export type ClearCookieInput = Omit<ClearCookieEffect, "type">;
