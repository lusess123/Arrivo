/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { BusinessError } from './business.error';
// import { UserDto, UserRole } from './auth.dto';

const excludedPaths = [
 
];

// const userPaths = [
//     '/exam/commit' ,
//     '/exam/commit-only',
//     '/exam/save',
//     '/exam/exit' ,
//     '/exam/answer',
// ]
// const retrievePaths = [
//     '/exam/retrievelist'
// ]

// const loginPaths = [
//     '/exam/result',
// ]

@Injectable()
export class AttachUserMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private readonly cls: ClsService,
  ) {}
  use(req: Request, res: Response, next: NextFunction) {
    // 从请求中获取用户信息（例如从 JWT 中解析）
    console.log('req?.cookies: ', req?.cookies);
    // console.log(req);
    const token = req?.cookies['Authentication']; // 从cookie中获取JWT
    let decoded: any = null;
    console.log('token: ', token, req.originalUrl);
    try {
      if (token) {
         decoded = this.jwtService.verify(token, {
          secret: `${process.env.jwt_secret}`,
        });
        console.log('user: ', decoded);
        req['user'] =  decoded;
       this.cls.set('user',  decoded);
       console.log("this.cls.get" , this.cls.get('user'));
      }
    } catch (e) {
      console.error('AttachUserMiddleware: ', e);
    }
   
    if(!excludedPaths.some(path => req.originalUrl.startsWith(path))) {
           
      if(!token || decoded?.role === 'guest') {
          throw new BusinessError('nologin');
      }
    }
   

    const teamid = req.cookies['teamid']; // 从cookie中获取teamid
    if (teamid) {
      this.cls.set('teamid', teamid);
    }
      next();  
  }
}
 