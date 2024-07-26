import * as fs from 'fs';
import { Command } from 'commander';
import { ComfyUiWorkflow } from './workflow';
import { ComfyAPIClient } from './comfyui';

// main関数
;(async () => {
  const program = new Command('comine-san');

  program
    .argument('<workflow-path>', 'path to workflow_api.json')
    .argument('<output-json>', 'path to output json');

  program.parse(process.argv.slice(0, 3)); // 最初の引数(jsonpath)のみをパース

  const jsonFilePath = program.args[0];

  if (!jsonFilePath) {
    program.help();
  }

  // Workflowを読み込み
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`File not found: ${jsonFilePath}`);
    process.exit(1);
  }

  const workflow = new ComfyUiWorkflow(JSON.parse(fs.readFileSync(jsonFilePath, 'utf8')));
  const wfParams = workflow.getWorkflowParams();
  // console.log(wfParams);

  // JSONのキーをコマンドオプションとして追加
  Object.entries(wfParams).forEach(([key, value]) => {
    //console.log(`Adding option: --${key} <${typeof value}>, default ${value}`);
    switch (typeof value) {
      case 'string':
        program.option(`--${key} <string>`, `provide a ${key}`, value);
        break;
      case 'number':
        program.option(`--${key} <number>`, `provide a ${key}`, Number, value);
        break;
      case 'boolean':
        program.option(`--${key} <boolean>` , `provide a ${key}`, (v) => v === 'true', value);
        break;
    }
  });

  program.parse(process.argv);

  if (process.argv.length <= 2) {
    program.help();
  }

  const options = program.opts();
  console.log('Parsed options:', options);

  workflow.setWorkflowParams(options);

  const apiInstance = new ComfyAPIClient('http://192.168.23.17:8188')
  await apiInstance.queue(workflow, program.args[1]);
})();