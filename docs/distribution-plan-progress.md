# comine-san 配布・ライブラリ化計画 進捗調査ログ

## スナップショット（2026-02-07）

### 対象リビジョン

- ブランチ: `dev`
- ベースコミット: `fcb905d` (2026-02-07 15:05 +0900)
- `main`: `25ddaad` (2025-11-05 16:39 +0900)
- 現時点の注意: このスナップショットは `dev` の上での未コミット差分も含みます（CLIのログ/exit code、CI artifact、テスト追加、ドキュメント更新など）。
- 現時点の注意: `dev` は `main` より 5 commits 先行しており、CLI/配布/CI/ドキュメント整備の大半は `main` に未取り込みです。

### ハイライト

- `src/cli`, `src/lib`, `src/index` に分離され、CLI とライブラリの境界は明確です（CLI: `src/cli/index.ts`, lib: `src/lib/index.ts`, compat: `src/index.ts`）。
- npm 配布に必要な `bin`/`exports`/`typesVersions`/`files` は揃い、`npm run build`（`yarn build`）で `dist/cjs` + `dist/esm` + `dist/types` を生成できます（`package.json`, `scripts/build-esm.mjs`）。
- CLI は `--quiet` / `--verbose` と exit code テーブルを実装・文書化し、`example/t2i_sd15.json` を使って実機 ComfyUI に対する smoke 実行も通っています（手動検証）。
- CI は `npm pack` の `.tgz` を artifact としてアップロードするよう更新済みです（ただし `main` 未取り込み）。
- テストは Vitest ではなく Node の `node:test` + `ts-node/register` で実行しており、CLI exit code や標準出力抑制のテストも追加されています（`scripts/test.mjs`, `tests/*.test.ts`）。

### 詳細ステータス

| 項目                    | 状態      | 所見                                                                                                                                                                                                                      | 根拠                                                                                                                                      | 次のアクション                                                                                                                                |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| プロジェクト構成再編    | ✅ 完了   | CLI エントリ/ライブラリ API/後方互換 re-export がそれぞれ `src/cli`・`src/lib`・`src/index` に整理され、ドキュメントでも利用方法が分離されています。                                                                      | `src/cli/index.ts:1-79`, `src/lib/index.ts:1-24`, `src/index.ts:1-2`, `README.md:1-73`                                                    | README へフォルダ構成図と import ルールを追記し、今後のノード追加時の参照場所を明確化する。                                                   |
| CLI パッケージ化        | ✅ 完了   | `bin`/shebang/`exports`/`typesVersions`/`files` が揃い、`npx @olduvai-jp/comine-san` を目標にした配布形になっています。`--quiet` / `--verbose` と exit code テーブルは実装・文書化済みです（ガイド自体はドラフト表記）。            | `src/cli/bin.ts`, `src/cli/index.ts`, `package.json`, `docs/cli-guide.md`                                                                 | CLI 仕様（ログ/exit code）の「安定化条件」を決め、必要なら `docs/cli-guide.md` のドラフト表記を外す。                                       |
| TypeScript ライブラリ化 | ✅ 完了   | ファサードとサブパス export が公開され、型情報は `typesVersions` で補完されます。ライブラリガイドに API サーフェスと拡張予定が整理されています。                                                                          | `src/lib/index.ts:1-24`, `package.json:19-73`, `docs/library-guide.md:3-85`                                                               | 破壊的変更ポリシー／サポート対象 ComfyUI バージョンを library-guide に明文化し、安定 API 宣言前の注意事項を追加する。                         |
| ビルド・配布 / CI       | 🟢 前進中 | CI と Release publish は用意済みですが、`dev` 先行のため `main` では未稼働です。`npm publish --provenance` は GitHub Release の publish をトリガーに実行する設計です。CI は `npm pack` の `.tgz` をアーティファクト化済みで、残タスクはカバレッジ等です。 | `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `docs/release.md`                                                           | `main` に取り込んだ上で、`test --coverage` やテストログ等の追加アーティファクト化を検討する。                                                |
| テスト・品質保証        | 🟡 前進中 | Workflow / ComfyAPIClient.queue の単体テストに加え、CLI の exit code / `--help` / unknown option の重複出力防止などのテストも追加済みです。実機 ComfyUI を模した自動統合テストは未着手です（手動 smoke は実施済み）。 | `tests/workflow.test.ts`, `tests/comfyuiQueue.test.ts`, `tests/cliExitCodes.test.ts`, `scripts/test.mjs`                                  | 実機依存の部分を切り出して、WebSocket/HTTP をより現実に近いモックで覆う統合テストを追加する。                                                |
| ドキュメント整備        | 🟢 前進中 | README から CLI/ライブラリ/リリース各ドキュメントへ誘導され、`docs/cli-guide.md`・`docs/library-guide.md`・`docs/release.md` がそれぞれドラフト完成しています。                                                           | `README.md:1-73`, `docs/cli-guide.md:1-90`, `docs/library-guide.md:1-85`, `docs/release.md:1-53`                                          | distribution-plan の「未確定事項」とリンクする FAQ/互換性ポリシーを docs に追記し、計画側のステータスも更新する。                             |
| リスク / ガバナンス     | 🟡 未着手 | 計画書に列挙した ComfyUI API 変更追従、WebSocket テスト安定化、ライセンス・配布サイズ管理などは Issue 化/解消されていません。ドキュメントにもサポート範囲の明記が不足しています。                                         | `docs/distribution-plan.md:89-100`, `src/lib/workflow/comfyui.ts:1-96`                                                                    | リスクごとに Issue/TODO を紐付け、README へサポートバージョンとローカライズ方針を追加し、`ComfyAPIClient` のログ/例外ハンドリングを整理する。 |

### 既知のズレ（2026-02-07 時点）

- 進捗の大半が `dev` にあり、`main` では「配布・CI まで含む計画」が未反映です。

## 過去スナップショット

以前のスナップショット（2025-11-10 / 2025-11-11）はドラフト時点の記録で、`tests/cli.test.ts` や `prepublishOnly` など実態と食い違う記述を含んでいました。参照が必要な場合は、必ずこの 2026-02-07 スナップショットの内容を優先してください。

## 安定化・受け入れ基準（チェックリスト）

`docs/cli-guide.md` と `docs/library-guide.md` の「安定化ポリシー / ドラフト卒業条件」を実際のリリース判断に使うための集約です。

### CLI spec stability（受け入れ）

- [x] `npm run prepublishOnly` が CI で通る（type-check / test / build）
- [x] exit code（0/2/3/4/5/1）の意味が docs と実装で一致し、テストで担保されている
- [x] `--quiet` / `--verbose` / stdout-stderr 契約がテストで担保されている（機械向け出力は `--quiet` のみ）

### Library API stability（受け入れ）

- [x] 公開 API サーフェス（`package.json#exports` で到達できる全 import path）を安定として保証する方針が確定している
- [x] breaking change 検出の仕組み（最低限: public import コンパイルテスト）が CI に入っている

### Docs（draft -> stable）

- [x] `docs/cli-guide.md` / `docs/library-guide.md` のタイトルから「（ドラフト）」を外せる状態になっている
- [x] すべてのサンプルが現行バージョンで動作し、前提条件が明記されている
