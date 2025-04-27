import { defineApp, RunTimeLayoutConfig, useLocation, useNavigate } from '@umijs/max';
import './global.css'
import { MenuDataItem } from "@ant-design/pro-components";

// import { AppProvider , useApp } from './hooks/app';
// import { LivekitProvider } from './hooks/livekit';
import { useEffect } from 'react';
import { IRenderType } from 'arrivo-server';
import { message, Image } from 'antd';
import { asyncHandle, get } from './utils/util';
import { logOutButton } from './logout';
import axios from 'axios';
import Logo from './assets/logo.png'

console.log('REACT_APP_GIT_COMMIT_TIME', process.env.REACT_APP_GIT_COMMIT_TIME)
console.log('REACT_APP_GIT_COMMIT_MESSAGE', process.env.REACT_APP_GIT_COMMIT_MESSAGE)
console.log('IRenderType', IRenderType)

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<any> {
  // alert("UMI_APP_LOGIN_URL: " + process.env.UMI_APP_LOGIN_URL)
  message.info('欢迎进入Arrivo经营后台 ')
  const [err, res] = await asyncHandle(axios.get('/api/auth'));
   if(err) {
    message.error('登录失败')
    location.href = `${process.env.UMI_APP_LOGIN_URL}?redirect=${location.href}`
    return { name: '@umijs/max' };
   }
  //  if(res?.data?.data?.access !== 'root') {
  //   message.error('请用有管理员权限的账号先登录,设置权限后需要重新登录才能生效')
  //   location.href = `${process.env.UMI_APP_LOGIN_URL}?redirect=${location.href}`
  //   return { name: '@umijs/max1' };
  //  }
  return { name: logOutButton, login : true , data: res?.data?.data };
}



function App({ children }: { children: React.ReactNode }) {
  return  <div className='flex w-full h-full justify-center items-center'>{children}</div>
}



export default defineApp({
  // rootContainer: (container:any) => {
  //   return  <App>{container}</App> 
  // },
  layout: () => {
    return {
      logo: <Image src={Logo} height={46} ></Image>,
      menu: {
        locale: false,
      },
   
      menuDataRender: () => menus,
    };
   }
   
  
});


const menus: MenuDataItem[] = [
  {
    name: '资源管理',
    path: '/',
    children: [
      {
        name: '文章',
        path: '/view/Articles/listview',
        component: '@/pages/index'
      },
      {
        name: '句子',
        path: '/view/Sentences/listview',
        component: '@/pages/index'
      },
      {
        name: '录入工具',
        path: '/tool',
        component: '@/pages/tool'
      }
    ]
  },
  {
    name: '权限',
    path: '/',
    children: [
      {
        name: '用户',
        path: '/view/User/listview',
        icon: 'smile',
        component: '@/pages/index'
      }
    ]
  },
  {
    name: '验证管理',
    path: '/',
    children: [
      {
        name: '手机验证码',
        path: '/view/PhoneCode/listview',
        component: '@/pages/index'
      }
    ]
  },
  {
    name: '设置',
    path: '/',
    children: [
      {
        name: '配置',
        path: '/view/Config/listview',
      }
    ]
  },
]

// export const layout: RunTimeLayoutConfig = () => {
//  return {
//    logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
//    menu: {
//      locale: false,
//    },

//    menuDataRender: () => menus,
//  };
// };

