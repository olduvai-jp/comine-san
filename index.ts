import * as fs from 'fs';
import { Command } from 'commander';
import { ComfyUiWorkflow } from './workflow/workflow';

// main関数
;(async () => {
  const program = new Command('comine-san');
  program.showHelpAfterError();

  program
    .argument('<workflow-path>', 'path to workflow_api.json')
    .argument('<output-json>', 'path to output json')
    .option('--server <string>', 'server url', 'http://127.0.0.1:8188')

  if (process.argv.length <= 2) {
    program.help({ error: false });
  }

  program.parse(process.argv.slice(0, 4)); // 最初の引数(jsonpath)のみをパース

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

  // Workflowのパラメータをコマンドオプションとして追加
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
        program.option(`--${key} <boolean>` , `provide a ${key}`, (v: string) => v === 'true', value);
        break;
    }
  });

  // 出力形式をhelpに追加
  const resultTypes = workflow.getWorkflowResultTypes();
  program.addHelpText('after', '\nResult types:\n' + JSON.stringify(resultTypes, null, 2));

  program.parse(process.argv);

  if (process.argv.length <= 3) {
    program.help();
  }

  // パラメータをWorkflowにセット
  const options = program.opts();

  workflow.setWorkflowParams(options);

  await workflow.execute(options.server);
  
  const results = workflow.getWorkflowResult();

  const outputJsonPath = program.args[1];
  fs.writeFileSync(outputJsonPath, JSON.stringify(results, null, 2));
  console.log(`Output json saved to ${outputJsonPath}`);

})();
