import { useEffect, useState } from "react";
import { Form, Input, Button } from "antd";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import axios from "axios";
import { useSearchParams } from "@umijs/max";
import { LanguageSwitch } from "@/components/language-switch";
import { useAuth } from "@/hooks/auth";
import { isAuthenticatedUser, resolvePostLoginPath } from "@/lib/auth-redirect";
import { useLocale } from "@/lib/locale";
import styles from "./index.module.less";

type AuthMode = "login" | "forgot" | "reset";
type Copy = readonly [zh: string, en: string];
type Feedback = { copy: Copy; error?: boolean };

const errorTranslations: Record<string, string> = {
  "账号不存在": "This account could not be found.",
  "邮箱或密码错误": "The email or password is incorrect.",
  "邮箱已注册": "This email is already registered.",
  "链接无效或已使用": "This link is invalid or has already been used.",
  "链接已过期": "This link has expired. Request a new one.",
  "链接无效": "This link is invalid.",
  "邮件服务未配置": "Email delivery is currently unavailable.",
  "请先登录": "Please sign in first.",
  "登录已过期": "Your session has expired. Sign in again.",
};

function errorCopy(error: unknown, fallback: Copy): Copy {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return ["连接失败，请联网后重试", "Couldn’t connect. Check your connection and try again."];
  const message = error.response.data?.message;
  return typeof message === "string" && Object.hasOwn(errorTranslations, message)
    ? [message, errorTranslations[message]]
    : fallback;
}

