export enum UserRole {
  // admin = 'admin',
  // student = 'student',
  // retrieve = 'retrieve',
  user = 'user',
  // admin = 'admin',
  guest = 'guest',
}
export class UserDto {
  id: string;
  name: string;
  email: string;
  tenant: string;
  mobile?: string;
  role: UserRole;
  tennantname: string;
  teamId?: string | null;
  nickname?: string | null;
  headimgurl?: string | null;
  access?: string | null;
  createTime?: Date | null;
  updateFun?: () => void;
  ip?: string | null;
}

export class UserLoginDto extends UserDto {
  password?: string;
  phoneNumber?: string;
}

export interface EmailLoginParam {
  email: string;
  emailCode: string;
}

export interface PhoneNumberLoginParam {
  phoneNumber: string;
  phoneNumberCode: string;
}

export interface IUserInfoSaveParam {
  userName: string;
  phoneNumber?: string;
  phoneNumberCode?: string;
  companyName: string;
  position: string;
  password?: string;
  email?: string;
  emailCode?: string;
}
