# CLI ガイド

## はじめに

`Comine San` は ComfyUI の `workflow_api.json` を読み取り、ノード入出力に応じて CLI 引数を自動生成するツールです。本ガイドでは CLI 利用者向けにインストール方法、コマンド例、トラブルシューティングをまとめます。

## クイックスタート

```bash
# 1. ComfyUI から workflow_api.json をエクスポート
# 2. サーバーを起動済みとする（ローカル例: http://127.0.0.1:8188 / 別ホスト例: http://192.168.23.17:8188）

npx @olduvai-jp/comine-san ./workflows/workflow_api.json \
  --Prompt_Text.string "generate a cute mascot" \
  --output-json ./results/metadata.json
```

- `workflow-path`: 最初の必須引数。ComfyUI でエクスポートした JSON へのパス。
- `--server`: ComfyUI の URL。省略時は `http://127.0.0.1:8188`。
- `--output-json`: 実行結果（各出力ノードの戻り値）を保存するパス。省略時は `metadata.json`。
- それ以外の `--<ノードタイトル>.<入力名>` オプションはワークフローから自動生成され、デフォルト値も `workflow_api.json` から抽出されます。

### サーバー不要の動作確認（--help）

ComfyUI サーバーに接続せず、ローカルのワークフロー JSON を読み込んで CLI オプション生成まで確認できます。

```bash
npx @olduvai-jp/comine-san ./example/t2i_sd15_base.json --help
```

## インストールと実行方法

| 方法                   | コマンド                                                               | 補足                                                |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| 一度きりの実行         | `npx @olduvai-jp/comine-san <workflow>`                                | Node.js 18+ 必須。`npm`/`pnpm`/`yarn` いずれでも OK |
| グローバルインストール | `npm i -g @olduvai-jp/comine-san` → `comine-san <workflow>`            | CLI を頻繁に使う場合に便利                          |
| package.json Script    | `"scripts": { "generate": "comine-san ./workflow.json --server ..." }` | CI やバッチから呼び出しやすい                       |

アンインストール: `npm uninstall -g @olduvai-jp/comine-san` またはローカルプロジェクトから `npm uninstall @olduvai-jp/comine-san`。

## コマンドオプション一覧

| オプション                 | 型                 | デフォルト              | 説明                                                 |
| -------------------------- | ------------------ | ----------------------- | ---------------------------------------------------- |
| `<workflow-path>`          | path               | なし                    | 必須。ワークフロー JSON の場所                       |
| `--server <url>`           | string             | `http://127.0.0.1:8188` | ComfyUI サーバーの URL                               |
| `--output-json <path>`     | string             | `metadata.json`         | 実行結果を保存する JSON の出力パス                   |
| `-q, --quiet`              | boolean            | `false`                 | 成功時は出力 JSON のパスだけを出力し、それ以外のログを抑制 |
| `-v, --verbose`            | boolean            | `false`                 | progress/executing/executed のイベントログを表示     |
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

### リポジトリ同梱サンプル（Smoke）

このリポジトリには最小の text-to-image ワークフロー例として `example/t2i_sd15_base.json` を同梱しています。

```bash
comine-san ./example/t2i_sd15_base.json \
  --server http://192.168.23.17:8188 \
  --output-json ./results/metadata.json \
  --output.filename ./results/t2i.png \
  --verbose
```

- `--output.filename` は、ワークフロー中の `SaveImage` ノードタイトル（この例では `output`）から自動生成されます。
- `--verbose` では progress/executing/executed のイベントログを stderr に出します。

実行後:

- `results/image.png`: `SaveImage` ノードの出力。複数枚生成する場合は連番になります。
- `results/output.json`: すべての出力ノード（`ShowText`, `ShowAnyToJson` など）の結果をまとめたオブジェクト。
- 標準出力: デフォルトでは完了メッセージ。`--quiet` は成功時に出力 JSON のパスのみ、`--verbose` は進行ログも出力します。

## エラーとトラブルシューティング

