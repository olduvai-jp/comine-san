# ComfyUI 標準 Primitives ノード対応 計画書（comine-san）

作成日: 2026-02-09  
対象リポジトリ: `/mnt/ssd01/project/comine-san`  
参照した ComfyUI: `/home/yamagishi/ssd01/project/ComfyUI`

実装状況: 完了（2026-02-09）

## 目的

`@olduvai-jp/comine-san` が現状サポートしている Crystools の Primitive 系ノード（`Primitive ... [Crystools]`）ではなく、ComfyUI 標準の **Primitives ノード群（カテゴリ `utils/primitive`）**に対応する。

ここでいう Primitives は、Virtual Node の `PrimitiveNode`（フロントエンド側の widget 入力ノード）ではなく、バックエンドに送られる実ノード:

* `PrimitiveInt`（Int）
* `PrimitiveFloat`（Float）
* `PrimitiveBoolean`（Boolean）
* `PrimitiveString`（String）
* `PrimitiveStringMultiline`（String (Multiline)）

## 調査結果（ComfyUI 側の定義）

ComfyUI の `utils/primitive` ノードは `comfy_extras/nodes_primitive.py` で定義されている。

* node_id（= prompt JSON の `class_type`）:
  * `PrimitiveString`
  * `PrimitiveStringMultiline`
  * `PrimitiveInt`
  * `PrimitiveFloat`
  * `PrimitiveBoolean`
* 入力は共通で `value` 1つ（型はそれぞれ `String` / `Int` / `Float` / `Boolean`）。
* category は `utils/primitive`。

参照: `/home/yamagishi/ssd01/project/ComfyUI/comfy_extras/nodes_primitive.py`

## 現状（comine-san 側）

* 入力パラメータは `ComfyUiWorkflow` が InputNode と認識したノードの `inputs` を走査して生成している。
  * 実装: `src/lib/workflow/workflow.ts`
* 現状の Primitive 対応は Crystools 前提。
  * `Primitive string multiline [Crystools]`（inputs: `string`）
  * `Primitive integer [Crystools]`（inputs: `int`）
  * `Primitive float [Crystools]`（inputs: `float`）
  * 実装: `src/lib/workflow/nodes/input/primitiveString.ts` など
* 2026-02-09 時点で ComfyUI 標準 primitives（inputs: `value`、class_type: `PrimitiveInt` 等）も InputNode として解釈され、CLI オプションが生成される。
  * 実装: `src/lib/workflow/nodes/input/primitiveString.ts`, `src/lib/workflow/nodes/input/primitiveInteger.ts`, `src/lib/workflow/nodes/input/primitiveFloat.ts`, `src/lib/workflow/nodes/input/primitiveBoolean.ts`
  * 登録: `src/lib/workflow/workflow.ts` の `inputNodeClasses`

## 対応内容（実装済み）

ComfyUI 標準 primitives を、従来の Crystools primitives と同様に「入力ノード」として扱う実装を追加済み。

* `class_type` が `PrimitiveInt` / `PrimitiveFloat` / `PrimitiveBoolean` / `PrimitiveString` / `PrimitiveStringMultiline` のノードを InputNode 化する
* `inputs.value` を CLI から上書き可能にする

`workflow_api.json`（Export API）だけで完結し、追加ファイル（workflow.json など）は不要。

## CLI 仕様（期待される挙動）

workflow 内の primitive ノードの `_meta.title` を `InputNode` 基底クラスのルールで正規化して CLI キーにする（現状と同じ: `[^a-zA-Z0-9_-]` を `_`）。

例:

* ノード title: `Seed`、入力名 `value` の場合
  * CLI: `--Seed.value 123`

型:

* `PrimitiveInt` / `PrimitiveFloat` は `number`
* `PrimitiveBoolean` は `boolean`（`--X.value true|false`）
* `PrimitiveString` / `PrimitiveStringMultiline` は `string`

## 実装タスク

1. InputNode クラス追加（ComfyUI 標準 primitives）: 完了
   * `PrimitiveString`, `PrimitiveStringMultiline`, `PrimitiveInt`, `PrimitiveFloat`, `PrimitiveBoolean`
2. `inputNodeClasses` に追加: 完了
   * `src/lib/workflow/workflow.ts`
3. ドキュメント更新: 完了
   * `README.md`, `docs/cli-guide.md`, `docs/library-guide.md`
   * 「Crystools primitives と標準 primitives で入力キーが違う」点を明記（Crystools: `*.string`/`*.int`/`*.float`、標準: `*.value`）
4. テスト追加: 完了
   * `tests/workflow.test.ts` に native primitives の JSON を内蔵して検証
   * `getWorkflowParams()` が `*.value` を返すこと
   * `setWorkflowParams()` で `*.value` を渡すと prompt JSON の該当ノード `inputs.value` が更新されること

## 検証観点（落とし穴）

* 既存の Crystools primitives を使っているユーザーの CLI 引数互換性
  * 既存は `*.string` / `*.int` / `*.float`。標準 primitives を追加しても既存は壊さない（追加のみ）。
* workflow 内で title の正規化後に衝突するケース
  * 現状も同じ問題があり得るため、必要なら「重複 title を検出して suffix を付ける」などの改善を別タスク化
* Boolean の CLI coercion（現状仕様）
  * 現在の CLI 実装は `v === 'true'` のみ true 扱い。`TRUE`/`1` は false。
  * 仕様変更する場合は別タスク化。
