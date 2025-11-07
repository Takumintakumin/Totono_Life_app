import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages用のbaseパス（リポジトリ名に合わせて変更してください）
// 例: リポジトリ名が "Totono_Life_app" の場合 → base: '/Totono_Life_app/'
// 例: カスタムドメインやルートドメインの場合 → base: '/'
const base = process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: base,
})

