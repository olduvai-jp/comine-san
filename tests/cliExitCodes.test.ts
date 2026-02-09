import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { runCli } from '../src/cli';
import { ComfyAPIClient } from '../src/lib/workflow/comfyui';
import { OutputNode } from '../src/lib/workflow/nodes/output/outputNodeBase';
import { ComfyUiWorkflow } from '../src/lib/workflow/workflow';

function captureStdoutStderr() {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  let stdout = '';
  let stderr = '';

  function coerceChunk(chunk: any, encoding?: any): string {
    if (typeof chunk === 'string') return chunk;
    if (Buffer.isBuffer(chunk)) {
      const enc = typeof encoding === 'string' && Buffer.isEncoding(encoding) ? encoding : 'utf8';
      return chunk.toString(enc);
    }
    return String(chunk);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.stdout.write as any) = (chunk: any, encoding?: any, cb?: any) => {
    stdout += coerceChunk(chunk, encoding);
    if (typeof encoding === 'function') encoding();
    if (typeof cb === 'function') cb();
    return true;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.stderr.write as any) = (chunk: any, encoding?: any, cb?: any) => {
    stderr += coerceChunk(chunk, encoding);
    if (typeof encoding === 'function') encoding();
    if (typeof cb === 'function') cb();
    return true;
  };

  return {
    getStdout: () => stdout,
    getStderr: () => stderr,
    restore: () => {
      process.stdout.write = originalStdoutWrite as any;
      process.stderr.write = originalStderrWrite as any;
    },
  };
}

class FakeWebSocket extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.OPEN;

  constructor(public url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3; // CLOSED (value doesn't matter for these tests)
    this.emit('close');
  }

  emitMessage(obj: unknown) {
    const buf = Buffer.from(JSON.stringify(obj));
    this.emit('message', buf);
  }
}

function makeMinimalWorkflow() {
  return new ComfyUiWorkflow({
    '1': {
      class_type: 'Primitive string multiline [Crystools]',
      inputs: { string: 'hello' },
      _meta: { title: 'Prompt Text' },
    },
  });
}

test('runCli: --help exits 0 and does not complain about missing workflow path', async () => {
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;
  const cap = captureStdoutStderr();

  try {
    await runCli(['node', 'comine-san', '--help']);
    assert.ok(process.exitCode === 0 || process.exitCode === undefined);
    assert.notEqual(process.exitCode, 2);
    assert.ok(!cap.getStderr().includes('Missing required argument: <workflow-path>'));
  } finally {
    cap.restore();
    process.exitCode = originalExitCode;
  }
});

test('runCli: file not found sets exitCode=3', async () => {
  const originalExitCode = process.exitCode;
  const originalConsoleError = console.error;
  process.exitCode = undefined;
  console.error = () => {};

  try {
    await runCli(['node', 'comine-san', '/path/does/not/exist/workflow_api.json']);
    assert.equal(process.exitCode, 3);
  } finally {
    console.error = originalConsoleError;
    process.exitCode = originalExitCode;
  }
});

