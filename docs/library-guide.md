# ライブラリ利用ガイド

## コンセプト

- ComfyUI ワークフロー制御をアプリケーションやスクリプトから再利用するための TypeScript API を提供します。
- CLI と同じ実装を内部的に共有しながら、ESM/CJS 双方で利用できる構成を採用しています。
- すべての公開型は `dist/types` に含まれ、`typesVersions` により TypeScript が自動補完します。

## インストール

```bash
npm install @olduvai-jp/comine-san
# or
pnpm add @olduvai-jp/comine-san
# or
yarn add @olduvai-jp/comine-san
```

- Node.js 18 以上を対象にしています（`fetch`/`WebSocket` 利用のため）。
- ESM プロジェクトではそのまま `import`、CJS プロジェクトでは `require` で読み込めます。

## クイックスタート

```ts
import { ComfyUiWorkflow } from '@olduvai-jp/comine-san';
import { readFile } from 'node:fs/promises';

const workflowJson = JSON.parse(await readFile('./workflow_api.json', 'utf8'));

const workflow = new ComfyUiWorkflow(workflowJson);
const params = workflow.getWorkflowParams();

workflow.setWorkflowParams({
  ...params,
  'Prompt_Text.string': 'high quality mascot',
});

// ComfyUI サーバーが起動している環境で実行してください。
await workflow.execute('http://127.0.0.1:8188');
console.log(workflow.getWorkflowResult());
```

- `getWorkflowParams()` で CLI と同じキー（`<ノード>.<入力>`）が得られます。
- ComfyUI 標準 primitives（`utils/primitive`）の入力キーは `value` です（例: `Seed.value`）。
- `execute()` は内部で `ComfyAPIClient` を使って HTTP/WebSocket 通信を行います。
- `getWorkflowResult()` は出力ノードごとの結果を `{ [nodeTitle]: payload }` 形式で返します。

## API サーフェス

| import                                                                              | 説明                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------ |
| `import { ComfyUiWorkflow } from '@olduvai-jp/comine-san'`                                      | ワークフロー構築と実行                     |
| `import { ComfyAPIClient } from '@olduvai-jp/comine-san/lib'`                                   | ComfyUI API クライアントのみ利用したい場合 |
| `import type { WorkflowParams, WorkflowResultTypes } from '@olduvai-jp/comine-san/workflow'`    | 型安全にパラメータや結果を扱いたい場合     |
| `import { PrimitiveStringCrystools } from '@olduvai-jp/comine-san/nodes/input/primitiveString'` | ノードクラスを個別に再利用／拡張           |
| `import { PrimitiveInt } from '@olduvai-jp/comine-san/nodes/input/primitiveInteger'`            | ComfyUI 標準 primitives（`PrimitiveInt`）  |

- `package.json` の `exports` と `typesVersions` により、CJS では `dist/cjs`、ESM では `dist/esm` を自動的に参照します。
- `sideEffects: false` なので、バンドラーが未使用コードを除去しやすくなっています。

## サブパス import とツリーシェイク

```ts
// ルート import（推奨）
import { ComfyUiWorkflow } from '@olduvai-jp/comine-san';

// サブパス（細粒度な依存に）
import { InputNode } from '@olduvai-jp/comine-san/nodes/input/inputNodeBase';
import type { ComfyUiWorkflowJson } from '@olduvai-jp/comine-san/workflow';
```

- ESM バンドラーではサブパス import を用いることで、CLI など不要部分を取り込まずに済みます。
- CJS でも `require('@olduvai-jp/comine-san/lib')` のように利用可能です。

## カスタムワークフロー構築

1. `workflow_api.json` を読み込み `ComfyUiWorkflow` を生成。
2. `getWorkflowParams()` で必要なパラメータキーを取得。
3. `setWorkflowParams()` で値を上書き。
4. `execute(serverUrl)` を呼び出し、`getWorkflowResult()` や `outputEmitter` イベントで結果を受け取る。

