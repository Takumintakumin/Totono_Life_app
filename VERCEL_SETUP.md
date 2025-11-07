# Vercel環境変数の設定方法

## 方法1: Vercelダッシュボードで設定（推奨）

### 手順

1. **Vercelにログイン**
   - [https://vercel.com](https://vercel.com) にアクセス
   - GitHubアカウントでログイン

2. **プロジェクトを選択**
   - ダッシュボードからプロジェクトを選択
   - または、GitHubリポジトリをインポート（まだの場合）

3. **Settingsに移動**
   - プロジェクトページの上部メニューから「Settings」をクリック

4. **Environment Variablesを開く**
   - 左サイドバーから「Environment Variables」を選択

5. **環境変数を追加**
   以下の環境変数を1つずつ追加：

   | Key | Value | 説明 |
   |-----|-------|------|
   | `MYSQL_HOST` | `your-mysql-host` | MySQLサーバーのホスト名（例: `aws-0-us-west-1.pooler.supabase.com`） |
   | `MYSQL_PORT` | `3306` | MySQLポート（通常は3306） |
   | `MYSQL_USER` | `your-username` | MySQLユーザー名 |
   | `MYSQL_PASSWORD` | `your-password` | MySQLパスワード |
   | `MYSQL_DATABASE` | `your-database-name` | データベース名 |
   | `MYSQL_SSL` | `true` または `false` | SSL接続が必要な場合（PlanetScaleは `true`） |

6. **環境を選択**
   - 各環境変数に対して、適用する環境を選択：
     - ✅ Production（本番環境）
     - ✅ Preview（プレビュー環境）
     - ✅ Development（開発環境）
   
   **推奨**: すべての環境にチェックを入れる

7. **保存**
   - 「Save」ボタンをクリック

8. **再デプロイ**
   - 環境変数を追加・変更した後は、再デプロイが必要です
   - 「Deployments」タブから最新のデプロイメントを選択
   - 「Redeploy」をクリック

## 方法2: Vercel CLIで設定

### Vercel CLIのインストール

```bash
npm install -g vercel
```

### ログイン

```bash
vercel login
```

### 環境変数の設定

```bash
# プロジェクトディレクトリに移動
cd /Users/yokotatakumi/Desktop/Totono_Life_app

# 環境変数を設定（すべての環境に適用）
vercel env add MYSQL_HOST production preview development
vercel env add MYSQL_PORT production preview development
vercel env add MYSQL_USER production preview development
vercel env add MYSQL_PASSWORD production preview development
vercel env add MYSQL_DATABASE production preview development
vercel env add MYSQL_SSL production preview development
```

各コマンドを実行すると、値の入力を求められます。

### 一括設定（.envファイルから）

```bash
# .envファイルを作成（既に作成済みの場合）
# 以下のコマンドで一括インポート
vercel env pull .env.local
```

## 方法3: .envファイルを使用（ローカル開発のみ）

ローカル開発用に `.env` ファイルを作成：

```env
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=your-database-name
MYSQL_SSL=false
VITE_API_BASE_URL=http://localhost:5173/api
```

**注意**: `.env` ファイルはGitにコミットされません（`.gitignore`に含まれています）

## 各MySQLサービスの設定例

### PlanetScaleの場合

```env
MYSQL_HOST=aws.connect.psdb.cloud
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database-name
MYSQL_SSL=true
```

### Neon（PostgreSQL）の場合

**方法A: DATABASE_URLを使用（推奨）**

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**方法B: 個別の環境変数を使用**

```env
POSTGRES_HOST=ep-xxxxx-xxxxx.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=neondb
POSTGRES_SSL=true
```

**注意**: NeonはPostgreSQLなので、pgライブラリを使用します。詳細は [NEON_SETUP.md](./NEON_SETUP.md) を参照してください。

### AWS RDSの場合

```env
MYSQL_HOST=your-db-instance.xxxxx.us-east-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database-name
MYSQL_SSL=true
```

## 環境変数の確認

### Vercelダッシュボードで確認

1. Settings → Environment Variables
2. 設定した環境変数が表示されます
3. 値はセキュリティのため、マスクされています

### Vercel CLIで確認

```bash
vercel env ls
```

## トラブルシューティング

### 環境変数が反映されない場合

1. **再デプロイを実行**
   - 環境変数を変更した後は、必ず再デプロイが必要です

2. **環境の確認**
   - Production、Preview、Developmentのどれに設定したか確認

3. **ログを確認**
   - Vercelダッシュボードの「Functions」タブからログを確認
   - エラーメッセージを確認

4. **環境変数の名前を確認**
   - 大文字小文字を正確に入力しているか確認
   - スペースや特殊文字が含まれていないか確認

## セキュリティのベストプラクティス

1. **パスワードは強力なものを使用**
2. **環境変数は直接コードに書かない**
3. **本番環境と開発環境で異なるデータベースを使用**
4. **定期的にパスワードを変更**

