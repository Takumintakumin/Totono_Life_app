# クイックスタートガイド 🚀

Totono Lifeアプリを最短で動かすための手順です。

## ステップ1: MySQLデータベースのセットアップ（5分）

### PlanetScaleを使用する場合（推奨）

1. **アカウント作成**
   - [https://planetscale.com](https://planetscale.com) にアクセス
   - GitHubアカウントでサインアップ

2. **データベース作成**
   - 「Create database」をクリック
   - 名前: `totono-life`
   - リージョン: `ap-northeast-1` (東京)
   - プラン: `Free`
   - 「Create database」をクリック

3. **接続情報を取得**
   - データベースをクリック
   - 「Connect」→「General」を選択
   - 接続情報をコピー（後で使います）

4. **スキーマを実行**
   - 「Console」タブを開く
   - `database/schema-planetscale.sql` の内容をコピー＆ペースト
   - 「Run」をクリック

✅ **完了**: データベースの準備ができました！

---

## ステップ2: Vercelにデプロイ（5分）

1. **Vercelアカウント作成**
   - [https://vercel.com](https://vercel.com) にアクセス
   - GitHubアカウントでログイン

2. **プロジェクトをインポート**
   - 「Add New」→「Project」をクリック
   - GitHubリポジトリ `Totono_Life_app` を選択
   - 「Import」をクリック

3. **環境変数を設定**
   - 「Settings」→「Environment Variables」を開く
   - 以下の6つの環境変数を追加：

   ```
   MYSQL_HOST=xxxxx.aws.connect.psdb.cloud
   MYSQL_PORT=3306
   MYSQL_USER=xxxxx
   MYSQL_PASSWORD=pscale_xxxxx
   MYSQL_DATABASE=totono-life
   MYSQL_SSL=true
   ```
   
   （`xxxxx` の部分は、PlanetScaleから取得した実際の値に置き換えてください）

   - 各環境変数で「Production」「Preview」「Development」すべてにチェック
   - 「Save」をクリック

4. **デプロイ**
   - 「Deploy」ボタンをクリック
   - デプロイが完了するまで待つ（1-2分）

✅ **完了**: アプリがデプロイされました！

---

## ステップ3: データベースの初期化（1分）

デプロイが完了したら、データベースを初期化します：

```bash
# デプロイされたURLを確認（Vercelダッシュボードに表示されます）
# 例: https://totono-life-app.vercel.app

# ブラウザで以下のURLにアクセス、またはcurlで実行
curl -X POST https://your-app.vercel.app/api/init
```

または、Vercelダッシュボードの「Functions」タブから、`/api/data` にアクセスすると自動的にテーブルが作成されます。

✅ **完了**: データベースが初期化されました！

---

## ステップ4: アプリを開く 🎉

Vercelダッシュボードに表示されているURLをクリックして、アプリを開きます！

例: `https://totono-life-app.vercel.app`

---

## トラブルシューティング

### データベース接続エラー

- 環境変数が正しく設定されているか確認
- PlanetScaleの接続情報が正しいか確認
- Vercelで再デプロイを実行

### テーブルが見つからない

- `/api/init` エンドポイントにPOSTリクエストを送信
- Vercelの「Functions」タブでログを確認

### その他の問題

- [MYSQL_SETUP.md](./MYSQL_SETUP.md) を参照
- [VERCEL_SETUP.md](./VERCEL_SETUP.md) を参照

---

## 次のステップ

- ✅ アプリが動いている
- 📱 スマホでもアクセスできる
- 💾 データがMySQLに保存されている
- 🎨 カスタマイズを始める

おめでとうございます！🎉

