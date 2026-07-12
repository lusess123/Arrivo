import type {
  AuthUserDto,
  EmailPasswordLoginInput,
  EmailPasswordRegisterInput,
  EmailPasswordSignInInput,
  LoginResultDto,
  PhoneNumberLoginInput,
  ResetPasswordInput,
  SendEmailLoginLinkInput,
  SendPasswordResetEmailInput
} from "@arrivo/contracts";
import type { ArrivoDb } from "@arrivo/db";
import type { EmailClient } from "@arrivo/infra";
import { httpError, signUserJwt } from "@arrivo/runtime";
import { activeRecordWhere, createRecordBase, normalizeTenantId, updateRecordBase } from "../runtime/data-scope";
import { db } from "../runtime/db";

type AuthDeps = {
  jwtSecret: string;
  jwtExpiresSeconds: number;
  fixedSmsCode?: string;
  defaultTenantId?: string | null;
};

type EmailAuthDeps = Omit<AuthDeps, "fixedSmsCode"> & {
  apiBaseUrl: string;
  emailClient: EmailClient;
  webOrigin: string;
};

type AuthUserRecord = {
  id: string;
  userName: string;
  email: string | null;
  phoneNumber: string | null;
  tenantId: string | null;
  teamId: string | null;
  nickname: string | null;
  headimgurl: string | null;
  access: string | null;
  lastLoginTime: Date | null;
  createdAt: Date | null;
};

const PASSWORD_HASH_PREFIX = "pbkdf2_sha256";
const PASSWORD_HASH_ITERATIONS = 100000;
const EMAIL_LOGIN_PURPOSE = "email-login";
const PASSWORD_RESET_PURPOSE = "password-reset";
const EMAIL_LOGIN_EXPIRES_MINUTES = 15;
const PASSWORD_RESET_EXPIRES_MINUTES = 30;

