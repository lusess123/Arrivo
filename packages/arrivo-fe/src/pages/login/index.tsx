import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { history, useSearchParams } from '@umijs/max';
// @ts-ignore – allow importing Less module without a declared type
import styles from './index.module.less';
import axios from 'axios';
// @ts-ignore – allow importing Less module without a declared type
// import footerLogo from '../../assets/logo.png';
import { asyncHandle } from '../../lib';
import { useAuth } from '@/hooks/auth';

export default function LoginPage() {
  const [form] = Form.useForm();
  const [countdown, setCountdown] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const startCountdown = () => {
    let counter = 59;
    setCountdown(counter);
    const timer = setInterval(() => {
      counter -= 1;
      setCountdown(counter);
      if (counter <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  };

  const sendCode = async () => {
    try {
      const phone = form.getFieldValue('phone');
      if (!phone) {
        message.warning('请输入手机号');
        return;
      }
      setSending(true);
      const [error] = await asyncHandle(axios.post('/api/auth/sendSmsCode', { phoneNumber: phone }));
      if (!error) {
        message.success('验证码已发送');
        startCountdown();
      } else {
        message.error('发送失败');
      }
    } catch (error: any) {
      message.error(error?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const [error, res] = await login(values.phone, values.code);
      if (!error) {
        message.success('登录成功');
        // Get redirect URL from query string if it exists
        const redirectUrl = searchParams.get('redirect');
        history.push(redirectUrl || '/');
      } else {
        message.error(error?.message || '登录失败');
      }
    } catch (error: any) {
      message.error(error?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1> Arrivo</h1>
        <p>突破语言的边界，就是打开世界的边界</p>
      </header>

      <main className={styles.form}>
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式错误' },
            ]}
          >
            <Input
              size="large"
              placeholder="请输入手机号"
              maxLength={11}
              autoComplete="tel"
            />
          </Form.Item>

          <Form.Item
            name="code"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Input
              size="large"
              placeholder="输入验证码"
              maxLength={6}
              addonAfter={
                <Button
                  type="link"
                  className={styles.getCodeBtn}
                  disabled={countdown > 0}
                  loading={sending}
                  onClick={sendCode}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className={styles.loginBtn}
              loading={loading}
            >
              登录 / 注册
            </Button>
          </Form.Item>
        </Form>
      </main>

      <footer className={styles.footer}>
       
        © {new Date().getFullYear()} Arrivo
      </footer>
    </div>
  );
}
