import { Navigate, useLocation } from "@umijs/max";
import { AimOutlined, ArrowRightOutlined, AudioOutlined } from "@ant-design/icons";
import logo from "@/assets/logo.png";
import { HomeTaskForm } from "./home-task-form";
import styles from "./home.module.less";

export default function HomePage() {
  const { search, hash } = useLocation();

  const params = new URLSearchParams(search);
  if (params.has("tab")) {
    return <Navigate to={{ pathname: "/learn", search, hash }} replace />;
  }

  return (
    <main className={styles.home} lang="zh-CN">
      <header className={styles.heading}>
        <img src={logo} alt="Arrivo" width={160} height={106} />
        <h1>语言学习与专注</h1>
      </header>
      <HomeTaskForm resume={params.get("addTask") === "1"} />
      <nav className={styles.modules} aria-label="Arrivo 功能">
        <a href="/learn" className={styles.module} aria-labelledby="learn-title" aria-describedby="learn-description">
          <span className={styles.icon}><AudioOutlined aria-hidden="true" /></span>
          <div className={styles.text}>
            <h2 id="learn-title">语言复读</h2>
            <p id="learn-description">用喜欢的文章逐句听读、跟练。</p>
          </div>
          <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
        </a>
        <a href="/mind-switch" className={styles.module} aria-labelledby="mind-title" aria-describedby="mind-description">
          <span className={styles.icon}><AimOutlined aria-hidden="true" /></span>
          <div className={styles.text}>
            <h2 id="mind-title">心智切换</h2>
            <p id="mind-description">切换任务时保留上下文，随手暂存新的想法。</p>
          </div>
          <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
        </a>
      </nav>
    </main>
  );
}
