import { asyncHandle } from '@/utils/util';
import { message } from 'antd';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function () {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
      (async function () {
        const [err, res] = await asyncHandle(axios.get('/api/auth'));
        if(err) {
          message.error('登录失败')
          location.href = `${process.env.UMI_APP_LOGIN_URL}?redirect=${location.href}`
          return;
        }
        if(res?.data?.data?.access !== 'root') {
          message.error('请用有管理员权限的账号先登录,设置权限后需要重新登录才能生效')
          location.href = `${process.env.UMI_APP_LOGIN_URL}?redirect=${location.href}`
          return;
        }
        setData(res?.data?.data);
      })()
  }, []);

  return <div>
    <h1>经营后台</h1>
    <div>
      <h2>当前登录用户</h2>
      <p>{data?.name}</p>
      <p>{data?.email}</p>
      <p>{data?.phoneNumber}</p>
    </div>
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
    {/* {JSON.stringify(data, null, 2)} */}
    </div>;
}
