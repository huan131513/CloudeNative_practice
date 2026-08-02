import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,          // ← 給 App.jsx/main.jsx 的 document、fetch）
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    
  },
  // 我只改了這裡，告訴eslint這些全域變數是合法的（不然他會覺得it, forEach這類變數沒有import）
  {
    files: ['**/*.test.{js,jsx}'],        // ← 新增：只針對測試檔
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },   // ← 測試全域（describe/it/vi/global）
    },
  },
])
