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
- Vercel (Serverless Functions)
- MySQL (データベース)
- LocalStorage（フォールバック）

## 使い方

1. 朝ルーティン画面で朝の習慣をチェック
2. 夜ルーティン画面で夜の習慣をチェックし、気分を記録
3. キャラクター画面で成長を確認
4. カレンダー画面で達成状況を確認
5. 設定画面でルーティンをカスタマイズ

データはMySQLデータベースに保存されます。API接続に失敗した場合は、LocalStorageにフォールバックします。

## Vercel + MySQL セットアップ

### 1. MySQLデータベースの準備

#### オプションA: PlanetScale（推奨）
1. [PlanetScale](https://planetscale.com)でアカウント作成
2. 新しいデータベースを作成
3. 接続情報を取得

#### オプションB: その他のMySQLサービス
- AWS RDS
- Google Cloud SQL
- Azure Database for MySQL
- その他のMySQLホスティングサービス

### 2. データベーススキーマの作成

`database/schema.sql` ファイルの内容を実行してテーブルを作成：

```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < database/schema.sql
```

または、MySQLクライアントで直接実行してください。

### 3. Vercelへのデプロイ

1. [Vercel](https://vercel.com)でアカウント作成
2. GitHubリポジトリをインポート
3. 環境変数を設定（詳細は [VERCEL_SETUP.md](./VERCEL_SETUP.md) を参照）：
   - `MYSQL_HOST`: MySQLホスト名
   - `MYSQL_PORT`: MySQLポート（通常は3306）
   - `MYSQL_USER`: MySQLユーザー名
   - `MYSQL_PASSWORD`: MySQLパスワード
   - `MYSQL_DATABASE`: データベース名
   - `MYSQL_SSL`: SSL接続が必要な場合は `true`（PlanetScaleの場合は `true`）
4. デプロイを実行

### 4. データベースの初期化

デプロイ後、以下のエンドポイントにPOSTリクエストを送信してデータベースを初期化：

```bash
curl -X POST https://your-app.vercel.app/api/init
```

または、Vercelのダッシュボードから関数ログを確認して、自動的にテーブルが作成されることを確認してください。

### 5. 環境変数の設定（ローカル開発）

ローカルで開発する場合、`.env` ファイルを作成：

```env
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=your-database-name
MYSQL_SSL=false
VITE_API_BASE_URL=http://localhost:5173/api
```

**注意**: `.env` ファイルはGitにコミットしないでください（`.gitignore`に含まれています）。

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

