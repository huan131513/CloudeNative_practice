// 這是前端vite的設定檔：Vite（dev server + build tool + test runner）
// 

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    enviroment: 'jsdom', // 用 jsdom 模擬瀏覽器 DOM
    globals: true, // 讓 describe/it/expect 全域可用（不用每個檔案都import）
    setupFiles: '.src/test-setup.js', //這個檔案是每個test檔跑前的統一前置
  },
})
