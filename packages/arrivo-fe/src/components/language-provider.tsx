import { useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { ConfigProvider } from "antd";
import enDesktop from "antd/es/locale/en_US";
import zhDesktop from "antd/es/locale/zh_CN";
import MobileConfigProvider from "antd-mobile/es/components/config-provider";
import enMobile from "antd-mobile/es/locales/en-US";
import zhMobile from "antd-mobile/es/locales/zh-CN";
import { localizedPageTitle, useLocale } from "@/lib/locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { language } = useLocale();
  const chinese = language === "zh";
  useLayoutEffect(() => {
    document.documentElement.lang = chinese ? "zh-CN" : "en";
    document.title = localizedPageTitle(window.location.pathname);
    document.querySelector('link[rel="manifest"]')?.setAttribute("href",
      chinese ? "/manifest.webmanifest" : "/manifest.en.webmanifest");
  }, [chinese]);

  return <ConfigProvider locale={chinese ? zhDesktop : enDesktop}>
    <MobileConfigProvider locale={chinese ? zhMobile : enMobile}>{children}</MobileConfigProvider>
  </ConfigProvider>;
}
