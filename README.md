# Comine San

```shell
> yarn ts-node index.ts ./workflow_api.json --help
Usage: index [options]

Options:
  --seed <int>                Primitive integer [Crystools]
  --denoise-strength <float>  Primitive float [Crystools]
  --prompt <string>           Primitive string multiline [Crystools]
  --negative-prompt <string>  Primitive string multiline [Crystools]
  --output-tags <string>      save path
  --Save-Image <string>       save path
  --output <string>           output dir path (default: "output")
  -h, --help                  display help for command
>
```

```shell
> yarn ts-node index.ts ./workflow_sample/workflow_api.json --prompt "test, hoge, fuga" --seed 66133 --negative-prompt "text" --denoise-strength 0.55 --output "out"
```