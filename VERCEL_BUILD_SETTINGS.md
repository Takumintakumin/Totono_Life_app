# Vercelビルド設定

## Vercelダッシュボードでの設定

Vercelプロジェクトの「Settings」→「General」→「Build & Development Settings」で以下を設定：

### Install Command
```
npm install
```
または空白のまま（デフォルトで `npm install` が実行されます）

### Build Command
```
npm run build
```

### Output Directory
```
dist
```

### Root Directory
空白のまま（プロジェクトルートを使用）

---

## 設定の説明

### Install Command
- 依存関係をインストールするコマンド
- デフォルト: `npm install`
- 通常は変更不要

### Build Command
- アプリをビルドするコマンド
- `package.json` の `build` スクリプトを実行
- Viteプロジェクトの場合: `npm run build` → `vite build`

### Output Directory
- ビルドされたファイルが出力されるディレクトリ
- Viteプロジェクトの場合: `dist`
- このディレクトリの内容がVercelにデプロイされます

---

## 自動検出について

Vercelは `package.json` を自動的に検出して、適切な設定を推測します：

- `package.json` がある → `npm install` を実行
- `build` スクリプトがある → `npm run build` を実行
- Viteプロジェクト → `dist` を出力ディレクトリとして認識

**通常は設定を変更する必要はありません！**

---

## 確認方法

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「General」を選択
3. 「Build & Development Settings」セクションを確認
4. 上記の設定になっているか確認

もし自動検出されていない場合は、手動で上記の値を設定してください。

---

## トラブルシューティング

### ビルドエラーが発生する場合

1. **Build Commandを確認**
   - `npm run build` が正しく設定されているか
   - `package.json` に `build` スクリプトがあるか

2. **Output Directoryを確認**
   - `dist` が正しく設定されているか
   - ビルド後に `dist` ディレクトリが作成されるか

3. **ログを確認**
   - Vercelの「Deployments」タブからログを確認
   - エラーメッセージを確認

### ビルドは成功するが、アプリが表示されない場合

- `vercel.json` の設定を確認
- APIルートの設定を確認
- 環境変数が正しく設定されているか確認

