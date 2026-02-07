# comine-san 配布・ライブラリ化計画

## 目的

- `npx comine-san` でゼロインストール実行できる CLI パッケージを npm 上で公開する。
- ComfyUI ワークフロー実行ロジックを別製品・別サービスから再利用できる TypeScript ライブラリとして切り出す。
- CLI 利用者・ライブラリ利用者双方にとって分かりやすいビルド／配布フローとドキュメント体制を整備する。

## 現状整理（現状リポジトリ）

- `index.ts` を `ts-node` で直接実行しており、npm 発行用のビルド成果物 (`dist/`) は未生成。
- `tsconfig.json` の `rootDir` は `src/` 指定だが、実装は `index.ts` や `workflow/` ディレクトリに存在し配置が不整合。
- CLI 依存ロジック（ComfyUiWorkflow, ComfyAPIClient, Node 実装群）が CLI に直結しており、外部からの再利用を想定した API 整理が未実施。
- `package.json` に `bin` や `exports` 設定が無く、`npx` 実行や利用側への型提供が未整備。
- `docs/` 配下は空で、README も CLI 利用手順中心。ライブラリ API や配布フローに関する文書は無い。

## 対象要件の整理

1. CLI パッケージ化
   - `npx` 即実行（グローバルインストール不要）
   - Node.js 18+ 対応、ESM/CJS ユーザー向けに shebang 付きエントリを提供
   - ワークフロー JSON 入力〜結果出力まで既存機能を維持
2. TypeScript ライブラリ化
   - ComfyUI 連携ロジックをアプリから import できる形で公開
   - 型定義 (`.d.ts`) の付随、ツリーシェイク可能な構造（副作用管理）
3. ビルド・配布体制
   - トランスパイル（`tsc` or `tsup`）による `dist/` 出力
   - `npm publish` を見据えた `package.json`/NPM メタデータ整備
   - チェンジログ、バージョニング、CI（lint/type-check/test/build）
4. ドキュメント
   - CLI ユーザー向けクイックスタート、オプション表、実行例
   - ライブラリ利用者向け API リファレンス／拡張ガイド
   - リリース手順・CI/CD フローのメンテナンスガイド

## 実施方針とタスク

### 1. プロジェクト構成再編

- `src/` 配下に以下のレイヤーを定義
  - `src/cli/index.ts`: CLI エントリ（Commander 設定＋ I/O）
  - `src/lib/`: ComfyUI ワークフロー制御ロジック（`workflow/` 以下を移設）
  - `src/lib/index.ts`: ライブラリ公開 API（ファサード）
- 共通コード（ノードクラス、API クライアント）は CLI とライブラリの双方で再利用できるよう依存方向を整理。
- 互換性維持のため `workflow/` 直下のファイル移動に伴う import パス修正と単体検証を実施。

### 2. CLI パッケージ化

- `package.json` に `bin` フィールドを追加し、`dist/cli/index.js` を公開。
- CLI エントリに shebang (`#!/usr/bin/env node`) を挿入し、ESM/CJS 互換のビルド出力を保証。
- `build` スクリプトで `tsc`（または `tsup`/`esbuild`）を実行、`prepublishOnly` でビルド済 artefact を検証。
- `npx` 動作確認用に `npm pack` → `npx --yes ./comine-san-x.y.z.tgz` のリハーサル手順を整備。
- 標準的な CLI エラーコード、標準出力/標準エラーの整理（ログ抑制/冗長モード等）を検討。

### 3. TypeScript ライブラリ化

- 外部公開したいクラス／関数を選定（例: `ComfyUiWorkflow`, `ComfyAPIClient`, ノード基底クラス, 型定義）。
- `src/lib/index.ts` で公開 API を明示し、内部実装は相対 import に留める。
- 型補完向上のため `interfaces.ts` 等で ComfyUI ノードの型を整理、`strict` 設定維持。
- `package.json` に `exports` & `typesVersions`（必要なら）を追加し、`import 'comine-san/lib'` と `import { ... } from 'comine-san'` の両方に対応。
- 将来のサブパッケージ（例: `comine-san/nodes`）公開可否を決定し、必要に応じて `exports` へエントリを追加。

