import { useEffect, useState } from "react";
import { Form, Input, Button, message } from "antd";
import { useSearchParams } from "@umijs/max";
// @ts-ignore – allow importing Less module without a declared type
import styles from "./index.module.less";
import { useAuth } from "@/hooks/auth";
import { resolvePostLoginPath } from "@/lib/auth-redirect";

type AuthMode = "login" | "forgot" | "reset";

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const {
    loadCurrentUser,
    login,
    resetPassword,
    sendEmailLoginLink,
    sendPasswordResetEmail,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("resetToken") || "";
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : "login");

  const redirectAfterLogin = (lastVisitedPath?: string | null) => {
    window.location.assign(
      resolvePostLoginPath(
        searchParams.get("redirect") || lastVisitedPath || null,
        window.location.origin,
      ),
    );
  };

  useEffect(() => {
    if (searchParams.get("emailLink") !== "1") return;
    setLoading(true);
    loadCurrentUser()
      .then(([error, response]) => {
        if (error) {
          message.error(getErrorMessage(error, "邮箱链接登录失败"));
          return;
        }
        message.success("登录成功");
        redirectAfterLogin(response?.data?.data?.lastVisitedPath);
      })
      .finally(() => setLoading(false));
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    form.resetFields(["password", "confirmPassword"]);
  };

  const sendMagicLink = async () => {
    try {
      const { email } = await form.validateFields(["email"]);
      setSendingLink(true);
      const [error] = await sendEmailLoginLink(
        email,
        searchParams.get("redirect"),
      );
      if (error) {
        message.error(getErrorMessage(error, "发送失败"));
        return;
      }
      message.success("登录链接已发送");
    } finally {
      setSendingLink(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (mode === "forgot") {
        const [error] = await sendPasswordResetEmail(values.email);
        if (error) {
          message.error(getErrorMessage(error, "发送失败"));
          return;
        }
        message.success("找回密码邮件已发送");
        switchMode("login");
        return;
      }

      if (mode === "reset") {
        const [error] = await resetPassword(resetToken, values.password);
        if (error) {
          message.error(getErrorMessage(error, "重置密码失败"));
          return;
        }
        message.success("密码已更新");
        redirectAfterLogin(res?.data?.data?.payload?.lastVisitedPath);
        return;
      }

      const [error, res] = await login(values.email, values.password);
      if (error) {
        message.error(getErrorMessage(error, "登录失败"));
        return;
      }
      message.success("登录成功");
      redirectAfterLogin(res?.data?.data?.payload?.lastVisitedPath);
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "forgot"
      ? "找回密码"
      : mode === "reset"
        ? "设置新密码"
        : "邮箱登录";
  const submitText =
    mode === "forgot"
      ? "发送找回邮件"
      : mode === "reset"
        ? "更新密码"
        : "登录 / 自动注册";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1> Arrivo</h1>
        <p>突破语言的边界，就是打开世界的边界</p>
      </header>

      <main className={styles.form}>
        <h2 className={styles.formTitle}>{title}</h2>
        {mode === "login" && (
          <p className={styles.modeHint}>
            首次登录会自动创建账号，之后用同一邮箱和密码登录。
          </p>
        )}
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          {mode !== "reset" && (
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "请输入邮箱" },
                { type: "email", message: "邮箱格式错误" },
              ]}
            >
              <Input size="large" placeholder="邮箱" autoComplete="email" />
            </Form.Item>
          )}

          {mode !== "forgot" && (
            <Form.Item
              name="password"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="密码"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </Form.Item>
          )}

          {mode === "reset" && (
            <Form.Item
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "请再次输入密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value)
                      return Promise.resolve();
                    return Promise.reject(new Error("两次密码不一致"));
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className={styles.loginBtn}
              loading={loading}
            >
              {submitText}
            </Button>
          </Form.Item>
        </Form>

        {mode === "login" && (
          <Button
            block
            className={styles.secondaryBtn}
            loading={sendingLink}
            onClick={sendMagicLink}
          >
            发送邮箱登录链接
          </Button>
        )}

        <div className={styles.linkRow}>
          {mode === "login" && (
            <>
              <Button type="link" onClick={() => switchMode("forgot")}>
                忘记密码
              </Button>
            </>
          )}
          {mode === "forgot" && (
            <Button type="link" onClick={() => switchMode("login")}>
              返回登录
            </Button>
          )}
          {mode === "reset" && (
            <Button type="link" onClick={() => switchMode("login")}>
              返回登录
            </Button>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Arrivo
      </footer>
    </div>
  );
}
