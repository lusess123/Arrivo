import { defineApp } from '@umijs/max';
import './global.css';
import { Image } from 'antd';
import Logo from './assets/logo.png';
import { configureHttpClient } from './utils/api';

configureHttpClient();

export async function getInitialState(): Promise<any> {
  return {
    name: '管理后台暂未开放',
    login: false,
    manageClosed: true,
    data: null,
  };
}

export default defineApp({
  layout: () => {
    return {
      logo: <Image src={Logo} height={46} preview={false} />,
      menu: {
        locale: false,
      },
      menuDataRender: () => [],
    };
  },
});
