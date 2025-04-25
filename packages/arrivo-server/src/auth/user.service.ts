import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  IUserInfoSaveParam,
  UserDto,
  UserLoginDto,
  UserRole,
} from './auth.dto';
import { PrismaClient } from 'arrivo-db';
import { genCode, generateUniqueId } from './db';
import { BusinessError } from './business.error';
// import { TestService } from './test.service';
import { AuthService } from './auth.service';
import { sendMail } from './email';
// import { sendTwilioVailCode } from './sms';
import { phoneNumberPattern, emailPattern } from './pattern';

import { AppConfigService } from './appconfig.service';
import { sendVailCode } from './sms';
// import { TeamService } from './team.service';

@Injectable()
export class UserService extends PrismaClient {
  constructor(
    @Inject(forwardRef(() => AuthService))
    protected readonly auth: AuthService,
    @Inject(forwardRef(() => AppConfigService))
    protected readonly appConfigService: AppConfigService,
    // @Inject(forwardRef(() => TeamService))
    // protected readonly teamService: TeamService
  ) {
    super();
  }

  async onModuleInit() {
    // Note: this is optional
    await this.$connect();
  }

  protected generateUniqueId() {
    return generateUniqueId();
  }

  async checkUserName(newName: string, oldName: string) {
    const user = await this.user.findFirst({
      where: {
        userName: newName,
      },
    });
    if (!user) return true;
    else {
      if (user.userName === oldName) return true;
      return false;
    }
  }

  async checkePhoneNumber(newval: string, oldval: string) {
    const user = await this.user.findFirst({
      where: {
        phoneNumber: newval,
      },
    });
    if (!user) return true;
    else {
      if (user.phoneNumber === oldval) return true;
      return false;
    }
  }

  // async getUserByPhoneNumber(phone)

  async sendEmailCode(to: string) {
    const code = genCode();
    sendMail({
      to,
      subject: 'voice 验证码, 发送时间： ' + new Date().toISOString(),
      text: `你的验证码是：${code}`,
    });
    const minu = 2;
    await this.emailCode.create({
      data: {
        id: this.generateUniqueId(),
        code,
        userId: this.auth.getUserId(),
        expiredTime: new Date(Date.now() + 1000 * 60 * minu),
        toEmail: to,

        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.auth.getUserId(),
        updatedBy: this.auth.getUserId(),
      },
    });
    return minu;
  }

  async sendPhoneNumber(to: string) {
    const FixedCode =
      await this.appConfigService.getAppConfigByKey('FixedCode');
    if (FixedCode) {
      return 1;
    }

    const code = genCode();
    // const code = '1234';
    this.callSendPhoneNumber(to, code);
    return 1;
  }

  private async callSendPhoneNumber(to: string, code: any) {
    await sendVailCode({
      id: to,
      phoneNumbers: [to],
      vailCode: code,
    });
    const minu = 1;
    await this.phoneCode.create({
      data: {
        id: this.generateUniqueId(),
        code,
        userId: this.auth.getUserId(),
        expiredTime: new Date(Date.now() + 1000 * 60 * 10),
        tenantId: '',
        toPhoneNumber: to,

        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.auth.getUserId(),
        updatedBy: this.auth.getUserId(),
      },
    });
    return minu;
  }

  async checkeEmail(newval: string, oldval: string) {
    const user = await this.user.findFirst({
      where: {
        email: newval,
      },
    });
    if (!user) return true;
    else {
      if (user.email === oldval) return true;
      return false;
    }
  }

