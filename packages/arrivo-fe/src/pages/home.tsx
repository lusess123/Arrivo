import { Navigate, useLocation } from "@umijs/max";
import { AimOutlined, ArrowRightOutlined, CalendarOutlined, SoundOutlined } from "@ant-design/icons";
import { HomeTaskForm } from "./home-task-form";
import styles from "./home.module.less";

export default function HomePage() {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  if (params.has("tab")) {
    return <Navigate to={{ pathname: "/learn", search, hash }} replace />;
  }

  const today = new Date();
  return (
    <main className={styles.home} lang="zh-CN">
      <div className={styles.frame}>
        <header className={styles.masthead}>
          <div className={styles.brand}>
            <img src="/favicon.svg" alt="" width={32} height={32} />
            <span>Arrivo</span>
          </div>
          <time className={styles.date} dateTime={today.toLocaleDateString("sv-SE")}>
            <CalendarOutlined aria-hidden="true" />
            {today.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
          </time>
        </header>
        <section className={styles.hero} aria-labelledby="home-prompt">
          <img className={styles.panorama} src="/images/arrivo-horizon.webp" alt="" />
          <div className={styles.heroContent}>
            <h1 id="home-prompt">现在想做什么？</h1>
            <HomeTaskForm resume={params.get("addTask") === "1"} />
          </div>
        </section>
        <nav className={styles.modules} aria-labelledby="home-module-heading">
          <h2 id="home-module-heading">语言学习与专注</h2>
          <div className={styles.moduleList}>
            <a href="/mind-switch" className={styles.module} aria-labelledby="mind-title" aria-describedby="mind-description">
              <span className={styles.icon}><AimOutlined aria-hidden="true" /></span>
              <div className={styles.text}>
                <h3 id="mind-title">心智切换</h3>
                <p id="mind-description">接回上次的进度，暂存新想法。</p>
              </div>
              <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
            </a>
            <a href="/learn" className={styles.module} aria-labelledby="learn-title" aria-describedby="learn-description">
              <span className={styles.icon}><SoundOutlined aria-hidden="true" /></span>
              <div className={styles.text}>
                <h3 id="learn-title">语言复读</h3>
                <p id="learn-description">打开一篇文章，逐句听读、跟练。</p>
              </div>
              <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>
    </main>
  );
}
