# comine-san 配布・ライブラリ化計画 進捗調査ログ

## スナップショット（2025-11-11）

### ハイライト

- `src/cli`, `src/lib`, `src/index` への再編と Commander ベースの CLI 実装により、CLI とライブラリの境界が明確化されました (`src/cli/index.ts:1-79`, `src/lib/index.ts:1-24`, `src/index.ts:1-2`)。
- npm 配布に必要な `bin`/`exports`/`typesVersions`/`files` と `prepublishOnly` フックを `package.json` に追加済みで、CJS+ESM デュアルビルドを生成する `yarn build` ランナーが確立されています (`package.json:14-114`)。
- CLI / ライブラリ / リリース専用ドキュメントが揃い、`docs/cli-guide.md` には `npm pack` リハーサル手順、`docs/library-guide.md` にはサブパス import と将来の拡張案、`docs/release.md` には SemVer 運用とチェックリストがまとまっています (`docs/cli-guide.md:6-86`, `docs/library-guide.md:3-85`, `docs/release.md:1-53`)。
- Vitest ベースの CLI / Workflow テストが追加され、GitHub Actions で `type-check → test → build` を自動実行する 1.0.0 時点の CI が動いています (`tests/cli.test.ts:1-86`, `tests/workflow.test.ts:1-65`, `.github/workflows/ci.yml:1-30`, `CHANGELOG.md:8-24`)。
- 未着手領域は、WebSocket/ComfyUI 実機に近い統合テスト、`runCli` のエラーコード／ログ設計、リリースタグ起点の `npm publish` 自動化、計画書に記載したリスク/未確定事項のクローズです (`docs/distribution-plan.md:47-100`, `docs/cli-guide.md:62-66`, `docs/release.md:52-54`)。

### 詳細ステータス

| 項目                    | 状態      | 所見                                                                                                                                                                                                                      | 根拠                                                                                                                                      | 次のアクション                                                                                                                                |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| プロジェクト構成再編    | ✅ 完了   | CLI エントリ/ライブラリ API/後方互換 re-export がそれぞれ `src/cli`・`src/lib`・`src/index` に整理され、ドキュメントでも利用方法が分離されています。                                                                      | `src/cli/index.ts:1-79`, `src/lib/index.ts:1-24`, `src/index.ts:1-2`, `README.md:1-73`                                                    | README へフォルダ構成図と import ルールを追記し、今後のノード追加時の参照場所を明確化する。                                                   |
| CLI パッケージ化        | 🟡 進行中 | `bin`/`exports`/`typesVersions`/`files`/`prepublishOnly` が整い、`docs/cli-guide.md` で `npm pack` リハーサル手順とトラブルシューティングを提供。`--quiet` や詳細エラーコードはまだ未実装です。                           | `package.json:14-114`, `docs/cli-guide.md:6-86`                                                                                           | CLI のログ/エラー設計を仕様化し、オプション（`--quiet`, `--verbose` など）と exit code テーブルを docs に追記する。                           |
| TypeScript ライブラリ化 | ✅ 完了   | ファサードとサブパス export が公開され、型情報は `typesVersions` で補完されます。ライブラリガイドに API サーフェスと拡張予定が整理されています。                                                                          | `src/lib/index.ts:1-24`, `package.json:19-73`, `docs/library-guide.md:3-85`                                                               | 破壊的変更ポリシー／サポート対象 ComfyUI バージョンを library-guide に明文化し、安定 API 宣言前の注意事項を追加する。                         |
| ビルド・配布 / CI       | 🟢 前進中 | `yarn type-check/test/build` を CI で実行し、Release 公開で `npm publish --provenance` を実行する workflow（`.github/workflows/release.yml`）も追加済みです。残タスクはカバレッジ/`npm pack` アーティファクトの共有です。 | `package.json:94-100`, `.github/workflows/ci.yml:1-30`, `.github/workflows/release.yml:1-33`, `docs/release.md:1-74`, `CHANGELOG.md:8-24` | `npm run test --coverage` の収集や `npm pack` 生成物をアーティファクト化し、Release 前後の検証証跡を残す。                                    |
| テスト・品質保証        | 🟡 前進中 | CLI/Workflow レイヤーの単体テストが追加され、CI と `prepublishOnly` で必須化されています。ただし `ComfyAPIClient` は実サーバー依存で、WebSocket/画像保存の経路は未カバーです。                                            | `tests/cli.test.ts:1-86`, `tests/workflow.test.ts:1-65`, `package.json:97-100`, `.github/workflows/ci.yml:23-30`                          | API クライアントを DI できるよう抽象化し、WebSocket メッセージとファイル I/O をモック化した統合テスト／カバレッジ収集を追加する。             |
| ドキュメント整備        | 🟢 前進中 | README から CLI/ライブラリ/リリース各ドキュメントへ誘導され、`docs/cli-guide.md`・`docs/library-guide.md`・`docs/release.md` がそれぞれドラフト完成しています。                                                           | `README.md:1-73`, `docs/cli-guide.md:1-90`, `docs/library-guide.md:1-85`, `docs/release.md:1-53`                                          | distribution-plan の「未確定事項」とリンクする FAQ/互換性ポリシーを docs に追記し、計画側のステータスも更新する。                             |
| リスク / ガバナンス     | 🟡 未着手 | 計画書に列挙した ComfyUI API 変更追従、WebSocket テスト安定化、ライセンス・配布サイズ管理などは Issue 化/解消されていません。ドキュメントにもサポート範囲の明記が不足しています。                                         | `docs/distribution-plan.md:89-100`, `src/lib/workflow/comfyui.ts:1-96`                                                                    | リスクごとに Issue/TODO を紐付け、README へサポートバージョンとローカライズ方針を追加し、`ComfyAPIClient` のログ/例外ハンドリングを整理する。 |

