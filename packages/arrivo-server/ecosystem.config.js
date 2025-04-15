// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require('os');
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const cpuCount = process.NODE_ENV === 'production' ? os.cpus().length : 2;

module.exports = {
  apps: [
    {
      name: 'vvvo-server', // 应用名称
      script: 'dist/main.js', // 编译后的入口文件
      instances: Math.max(1, Math.floor(cpuCount / 2)), // 实例数量，确保至少有一个实例
      exec_mode: 'cluster', // 使用 cluster 模式
      env: {
        NODE_ENV: process.NODE_ENV, // 环境变
      },
    },
  ],
};
