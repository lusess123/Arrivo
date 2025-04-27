import { Button, Card, CountdownProps, Descriptions } from 'antd';
import React from 'react';
import { Col, Row, Statistic } from 'antd';
import { useModel } from '@umijs/max';
// import useApp from 'antd/es/app/useApp';

const { Countdown } = Statistic;

const deadline = Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 30; // Dayjs is also OK

const onFinish: CountdownProps['onFinish'] = () => {
  console.log('finished!');
};

const onChange: CountdownProps['onChange'] = (val) => {
  if (typeof val === 'number' && 4.95 * 1000 < val && val < 5 * 1000) {
    console.log('changed!');
  }
};


export default function () {
  const { initialState } =
    useModel('@@initialState');
  const auth = initialState.data;
  return  <div className='w-full h-screen  flex justify-center '>
   <Descriptions column={2} title="用户信息" size='default' >
  <Descriptions.Item label="手机号">{auth?.mobile}</Descriptions.Item>
  <Descriptions.Item label="是否管理员">{auth?.access === 'root' ? '是' : '否'}</Descriptions.Item>
  <Descriptions.Item label="上次登录时间">{auth?.lastLoginTime}</Descriptions.Item>
  </Descriptions>
  </div>
}