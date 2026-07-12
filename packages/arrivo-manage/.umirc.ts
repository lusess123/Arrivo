import { defineConfig } from "@umijs/max";
const projectRoot = process.cwd();
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const loginUrl = isProduction ? "https://app-arrivo.zyking.xyz/login" : process.env.UMI_APP_LOGIN_URL;
const apiBaseUrl = isProduction ? "https://api-arrivo.zyking.xyz" : process.env.UMI_APP_API_BASE_URL;

export default defineConfig({
  mfsu: false, // 明确关闭 mfsu
  hash: true,
  antd: {},
  define: {
    "process.env": {
      UMI_APP_LOGIN_URL: loginUrl,
      UMI_APP_API_BASE_URL: apiBaseUrl,
    },
  },
  https: {
    cert: path.join(projectRoot, "ssl", "local-manage.zyking.xyz.pem"),
    key: path.join(projectRoot, "ssl", "local-manage.zyking.xyz-key.pem"),
  },
  esbuildMinifyIIFE: true,
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: "dashboard",
  },
  routes: [
    {
      path: "/",
      component: "index",
    },
    {
      path: "/tool",
      component: "index",
    },
    {
      name: "视图",
      path: "/view/:model/:view",
      component: "index",
    },
  ],
  npmClient: 'pnpm',
  proxy: {
    "/api": {
      target: process.env.UMI_APP_API_PROXY_TARGET || "http://localhost:3000",
      changeOrigin: true,
      secure: false,  // 禁用 SSL 证书验证
      pathRewrite: { "^/api": "" }, // 去掉 /server 前缀
    },
  }
});