### リスク・課題（2025-11-11 時点）

- `npm run test --coverage` や `npm pack` 生成物を CI アーティファクトとして残しておらず、Release 成果物の再現性確保が未対応です。
- CLI ログ/エラーメッセージ設計は未着手で、`docs/cli-guide.md` でも `--quiet` を「今後予定」として扱っています (`docs/cli-guide.md:62-66`)。
- `ComfyAPIClient` は `fetch`/WebSocket を直接呼び出しつつ `console.log` ベースの例外処理で、DI もできないためテストしづらい状態です (`src/lib/workflow/comfyui.ts:1-96`)。
- 計画書のリスク・未確定項目（ComfyUI API サポート・ライセンス運用・バンドル戦略・ローカライズなど）がクローズされておらず、現行ドキュメントにも反映されていません (`docs/distribution-plan.md:89-100`)。

### 推奨フォローアップ

- `npm publish` 自動化とリハーサル（`npm pack` アーティファクトの CI 共有）を GitHub Actions に追加し、`docs/release.md` の TODO を完了扱いに更新する。
- `ComfyAPIClient` をインターフェース化し、WebSocket/HTTP をモックできるようにした上で統合テストを追加、`runCli` のログレベル／exit code ポリシーを仕様化する。
- distribution-plan の「未確定事項」について、README/FAQ でサポート範囲を明記し、残タスクを Issue とリンクさせて追跡を容易にする。

## スナップショット（2025-11-10）

### ハイライト

- `src/cli` と `src/lib` への分割が完了し、CLI は Commander ベースで単独ビルド可能、ライブラリはファサード経由で型付き公開される状態になりました。
- npm パッケージングに必要な `bin`/`exports`/`typesVersions`、CJS+ESM のデュアルビルド、CI での型チェック+ビルドまでは整備済みです。
- `package.json` に repository/bugs/homepage/keywords/engines/publishConfig と `prepublishOnly` を追加し、CLI ガイドへ `npm pack` リハーサル手順を追記済みです。
- `docs/release.md` と `CHANGELOG.md` を追加し、SemVer 運用とリリースチェックリスト／履歴管理の最低限を整備済みです。
- Vitest ベースの最小テスト（workflow/CLI）と `yarn test` スクリプトを導入し、CI でも自動実行するようになりました。
- ただし テストのカバレッジ拡大や CI の自動 publish、ログ設計など品質保証面の ToDo は残っています。

### 詳細ステータス