`outputEmitter` は `progress`, `executing`, `executed`, `disconnected` などのイベントを発火するため、UI 更新やログ出力にも利用できます。

## テストとモック

- `ComfyUiWorkflow` は純粋な JSON を受け取るだけなので、スナップショットテストや fixture ベースの検証が容易です。
- WebSocket/HTTP を実際に叩きたくない場合は `ComfyAPIClient` をラップしたモックを用意し、`execute()` の代わりに `queue()` を直接呼ぶなどの戦略が取れます。
- `fetch`/`WebSocket`/`logger` はすでに差し替え可能です。追加の DI しやすさは将来の改善候補ですが、互換性の約束（stable API）には含めません。

## 将来の検討（非保証）

- `outputEmitter` のイベント型付けとリスナーのヘルパー整備（互換性は壊さない範囲で追加）。
- カスタムノード登録 API（プラグイン機構）の検討。
- `@comine-san/workflow` のようなスコープドパッケージへの分割公開の可能性。

## 安定化ポリシー / ドラフト卒業条件

このドキュメントに記載したライブラリ API を「安定」として扱うための、**実行可能かつ検証可能**な条件です（現状は満たしています）。

### ライブラリ API の安定化条件（library API stability）

- [x] **安定版として保証する「公開 API サーフェス」が確定**している
  - 対象は **`package.json#exports` で import 可能な全エントリポイント（ワイルドカード含む）**。
  - 「将来変更し得る内部実装」を作りたい場合は、`exports` から到達できない形にする（＝到達できるものは公開 API 扱い）。
- [x] **SemVer の適用基準が固定**されている
  - breaking change（型/シグネチャ/挙動の互換性を破る変更）は **major**
  - 互換性を保った追加（新しい export/メソッド/イベント追加など）は **minor**
  - バグ修正・ドキュメント修正は **patch**
- [x] **主要クラスの契約が固定**され、テストで担保されている
  - `ComfyUiWorkflow`
    - `getWorkflowParams()` が返すキー形式は `<NodeTitle>.<InputKey>` である
    - `NodeTitle` は `_meta.title` を正規化したもの（`[^a-zA-Z0-9_-]` を `_` に置換）
    - `setWorkflowParams()` は既知キーのみを上書きし、`undefined` は上書きしない
    - `getModifiedJson()` は deep copy を返し、元 JSON を破壊しない
    - `outputEmitter` が少なくとも `progress` / `executing` / `executed` / `disconnected` を発火し続ける（追加は OK、削除/意味変更は major）
  - `ComfyAPIClient`
    - `queue()` が `/prompt` + WebSocket を用いてワークフローを実行し、完了時に resolve/reject する
    - `fetch` / `WebSocket` / `logger` の差し替え（DI）が可能で、テストで安定動作が担保されている
- [x] **公開 import の動作確認（パッケージ形での検証）が自動化**されている
  - `npm run prepublishOnly` が通る（type-check / test / build）
- [x] **互換性を壊す変更の検知手段がある**
  - 最低限: `package.json#exports` で到達できる公開 import 群をコンパイルする「public API import テスト」（`tsc --noEmit` で落ちる形）を CI に入れる
  - 追加で可能なら: 型のスナップショット/公開型の差分チェック（API レポート）を導入する

（推奨）リリース前の手動検証として `npm pack` した `.tgz` を `node` / `npx` で使い、配布形での import/実行を確認すると安全です（ただし CI の必須条件にはしません）。

### ドキュメントの安定化条件（draft -> stable）

- [x] このファイルのタイトルから「（ドラフト）」を外す前に、上記チェックがすべて `✅` になっている
- [x] すべてのサンプルコードが **現行バージョンで動作**し、実行条件（Node 18+ / ComfyUI URL など）が明記されている
- [x] 「予定」「近い将来」「Issue 追跡中」などの記述は、安定版では以下のいずれかにする
  - 明確な Issue/マイルストーンへのリンク（もしくは削除）
  - 互換性約束の範囲外（experimental）として明示