function toAuthUser(user: {
  id: string;
  userName: string;
  email: string | null;
  phoneNumber: string | null;
  tenantId: string | null;
  teamId: string | null;
  nickname: string | null;
  headimgurl: string | null;
  access: string | null;
  lastLoginTime: Date | null;
  createdAt: Date | null;
}): AuthUserDto {
  return {
    id: user.id,
    name: user.userName,
    role: "user",
    email: user.email,
    mobile: user.phoneNumber,
    tenant: user.tenantId,
    teamId: user.teamId,
    nickname: user.nickname,
    headimgurl: user.headimgurl,
    access: user.access,
    lastLoginTime: user.lastLoginTime,
    createTime: user.createdAt
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toHex(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return toHex(value);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

async function hashPassword(password: string, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(salt),
      iterations: PASSWORD_HASH_ITERATIONS
    },
    key,
    256
  );
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt}$${toHex(hash)}`;
}

async function verifyPassword(password: string, storedPassword: string | null | undefined) {
  if (!storedPassword) return false;
  const [prefix, iterations, salt, hash] = storedPassword.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !iterations || !salt || !hash) {
    return storedPassword === password;
  }

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const passwordHash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(salt),
      iterations: Number(iterations)
    },
    key,
    256
  );
  return toHex(passwordHash) === hash;
}

async function issueLoginResult({
  user,
  jwtSecret,
  jwtExpiresSeconds
}: {
  user: AuthUserRecord;
  jwtSecret: string;
  jwtExpiresSeconds: number;
}) {
  const now = new Date();
  await db.user.updateMany({
    where: {
      id: user.id,
      ...activeRecordWhere(user.tenantId)
    },
    data: {
      lastLoginTime: now,
      ...updateRecordBase({ userId: user.id, now })
    }
  });
  const updatedUser = await db.user.findFirst({
    where: {
      id: user.id,
      ...activeRecordWhere(user.tenantId)
    }
  });
  if (!updatedUser) throw httpError.unauthorized();

  const payload = toAuthUser(updatedUser);
  const accessToken = await signUserJwt({
    user: payload,
    secret: jwtSecret,
    expiresSeconds: jwtExpiresSeconds
  });
  const refreshToken = await signUserJwt({
    user: payload,
    secret: jwtSecret,
    expiresSeconds: 7 * 24 * 60 * 60
  });

  return {
    payload,
    accessToken,
    refreshToken
  };
}

async function findUserByEmail(email: string, tenantId: string) {
  return db.user.findFirst({
    where: {
      email: normalizeEmail(email),
      ...activeRecordWhere(tenantId)
    }
  });
}

async function setUserPassword({ userId, password, tenantId }: { userId: string; password: string; tenantId: string }) {
  const now = new Date();
  const passwordHash = await hashPassword(password);
  const existingPassword = await db.userPassword.findFirst({
    where: {
      id: userId,
      ...activeRecordWhere(tenantId)
    },
    select: {
      id: true
    }
  });

  if (existingPassword) {
    await db.userPassword.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        ...updateRecordBase({ userId, now })
      }
    });
    return;
  }

  await db.userPassword.create({
    data: {
      ...createRecordBase({ userId, tenantId, now }),
      id: userId,
      password: passwordHash
    }
  });
}

async function createEmailUser({ email, tenantId, password }: { email: string; tenantId: string; password?: string }) {
  const now = new Date();
  const normalizedEmail = normalizeEmail(email);
  const userBase = createRecordBase({ tenantId, now });
  const user = await db.user.create({
    data: {
      ...userBase,
      email: normalizedEmail,
      userName: normalizedEmail,
      nickname: normalizedEmail,
      registrationTime: now,
      lastLoginTime: now
    }
  });

  if (password) {
    await db.userPassword.create({
      data: {
        ...createRecordBase({ userId: user.id, tenantId, now }),
        id: user.id,
        password: await hashPassword(password)
      }
    });
  }

  return user;
}

async function createEmailToken({
  email,
  purpose,
  tenantId,
  userId,
  expiresMinutes
}: {
  email: string;
  purpose: string;
  tenantId: string;
  userId?: string | null;
  expiresMinutes: number;
}) {
  const now = new Date();
  const token = randomToken();
  await db.emailCode.create({
    data: {
      ...createRecordBase({ userId: userId ?? undefined, tenantId, now }),
      code: await sha256Hex(token),
      purpose,
      toEmail: normalizeEmail(email),
      userId: userId ?? undefined,
      expiredTime: new Date(now.getTime() + expiresMinutes * 60 * 1000)
    }
  });
  return token;
}

async function getValidEmailToken({ token, purpose, tenantId }: { token: string; purpose: string; tenantId: string }) {
  const tokenHash = await sha256Hex(token);
  const record = await db.emailCode.findFirst({
    where: {
      code: tokenHash,
      purpose,
      usedAt: null,
      ...activeRecordWhere(tenantId)
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  if (!record) throw httpError.badRequest("链接无效或已使用");
  if (record.expiredTime && record.expiredTime < new Date()) {
    throw httpError.badRequest("链接已过期");
  }
  if (!record.toEmail) throw httpError.badRequest("链接无效");
  return record;
}

async function markEmailTokenUsed({ id, userId }: { id: string; userId?: string | null }) {
  await db.emailCode.update({
    where: { id },
    data: {
      usedAt: new Date(),
      ...updateRecordBase({ userId: userId ?? undefined })
    }
  });
}

function requireEmailClient(emailClient: EmailClient) {
  if (!emailClient.isConfigured) {
    throw httpError.internal("邮件服务未配置");
  }
}

function passwordResetEmailHtml(link: string) {
  return `<p>你正在找回 Arrivo 密码。</p><p><a href="${link}">点击这里设置新密码</a></p><p>链接 30 分钟内有效。如果不是你本人操作，请忽略这封邮件。</p>`;
}

function emailLoginHtml(link: string) {
  return `<p>你正在登录 Arrivo。</p><p><a href="${link}">点击这里完成登录</a></p><p>链接 15 分钟内有效。如果不是你本人操作，请忽略这封邮件。</p>`;
}

async function getFixedSmsCode(db: ArrivoDb, envFixedCode?: string, tenantId?: string | null) {
  if (envFixedCode) return envFixedCode;
  const fixedConfig = await db.config.findFirst({
    where: {
      key: "FixedCode",
      ...activeRecordWhere(tenantId)
    },
    select: {
      value: true
    }
  });
  return fixedConfig?.value || undefined;
}

export async function sendSmsCode({
  phoneNumber,
  fixedSmsCode,
  defaultTenantId
}: {
  phoneNumber: string;
  fixedSmsCode?: string;
  defaultTenantId?: string | null;
}) {
  const tenantId = normalizeTenantId(defaultTenantId);
  const fixedCode = await getFixedSmsCode(db, fixedSmsCode, tenantId);
  if (fixedCode) return 1;

  const code = String(Math.floor(Math.random() * 900000) + 100000);
  const now = new Date();
  await db.phoneCode.create({
    data: {
      ...createRecordBase({ tenantId, now }),
      code,
      toPhoneNumber: phoneNumber,
      expiredTime: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  return 1;
}

export async function phoneNumberLogin({
  jwtSecret,
  jwtExpiresSeconds,
  fixedSmsCode,
  defaultTenantId,
  input
}: AuthDeps & { input: PhoneNumberLoginInput }): Promise<LoginResultDto> {
  const tenantId = normalizeTenantId(defaultTenantId);
  const fixedCode = await getFixedSmsCode(db, fixedSmsCode, tenantId);
  if (fixedCode) {
    if (input.phoneNumberCode !== fixedCode) throw httpError.badRequest("验证码错误");
  } else {
    const record = await db.phoneCode.findFirst({
      where: {
        code: input.phoneNumberCode,
        toPhoneNumber: input.phoneNumber,
        ...activeRecordWhere(tenantId)
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    if (!record) throw httpError.badRequest("手机验证码错误");
    if (record.expiredTime && record.expiredTime < new Date()) {
      throw httpError.badRequest("手机验证码已过期");
    }
  }

  const now = new Date();
  let user = await db.user.findFirst({
    where: {
      phoneNumber: input.phoneNumber,
      ...activeRecordWhere(tenantId)
    }
  });

  if (!user) {
    user = await db.user.create({
      data: {
        ...createRecordBase({ tenantId, now }),
        phoneNumber: input.phoneNumber,
        email: "",
        userName: input.phoneNumber,
        registrationTime: now,
        lastLoginTime: now
      }
    });
  } else {
    await db.user.updateMany({
      where: {
        id: user.id,
        ...activeRecordWhere(tenantId)
      },
      data: {
        lastLoginTime: now,
        ...updateRecordBase({ userId: user.id, now })
      }
    });
    const updatedUser = await db.user.findFirst({
      where: {
        id: user.id,
        ...activeRecordWhere(tenantId)
      }
    });
    if (!updatedUser) throw httpError.unauthorized();
    user = updatedUser;
  }

  const payload = toAuthUser(user);
  const accessToken = await signUserJwt({
    user: payload,
    secret: jwtSecret,
    expiresSeconds: jwtExpiresSeconds
  });
  const refreshToken = await signUserJwt({
    user: payload,
    secret: jwtSecret,
    expiresSeconds: 7 * 24 * 60 * 60
  });

  return {
    payload,
    accessToken,
    refreshToken
  };
}

export async function registerEmailPassword({
  jwtSecret,
  jwtExpiresSeconds,
  defaultTenantId,
  input
}: AuthDeps & { input: EmailPasswordRegisterInput }): Promise<LoginResultDto> {
  const tenantId = normalizeTenantId(defaultTenantId);
  const email = normalizeEmail(input.email);
  const existingUser = await findUserByEmail(email, tenantId);
  if (existingUser) {
    const existingPassword = await db.userPassword.findFirst({
      where: {
        id: existingUser.id,
        ...activeRecordWhere(tenantId)
      }
    });
    if (existingPassword?.password) throw httpError.badRequest("邮箱已注册");
    await setUserPassword({ userId: existingUser.id, password: input.password, tenantId });
    return issueLoginResult({ user: existingUser, jwtSecret, jwtExpiresSeconds });
  }

  const user = await createEmailUser({ email, tenantId, password: input.password });
  return issueLoginResult({ user, jwtSecret, jwtExpiresSeconds });
}

export async function emailPasswordLogin({
  jwtSecret,
  jwtExpiresSeconds,
  defaultTenantId,
  input
}: AuthDeps & { input: EmailPasswordLoginInput }): Promise<LoginResultDto> {
  const tenantId = normalizeTenantId(defaultTenantId);
  const user = await findUserByEmail(input.email, tenantId);
  if (!user) throw httpError.badRequest("邮箱或密码错误");
  const userPassword = await db.userPassword.findFirst({
    where: {
      id: user.id,
      ...activeRecordWhere(tenantId)
    }
  });
  const passwordMatched = await verifyPassword(input.password, userPassword?.password);
  if (!passwordMatched) throw httpError.badRequest("邮箱或密码错误");
  if (userPassword?.password && !userPassword.password.startsWith(PASSWORD_HASH_PREFIX)) {
    await setUserPassword({ userId: user.id, password: input.password, tenantId });
  }
  return issueLoginResult({ user, jwtSecret, jwtExpiresSeconds });
}

export async function emailPasswordSignIn({
  jwtSecret,
  jwtExpiresSeconds,
  defaultTenantId,
  input
}: AuthDeps & { input: EmailPasswordSignInInput }): Promise<LoginResultDto> {
  const tenantId = normalizeTenantId(defaultTenantId);
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email, tenantId);

  if (!user) {
    const createdUser = await createEmailUser({ email, tenantId, password: input.password });
    return issueLoginResult({ user: createdUser, jwtSecret, jwtExpiresSeconds });
  }

  const userPassword = await db.userPassword.findFirst({
    where: {
      id: user.id,
      ...activeRecordWhere(tenantId)
    }
  });

  if (!userPassword?.password) {
    await setUserPassword({ userId: user.id, password: input.password, tenantId });
    return issueLoginResult({ user, jwtSecret, jwtExpiresSeconds });
  }

  const passwordMatched = await verifyPassword(input.password, userPassword.password);
  if (!passwordMatched) throw httpError.badRequest("邮箱或密码错误");
  if (!userPassword.password.startsWith(PASSWORD_HASH_PREFIX)) {
    await setUserPassword({ userId: user.id, password: input.password, tenantId });
  }

  return issueLoginResult({ user, jwtSecret, jwtExpiresSeconds });
}

export async function sendPasswordResetEmail({
  defaultTenantId,
  emailClient,
  input,
  webOrigin
}: EmailAuthDeps & { input: SendPasswordResetEmailInput }) {
  requireEmailClient(emailClient);
  const tenantId = normalizeTenantId(defaultTenantId);
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email, tenantId);
  if (!user) return 1;

  const token = await createEmailToken({
    email,
    purpose: PASSWORD_RESET_PURPOSE,
    tenantId,
    userId: user.id,
    expiresMinutes: PASSWORD_RESET_EXPIRES_MINUTES
  });
  const link = `${webOrigin}/login?resetToken=${encodeURIComponent(token)}`;
  await emailClient.send({
    to: email,
    subject: "Arrivo 密码找回",
    text: `点击链接设置新密码：${link}\n\n链接 30 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
    html: passwordResetEmailHtml(link)
  });
  return 1;
}