test('runCli: invalid JSON sets exitCode=4', async () => {
  const originalExitCode = process.exitCode;
  const originalConsoleError = console.error;
  process.exitCode = undefined;
  console.error = () => {};

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  fs.writeFileSync(workflowPath, '{ this is not valid JSON', 'utf8');

  try {
    await runCli(['node', 'comine-san', workflowPath]);
    assert.equal(process.exitCode, 4);
  } finally {
    console.error = originalConsoleError;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: unknown option is not printed twice', async () => {
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;
  const cap = captureStdoutStderr();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  try {
    await runCli(['node', 'comine-san', workflowPath, '--definitely-unknown-option']);
    assert.equal(process.exitCode, 2);
    const stderr = cap.getStderr();
    const occurrences = stderr.split('unknown option').length - 1;
    assert.equal(occurrences, 1);
  } finally {
    cap.restore();
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: --quiet and --verbose are mutually exclusive (exitCode=2) and does not execute workflow', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;
  const cap = captureStdoutStderr();

  let executeCalls = 0;
  (ComfyUiWorkflow.prototype as any).execute = async () => {
    executeCalls += 1;
  };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  try {
    await runCli(['node', 'comine-san', workflowPath, '--quiet', '--verbose']);
    assert.equal(process.exitCode, 2);
    assert.equal(executeCalls, 0);
    assert.equal(cap.getStdout(), '');
    assert.match(cap.getStderr(), /mutually exclusive/i);
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: success sets exitCode=0 (implicit) and stdout is human log unless --quiet', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;

  (ComfyUiWorkflow.prototype as any).execute = async () => {};

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  const outputJsonPath = path.join(dir, 'out.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  const cap = captureStdoutStderr();
  try {
    await runCli(['node', 'comine-san', workflowPath, '--output-json', outputJsonPath]);
    assert.ok(process.exitCode == null || process.exitCode === 0);
    assert.ok(fs.existsSync(outputJsonPath), 'output json was not written');
    // stdout is human-oriented unless --quiet; avoid coupling to exact wording.
    assert.ok(cap.getStdout().length > 0, 'stdout should not be empty on success');
    assert.equal(cap.getStderr(), '');
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: --quiet prints only output json path to stdout', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;

  (ComfyUiWorkflow.prototype as any).execute = async () => {};

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  const outputJsonPath = path.join(dir, 'out.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  const cap = captureStdoutStderr();
  try {
    await runCli(['node', 'comine-san', workflowPath, '--output-json', outputJsonPath, '--quiet']);
    assert.ok(process.exitCode == null || process.exitCode === 0);
    assert.equal(cap.getStdout().trim(), outputJsonPath);
    assert.equal(cap.getStderr(), '');
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: --output-json - prints JSON to stdout and does not create a file', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;

  (ComfyUiWorkflow.prototype as any).execute = async () => {};

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  const cap = captureStdoutStderr();
  try {
    await runCli(['node', 'comine-san', workflowPath, '--output-json', '-']);
    assert.ok(process.exitCode == null || process.exitCode === 0);
    const stdout = cap.getStdout();
    assert.doesNotThrow(() => JSON.parse(stdout), 'stdout should be valid JSON');
    assert.equal(cap.getStderr(), '');
    assert.equal(fs.readdirSync(dir).includes('metadata.json'), false);
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: --verbose event logs go to stderr (stdout stays human log)', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;

  (ComfyUiWorkflow.prototype as any).execute = async function (this: ComfyUiWorkflow) {
    this.outputEmitter.emit('progress', null, { step: 'p' });
    this.outputEmitter.emit('executing', null, { node: '1' });
    this.outputEmitter.emit('executed', null, { node: '1' });
  };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  const outputJsonPath = path.join(dir, 'out.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  const cap = captureStdoutStderr();
  try {
    await runCli(['node', 'comine-san', workflowPath, '--output-json', outputJsonPath, '--verbose']);
    assert.ok(process.exitCode == null || process.exitCode === 0);
    assert.ok(cap.getStdout().length > 0, 'stdout should not be empty on success');
    assert.match(cap.getStderr(), /Progress:/);
    assert.match(cap.getStderr(), /Executing:/);
    assert.match(cap.getStderr(), /Executed:/);
    assert.ok(!cap.getStdout().includes('Progress:'), 'stdout should not contain verbose event logs');
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: ComfyUI server/network error sets exitCode=5', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;
  const cap = captureStdoutStderr();

  (ComfyUiWorkflow.prototype as any).execute = async () => {
    throw new Error('ECONNREFUSED 127.0.0.1:8188');
  };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  try {
    await runCli(['node', 'comine-san', workflowPath]);
    assert.equal(process.exitCode, 5);
    assert.match(cap.getStderr(), /ECONNREFUSED/i);
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('runCli: unknown error sets exitCode=1', async () => {
  const originalExitCode = process.exitCode;
  const originalExecute = (ComfyUiWorkflow.prototype as any).execute;
  process.exitCode = undefined;
  const cap = captureStdoutStderr();

  (ComfyUiWorkflow.prototype as any).execute = async () => {
    throw new Error('some unexpected failure');
  };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comine-san-tests-'));
  const workflowPath = path.join(dir, 'workflow_api.json');
  fs.writeFileSync(
    workflowPath,
    JSON.stringify({
      '1': {
        class_type: 'Primitive string multiline [Crystools]',
        inputs: { string: 'hello' },
        _meta: { title: 'Prompt Text' },
      },
    }),
    'utf8',
  );

  try {
    await runCli(['node', 'comine-san', workflowPath]);
    assert.equal(process.exitCode, 1);
    assert.match(cap.getStderr(), /unexpected failure/i);
  } finally {
    cap.restore();
    (ComfyUiWorkflow.prototype as any).execute = originalExecute;
    process.exitCode = originalExitCode;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

test('library: OutputNodeBase default handlers do not call console.log', () => {
  const originalConsoleLog = console.log;
  let calls = 0;
  console.log = () => {
    calls += 1;
  };

  try {
    const node = new OutputNode('1', 'Output');
    node.onProgress(null as any, { node: '1' });
    node.onExecuting(null as any, { node: '1' });
    node.onExecuted(null as any, { node: '1' });
    node.onGetArrayBuffer(null as any, { hello: 'world' });
    assert.equal(calls, 0);
  } finally {
    console.log = originalConsoleLog;
  }
});

test('library: ComfyAPIClient default logger does not call console.log', async () => {
  FakeWebSocket.instances = [];

  const originalConsoleLog = console.log;
  let calls = 0;
  console.log = () => {
    calls += 1;
  };

  try {
    const workflow = makeMinimalWorkflow();

    const client = new ComfyAPIClient('http://localhost:8188', {
      fetch: async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ prompt_id: 'prompt-1' }),
      }),
      WebSocket: FakeWebSocket,
    });

    const queuePromise = client.queue(workflow);
    const ws = FakeWebSocket.instances[0];
    assert.ok(ws, 'FakeWebSocket instance was not created');

    ws.emitMessage({ type: 'some_unknown_type', data: { foo: 'bar' } });
    ws.emitMessage({ type: 'executing', data: { node: null, prompt_id: 'prompt-1' } });

    await queuePromise;
    assert.equal(calls, 0);
  } finally {
    console.log = originalConsoleLog;
  }
});
