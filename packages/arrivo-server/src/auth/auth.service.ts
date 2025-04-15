/* eslint-disable prettier/prettier */
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import {
    EmailLoginParam,
    PhoneNumberLoginParam,
    UserDto,
    UserLoginDto,
    UserRole,
} from './auth.dto';

import { genCode, generateUniqueId } from './db';
import { BusinessError } from './business.error';
import { UserService } from './user.service';
import { sendMail } from './email';
// import { verifyTwilioVailCode } from './sms';
import { AppConfigService } from './appconfig.service';
@Injectable()
export class AuthService {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private jwtService: JwtService,
        private readonly cls: ClsService,
        private readonly appConfigService: AppConfigService
    ) { }

    getUser(): UserDto | undefined {
        return this.cls.get('user');
    }
    getUserId(): string | undefined {
        // console.log("this.cls.get" , this.cls.get('user'));
        return this.cls.get('user')?.id || '';
    }

    getTeamId(): string | undefined {
        return this.cls.get('teamid') || '';
    }

    signOut() {
        this.cls.set('user', undefined);
    }

    setAuth(payload: UserDto) {
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.jwt_secret,
            expiresIn: '1d',
        });
        this.cls.set('user', payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.jwt_secret,
            expiresIn: '7d',
        });

        return {
            payload,
            accessToken,
            refreshToken,
        };
    }



    async phoneNumberLogin(user: PhoneNumberLoginParam) {
        if(user.phoneNumber && !user.phoneNumber.startsWith('+')) {
            user.phoneNumber = `+${user.phoneNumber}`;
        }
        let userRow = await this.userService.getUserByPhoneNumber(user.phoneNumber);
        const successs = await this.userService.checkPhoneNumberCode(
            user.phoneNumberCode,
            user.phoneNumber
        );
        if (!successs) {
            throw new BusinessError('验证码错误');
        } 
        if (userRow) {
            
        } else {
            // await this.checkPhoneNumberCode(user.phoneNumber, user.phoneNumberCode);
                //---自动注册
            const newUserObj = {
                    id: '',
                    phoneNumber: user.phoneNumber,
                    email: '',
                    name: user.phoneNumber,
                    password: generateUniqueId(),
                    role: UserRole.user,
                    tenant: '',
                    tennantname: '',
                    // teamId: userDetail.teamId,
                    // headimgurl: userDetail.headimgurl
                };
                // await this.userService.checkUser(newUserObj);
                const [newUser] = await this.userService.addUserPromise(newUserObj);
                userRow = newUser;
                // return newUeser;
                // return userRow;
            // } else {
            //     throw new BusinessError('验证码错误');
            // }
        }
        const userDetail = userRow;
        const payload: UserDto = {
            id: userDetail.id,
            name: userDetail.userName,
            tenant: userDetail.tenantId!,
            nickname: userDetail.nickname,
            role: UserRole.user,
            email: userDetail.email!,
            mobile: userDetail.phoneNumber,
            tennantname: userDetail.tenantId!,
            teamId: userDetail.teamId,
            headimgurl: userDetail.headimgurl,
            access: userDetail.access,
            // access: userDetail.access
        };
        await this.userService.loginCommond(payload);

        return this.setAuth(payload);
    }

    async emailLogin(user: EmailLoginParam) {
        let userRow = await this.userService.getUserByEmail(user.email);
        if (userRow) {
            const successs = await this.userService.checkEmailCode(
                user.emailCode,
                user.email
            );
            if (successs) {
                // return userRow;
            } else {
                throw new BusinessError('验证码错误');
            }
        } else {
            const successs = await this.userService.checkEmailCode(
                user.emailCode,
                user.email
            );
            if (successs) {
                //---自动注册
                const newUserObj = {
                    id: '',
                    email: user.email,
                    name: user.email,
                    password: generateUniqueId(),
                    role: UserRole.user,
                    tenant: '',
                    tennantname: '',
                    phoneNumber: '',
                };
                await this.userService.checkUser(newUserObj);
                const [newUser] = await this.userService.addUserPromise(newUserObj);
                userRow = newUser;
                // return newUeser;
                // return userRow;
            } else {
                throw new BusinessError('验证码错误');
            }
        }
        const userDetail = userRow;
        const payload: UserDto = {
            id: userDetail.id,
            name: userDetail.userName,
            tenant: userDetail.tenantId!,
            nickname: userDetail.nickname,
            role: UserRole.user,
            email: userDetail.email!,
            tennantname: userDetail.tenantId!,
            teamId: userDetail.teamId,
            headimgurl: userDetail.headimgurl,
            access: userDetail.access
        };
        await this.userService.loginCommond(payload);

        return this.setAuth(payload);
    }

    async login(user: UserLoginDto) {
        const userDetail = await this.userService.checkPassword(user, true);
        const payload: UserDto = {
            id: userDetail.id,
            name: userDetail.userName,
            nickname: userDetail.nickname,
            tenant: userDetail.tenantId!,
            role: UserRole.user,
            email: userDetail.email!,
            tennantname: userDetail.tenantId!,
            headimgurl: userDetail.headimgurl,
            teamId: userDetail.teamId,
            access: userDetail.access,
        };

        await this.userService.loginCommond(payload);

        return this.setAuth(payload);
    }

    async sendEmailCode(to: string) {
        return sendMail({
            to,
            subject: 'abit 验证码',
            text: `你的验证码是：${genCode()}`,
        });
    }

    async registerUser(user: UserLoginDto) {
        await this.userService.checkUser(user);
        const [userdetail] = await this.userService.addUserPromise(user);
        return {
            id: userdetail.id,
        };
    }

    async refreshToken(user: UserDto) {
        const payload = {
            username: user.email,
            sub: {
                name: user.name,
            },
        };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

   async setUserAuthByUserId(userId: string, ip?: string) {
        const user =  await  this.userService.getUserDtoByUserId(userId, ip);
        return this.setAuth(user);
    }

    guestLogin(ip: string) {
        console.log("guestLogin" , this.cls.get('user'));
        const userId = this.getUserId();
        if (!userId) {
            const id = generateUniqueId();
            const user: UserDto = {
                id,
                name: 'guest-'+ id,
                email: '',
                tenant: '',
                role: UserRole.guest,
                tennantname: '',
                ip: ip,
                teamId: '',
                createTime: new Date(),
            }
            return this.setAuth(user);
            // return true;
        }
        return false;
    }

    async sendSmsCode(phoneNumber: string) {
        return this.userService.sendPhoneNumber(phoneNumber);
    }
}
