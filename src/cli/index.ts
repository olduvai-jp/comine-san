#!/usr/bin/env node
import * as fs from 'fs';
import { Command } from 'commander';
import { ComfyUiWorkflow } from '../lib';

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = new Command('comine-san');
  program.showHelpAfterError();

  program
    .argument('<workflow-path>', 'path to workflow_api.json')
    .option('--server <string>', 'server url', 'http://127.0.0.1:8188')
    .option('--output-json <string>', 'path to output json', 'metadata.json');

  if (argv.length <= 2) {
    program.help({ error: false });
    return;
  }

  const parsedArgs = program.parseOptions(argv.slice(2));
  const workflowPath = parsedArgs.operands[0];

  if (!workflowPath) {
    program.help({ error: false });
    return;
  }

  if (!fs.existsSync(workflowPath)) {
    console.error(`File not found: ${workflowPath}`);
    process.exitCode = 1;
    return;
  }

  const workflowJson = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const workflow = new ComfyUiWorkflow(workflowJson);
  const wfParams = workflow.getWorkflowParams();

  Object.entries(wfParams).forEach(([key, value]) => {
    switch (typeof value) {
      case 'string':
        program.option(`--${key} <string>`, `provide a ${key}`, value);
        break;
      case 'number':
        program.option(`--${key} <number>`, `provide a ${key}`, Number, value);
        break;
      case 'boolean':
        program.option(`--${key} <boolean>`, `provide a ${key}`, (v: string) => v === 'true', value);
        break;
      default:
        break;
    }
  });

  const resultTypes = workflow.getWorkflowResultTypes();
  program.addHelpText('after', '\nResult types:\n' + JSON.stringify(resultTypes, null, 2));

  program.parse(argv);

  const options = program.opts();
  workflow.setWorkflowParams(options);
  await workflow.execute(options.server);

  const results = workflow.getWorkflowResult();
  const outputJsonPath = options.outputJson;
  fs.writeFileSync(outputJsonPath, JSON.stringify(results, null, 2));
  console.log(`Output json saved to ${outputJsonPath}`);
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
