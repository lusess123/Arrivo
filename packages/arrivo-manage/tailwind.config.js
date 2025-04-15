module.exports = {
  theme: {
    extend: {
      animation: {
        'breath': 'breath 2s ease-in-out infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' }, // 放大到1.08倍
        },
      },
    },
  },
  
  content: [
    './src/pages/**/*.tsx',
    './src/components/**/*.tsx',
    './src/layouts/**/*.tsx',
  ],
}