  async loginCommond(user: UserDto) {
    return await this.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginTime: new Date(),
        updatedAt: new Date(),
        updatedBy: user.id,
      },
    });
  }

  async getUserDetailInfo() {
    // const count = await this.testService.getTestCountByCreator();
    const user = await this.user.findFirst({
      where: {
        id: this.auth.getUserId(),
      },
      select: {
        id: true,
        tenantId: true,
        userName: true,
        email: true,
        phoneNumber: true,
        registrationTime: true,
        nickname: true,
        companyName: true,
        // position: true,
        lastLoginTime: true,
        headimgurl: true,
      },
    });
    return user;
  }

  async getUserDtoByUserId(userId: string, ip?: string): Promise<UserDto> {
    const user = await this.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new BusinessError(`user ${userId} not found`);
    }
    return {
      id: user.id,
      name: user.userName,
      email: user.email,
      tenant: user.tenantId,
      role: UserRole.user,
      tennantname: user.tenantId,
      teamId: user.teamId,
      ip: ip,
      mobile: user.phoneNumber,
      nickname: user.nickname,
      headimgurl: user.headimgurl,
      access: user.access,
    };
  }

  async checkEmailCode(code: string, email: string) {
    const emaiRecord = await this.emailCode.findFirst({
      where: {
        code: code,
        toEmail: email,
        // userId: this.auth.getUserId(),
      },
    });
    if (emaiRecord) {
      if (emaiRecord.expiredTime! < new Date()) {
        throw new BusinessError('邮箱验证码已过期');
      } else {
        return true;
      }
    } else {
      throw new BusinessError('邮箱验证码错误');
    }
  }

  async checkPhoneNumberCode(code: string, phoneNumber: string) {
    const emaiRecord = await this.phoneCode.findFirst({
      where: {
        code: code,
        toPhoneNumber: phoneNumber,
        // userId: this.auth.getUserId(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (emaiRecord) {
      if (emaiRecord.expiredTime! < new Date()) {
        throw new BusinessError('手机验证码已过期');
      } else {
        return true;
      }
    } else {
      throw new BusinessError('手机验证码错误');
    }
  }

  async getUserByEmail(email: string) {
    return this.user.findFirst({
      where: {
        email: email,
      },
    });
  }

  async getUserByPhoneNumber(phoneNumber: string) {
    return this.user.findFirst({
      where: {
        phoneNumber,
      },
    });
  }

  async saveUserInfo(userinfo: IUserInfoSaveParam) {
    const userInfo = await this.user.findFirst({
      where: {
        id: this.auth.getUserId(),
        deletedAt: null,
      },
    });
    if (!userInfo) {
      throw new Error('用户不存在');
    }
    let email: string | undefined = undefined;
    let success = false;
    if (userinfo.email && userinfo.email !== userInfo.email) {
      if (!userinfo.emailCode) throw new Error('请输入邮箱验证码');
      const checkEmail = await this.checkeEmail(
        userinfo.email,
        userInfo.email!,
      );
      if (!checkEmail) throw new BusinessError('邮箱已经被占用');
      //需要修改邮箱了
      success = await this.checkEmailCode(userinfo.emailCode, userinfo.email);
      if (success) {
        email = userinfo.email;
      }
    }
    let password: string | undefined = undefined;
    if (userinfo.password) {
      if (!userinfo.emailCode && !userinfo.phoneNumberCode) {
        throw new BusinessError('修改密码需要邮箱和手机验证');
      } else {
        if (userinfo.email) {
          if (!userinfo.emailCode)
            throw new BusinessError('修改邮箱需要邮箱验证码');
          else {
            if (!success) {
              success = await this.checkEmailCode(
                userinfo.emailCode,
                userinfo.email,
              );
            }

            if (success) {
              password = userinfo.password;
            }
          }
        }
      }
    }

    let pPassword: any = undefined;
    if (password) {
      pPassword = this.userPassword.update({
        where: {
          id: this.auth.getUserId(),
        },
        data: {
          password: password,
        },
      });
    }
    const pUser = this.user.update({
      where: {
        id: this.auth.getUserId(),
      },
      data: {
        companyName: userinfo.companyName,
        userName: userinfo.userName,
        // position: userinfo.position,
        email,
        phoneNumber: userinfo.phoneNumber,
        updatedAt: new Date(),
        updatedBy: this.auth.getUserId(),
      },
    });

    const [user] = await this.$transaction(
      pPassword ? ([pUser, pPassword] as any) : [pUser],
    );

    return user;
  }

  async checkPassword(credentials: UserLoginDto, autoRegister: boolean) {
    const user = await this.user.findFirst({
      where: {
        userName: credentials.name || '',
        // password: credentials.password || '',
        deletedAt: null,
      },
    });

    if (!user) {
      if (autoRegister) {
        // 用户名如果为手机号和邮箱，不允许自动注册
        // const phoneNumberPattern.test(credentials.name);
        if (
          phoneNumberPattern.test(credentials.name) ||
          emailPattern.test(credentials.name)
        ) {
          throw new BusinessError('no user');
        }
        const [newUeser] = await this.addUserPromise(credentials);
        return newUeser;
      } else {
        throw new BusinessError('no user');
      }
    } else {
      const userPassword = await this.userPassword.findFirst({
        where: {
          id: user?.id || '',
          deletedAt: null,
        },
      });
      if (!userPassword) {
        await this.userPassword.create({
          data: {
            id: user?.id || '',
            password: credentials.password!,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        return user;
      } else {
        if (userPassword?.password !== credentials.password!)
          throw new BusinessError('password error');
      }
    }
    return user;
    // if(user.en)
  }

  async checkUser(credentials: UserLoginDto) {
    const user = await this.user.findFirst({
      where: {
        userName: credentials.name!,
      },
    });
    if (user) {
      throw new BusinessError('user already exit');
    }
  }

  addUserPromiseByMobile(
    userId: string,
    nickName: string,
    password: string,
    mobile: string,
  ): [any, any] {
    const id = userId;
    const user = this.user.create({
      data: {
        id,
        userName: mobile,
        speed: 0,
        // password: credentials.password,
        phoneNumber: mobile,
        nickname: nickName,
        registrationTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const userPassword = this.userPassword.create({
      data: {
        id: id,
        password: password,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: id,
        updatedBy: id,
      },
    });
    return [user, userPassword];
  }

  addUserPromise(credentials: UserLoginDto) {
    const id = this.generateUniqueId();
    const user = this.user.create({
      data: {
        id,
        userName: credentials.name,
        // password: credentials.password,
        phoneNumber: credentials.phoneNumber,
        nickname: credentials.name,
        registrationTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const userPassword = this.userPassword.create({
      data: {
        id: id,
        password: credentials.password,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: id,
        updatedBy: id,
      },
    });
    return this.$transaction([user, userPassword]);
  }
}
