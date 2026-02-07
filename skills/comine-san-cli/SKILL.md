---
name: comine-san-cli
description: Run ComfyUI workflows from the command line using comine-san (npx). Use when the user has a ComfyUI-exported workflow_api.json and wants to (1) discover generated CLI options via --help, (2) execute against a ComfyUI server via --server, (3) save aggregated results via --output-json, or (4) script runs with --quiet and troubleshoot common failures (missing file, invalid JSON, cannot connect to server).
---

# Comine San CLI

## Quick Start (npx)

1. Export the workflow from ComfyUI as `workflow_api.json`.
2. Start a ComfyUI server (default: `http://127.0.0.1:8188`).
3. Inspect generated options from the workflow:

```bash
npx --yes @olduvai-jp/comine-san ./path/to/workflow_api.json --help
```

4. Run it with the required params:

```bash
npx --yes @olduvai-jp/comine-san ./path/to/workflow_api.json \
  --server http://127.0.0.1:8188 \
  --output-json ./results/output.json
```

## How Parameters Map To CLI Options

comine-san reads the workflow JSON and generates options in this form:

`--<NodeTitle>.<inputKey> <value>`

Notes:
- `<NodeTitle>` is taken from the node title in ComfyUI and normalized to `[A-Za-z0-9_-]` (other chars become `_`).
- Use `--help` to see the exact list for the workflow you are running.

Example:
- Node title: `Prompt Text`
- Input key: `string`
- CLI option: `--Prompt_Text.string`

## Output

- `--output-json <path>` writes an aggregated JSON of output node results (default: `metadata.json`).
- Some output nodes (e.g. `SaveImage`) also write files to paths specified by their generated options.

## Useful Flags

- `--server <url>`: ComfyUI base URL (default: `http://127.0.0.1:8188`)
- `--output-json <path>`: output JSON path (default: `metadata.json`)
- `--quiet`: print only the output json path to stdout (useful for scripts)
- `--verbose`: log progress/executing/executed events to stderr

## Troubleshooting

- If `--help` shows no generated options: confirm you exported `workflow_api.json` (not the UI workflow json).
- If it fails to connect: confirm the server URL and that ComfyUI is reachable from your machine.
- If a parameter seems ignored: confirm you used the exact option spelling from `--help` for that workflow.

## References

For additional examples (including `npm pack` -> `npx ./tgz`), read `references/cheatsheet.md`.
