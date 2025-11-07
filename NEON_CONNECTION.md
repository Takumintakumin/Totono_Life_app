# Neon接続情報とセットアップ

## 接続情報

Neonから取得した接続文字列：
```
postgresql://neondb_owner:npg_MRpzKYT1k4Ej@ep-floral-sky-ahum7z9i-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 環境変数の設定

### Vercelダッシュボードで設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. 以下の環境変数を追加：

**方法A: DATABASE_URLを使用（推奨・簡単）**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_MRpzKYT1k4Ej@ep-floral-sky-ahum7z9i-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require` |

**方法B: 個別の環境変数を使用**

| Key | Value |
|-----|-------|
| `POSTGRES_HOST` | `ep-floral-sky-ahum7z9i-pooler.c-3.us-east-1.aws.neon.tech` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_USER` | `neondb_owner` |
| `POSTGRES_PASSWORD` | `npg_MRpzKYT1k4Ej` |
| `POSTGRES_DATABASE` | `neondb` |
| `POSTGRES_SSL` | `true` |

5. 各環境変数で「Production」「Preview」「Development」すべてにチェック
6. 「Save」をクリック
7. 「Deployments」タブから「Redeploy」をクリック

## スキーマの実行

### 方法1: Neonダッシュボードから（推奨）

1. Neonダッシュボードにログイン
2. プロジェクトを選択
3. 「SQL Editor」タブを開く
4. `database/schema-neon.sql` の内容をコピー＆ペースト
5. 「Run」ボタンをクリック

### 方法2: psqlコマンドから

```bash
# 接続文字列を使ってスキーマを実行
psql 'postgresql://neondb_owner:npg_MRpzKYT1k4Ej@ep-floral-sky-ahum7z9i-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' < database/schema-neon.sql
```

### 方法3: 手動で実行

```bash
# psqlに接続
psql 'postgresql://neondb_owner:npg_MRpzKYT1k4Ej@ep-floral-sky-ahum7z9i-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'

# スキーマファイルの内容をコピー＆ペーストして実行
```

## 接続テスト

データベースが正しく設定されたか確認：

```bash
psql 'postgresql://neondb_owner:npg_MRpzKYT1k4Ej@ep-floral-sky-ahum7z9i-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "\dt"
```

以下のテーブルが表示されれば成功：
- users
- characters
- routine_settings
- day_logs

## 次のステップ

1. ✅ Neonでデータベース作成（完了）
2. ✅ 接続情報を取得（完了）
3. → スキーマを実行（上記の方法で実行）
4. → Vercelの環境変数を設定
5. → Vercelにデプロイ
6. → `/api/init` エンドポイントで初期化確認

## トラブルシューティング

### psqlコマンドが見つからない場合

macOSの場合：
```bash
brew install postgresql
```

### 接続エラーが発生する場合

- SSL接続が必要です（`sslmode=require`）
- 接続文字列が正しいか確認
- Neonダッシュボードで接続情報を再確認

### スキーマエラーが発生する場合

- PostgreSQL用のスキーマ（`schema-neon.sql`）を使用しているか確認
- ENUM型の定義が正しいか確認

