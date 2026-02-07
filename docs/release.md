# リリース手順

`@olduvai-jp/comine-san` を npm へ公開する際のフロー、バージョニング、アクセス管理をまとめたメンテナー向けガイドです。すべてのリリースは Semantic Versioning (`MAJOR.MINOR.PATCH`) に従い、`main` ブランチからのみ行います。

## 前提条件

- Node.js 18 以上と最新の `npm` がインストールされていること。
- GitHub の `main` ブランチに書き込みできること。
- npm organization（`@olduvai-jp/comine-san` パッケージの権限）で `publish` 権限を持っていること。
- 2FA が必須の npm アカウントであること（organization 設定に合わせる）。
- ローカルの npm 設定で `@olduvai-jp:registry` が GitHub Packages を指している場合は、`npm publish`/`npm view` が npmjs.com ではなく GitHub Packages に向くため注意してください（本リポジトリは `.npmrc` で npmjs.com を明示しています）。

## 推奨: Trusted publishing（OIDC）で publish する

本リポジトリは GitHub Actions の OIDC を使った **Trusted publishing**（トークン不要）で publish できるようにしてあります（`.github/workflows/release.yml`）。

- npm 側で Trusted publisher を設定する必要があります（owner/repo/workflow file name が一致していること）。
- GitHub Actions 側は `permissions: id-token: write` が必要です（設定済み）。
- npm CLI は `11.5.1` 以上が必要です（Workflow 内で更新しています）。

注意: **初回 publish（まだ npm にパッケージが存在しない状態）では、Trusted publisher を設定する画面自体が無いため、先にトークン等で 1 回 publish してパッケージを作る**必要があります。初回 publish 後に Trusted publisher を設定し、以降の publish は OIDC に移行してください。

## バージョン管理ポリシー

| 用途                        | 例                             | 説明                                            |
| --------------------------- | ------------------------------ | ----------------------------------------------- |
| 破壊的変更                  | `npm version major` → `v2.0.0` | CLI の既存オプション削除や公開 API の互換性崩壊 |
| 後方互換な機能追加          | `npm version minor` → `v1.1.0` | 新しいノード型や CLI オプションを追加           |
| バグ修正 / ドキュメントのみ | `npm version patch` → `v1.0.1` | ログ改善、型調整、CI 修正など                   |

`npm version` は自動的に `CHANGELOG.md` 更新分と合わせてタグを作成します。タグは GitHub へ push し、必要に応じて Release Note を作成してください。

## リリースチェックリスト

1. `main` を最新にし、未マージの変更がないか確認する。
2. ドキュメント（`README.md`, `docs/*.md`）と `CHANGELOG.md` を更新する。
3. `npm run prepublishOnly` で型チェック・テスト・ビルドが通ることを確認する。
4. `docs/cli-guide.md` の手順で `npm pack` → `npx` リハーサルを行い、生成物が動作することを確認する。
5. `npm version <major|minor|patch>` を実行し、バージョン番号とタグを更新する。
6. `git push origin main --tags` を実行し、CI が成功することを確認する。
7. `npm publish --access public`（または organization 設定に応じたコマンド）を実行する。
8. GitHub Release に変更点を掲載し、必要に応じてドキュメントへリンクする。

## npm publish コマンド

```bash
# 例: 後方互換の機能追加
npm version minor
git push origin main --tags
npm publish --access public
```

## GitHub Actions での自動 publish

- `.github/workflows/release.yml` は Release の `published` イベント（または手動 `workflow_dispatch`）で起動し、`yarn install → type-check → test → build → npm publish` を実行します。
- Trusted publishing（OIDC）を使う場合、GitHub Secrets に `NPM_TOKEN` を登録する必要はありません。
- npm 側で provenance が有効になるよう `id-token: write` パーミッションを付与済みです。Organization のポリシーで Provenance を必須にしている場合でも追加設定は不要です。
- Release を作成して `Publish release` を押すと自動的に npm へ公開されます。事前検証したい場合は `workflow_dispatch` を実行し、成功後に Release を確定させてください。

## アクセス制御

- npm: organization owners が `publish` 権限を管理します。少なくとも 2 名以上で管理し、パスワードレスポンスに備えてください。
- GitHub: Release 権限を持つメンテナーのみがタグ push と Release 作成を行う想定です。
- CI: `NODE_AUTH_TOKEN` を使うワークフローは `environment` で保護し、承認が必要な設定にします。

## トラブルシューティング

| 症状                     | 対応                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `npm version` が失敗する | `git status` が clean か確認。未コミットがあればコミットしてから再実行                        |
| `npm publish` で 403/401 | npm の 2FA/Token が有効期限切れ。`npm login --registry https://registry.npmjs.org/` で再発行  |
| 公開後に重大な不具合     | `npm dist-tag add @olduvai-jp/comine-san@<previous-version> latest` でロールバックし、修正版を re-publish |

## 今後の自動化 TODO

- ✅ `npm pack` 生成物（`.tgz`）を CI のアーティファクトとして保存し、レビュー時の検証コストを下げる。
- TODO: `npm run test` のログや `test --coverage` の成果物を CI のアーティファクトとして保存する（カバレッジは別途対応）。
