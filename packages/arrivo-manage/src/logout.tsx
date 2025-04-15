import { Button} from 'antd'
import React from 'react'
import { asyncHandle } from './utils/util';
import axios from 'axios';
function extractBaseUrl(url: string): string {
    try {
      // 使用 URL 对象解析输入的 URL
      const parsedUrl = new URL(url);
  
      // 获取路径的前两个部分
      const segments = parsedUrl.pathname
        .split("/")
        .filter((segment) => segment !== "");
  
      // 拼接协议、主机名、端口号和路径的前两个部分
      if (segments.length > 0) {
        return `${parsedUrl.protocol}//${parsedUrl.host}/${segments[0]}`;
      } else {
        return `${parsedUrl.protocol}//${parsedUrl.host}`;
      }
    } catch (error) {
      console.error("Invalid URL provided:", error);
      return "";
    }
  }
export const logOutButton = <Button onClick={async () => {
    //  location.href = extractBaseUrl(`${process.env.UMI_APP_LOGIN_URL}`)
    const [err, res] = await asyncHandle(axios.post('/api/auth/signout'));
        if(err) {
            // Toast.show('Logout failed');
        } else {
            // Toast.show('Logout success');
            location.reload();
        }
        return [err, res]
}}><div>
  </div>退出</Button>