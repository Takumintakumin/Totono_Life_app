# Neon（PostgreSQL）セットアップガイド

NeonはPostgreSQLデータベースサービスです。このガイドでは、Neonを使用してTotono Lifeアプリをセットアップする方法を説明します。

## Neonの特徴

- ✅ 無料プランあり（3GBストレージ）
- ✅ PostgreSQL 15対応
- ✅ サーバーレス（自動スケーリング）
- ✅ ブランチ機能（開発・本番環境を分けられる）
- ✅ 接続文字列（DATABASE_URL）で簡単に接続

## セットアップ手順

### 1. Neonアカウント作成（既に完了）

✅ 既にNeonでデータベースを作成済みとのことです！

### 2. 接続情報の取得

1. Neonダッシュボードにログイン
2. 作成したプロジェクトを選択
3. 「Connection Details」または「Connect」をクリック
4. 以下の情報を取得：
   - **Connection string** (DATABASE_URL)
   - または個別の情報：
     - Host
     - Database
     - User
     - Password
     - Port (通常は5432)

### 3. 接続文字列の形式

Neonは通常、以下の形式の接続文字列を提供します：

```
postgresql://username:password@hostname/database?sslmode=require
```

または個別の情報：
```
Host: ep-xxxxx-xxxxx.us-east-2.aws.neon.tech
Database: neondb
User: username
Password: password
Port: 5432
SSL: Required
```

### 4. 環境変数の設定

Vercelの環境変数に以下を設定：

**方法A: DATABASE_URLを使用（推奨）**

```
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
```

**方法B: 個別の環境変数を使用**

```
POSTGRES_HOST=ep-xxxxx-xxxxx.us-east-2.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=neondb
POSTGRES_SSL=true
```

### 5. スキーマの実行

Neonダッシュボードの「SQL Editor」から、`database/schema-neon.sql` の内容を実行してください。

または、psqlコマンドで実行：

```bash
psql "postgresql://username:password@hostname/database?sslmode=require" < database/schema-neon.sql
```

---

## コードの変更

NeonはPostgreSQLなので、以下の変更が必要です：

1. ✅ `mysql2` → `pg` に変更（package.json）
2. ✅ データベース接続コードをPostgreSQL用に変更
3. ✅ スキーマをPostgreSQL用に変更
4. ✅ APIクエリをPostgreSQL用に変更

これらの変更は自動的に適用されます。

---

## 次のステップ

1. ✅ Neonでデータベース作成（完了）
2. → 接続情報を取得
3. → スキーマを実行
4. → Vercelの環境変数を設定
5. → デプロイ

---

## トラブルシューティング

### 接続エラーが発生する場合

- SSL接続が必要です（`sslmode=require`）
- 接続文字列が正しいか確認
- Neonダッシュボードで接続情報を再確認

### スキーマエラーが発生する場合

- PostgreSQL用のスキーマ（`schema-neon.sql`）を使用しているか確認
- ENUM型の定義方法が異なる場合があります

---

## Neonの無料プラン

- ストレージ: 3GB
- 計算時間: 制限あり
- ブランチ: 無制限（開発用）
- 個人アプリには十分な容量！

