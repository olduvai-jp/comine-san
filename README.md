# Comine San

Comine San は ComfyUI でエクスポートした `workflow_api.json` を読み込み、CLI からワークフローを実行する TypeScript 製ツールです。

## 特徴
- ワークフロー内の入力/出力ノードを解析し、`--<ノードタイトル>.<入力名>` 形式の CLI オプションを自動生成
- 指定した ComfyUI サーバーに対して `POST /prompt` を発行し、WebSocket で進行状況を監視
- SaveImage / ShowText / Show Any to JSON などの出力をファイル保存と JSON で集約

## 必要環境
- Node.js 18 以上（`fetch` API を利用）
- Yarn もしくは npm
- 実行中の ComfyUI サーバー（デフォルトは `http://127.0.0.1:8188`）

## セットアップ
```shell
yarn install
```

## 使い方
1. ComfyUI から対象フローを `workflow_api.json` としてエクスポートする。
2. ComfyUI サーバーを起動する（例: `python main.py --listen 0.0.0.0 --port 8188`）。
3. 下記のように `--help` を実行し、利用可能なオプションを確認する。

```shell
yarn ts-node index.ts ./path/to/workflow_api.json --help
```

`Result types` として、取得できる出力ノードとフィールド型が末尾に表示されます。

4. 必要なオプションを確認したら、実際の実行コマンドを組み立てて実行する。

```shell
yarn ts-node index.ts ./path/to/workflow_api.json \
  --output-json ./results/output.json \
  --server http://127.0.0.1:8188 \
  --Prompt_Text.string "test prompt" \
  --SaveImage.filename output/result.png
```

- 第 1 引数: ワークフロー JSON のパス
- `--output-json`: 実行結果を保存する JSON のパス（省略時は `metadata.json` が作成される）
- `--server`: ComfyUI のベース URL（省略時は `http://127.0.0.1:8188`）
- その他のオプションは、ComfyUI 上で設定したノードタイトル（英数字・`_-` に正規化）と入力キーを組み合わせた形式で自動生成される

> 例: ComfyUI のノードタイトルが `Prompt Text`、入力キーが `string` の場合、CLI オプションは `--Prompt_Text.string` になります。

### 実行結果
- 画像出力ノード (`SaveImage`) は指定したパスに画像ファイルを保存します。
- テキスト出力ノード (`ShowText|pysssss`, `Show any to JSON [Crystools]`) は JSON の `text` フィールドに格納されます。
- CLI の `--output-json` オプションで指定した JSON ファイルには、各出力ノードの結果が連想配列形式でまとめられます。

### 対応ノード
- **Input** `Primitive string multiline [Crystools]`（文字列のプロンプトなど）
- **Input** `Primitive integer [Crystools]`（シード値などの整数入力）
- **Input** `Primitive float [Crystools]`（ガイダンススケールなどの小数入力）
- **Input** `ETN_LoadImageBase64`（ファイルパス/既存の Base64 文字列から画像を読込）
- **Output** `SaveImage`（画像をファイルに保存しパスを返却）
- **Output** `SaveAnimatedWEBP`（アニメーションWebPをファイルに保存しパスを返却）
- **Output** `Show any to JSON [Crystools]`（任意の値を JSON テキストとして取得）
- **Output** `ShowText|pysssss`（テキスト出力を改行付き文字列として取得）

## 開発メモ
- 型チェック: `yarn type-check`
- ノード固有の実装は `workflow/nodes/` 配下にまとまっています。必要に応じて新しい Input / Output ノードクラスを追加してください。
