import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  EmailLoginParam,
  PhoneNumberLoginParam,
  UserDto,
  UserLoginDto,
} from './auth.dto';
import { setCookie, setLoginCookie } from './util';
import { AppConfigService } from './appconfig.service';
import { BusinessError } from './business.error';
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private appConfigService: AppConfigService,
  ) {}
  @Get()
  async user() {
    console.log('user' + new Date().getTime());
    const user = this.authService.getUser() || {};
    const teamid = this.authService.getTeamId() || '';
    return { ...user, teamid };
  }
  @Post('emaillogin')
  async emaillogin(@Body() user: EmailLoginParam, @Res() res: any) {
    const loginResturn = await this.authService.emailLogin(user);

    setLoginCookie(res, loginResturn);
    return res.status(200).json({ data: loginResturn });
  }
  @Post('phonenumberlogin')
  async phoneNumberlogin(@Body() user: PhoneNumberLoginParam, @Res() res: any) {
    const loginResturn = await this.authService.phoneNumberLogin(user);
    setLoginCookie(res, loginResturn);
    return res.status(200).json({ data: loginResturn });
  }

  @Post('login')
  async login(@Body() userloginDto: UserLoginDto, @Res() res: any) {
    const loginResturn = await this.authService.login(userloginDto);

    setLoginCookie(res, loginResturn);
    return res.status(200).json({ data: loginResturn });
  }

  @Post('signout')
  async signOut(@Res() res: any) {
    this.authService.signOut();
    setCookie(res, { key: 'Authentication', value: '' });
    setCookie(res, { key: 'Refresh', value: '' });
    setCookie(res, { key: 'AuthenticationRole', value: '' });
    setCookie(res, { key: 'teamid', value: '' });
    return res.status(200).json({ message: 'Logout Success' });
  }

  @Post('register')
  async registerUser(@Body() createUserDto: UserDto) {
    return await this.authService.registerUser(createUserDto);
  }

  @Post('refresh')
  async refrshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @Post('sendSmsCode')
  async sendSmsCode(@Body() body: any) {
    if (!body.phoneNumber) {
      throw new BusinessError('phoneNumber is required');
    }
    return this.authService.sendSmsCode(body.phoneNumber);
  }

  @Get('checklogin')
  async checklogin(
    @Res() res: any,
    @Ip() ip: string,
    @Query('force') force: string,
  ) {
    console.log('checklogin');
    console.log('checklogin force:', force);
    // const ip = req.ip;
    const loginResturn = this.authService.guestLogin(ip);
    const appConfig = await this.appConfigService.getAppConfig();
    if (loginResturn) {
      setLoginCookie(res, loginResturn);
      res.status(200).json({ loginResturn, appConfig });
    } else {
      if (force && force !== 'false') {
        const userRes = await this.authService.setUserAuthByUserId(
          this.authService.getUserId(),
          ip,
        );
        setLoginCookie(res, userRes);
        return res.status(200).json({
          loginResturn: userRes,
          appConfig,
        });
      }

      return res.status(200).json({
        loginResturn: {
          payload: this.authService.getUser(),
        },
        appConfig,
      });
    }
  }
}
