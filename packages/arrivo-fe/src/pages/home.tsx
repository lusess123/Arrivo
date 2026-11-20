import { Navigate, useLocation } from "@umijs/max";
import { AimOutlined, ArrowRightOutlined, SoundOutlined } from "@ant-design/icons";
import { LanguageSwitch } from "@/components/language-switch";
import { useLocale } from "@/lib/locale";
import { HomeTaskForm } from "./home-task-form";
import styles from "./home.module.less";

export default function HomePage() {
  const { language, locale, t } = useLocale();
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  if (params.has("tab")) {
    return <Navigate to={{ pathname: "/learn", search, hash }} replace />;
  }

  const today = new Date();
  return (
    <main className={styles.home} lang={locale}>
      <div className={styles.frame}>
        <header className={styles.masthead}>
          <div className={styles.brand}>
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span>Arrivo</span>
          </div>
          <div className={styles.headerActions}>
            <time className={styles.date} dateTime={today.toLocaleDateString("sv-SE")}>
              {today.toLocaleDateString(locale, { month: "short", day: "numeric", weekday: "short" })}
            </time>
            <LanguageSwitch />
          </div>
        </header>

        <section className={styles.cover} aria-labelledby="home-prompt">
          <h1 id="home-prompt" aria-label={t("现在想做什么？", "What’s next?")}>
            <span>{t("现在想", "What’s")}</span><span>{t("做什么", "next")}<em>{language === "en" ? "?" : "？"}</em></span>
          </h1>
          <HomeTaskForm resume={params.get("addTask") === "1"} />
        </section>

        <nav className={styles.modules} aria-labelledby="home-module-heading">
          <h2 id="home-module-heading">{t("工作空间", "Workspaces")}</h2>
          <div className={styles.index}>
            <a href="/mind-switch" className={styles.module} aria-labelledby="mind-title" aria-describedby="mind-description">
              <AimOutlined className={styles.icon} aria-hidden="true" />
              <h3 id="mind-title">{t("心智切换", "MindSwitch")}</h3>
              <p id="mind-description">{t("接回上次的进度，暂存新想法。", "Pick up where you left off and jot down ideas.")}</p>
              <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
            </a>
            <a href="/learn" className={styles.module} aria-labelledby="learn-title" aria-describedby="learn-description">
              <SoundOutlined className={styles.icon} aria-hidden="true" />
              <h3 id="learn-title">{t("语言复读", "Language Practice")}</h3>
              <p id="learn-description">{t("用一篇喜欢的文章，逐句听读、跟练。", "Listen to an article and practice one sentence at a time.")}</p>
              <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>
    </main>
  );
}
