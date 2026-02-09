import * as fs from 'fs';
import { Command, CommanderError } from 'commander';
import { ComfyUiWorkflow } from '../lib';

const EXIT_CODES = {
  success: 0,
  badArguments: 2,
  workflowFileNotFound: 3,
  workflowJsonParseError: 4,
  comfyUiServerOrNetworkError: 5,
  unknownError: 1,
} as const;

function coerceErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isComfyUiServerOrNetworkError(err: unknown): boolean {
  const msg = coerceErrorMessage(err);
  return (
    /ComfyUI/i.test(msg) ||
    /\bECONNREFUSED\b/i.test(msg) ||
    /\bENOTFOUND\b/i.test(msg) ||
    /\bEHOSTUNREACH\b/i.test(msg) ||
    /\bETIMEDOUT\b/i.test(msg) ||
    /\bfetch failed\b/i.test(msg)
  );
}

function handleCommanderError(err: unknown): boolean {
  if (!(err instanceof CommanderError)) return false;

  // --help / help() typically uses exitCode 0.
  if (err.exitCode === 0) {
    process.exitCode = EXIT_CODES.success;
    return true;
  }

  // Commander already prints parse errors to stderr (and we enable showHelpAfterError()).
  // Avoid duplicating the same message here.
  process.exitCode = EXIT_CODES.badArguments;
  return true;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = new Command('comine-san');
  program.showHelpAfterError();
  program.exitOverride();

  program
    .argument('<workflow-path>', 'path to workflow_api.json')
    .option('--server <string>', 'server url', 'http://127.0.0.1:8188')
    .option('--output-json <string>', 'path to output json (use "-" for stdout)', 'metadata.json')
    .option('-q, --quiet', 'suppress output (prints only output json path on success)')
    .option('-v, --verbose', 'print progress/executing/executed events');

  if (argv.length <= 2) {
    try {
      program.help({ error: false });
    } catch (err) {
      handleCommanderError(err);
    }
    return;
  }

  let workflowPath: string | undefined;
  try {
    const parsedArgs = program.parseOptions(argv.slice(2));
    workflowPath = parsedArgs.operands[0];
  } catch (err) {
    if (handleCommanderError(err)) return;
    throw err;
  }

  // `comine-san --help` should show base help and succeed even without <workflow-path>.
  // (If <workflow-path> is provided, we will load the workflow and show generated options later.)
  const userArgs = argv.slice(2);
  const requestedHelp = userArgs.includes('--help') || userArgs.includes('-h');
  if (!workflowPath && requestedHelp) {
    try {
      program.help({ error: false });
    } catch (err) {
      handleCommanderError(err);
    }
    return;
  }

  if (!workflowPath) {
    console.error('Missing required argument: <workflow-path>');
    process.exitCode = EXIT_CODES.badArguments;
    program.outputHelp();
    return;
  }

  if (!fs.existsSync(workflowPath)) {
    console.error(`File not found: ${workflowPath}`);
    process.exitCode = EXIT_CODES.workflowFileNotFound;
    return;
  }

  let workflowJson: unknown;
  try {
    workflowJson = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse workflow JSON: ${workflowPath}`);
    console.error(coerceErrorMessage(err));
    process.exitCode = EXIT_CODES.workflowJsonParseError;
    return;
  }

  const workflow = new ComfyUiWorkflow(workflowJson as any);
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

  try {
    program.parse(argv);
  } catch (err) {
    if (handleCommanderError(err)) return;
    throw err;
  }

  const options = program.opts();
  if (options.quiet && options.verbose) {
    console.error('Options --quiet and --verbose are mutually exclusive.');
    process.exitCode = EXIT_CODES.badArguments;
    return;
  }

  workflow.setWorkflowParams(options);

  if (options.verbose) {
    workflow.outputEmitter.on('progress', (_client, data) => {
      console.error('Progress:', data);
    });
    workflow.outputEmitter.on('executing', (_client, data) => {
      console.error('Executing:', data);
    });
    workflow.outputEmitter.on('executed', (_client, data) => {
      console.error('Executed:', data);
    });
  }

  try {
    await workflow.execute(options.server);
  } catch (err) {
    console.error(coerceErrorMessage(err));
    process.exitCode = isComfyUiServerOrNetworkError(err)
      ? EXIT_CODES.comfyUiServerOrNetworkError
      : EXIT_CODES.unknownError;
    return;
  }

  const results = workflow.getWorkflowResult();
  const outputJsonPath = options.outputJson;
  const json = JSON.stringify(results, null, 2);

  // Convention: `--output-json -` writes JSON to stdout (and does not create any file).
  if (outputJsonPath === '-') {
    process.stdout.write(json + '\n');
    return;
  }

  fs.writeFileSync(outputJsonPath, json);
  if (options.quiet) console.log(outputJsonPath);
  else console.log(`Output json saved to ${outputJsonPath}`);
}
