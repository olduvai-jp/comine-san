import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { test } from 'node:test';

import { ComfyAPIClient } from '../src/lib/workflow/comfyui';
import { ComfyUiWorkflow } from '../src/lib/workflow/workflow';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    sleep(ms).then(() => {
      throw new Error(`Timed out after ${ms}ms`);
    }),
  ]);
}

class FakeWebSocket extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;

  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.OPEN;
  closeCalled = false;

  constructor(public url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closeCalled = true;
    this.readyState = 3; // CLOSED (value isn't important for these tests)
    this.emit('close');
  }

  emitMessage(obj: unknown) {
    const buf = Buffer.from(JSON.stringify(obj));
    this.emit('message', buf);
  }
}

function makeWorkflow() {
  // Minimal valid workflow JSON; node types do not matter for queue() behavior.
  return new ComfyUiWorkflow({
    '1': {
      class_type: 'Primitive string multiline [Crystools]',
      inputs: { string: 'hello' },
      _meta: { title: 'Prompt Text' },
    },
  });
}

test('ComfyAPIClient.queue resolves when completion message arrives before /prompt fetch resolves (race)', async () => {
  FakeWebSocket.instances = [];

  const workflow = makeWorkflow();
  const fetchDeferred = deferred<{
    ok: boolean;
    status: number;
    statusText: string;
    text(): Promise<string>;
  }>();

  const client = new ComfyAPIClient('http://localhost:8188', {
    fetch: async () => fetchDeferred.promise,
    WebSocket: FakeWebSocket,
  });

  const queuePromise = client.queue(workflow);

  const ws = FakeWebSocket.instances[0];
  assert.ok(ws, 'FakeWebSocket instance was not created');

  // Completion message (node: null) arrives before HTTP /prompt returns.
  ws.emitMessage({ type: 'executing', data: { node: null } });

  fetchDeferred.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify({ prompt_id: 'prompt-123' }),
  });

  await withTimeout(queuePromise, 200);
  assert.equal(ws.closeCalled, true, 'WebSocket was not closed on completion');
});

test('ComfyAPIClient.queue rejects when /prompt returns non-ok (and closes ws)', async () => {
  FakeWebSocket.instances = [];

  const workflow = makeWorkflow();

  const client = new ComfyAPIClient('http://localhost:8188', {
    fetch: async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => JSON.stringify({ error: 'nope' }),
    }),
    WebSocket: FakeWebSocket,
  });

  const queuePromise = client.queue(workflow);

  const ws = FakeWebSocket.instances[0];
  assert.ok(ws, 'FakeWebSocket instance was not created');

  await assert.rejects(queuePromise, /ComfyUI server error/);
  assert.equal(ws.closeCalled, true, 'WebSocket was not closed on /prompt error');
});

