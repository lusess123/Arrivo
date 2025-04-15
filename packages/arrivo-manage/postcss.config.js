// postcss.config.js
module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}'],
    darkMode: false, // 或者 'media' 或 'class'
  plugins: {
    '@tailwindcss/postcss': {},
    // 其他插件...
  },
};