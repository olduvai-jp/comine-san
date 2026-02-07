# ライブラリ利用ガイド（ドラフト）

## コンセプト

- ComfyUI ワークフロー制御をアプリケーションやスクリプトから再利用するための TypeScript API を提供します。
- CLI と同じ実装を内部的に共有しながら、ESM/CJS 双方で利用できる構成を採用しています。
- すべての公開型は `dist/types` に含まれ、`typesVersions` により TypeScript が自動補完します。

## インストール

```bash
npm install comine-san
# or
pnpm add comine-san
# or
yarn add comine-san
```

- Node.js 18 以上を対象にしています（`fetch`/`WebSocket` 利用のため）。
- ESM プロジェクトではそのまま `import`、CJS プロジェクトでは `require` で読み込めます。

## クイックスタート

```ts
import { ComfyUiWorkflow } from 'comine-san';
import { readFile } from 'node:fs/promises';

const workflowJson = JSON.parse(await readFile('./workflow_api.json', 'utf8'));

const workflow = new ComfyUiWorkflow(workflowJson);
const params = workflow.getWorkflowParams();

workflow.setWorkflowParams({
  ...params,
  'Prompt_Text.string': 'high quality mascot',
});

await workflow.execute('http://127.0.0.1:8188');
console.log(workflow.getWorkflowResult());
```

- `getWorkflowParams()` で CLI と同じキー（`<ノード>.<入力>`）が得られます。
- `execute()` は内部で `ComfyAPIClient` を使って HTTP/WebSocket 通信を行います。
- `getWorkflowResult()` は出力ノードごとの結果を `{ [nodeTitle]: payload }` 形式で返します。

## API サーフェス

| import                                                                              | 説明                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------ |
| `import { ComfyUiWorkflow } from 'comine-san'`                                      | ワークフロー構築と実行                     |
| `import { ComfyAPIClient } from 'comine-san/lib'`                                   | ComfyUI API クライアントのみ利用したい場合 |
| `import type { WorkflowParams, WorkflowResultTypes } from 'comine-san/workflow'`    | 型安全にパラメータや結果を扱いたい場合     |
| `import { PrimitiveStringCrystools } from 'comine-san/nodes/input/primitiveString'` | ノードクラスを個別に再利用／拡張           |

- `package.json` の `exports` と `typesVersions` により、CJS では `dist/cjs`、ESM では `dist/esm` を自動的に参照します。
- `sideEffects: false` なので、バンドラーが未使用コードを除去しやすくなっています。

## サブパス import とツリーシェイク

```ts
// ルート import（推奨）
import { ComfyUiWorkflow } from 'comine-san';

// サブパス（細粒度な依存に）
import { InputNode } from 'comine-san/nodes/input/inputNodeBase';
import type { ComfyUiWorkflowJson } from 'comine-san/workflow';
```

- ESM バンドラーではサブパス import を用いることで、CLI など不要部分を取り込まずに済みます。
- CJS でも `require('comine-san/lib')` のように利用可能です。

## カスタムワークフロー構築

1. `workflow_api.json` を読み込み `ComfyUiWorkflow` を生成。
2. `getWorkflowParams()` で必要なパラメータキーを取得。
3. `setWorkflowParams()` で値を上書き。
4. `execute(serverUrl)` を呼び出し、`getWorkflowResult()` や `outputEmitter` イベントで結果を受け取る。

`outputEmitter` は `progress`, `executing`, `executed`, `disconnected` などのイベントを発火するため、UI 更新やログ出力にも利用できます。

## テストとモック

- `ComfyUiWorkflow` は純粋な JSON を受け取るだけなので、スナップショットテストや fixture ベースの検証が容易です。
- WebSocket/HTTP を実際に叩きたくない場合は `ComfyAPIClient` をラップしたモックを用意し、`execute()` の代わりに `queue()` を直接呼ぶなどの戦略が取れます。
- 近い将来、DI しやすいインターフェースを整備する予定です（Issue 追跡中）。

## 今後の拡張予定

- `outputEmitter` のイベント型付けとリスナーの公式ヘルパーを追加予定。
- カスタムノード登録 API（プラグイン機構）の検討。
- `@comine-san/workflow` のようなスコープドパッケージへの分割公開の可能性。