| 項目                    | 状態      | 所見                                                                                                                                                                                                                                                  | 根拠                                                                                                                         | 次のアクション                                                                                                                                         |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| プロジェクト構成再編    | ✅ 完了   | CLI エントリは `src/cli/index.ts`、ライブラリ API は `src/lib/index.ts` に集約し、`src/index.ts` で後方互換 export を提供しています。                                                                                                                 | `src/cli/index.ts:1`, `src/lib/index.ts:1`, `src/index.ts:1`                                                                 | Input/Output ノード追加時の import 変更を抑えるため、フォルダ構成を README のアーキテクチャ図に追記する。                                              |
| CLI パッケージ化        | 🟡 進行中 | `bin`/shebang に加えて `prepublishOnly` と `npm pack` リハーサル手順を整備し、ローカル tarball で `npx` 実行を再現できるようになりました。残課題は CLI のエラーメッセージ体系と将来の `--quiet`/ログレベル設計です。                                  | `package.json:94`, `package.json:98`, `docs/cli-guide.md:67`                                                                 | エラーコード/ログ方針をまとめ、トラブルシューティング節に反映する。                                                                                    |
| TypeScript ライブラリ化 | ✅ 完了   | 公開 API をファサードで export し、サブパス import も `exports`/`typesVersions` で提供。利用ガイド（ドラフト）も整備済みです。                                                                                                                        | `src/lib/index.ts:1`, `package.json:10`, `docs/library-guide.md:1`                                                           | API surface の安定宣言前に SemVer ポリシーと breaking change フローを決め、docs/library-guide.md にサポート範囲を明記する。                            |
| ビルド・配布 / CI 体制  | 🟡 進行中 | npm 公開向けメタデータ（repository/bugs/homepage/keywords/engines/publishConfig）と `prepublishOnly` フックを追加済みで、リリースガイド/CHANGELOG も準備できました。CI では `yarn type-check`→`yarn test`→`yarn build` を実行する体制に更新済みです。 | `package.json:5`, `package.json:80`, `package.json:86`, `package.json:90`, `docs/release.md:1`, `.github/workflows/ci.yml:1` | GitHub Actions にタグ起点の `npm publish` フローを追加し、将来的な `npm run test --coverage` のレポートや npm pack アーティファクトを自動化する。      |
| テスト・品質保証        | 🟡 前進中 | Vitest を導入し、`tests/workflow.test.ts` と `tests/cli.test.ts` でワークフロー API と CLI 引数処理をモック付きで検証、`npm run test` を `prepublishOnly` と CI に組み込みました。まだ WebSocket/ComfyUI 実機を模した統合テストは未整備です。         | `tests/workflow.test.ts:1`, `tests/cli.test.ts:1`, `package.json:94`, `.github/workflows/ci.yml:1`                           | ComfyAPIClient を DI できるようにしてモック WebSocket テストを追加し、画像保存やイベントエミッター経路をカバーする。                                   |
| ドキュメント整備        | 🟢 前進中 | README から CLI/ライブラリ/リリースガイドへの導線があり、`CHANGELOG.md` も追加済み。今後は API 仕様や拡張ガイドの深掘りが必要です。                                                                                                                   | `README.md:63`, `docs/cli-guide.md:1`, `docs/library-guide.md:1`, `docs/release.md:1`, `CHANGELOG.md:1`                      | API サーフェスのサポート範囲・互換ポリシーを docs/library-guide.md に明記し、将来のプラグイン案を docs/distribution-plan.md の未確定事項へ反映させる。 |

### 補足観察

- `dist/` には CJS/ESM/型定義すべてが生成済みで、`files` フィールドに `docs` と `README` まで含めているため npm 配布サイズは制御しやすい状態です (`package.json:66`)。
- `docs/distribution-plan.md` で挙げたリスク（WebSocket テスト、API 変更追従、ライセンス確認など）はまだ解消されていないため、Issue 起票や README へのサポート範囲明記が必要です。
- 依存関係は最小限（`commander`, `ws`）なので、バンドル戦略の検討は後回しでも影響は限定的です。まずは CLI/ライブラリアイテムの安定化と配布オペレーション整備を優先できます。
