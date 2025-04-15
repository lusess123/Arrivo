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
  // locale: {
  //   // 默认使用 src/locales/zh-CN.ts 作为多语言文件
  //   default: 'zh',
  //   baseSeparator: '-',
  // },
  esbuildMinifyIIFE: true,
  routes: [
  ],
  npmClient: 'pnpm',
  // plugins: ['./src/plugins/insertNoscript.ts'],
  // devtool:  'eval-source-map',
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      changeOrigin: true,
      secure: false,  // 禁用 SSL 证书验证
      pathRewrite: { "^/api": "" }, // 去掉 /server 前缀
    },
  }
});
