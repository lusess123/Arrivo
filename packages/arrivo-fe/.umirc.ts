import { defineConfig } from "@umijs/max";
const projectRoot = process.cwd();
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const dashboardUrl = isProduction ? "https://manage-arrivo.zyking.xyz" : process.env.UMI_APP_DASHBOARD;
const apiBaseUrl = isProduction ? "https://api-arrivo.zyking.xyz" : process.env.UMI_APP_API_BASE_URL;
const clarityProjectId = isProduction ? "xl7w8qhw2t" : process.env.UMI_APP_CLARITY_PROJECT_ID;

export default defineConfig({
  mfsu: false, // 明确关闭 mfsu
  hash: true,
  title: "Arrivo - 让语言为你的世界降临",
  links: [
    { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.svg" },
  ],
  antd: {},
  define: {
    "process.env": {
      UMI_APP_DASHBOARD: dashboardUrl,
      UMI_APP_API_BASE_URL: apiBaseUrl,
      UMI_APP_CLARITY_PROJECT_ID: clarityProjectId,
    },
  },
  https: {
    cert: path.join(projectRoot, "ssl", "local.zyking.xyz.pem"),
    key: path.join(projectRoot, "ssl", "local.zyking.xyz-key.pem"),
  },
  // locale: {
  //   // 默认使用 src/locales/zh-CN.ts 作为多语言文件
  //   default: 'zh',
  //   baseSeparator: '-',
  // },
  esbuildMinifyIIFE: true,
  routes: [
    {
      path: '/',
      component: 'index',
      wrappers: ['@/wrappers/auth'],
    },
    {
      path: '/login',
      component: 'login',
    },
    {
      path: '/article/:id',
      component: 'article',
      wrappers: ['@/wrappers/auth'],
    }
  ],
  npmClient: 'pnpm',
  // plugins: ['./src/plugins/insertNoscript.ts'],
  // devtool:  'eval-source-map',
  proxy: {
    "/api": {
      target: process.env.UMI_APP_API_PROXY_TARGET || "http://localhost:3000",
      changeOrigin: true,
      secure: false,  // 禁用 SSL 证书验证
      pathRewrite: { "^/api": "" }, // 去掉 /server 前缀
    },
  }
});
