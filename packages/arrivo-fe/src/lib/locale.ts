import { useSyncExternalStore } from "react";
import { languagePreferenceKey, resolveLanguage } from "./ui-language";
import type { UiLanguage } from "./ui-language";

export type { UiLanguage };
export type Translate = (zh: string, en: string) => string;
export type MessagePair = readonly [zh: string, en: string];

const languages = {
  zh: { language: "zh", locale: "zh-CN", t: (zh: string, _en: string) => zh },
  en: { language: "en", locale: "en-US", t: (_zh: string, en: string) => en },
} as const;

function readPreference() {
  try {
    return window.localStorage.getItem(languagePreferenceKey);
  } catch {
    return null;
  }
}

let preference = typeof window === "undefined" ? null : readPreference();
const listeners = new Set<() => void>();

export function getLanguage(): UiLanguage {
  if (typeof navigator === "undefined") return resolveLanguage(preference, []);
  return resolveLanguage(preference, navigator.languages?.length ? navigator.languages : [navigator.language]);
}

export function setLanguage(language: UiLanguage) {
  preference = language;
  try {
    window.localStorage.setItem(languagePreferenceKey, language);
  } catch {
    // Keep the explicit choice for the current document when storage is unavailable.
  }
  notify();
}

function notify() {
  listeners.forEach(listener => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== languagePreferenceKey && event.key !== null) return;
  preference = readPreference();
  notify();
}

function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("languagechange", notify);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("languagechange", notify);
    }
  };
}

export function translate(zh: string, en: string) {
  return languages[getLanguage()].t(zh, en);
}

export function useLocale() {
  return languages[useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage)];
}

export function localizedPageTitle(pathname: string) {
  const section = pathname.split("/")[1];
  switch (section) {
    case "learn": return translate("语言复读", "Language Practice") + " · Arrivo";
    case "mind-switch": return translate("心智切换", "MindSwitch") + " · Arrivo";
    case "login": return translate("登录", "Sign in") + " · Arrivo";
    case "article": return translate("文章练习", "Article practice") + " · Arrivo";
    default: return "Arrivo";
  }
}
