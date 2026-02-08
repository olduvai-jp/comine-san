# comine-san CLI cheatsheet

## Help (generated options)

```bash
npx --yes @olduvai-jp/comine-san ./path/to/workflow_api.json --help
```

## Run (typical)

```bash
npx --yes @olduvai-jp/comine-san ./path/to/workflow_api.json \
  --server http://127.0.0.1:8188 \
  --output-json ./results/output.json
```

## Run (script-friendly)

Print only the output json path (for piping/automation):

```bash
out_json="$(npx --yes @olduvai-jp/comine-san ./path/to/workflow_api.json --quiet)"
cat "$out_json"
```

## Pass workflow parameters

Generated parameters depend on the workflow. Example:

```bash
npx --yes @olduvai-jp/comine-san ./path/to/workflow_api.json \
  --Prompt_Text.string "a cat, studio lighting" \
  --SaveImage.filename "output/result.png"
```

Always copy the exact option names from `--help`.

## Distribution rehearsal (run the packed tarball)

Useful to test the published shape without publishing:

```bash
npm pack
npx --yes ./olduvai-jp-comine-san-*.tgz ./path/to/workflow_api.json --help
```

## List installed models (ComfyUI API)

Use when ComfyUI errors with `not found` for a checkpoint/LoRA/VAE and you need candidate names:

```bash
curl http://127.0.0.1:8188/models
curl http://127.0.0.1:8188/models/checkpoints
```
