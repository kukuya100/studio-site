// postcss.config.js (ESM)
export default {
  plugins: {
    "@tailwindcss/postcss": {},  // ✅ v4 전용 PostCSS 플러그인
    autoprefixer: {},            // (선택) 유지해도 됩니다
  },
}