| 症状                                | 原因                                | 対処                                                       |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `File not found: workflow_api.json` | パスの指定ミス                      | `pwd` でディレクトリを確認し、相対/絶対パスを見直す        |
| `ECONNREFUSED 127.0.0.1:8188`       | ComfyUI が起動していない/ポート違い | `--server` オプションで正しい URL を指定、ComfyUI を起動   |
| `Failed to parse ComfyUI response`  | サーバーがエラー HTML を返却        | ComfyUI 側のログを確認。必要なら `--verbose` も併用        |
| 途中でハングする                    | WebSocket 未切断                    | ComfyUI 0.2.x 以降で挙動が安定。最新バージョンへの更新推奨 |

## CI や自動化での利用

- GitHub Actions などで `npx @olduvai-jp/comine-san` を実行する場合は、ワークフロー JSON と ComfyUI サーバーへの接続情報（VPN / テスト用モック）を事前に準備してください。
- exit code は以下の通りです（CI で分岐しやすいよう用途別に分けています）。

| exit code | 意味                          |
| --------- | ----------------------------- |
| 0         | success                       |
| 2         | bad arguments                 |
| 3         | workflow file not found       |
| 4         | workflow JSON parse error     |
| 5         | ComfyUI server/network error  |
| 1         | unknown error                 |

## 安定化ポリシー / ドラフト卒業条件

このドキュメントに記載した CLI 仕様を「安定」として扱うための、**実行可能かつ検証可能**な条件です（現状は満たしています）。

### CLI 仕様の安定化条件（CLI spec stability）

- [x] **コマンド名・引数の骨格が固定**されている
  - `comine-san <workflow-path>`（必須）
  - ベースオプション: `--server`, `--output-json`, `--quiet`, `--verbose`, `--help/-h`
- [x] **`--help` の契約が固定**されている
  - `comine-san --help` は `<workflow-path>` 無しでも **exit code 0** で終了する
  - `<workflow-path>` を与えた場合は、ワークフローから生成した `--<NodeTitle>.<InputKey>` を help に表示する
- [x] **exit code の意味が固定**され、テストで担保されている
  - `0`: success
  - `2`: bad arguments（CLI の parse/指定ミス）
  - `3`: workflow file not found
  - `4`: workflow JSON parse error
  - `5`: ComfyUI server/network error
  - `1`: unknown error
- [x] **stdout/stderr の契約が固定**されている
  - エラーは `stderr` に出し、プロセスの `exit code` で機械判定できる
  - **機械判定が必要な場合は `--quiet` を使う**（成功時に `stdout` へ出力 JSON パスのみ）
  - `--quiet` 以外の `stdout` は人間向けログであり、文言は互換性の対象外（パース前提にしない）
  - `--verbose` のイベントログは `stderr` に出す（stdout を汚さない）
- [x] **`--quiet` / `--verbose` の契約が固定**されている
  - `--quiet` は成功時に **出力 JSON パスのみ**を `stdout` に出す
  - `--quiet` と `--verbose` は同時指定不可（`exit code 2`）
- [x] **ワークフロー由来オプション生成の契約が固定**されている
  - 生成形式: `--<NodeTitle>.<InputKey>`
  - `NodeTitle` は `_meta.title` を正規化したもの（`[^a-zA-Z0-9_-]` を `_` に置換）
  - `InputKey` はワークフロー JSON の `inputs` キーをそのまま用いる
  - 型の扱い: `string` / `number` / `boolean` の入力は CLI 引数として上書き可能で、デフォルト値はワークフローから抽出される
- [x] **`npm run prepublishOnly` が通る**（type-check / test / build）

（推奨）リリース前の手動検証として `npm pack` → `npx` 実行のリハーサルを行うと、配布形での問題を早期に検出できます（ただし CI の必須条件にはしません）。

### 変更ポリシー（SemVer）

- **Breaking change（破壊的変更）**: 上記の契約を破る変更（exit code の意味変更、既存オプション削除/意味変更、出力の stdout/stderr 契約変更、正規化ルール変更など）は **major**。
- **Additive change（追加）**: 互換を壊さない新オプション/新イベント/新ノード追加などは **minor**。
- **Bugfix / docs**: 互換を壊さない修正は **patch**。

## メンテナー向け: npm pack リハーサル

リリース前には npm に publish せず動作確認できるよう、以下の手順でローカル tarball を生成して `npx` 実行をリハーサルします。

```bash
# 1. 型チェック・テスト・ビルド（prepublishOnly と同じ）
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
