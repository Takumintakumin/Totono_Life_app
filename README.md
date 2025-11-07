# Totono Life（仮）🌞🌙

朝と夜のルーティンをこなすことで、あなたの"キャラ（生活の精霊）"が成長していく育成アプリです。

## 機能

- 🌅 **朝ルーティン画面**: 朝の習慣をチェックして経験値を獲得
- 🌙 **夜ルーティン画面**: 夜の習慣をチェックし、気分を記録
- ✨ **育成キャラ要素**: ルーティン達成で経験値UP、レベルアップ、進化
- 📅 **カレンダー/ログ画面**: 達成状況を可視化、連続達成日数を表示
- ⚙️ **設定機能**: ルーティン項目の追加・削除、通知時間設定、キャラテーマ選択

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## 技術スタック

- React 18
- TypeScript
- Vite
- React Router
- LocalStorage（データ永続化）

## 使い方

1. 朝ルーティン画面で朝の習慣をチェック
2. 夜ルーティン画面で夜の習慣をチェックし、気分を記録
3. キャラクター画面で成長を確認
4. カレンダー画面で達成状況を確認
5. 設定画面でルーティンをカスタマイズ

データはブラウザのLocalStorageに保存されます。

## GitHubへのプッシュ手順

### 1. GitHubでリポジトリを作成

1. [GitHub](https://github.com)にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例: `Totono_Life_app`）
4. 「Public」または「Private」を選択
5. 「Initialize this repository with a README」は**チェックしない**（既にREADMEがあるため）
6. 「Create repository」をクリック

### 2. ローカルリポジトリをGitHubにプッシュ

```bash
# リモートリポジトリを追加（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換えてください）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# メインブランチを設定
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

### 3. GitHub Pagesでデプロイ（オプション）

GitHub Pagesでアプリを公開する場合：

1. GitHubリポジトリの「Settings」→「Pages」に移動
2. Source で「GitHub Actions」を選択
3. 以下のワークフローファイル（`.github/workflows/deploy.yml`）を作成：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v2
      - uses: actions/upload-pages-artifact@v1
        with:
          path: dist
      - uses: actions/deploy-pages@v1
```

4. ファイルをコミット・プッシュ：

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deployment workflow"
git push
```

5. 数分後、`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` でアクセス可能になります

