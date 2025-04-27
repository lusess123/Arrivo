import { defineConfig } from "@umijs/max";
const projectRoot = process.cwd();
import path from "path";

export default defineConfig({
  mfsu: false, // 明确关闭 mfsu
  hash: true,
  antd: {},
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
    title: "Arrivo经营后台",
  },
  routes: [
    {
      path: "/",
      component: "index",
    },
    {
      path: "/tool",
      component: "./tool",
    },
    {
      name: "视图",
      path: "/view/:model/:view",
      component: "./View",
    },
  ],
  npmClient: 'pnpm',
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      changeOrigin: true,
      secure: false,  // 禁用 SSL 证书验证
      pathRewrite: { "^/api": "" }, // 去掉 /server 前缀
    },
  }
});
