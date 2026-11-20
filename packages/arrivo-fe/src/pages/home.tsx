import { Navigate, useLocation } from "@umijs/max";
import { AimOutlined, ArrowRightOutlined, SoundOutlined } from "@ant-design/icons";
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
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span>Arrivo</span>
          </div>
          <time className={styles.date} dateTime={today.toLocaleDateString("sv-SE")}>
            {today.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
          </time>
        </header>

        <section className={styles.cover} aria-labelledby="home-prompt">
          <h1 id="home-prompt" aria-label="现在想做什么？">
            <span>现在想</span><span>做什么<em>？</em></span>
          </h1>
          <div className={styles.art} aria-hidden="true">
            <img src="/images/arrivo-fold.webp" alt="" />
          </div>
          <HomeTaskForm resume={params.get("addTask") === "1"} />
        </section>

        <nav className={styles.modules} aria-labelledby="home-module-heading">
          <h2 id="home-module-heading">工作空间</h2>
          <div className={styles.index}>
            <a href="/mind-switch" className={styles.module} aria-labelledby="mind-title" aria-describedby="mind-description">
              <AimOutlined className={styles.icon} aria-hidden="true" />
              <h3 id="mind-title">心智切换</h3>
              <p id="mind-description">接回上次的进度，暂存新想法。</p>
              <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
            </a>
            <a href="/learn" className={styles.module} aria-labelledby="learn-title" aria-describedby="learn-description">
              <SoundOutlined className={styles.icon} aria-hidden="true" />
              <h3 id="learn-title">语言复读</h3>
              <p id="learn-description">用一篇喜欢的文章，逐句听读、跟练。</p>
              <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>
    </main>
  );
}
