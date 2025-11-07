# MySQLデータベースのセットアップ手順

> 💡 **無料データベースサービスの比較は [FREE_DATABASE_COMPARISON.md](./FREE_DATABASE_COMPARISON.md) を参照してください**

## オプション1: PlanetScale（最推奨・無料プランあり）

PlanetScaleは無料プランがあり、MySQL互換で簡単に始められます。

### 手順

#### 1. PlanetScaleアカウント作成

1. [https://planetscale.com](https://planetscale.com) にアクセス
2. 「Sign up」をクリック
3. GitHubアカウントでサインアップ（推奨）

#### 2. データベース作成

1. ダッシュボードにログイン
2. 「Create database」をクリック
3. 以下の情報を入力：
   - **Name**: `totono-life`（任意の名前）
   - **Region**: 最寄りのリージョンを選択（例: `ap-northeast-1` for 東京）
   - **Plan**: `Free` を選択
4. 「Create database」をクリック

#### 3. 接続情報の取得

1. 作成したデータベースをクリック
2. 「Connect」ボタンをクリック
3. 「Connect with」から「General」を選択
4. 接続情報が表示されます：
   ```
   Host: xxxxx.aws.connect.psdb.cloud
   Username: xxxxx
   Password: pscale_xxxxx
   Database: totono-life
   ```

#### 4. ブランチの作成（オプション）

PlanetScaleはブランチ機能がありますが、最初は `main` ブランチを使用します。

#### 5. スキーマの実行

**方法A: PlanetScaleダッシュボードから**

1. データベースの「Console」タブを開く
2. SQLエディタに `database/schema.sql` の内容をコピー＆ペースト
3. 実行ボタンをクリック

**方法B: PlanetScale CLIから**

```bash
# PlanetScale CLIをインストール
brew install planetscale/tap/pscale

# ログイン
pscale auth login

# データベースに接続
pscale connect totono-life main --port 3309

# 別のターミナルでスキーマを実行（PlanetScale用）
mysql -h 127.0.0.1 -P 3309 -u root < database/schema-planetscale.sql
```

**方法C: 直接接続（MySQLクライアント）**

```bash
mysql -h xxxxx.aws.connect.psdb.cloud \
      -u xxxxx \
      -p \
      -D totono-life \
      < database/schema.sql
```

パスワードを求められたら、PlanetScaleから取得したパスワードを入力。

#### 6. 接続情報をメモ

以下の情報をメモしておきます（Vercelの環境変数設定で使用）：

```
MYSQL_HOST=xxxxx.aws.connect.psdb.cloud
MYSQL_PORT=3306
MYSQL_USER=xxxxx
MYSQL_PASSWORD=pscale_xxxxx
MYSQL_DATABASE=totono-life
MYSQL_SSL=true
```

---

## オプション2: Supabase（PostgreSQL - 注意が必要）

SupabaseはPostgreSQLなので、コードの変更が必要です。MySQLを使いたい場合は、PlanetScaleを推奨します。

---

## オプション3: Railway（無料プランあり）

### 手順

1. [https://railway.app](https://railway.app) にアクセス
2. GitHubアカウントでサインアップ
3. 「New Project」→「Provision MySQL」を選択
4. データベースが作成されたら、「Variables」タブで接続情報を確認
5. 「Connect」タブから接続文字列を取得

---

## オプション4: ローカルMySQL（開発用）

### macOSの場合

```bash
# HomebrewでMySQLをインストール
brew install mysql

# MySQLを起動
brew services start mysql

# ルートパスワードを設定（初回のみ）
mysql_secure_installation

# データベースを作成
mysql -u root -p
```

MySQLコンソールで：

```sql
CREATE DATABASE totono_life;
USE totono_life;
SOURCE /Users/yokotatakumi/Desktop/Totono_Life_app/database/schema.sql;
EXIT;
```

---

## スキーマファイルの確認

`database/schema.sql` ファイルの内容を確認：

```bash
cat database/schema.sql
```

このファイルには以下のテーブルが含まれています：
- `users` - ユーザー情報
- `characters` - キャラクター情報
- `routine_settings` - ルーティン設定
- `day_logs` - 日次ログ

---

## 接続テスト

データベースが正しく設定されたか確認：

### PlanetScaleの場合

```bash
mysql -h xxxxx.aws.connect.psdb.cloud \
      -u xxxxx \
      -p \
      -D totono-life \
      -e "SHOW TABLES;"
```

以下のテーブルが表示されれば成功：
- users
- characters
- routine_settings
- day_logs

### ローカルMySQLの場合

```bash
mysql -u root -p totono_life -e "SHOW TABLES;"
```

---

## 次のステップ

1. ✅ データベースの作成
2. ✅ スキーマの実行
3. ✅ 接続情報の取得
4. → [Vercelの環境変数設定](./VERCEL_SETUP.md) に進む

---

## トラブルシューティング

### 接続エラーが発生する場合

1. **ホスト名、ユーザー名、パスワードを確認**
2. **ファイアウォール設定を確認**（ローカルMySQLの場合）
3. **SSL接続が必要か確認**（PlanetScaleは必須）

### テーブルが作成されない場合

1. **スキーマファイルの構文を確認**
2. **データベースを選択しているか確認**（`USE database_name;`）
3. **権限を確認**（CREATE TABLE権限があるか）

### PlanetScaleでエラーが出る場合

- PlanetScaleは一部のMySQL構文をサポートしていない場合があります
- エラーメッセージを確認して、必要に応じてスキーマを調整

---

## 推奨サービス比較

| サービス | 無料プラン | MySQL互換 | 難易度 | 推奨度 |
|---------|----------|----------|--------|--------|
| PlanetScale | ✅ あり | ✅ 完全互換 | ⭐ 簡単 | ⭐⭐⭐⭐⭐ |
| Railway | ✅ あり | ✅ 完全互換 | ⭐⭐ 普通 | ⭐⭐⭐⭐ |
| Supabase | ✅ あり | ❌ PostgreSQL | ⭐⭐ 普通 | ⭐⭐ |
| ローカル | ✅ 無料 | ✅ 完全互換 | ⭐⭐⭐ やや難 | ⭐⭐⭐ |

**結論**: 初心者の方は **PlanetScale** を強く推奨します！

