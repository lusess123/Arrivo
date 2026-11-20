import { setLanguage, useLocale } from "@/lib/locale";
import styles from "./language-switch.module.less";

export function LanguageSwitch() {
  const { language } = useLocale();
  const target = language === "zh" ? "en" : "zh";
  return <button
    type="button"
    className={styles.switcher}
    lang={target === "zh" ? "zh-CN" : "en"}
    onClick={() => setLanguage(target)}
  >{target === "en" ? "English" : "中文"}</button>;
}
