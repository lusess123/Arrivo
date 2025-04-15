import { UserDto } from './auth.dto';
import { Response } from 'express';
export function setLoginCookie(
  res: any,
  loginReturn: { payload: UserDto; accessToken: string; refreshToken: string },
) {
  setCookie(res, {
    key: 'Authentication',
    value: loginReturn.accessToken,
  });

  setCookie(res, {
    key: 'Refresh',
    value: loginReturn.refreshToken,
  });

  setCookie(res, {
    key: 'AuthenticationRole',
    value: loginReturn.payload.role,
  });

  console.log('设置完成登录的cookie');
}

export interface ISetCookie {
  key: string;
  value: any;
}

export function setCookie(res: Response, options: ISetCookie) {
  res.cookie(options.key, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  });
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 当前时间加7天
  // const secure =
  //   process.env.NODE_ENV === 'production' ||
  //   !!process.env.HTTPS_ENV ||
  //   process.env.AUTH_ENV === 'production0';
  const cookieData: any = {
    httpOnly: true,
    secure: false,
    expires: sevenDaysFromNow,
    domain: process.env.HTTPS_DOMAIN,
    sameSite: 'lax',
    path: '/', // 适用于所有路径
  };
  res.cookie(options.key, options.value, cookieData);
  console.log('setCookie', cookieData);
}

export function getCookie(req: any, key: string) {
  const cookies = req.cookies;
  return cookies[key];
}