export default function LoginPage() {
  const { language, t } = useLocale();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const { loadCurrentUser, login, resetPassword, sendEmailLoginLink, sendPasswordResetEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("resetToken") || "";
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : "login");

  const redirectAfterLogin = (lastVisitedPath?: string | null) => {
    window.location.assign(
      resolvePostLoginPath(searchParams.get("redirect") || lastVisitedPath || null, window.location.origin),
    );
  };

  useEffect(() => {
    if (searchParams.get("emailLink") !== "1") return;
    setLoading(true);
    loadCurrentUser().then(([error, response]) => {
      if (error || !isAuthenticatedUser(response?.data?.data)) {
        setFeedback({ error: true, copy: errorCopy(error, ["邮箱链接登录失败", "Couldn’t sign in with this link. Request a new one."]) });
        return;
      }
      redirectAfterLogin(response?.data?.data?.lastVisitedPath);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const invalid = form.getFieldsError().filter((field) => field.errors.length);
    if (invalid.length) void form.validateFields(invalid.map((field) => field.name)).catch(() => {});
  }, [form, language]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedback(null);
    form.resetFields(["password", "confirmPassword"]);
  }

  async function sendMagicLink() {
    const fields = await form.validateFields(["email"]).catch(() => null);
    if (!fields) return;
    setSendingLink(true);
    setFeedback(null);
    try {
      const [error] = await sendEmailLoginLink(fields.email, searchParams.get("redirect"));
      setFeedback(error
        ? { error: true, copy: errorCopy(error, ["发送失败", "Couldn’t send a sign-in link. Try again."]) }
        : { copy: ["登录链接已发送", "Check your email for your sign-in link."] });
    } finally {
      setSendingLink(false);
    }
  }

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    setFeedback(null);
    try {
      if (mode === "forgot") {
        const [error] = await sendPasswordResetEmail(values.email);
        if (error) {
          setFeedback({ error: true, copy: errorCopy(error, ["发送失败", "Couldn’t send a password reset email. Try again."]) });
          return;
        }
        switchMode("login");
        setFeedback({ copy: ["如果该邮箱已注册，你会收到找回密码邮件。", "If this email is registered, you’ll receive a password reset link."] });
        return;
      }

      const [error, response] = mode === "reset"
        ? await resetPassword(resetToken, values.password)
        : await login(values.email, values.password);
      if (error) {
        const fallback: Copy = mode === "reset"
          ? ["重置密码失败", "Couldn’t reset your password. Try again."]
          : ["登录失败", "Couldn’t sign in. Try again."];
        setFeedback({ error: true, copy: errorCopy(error, fallback) });
        return;
      }
      redirectAfterLogin(response?.data?.data?.payload?.lastVisitedPath);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "forgot" ? t("找回密码", "Forgot password?")
    : mode === "reset" ? t("设置新密码", "Choose a new password") : t("邮箱登录", "Sign in with email");
  const submitText = mode === "forgot" ? t("发送找回邮件", "Send reset email")
    : mode === "reset" ? t("更新密码", "Update password") : t("登录 / 自动注册", "Continue with email");

  const passwordIcon = (visible: boolean) => (
    <button type="button" aria-label={visible ? t("隐藏密码", "Hide password") : t("显示密码", "Show password")}>
      {visible ? <EyeOutlined aria-hidden="true" /> : <EyeInvisibleOutlined aria-hidden="true" />}
    </button>
  );

  return (
    <div className={styles.container}>
      <div className={styles.language}><LanguageSwitch /></div>
      <header className={styles.header}>
        <h1><a href="/" aria-label={t("返回 Arrivo 首页", "Back to Arrivo home")}>Arrivo</a></h1>
        <p>{t("保存任务和练习进度", "Save your tasks and practice progress.")}</p>
      </header>

      <main className={styles.form}>
        <h2 className={styles.formTitle}>{title}</h2>
        {mode === "login" && (
          <p className={styles.modeHint}>
            {t("首次登录会自动创建账号，之后用同一邮箱和密码登录。", "New here? We’ll create an account with your email and password.")}
          </p>
        )}
        <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false}>
          {mode !== "reset" && (
            <Form.Item name="email" rules={[
              { required: true, message: t("请输入邮箱", "Enter your email address.") },
              { type: "email", message: t("邮箱格式错误", "Enter a valid email address.") },
            ]}>
              <Input size="large" aria-label={t("邮箱", "Email")} placeholder={t("邮箱", "Email")} autoComplete="email" />
            </Form.Item>
          )}

          {mode !== "forgot" && (
            <Form.Item name="password" rules={[
              { required: true, message: t("请输入密码", "Enter a password.") },
              { min: 6, message: t("密码至少 6 位", "Use at least 6 characters.") },
            ]}>
              <Input.Password size="large" aria-label={t("密码", "Password")} placeholder={t("密码", "Password")}
                iconRender={passwordIcon} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Form.Item>
          )}

          {mode === "reset" && (
            <Form.Item name="confirmPassword" dependencies={["password"]} rules={[
              { required: true, message: t("请再次输入密码", "Confirm your new password.") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error(t("两次密码不一致", "The passwords don’t match.")));
                },
              }),
            ]}>
              <Input.Password size="large" aria-label={t("再次输入密码", "Confirm password")}
                placeholder={t("再次输入密码", "Confirm password")} iconRender={passwordIcon} autoComplete="new-password" />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" className={styles.loginBtn} loading={loading}>
              {submitText}
            </Button>
          </Form.Item>
        </Form>

        {mode === "login" && (
          <Button block className={styles.secondaryBtn} loading={sendingLink} onClick={sendMagicLink}>
            {t("发送邮箱登录链接", "Email me a sign-in link")}
          </Button>
        )}

        {feedback && <p className={styles.feedback} role={feedback.error ? "alert" : "status"}>{t(...feedback.copy)}</p>}
        <div className={styles.linkRow}>
          {mode === "login"
            ? <Button type="link" onClick={() => switchMode("forgot")}>{t("忘记密码", "Forgot password?")}</Button>
            : <Button type="link" onClick={() => switchMode("login")}>{t("返回登录", "Back to sign-in")}</Button>}
        </div>
      </main>
      <footer className={styles.footer}>© {new Date().getFullYear()} Arrivo</footer>
    </div>
  );
}
