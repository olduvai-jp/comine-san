# CLI ガイド（ドラフト）

## はじめに

`Comine San` は ComfyUI の `workflow_api.json` を読み取り、ノード入出力に応じて CLI 引数を自動生成するツールです。本ガイドでは CLI 利用者向けにインストール方法、コマンド例、トラブルシューティングをまとめます。

## クイックスタート

```bash
# 1. ComfyUI から workflow_api.json をエクスポート
# 2. サーバーをローカルで起動済みとする (http://127.0.0.1:8188)

npx comine-san ./workflows/workflow_api.json \
  --Prompt_Text.string "generate a cute mascot" \
  --output-json ./results/metadata.json
```

- `workflow-path`: 最初の必須引数。ComfyUI でエクスポートした JSON へのパス。
- `--server`: ComfyUI の URL。省略時は `http://127.0.0.1:8188`。
- `--output-json`: 実行結果（各出力ノードの戻り値）を保存するパス。省略時は `metadata.json`。
- それ以外の `--<ノードタイトル>.<入力名>` オプションはワークフローから自動生成され、デフォルト値も `workflow_api.json` から抽出されます。

## インストールと実行方法

| 方法                   | コマンド                                                               | 補足                                                |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| 一度きりの実行         | `npx comine-san <workflow>`                                            | Node.js 18+ 必須。`npm`/`pnpm`/`yarn` いずれでも OK |
| グローバルインストール | `npm i -g comine-san` → `comine-san <workflow>`                        | CLI を頻繁に使う場合に便利                          |
| package.json Script    | `"scripts": { "generate": "comine-san ./workflow.json --server ..." }` | CI やバッチから呼び出しやすい                       |

アンインストール: `npm uninstall -g comine-san` またはローカルプロジェクトから `npm uninstall comine-san`。

## コマンドオプション一覧

| オプション                 | 型                 | デフォルト              | 説明                                                 |
| -------------------------- | ------------------ | ----------------------- | ---------------------------------------------------- |
| `<workflow-path>`          | path               | なし                    | 必須。ワークフロー JSON の場所                       |
| `--server <url>`           | string             | `http://127.0.0.1:8188` | ComfyUI サーバーの URL                               |
| `--output-json <path>`     | string             | `metadata.json`         | 実行結果を保存する JSON の出力パス                   |
| `--<NodeTitle>.<InputKey>` | string/number/bool | ワークフロー定義        | 自動生成されたノード引数。例: `--Prompt_Text.string` |

`comine-san --help` で現在のワークフローから生成された全オプションを確認できます。

## 実行例

```bash
comine-san ./workflows/workflow_api.json \
  --server http://127.0.0.1:8188 \
  --output-json ./results/output.json \
  --Prompt_Text.string "test prompt" \
  --SaveImage.filename ./results/image.png
```

実行後:

- `results/image.png`: `SaveImage` ノードの出力。複数枚生成する場合は連番になります。
- `results/output.json`: すべての出力ノード（`ShowText`, `ShowAnyToJson` など）の結果をまとめたオブジェクト。
- 標準出力: コマンドの進行ログと完了メッセージ。

## エラーとトラブルシューティング

| 症状                                | 原因                                | 対処                                                       |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `File not found: workflow_api.json` | パスの指定ミス                      | `pwd` でディレクトリを確認し、相対/絶対パスを見直す        |
| `ECONNREFUSED 127.0.0.1:8188`       | ComfyUI が起動していない/ポート違い | `--server` オプションで正しい URL を指定、ComfyUI を起動   |
| `Failed to parse ComfyUI response`  | サーバーがエラー HTML を返却        | ComfyUI 側のログを確認。`-v` オプションなど今後の改善予定  |
| 途中でハングする                    | WebSocket 未切断                    | ComfyUI 0.2.x 以降で挙動が安定。最新バージョンへの更新推奨 |

## CI や自動化での利用

- GitHub Actions などで `npx comine-san` を実行する場合は、ワークフロー JSON と ComfyUI サーバーへの接続情報（VPN / テスト用モック）を事前に準備してください。
- exit code は成功時 `0`、ファイル未発見やサーバーエラーで `>0`。CI で失敗検知しやすい設計です。
- 実行ログを短くしたい場合は、今後予定している `--quiet` オプションを検討中（Issue #TODO）。

## メンテナー向け: npm pack リハーサル

リリース前には npm に publish せず動作確認できるよう、以下の手順でローカル tarball を生成して `npx` 実行をリハーサルします。

```bash
# 1. 型チェックとビルド（prepublishOnly と同じ）
npm run prepublishOnly

# 2. npm pack で tarball を作成（ファイル名が表示されます）
PACKAGE_TGZ=$(npm pack)

# 3. 生成物を npx でそのまま実行し、CLI 振る舞いを確認
npx --yes "./${PACKAGE_TGZ}" ./workflows/workflow_api.json --help

# 4. 後片付け
rm "${PACKAGE_TGZ}"
```

`npm pack` は `prepublishOnly` 後の `dist/` をそのまま含むため、実際の publish と同等の依存ファイルを検証できます。`.tgz` をチーム共有の CI アーティファクトにアップロードしておくと、他メンバーも同じビルドを試せます。

## FAQ

- **Q:** `workflow_api.json` をどこから取得しますか？  
  **A:** ComfyUI の UI メニュー `Save (API)` から保存できます。
- **Q:** 日本語ノード名はどう扱われますか？  
  **A:** タイトルは英数字・`_-` のみになるよう正規化されます（CLI オプションは `--Prompt_Text.string` のような形式）。
