import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';

import type { ComfyUiWorkflowJson } from '../src/lib/workflow/workflow';
import { ComfyUiWorkflow } from '../src/lib/workflow/workflow';
import { SaveImage } from '../src/lib/workflow/nodes/output/saveImage';
import { SaveAnimatedWEBP } from '../src/lib/workflow/nodes/output/saveAnimatedWebp';

function assertIsString(value: unknown, message?: string): asserts value is string {
  assert.equal(typeof value, 'string', message);
}

function makeWorkflowJson(): ComfyUiWorkflowJson {
  return {
    '1': {
      class_type: 'Primitive string multiline [Crystools]',
      inputs: { string: 'hello' },
      _meta: { title: 'Prompt Text' },
    },
    '2': {
      class_type: 'Primitive integer [Crystools]',
      inputs: { int: 123 },
      _meta: { title: 'Seed#1' },
    },
    '3': {
      class_type: 'SaveImage',
      inputs: {},
      _meta: { title: 'Output Image' },
    },
  };
}

test('getWorkflowParams uses normalized titles and includes input/output params', () => {
  const workflow = new ComfyUiWorkflow(makeWorkflowJson());
  const params = workflow.getWorkflowParams();

  // Title normalization happens in InputNode/OutputNode base classes.
  assert.equal(params['Prompt_Text.string'], 'hello');
  assert.equal(params['Seed_1.int'], 123);
  assert.equal(params['Output_Image.filename'], 'Output_Image.png');

  assert.equal(params['Prompt Text.string'], undefined);
  assert.equal(params['Seed#1.int'], undefined);
});

test('setWorkflowParams updates existing params (but ignores undefined and unknown keys)', () => {
  const workflow = new ComfyUiWorkflow(makeWorkflowJson());

  workflow.setWorkflowParams({
    Prompt_Text: 'this key should be ignored (no dot)',
    'Prompt_Text.string': 'updated',
    'Seed_1.int': undefined, // should not overwrite
    'Output_Image.filename': 'custom/path.png',
    'Unknown.key': 'ignored',
  });

  const params = workflow.getWorkflowParams();
  assert.equal(params['Prompt_Text.string'], 'updated');
  assert.equal(params['Seed_1.int'], 123);
  assert.equal(params['Output_Image.filename'], 'custom/path.png');
});

test('getModifiedJson returns a deep copy with modified node inputs applied', () => {
  const original = makeWorkflowJson();
  const workflow = new ComfyUiWorkflow(original);

  workflow.setWorkflowParams({
    'Prompt_Text.string': 'new prompt',
    'Output_Image.filename': 'out/result.png',
  });

  const modified = workflow.getModifiedJson();

  // Original JSON should not be mutated.
  assert.equal(original['1'].inputs.string, 'hello');
  assert.equal((original['3'].inputs as any).filename, undefined);

  // Modified JSON should reflect updated INPUT-node values.
  assert.equal(modified['1'].inputs.string, 'new prompt');
  assert.equal(modified['2'].inputs.int, 123);

  // Output-node params are workflow-run sidecar settings, not prompt JSON inputs.
  assert.equal((modified['3'].inputs as any).filename, undefined);

  // Output-node params still update the workflow's runtime params.
  const params = workflow.getWorkflowParams();
  assert.equal(params['Output_Image.filename'], 'out/result.png');

  // Deep copy: nested objects should not be the same reference.
  assert.notEqual(modified, original);
  assert.notEqual(modified['1'].inputs, original['1'].inputs);
  assert.notEqual(modified['3'].inputs, original['3'].inputs);
});

test('getWorkflowResultTypes reports output result shapes keyed by normalized title', () => {
  const workflow = new ComfyUiWorkflow(makeWorkflowJson());
  const resultTypes = workflow.getWorkflowResultTypes();

  assert.deepEqual(resultTypes, {
    Output_Image: {
      filename: 'string',
    },
  });
});

test('SaveImage.result() resolves relative filename input to an absolute path', () => {
  const workflow = new ComfyUiWorkflow(makeWorkflowJson());
  workflow.setWorkflowParams({
    'Output_Image.filename': 'out/result.png',
  });

  const node = workflow.outputNodeInstances.find((n) => n instanceof SaveImage);
  assert.ok(node, 'SaveImage node not found');

  const result = node.result();
  const filename = result.filename;
  assertIsString(filename);
  assert.ok(path.isAbsolute(filename));
});

test('SaveAnimatedWEBP.result() resolves relative filename input to an absolute path', () => {
  const workflowJson: ComfyUiWorkflowJson = {
    '1': {
      class_type: 'SaveAnimatedWEBP',
      inputs: {},
      _meta: { title: 'Output Animation' },
    },
  };

  const workflow = new ComfyUiWorkflow(workflowJson);
  workflow.setWorkflowParams({
    'Output_Animation.filename': 'out/anim.webp',
  });

  const node = workflow.outputNodeInstances.find((n) => n instanceof SaveAnimatedWEBP);
  assert.ok(node, 'SaveAnimatedWEBP node not found');

  const result = node.result();
  const filename = result.filename;
  assertIsString(filename);
  assert.ok(path.isAbsolute(filename));
});

test('built-in output nodes: result() keys are a subset of resultType() keys', () => {
  const workflowJson: ComfyUiWorkflowJson = {
    '1': {
      class_type: 'SaveImage',
      inputs: {},
      _meta: { title: 'Output Image' },
    },
    '2': {
      class_type: 'SaveAnimatedWEBP',
      inputs: {},
      _meta: { title: 'Output Animation' },
    },
    '3': {
      class_type: 'ShowText|pysssss',
      inputs: {},
      _meta: { title: 'Output Text' },
    },
    '4': {
      class_type: 'Show any to JSON [Crystools]',
      inputs: {},
      _meta: { title: 'Output Json' },
    },
  };

  const workflow = new ComfyUiWorkflow(workflowJson);
  assert.ok(workflow.outputNodeInstances.length > 0, 'No output nodes were registered');

  for (const node of workflow.outputNodeInstances) {
    const resultKeys = Object.keys(node.result());
    const typeKeys = Object.keys(node.resultType());

    for (const k of resultKeys) {
      assert.ok(typeKeys.includes(k), `Unexpected result key: ${k}`);
    }
  }
});