export async function resetPassword({
  jwtSecret,
  jwtExpiresSeconds,
  defaultTenantId,
  input
}: AuthDeps & { input: ResetPasswordInput }): Promise<LoginResultDto> {
  const tenantId = normalizeTenantId(defaultTenantId);
  const record = await getValidEmailToken({
    token: input.token,
    purpose: PASSWORD_RESET_PURPOSE,
    tenantId
  });
  const user = await findUserByEmail(record.toEmail!, tenantId);
  if (!user) throw httpError.badRequest("账号不存在");
  await setUserPassword({ userId: user.id, password: input.password, tenantId });
  await markEmailTokenUsed({ id: record.id, userId: user.id });
  return issueLoginResult({ user, jwtSecret, jwtExpiresSeconds });
}

export async function sendEmailLoginLink({
  apiBaseUrl,
  defaultTenantId,
  emailClient,
  input,
  webOrigin
}: EmailAuthDeps & { input: SendEmailLoginLinkInput }) {
  requireEmailClient(emailClient);
  const tenantId = normalizeTenantId(defaultTenantId);
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email, tenantId);
  const token = await createEmailToken({
    email,
    purpose: EMAIL_LOGIN_PURPOSE,
    tenantId,
    userId: user?.id,
    expiresMinutes: EMAIL_LOGIN_EXPIRES_MINUTES
  });
  const redirect = input.redirect || webOrigin;
  const link = `${apiBaseUrl}/auth/emailLinkLogin?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;
  await emailClient.send({
    to: email,
    subject: "登录 Arrivo",
    text: `点击链接登录 Arrivo：${link}\n\n链接 15 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
    html: emailLoginHtml(link)
  });
  return 1;
}

export async function emailLinkLogin({
  jwtSecret,
  jwtExpiresSeconds,
  defaultTenantId,
  token
}: AuthDeps & { token: string }): Promise<LoginResultDto> {
  const tenantId = normalizeTenantId(defaultTenantId);
  const record = await getValidEmailToken({
    token,
    purpose: EMAIL_LOGIN_PURPOSE,
    tenantId
  });
  let user = await findUserByEmail(record.toEmail!, tenantId);
  if (!user) {
    user = await createEmailUser({ email: record.toEmail!, tenantId });
  }
  await markEmailTokenUsed({ id: record.id, userId: user.id });
  return issueLoginResult({ user, jwtSecret, jwtExpiresSeconds });
}