### 4. ビルド・配布／CI 体制

- `scripts`
  - `build`: `tsc -p tsconfig.build.json`（CLI/Lib 共通ビルド、必要なら tsconfig を CLI/Lib で分割）
  - `lint`: eslint or `tsc --noEmit`（現状 `type-check` を `lint` として活用）
  - `test`: ワークフローのモックを用いた最小限の統合テスト（WebSocket をスタブ化）
  - `prepare`: `npm run build`（ローカル `npm link`/_git install_ でもビルド）
- `package.json` メタデータ更新
  - `version` ポリシー（semver）、`repository`, `bugs`, `homepage`
  - `engines`: `{ "node": ">=18" }`
  - `files`: `dist/**/*`, `README.md`, `LICENSE`, 必要 docs
  - `keywords`, `author`, `publishConfig.access`
- CI（GitHub Actions 想定）
  - `push`/`pull_request` で `yarn install --frozen-lockfile`, `npm run type-check`, `npm run test`, `npm run build`
  - `release` タグで `npm publish` 自動化（`NODE_AUTH_TOKEN` 利用）

### 5. テスト・品質保証

- CLI smoke test: `yarn test:cli` でダミーワークフローを実行し期待出力を検証（外部サーバーはモック）。
- API ユニットテスト: 入出力ノードのパラメータ変換、`ComfyAPIClient.queue` のリクエストペイロード検証。
- E2E 手動検証手順: 実際の ComfyUI サーバーに対するサンプルワークフロー実行ガイドを docs に記載。

### 6. ドキュメント整備

- `README.md` を CLI クイックスタート中心に再構成し、`docs/` への詳細ガイドリンクを追加。
- `docs/cli-guide.md`: インストール方法（`npx`, `npm i -g`, `npm exec`）とオプション一覧、自動生成されるパラメータの説明。
- `docs/library-guide.md`: 主要 API（Workflow 初期化、パラメータ設定、実行、イベント購読）のコードサンプル。
- `docs/release.md`: バージョン管理、`npm version` 運用、`npm publish` 流れ、CI 連携手順。
- 変更履歴: `CHANGELOG.md` を `Keep a Changelog` 形式で作成し、`npm` リリース毎に更新。

## スケジュール提案

1. 週1: 構成再編・ビルド基盤整備（~2日）
2. 週2: 公開 API 設計・型整備・最小テスト実装（~3日）
3. 週3: ドキュメント執筆・CI 導入・リリースリハーサル（~2日）
4. 週4: v1.0.0 npm 公開、フィードバック反映期間

## リスクと対策

- **ComfyUI API の仕様変更**: API バージョン追従のため、サポート対象バージョンを README に明記し、互換性テストを CI に組み込む。
- **WebSocket 依存テストの不安定化**: ライブラリ層は WebSocket クライアントを DI 可能にして、テストではモック実装を注入。
- **既存ユーザーの破壊的変更**: 旧パス（`./index.ts`）を暫定でエイリアスとし、Major リリースノートで告知。
- **配布サイズ増大**: `files` フィールドと `.npmignore` を設定し、不要ファイル（テスト, docs 原稿）を除外。

## 未確定事項・要確認

- ライセンス表記（MIT 継続 or 組織ルール）の最終確認。
- npm 公開スコープ（パブリック vs プライベート）と組織アカウント運用。
- 将来的な ComfyUI ノード拡張の公開 API （プラグイン形式）に関する仕様。
- CLI での日本語ローカライズ要否（メッセージ、ヘルプテキスト）。
- 依存パッケージのバンドル戦略（純 TS/Node 依存に留めるか、バンドラ導入するか）。
