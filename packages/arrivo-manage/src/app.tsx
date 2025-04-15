import { defineApp, RunTimeLayoutConfig, useLocation, useNavigate } from '@umijs/max';
import './global.css'
import { MenuDataItem } from "@ant-design/pro-components";
// import { AppProvider , useApp } from './hooks/app';
// import { LivekitProvider } from './hooks/livekit';
import { useEffect } from 'react';
import { IRenderType } from 'arrivo-server';
import { message } from 'antd';
import { asyncHandle, get } from './utils/util';
import { logOutButton } from './logout';
import axios from 'axios';

console.log('REACT_APP_GIT_COMMIT_TIME', process.env.REACT_APP_GIT_COMMIT_TIME)
console.log('REACT_APP_GIT_COMMIT_MESSAGE', process.env.REACT_APP_GIT_COMMIT_MESSAGE)
console.log('IRenderType', IRenderType)

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<any> {
  // alert("UMI_APP_LOGIN_URL: " + process.env.UMI_APP_LOGIN_URL)
  message.info('欢迎进入vphone经营后台 ')
  const [err, res] = await asyncHandle(axios.get('/api/auth'));
   if(err) {
    message.error('登录失败')
    location.href = `${process.env.UMI_APP_LOGIN_URL}?redirect=${location.href}`
    return { name: '@umijs/max1' };
   }
   if(res?.data?.data?.access !== 'root') {
    message.error('请用有管理员权限的账号先登录,设置权限后需要重新登录才能生效')
    location.href = `${process.env.UMI_APP_LOGIN_URL}?redirect=${location.href}`
    return { name: '@umijs/max1' };
   }
  return { name: logOutButton, login : true , data: res?.data?.data };
}



function App({ children }: { children: React.ReactNode }) {
    // const { data, fetchAuth } = useApp();
    // // const location = useLocation();
    // // const navigate = useNavigate();

    // useEffect(() => {
    //    (async function () {
    //     await fetchAuth();
    //    })();
    // }, []);
    // useEffect(() => {
    //     if(data?.role === 'guest' && location.pathname !== '/login') {
    //         location.href = `/login?redirect=${location.pathname}`
    //         return;
    //     }
    //     if(data?.role === 'user' && location.pathname === '/login') {
    //         location.href = '/';
    //         return;
    //     }
    //     // location.href = `/login`
    //     // return ;

    //     // fetchAuth();
    // }, [data]);
  return  <div className='flex w-full h-full justify-center items-center'>{children}</div>
}



// export default defineApp({
//   rootContainer: (container:any) => {
//     return  <App>{container}</App>
     
//   },
  
// });


const menus: MenuDataItem[] = [
  {
    name: '资源管理',
    path: '/',
    children: [
      {
        name: '手机号',
        path: '/view/PhoneNumer/listview',
        component: '@/pages/index'
      },
      {
        name: '联系人',
        path: '/view/Contact/listview',
        component: '@/pages/index'
      },
      {
        name: '通话历史',
        path: '/view/CallHistory/listview',
        component: '@/pages/index'
      },
    ]
  },
  {
    name: '财务',
    path: '/',
    children: [
      {
        name: '订单',
        path: '/view/Order/listview',
        icon: 'smile',
        component: '@/pages/index'
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
      },
      {
        name: '邮箱验证码',
        path: '/view/EmailCode/listview',
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

export const layout: RunTimeLayoutConfig = () => {
 return {
   logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
   menu: {
     locale: false,
   },
   menuDataRender: () => menus,
 };
};

