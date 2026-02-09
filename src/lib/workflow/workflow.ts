import EventEmitter from 'events';
import { ComfyAPIClient } from './comfyui';
import { InputNode } from './nodes/input/inputNodeBase';
import { PrimitiveString, PrimitiveStringCrystools, PrimitiveStringMultiline } from './nodes/input/primitiveString';
import { PrimitiveInt, PrimitiveIntegerCrystools } from './nodes/input/primitiveInteger';
import { PrimitiveBoolean } from './nodes/input/primitiveBoolean';
import { PrimitiveFloat, PrimitiveFloatCrystools } from './nodes/input/primitiveFloat';

import { OutputNode } from './nodes/output/outputNodeBase';
import { SaveImage } from './nodes/output/saveImage';
import { SaveAnimatedWEBP } from './nodes/output/saveAnimatedWebp';
import { ShowAnyToJson } from './nodes/output/showAnyToJson';
import { LoadImageBase64 } from './nodes/input/loadImageBase64';
import { ShowTextPysssss } from './nodes/output/showText';
import { LoadImage } from './nodes/input/loadImage';
import type { WorkflowResults, WorkflowResultTypes } from './resultTypes';

const inputNodeClasses = [
  PrimitiveString,
  PrimitiveStringMultiline,
  PrimitiveInt,
  PrimitiveFloat,
  PrimitiveBoolean,
  PrimitiveStringCrystools,
  PrimitiveIntegerCrystools,
  PrimitiveFloatCrystools,
  LoadImageBase64,
  LoadImage,
];

const outputNodeClasses = [SaveImage, SaveAnimatedWEBP, ShowAnyToJson, ShowTextPysssss];

export interface ComfyUiWorkflowJson {
  [nodeId: string]: ComfyUiNode;
}

export interface ComfyUiNode {
  class_type: string;
  inputs: any;
  _meta: {
    title: string;
  };
}

export type WorkflowParameterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;
export type WorkflowParams = Record<string, WorkflowParameterValue>;
export type { WorkflowResultAtomType, WorkflowResultTypes, WorkflowResults, WorkflowResultValue } from './resultTypes';

export class ComfyUiWorkflow {
  // 入力されたworkflowのjson全文
  private workflowJson: ComfyUiWorkflowJson;

  // インスタンス
  inputNodeInstances: InputNode[] = [];
  outputNodeInstances: OutputNode[] = [];

  outputEmitter = new EventEmitter();

  getWorkflowParams(): WorkflowParams {
    const params: WorkflowParams = {};

    // inputノードの入力を取得
    for (const inputNodeInstance of this.inputNodeInstances) {
      const title = inputNodeInstance.title;
      const inputs = inputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        params[key] = inputs[inputKey];
      });
    }

    // outputノードの入力を取得
    for (const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const inputs = outputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        params[key] = inputs[inputKey];
      });
    }

    return params;
  }

  setWorkflowParams(params: WorkflowParams) {
    // inputノードの入力を上書き
    for (const inputNodeInstance of this.inputNodeInstances) {
      const title = inputNodeInstance.title;
      const inputs = inputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        if (params[key] !== undefined) {
          inputs[inputKey] = params[key];
        }
      });

      inputNodeInstance.inputs = inputs;
    }

    // outputノードの入力を上書き
    for (const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const inputs = outputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        if (params[key] !== undefined) {
          inputs[inputKey] = params[key];
        }
      });

      outputNodeInstance.inputs = inputs;
    }
  }

  getWorkflowResultTypes(): WorkflowResultTypes {
    const resultTypes: WorkflowResultTypes = {};

    for (const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const resultType = outputNodeInstance.resultType();
      resultTypes[title] = resultType;
    }

    return resultTypes;
  }

  getWorkflowResult(): WorkflowResults {
    const results: WorkflowResults = {};
    for (const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const result = outputNodeInstance.result();
      results[title] = result;
    }

    return results;
  }

  constructor(workflowJson: ComfyUiWorkflowJson) {
    this.workflowJson = workflowJson;

    // Node毎に回す
    Object.keys(workflowJson).forEach((nodeId) => {
      const node = workflowJson[nodeId];

      // input nodeから、class_typeに一致するクラスを探して登録
      for (const inputNodeClass of inputNodeClasses) {
        if (node.class_type == inputNodeClass.class_type) {
          // インスタンス登録
          const inputNode: InputNode = new inputNodeClass(nodeId, node._meta.title, node.inputs);
          this.inputNodeInstances.push(inputNode);

          break;
        }
      }

      // output nodeから、class_typeに一致するクラスを探して登録
      for (const outputNodeClass of outputNodeClasses) {
        if (node.class_type == outputNodeClass.class_type) {
          // インスタンス登録
          const outputNode = new outputNodeClass(nodeId, node._meta.title);
          this.outputNodeInstances.push(outputNode);

          // outputEmitterにイベント登録
          // 以降、outputEmitter.emit('hoge', args)で、'hoge'イベントを発火できる
          outputNode.registEventsToEmitter(this.outputEmitter);

          break;
        }
      }
    });
  }

  // パラメーター上書き済みのJSONを返す(POST /prompt 用)
  getModifiedJson(): ComfyUiWorkflowJson {
    const modifiedJson = JSON.parse(JSON.stringify(this.workflowJson)); // deep copy

    // inputノードの入力をJSONに反映
    for (const inputNodeInstance of this.inputNodeInstances) {
      const nodeId = inputNodeInstance.nodeId;
      const inputs = inputNodeInstance.inputs;

      // Defensive: some workflow JSONs may omit `inputs` for certain nodes.
      if (!modifiedJson[nodeId]) continue;
      if (!modifiedJson[nodeId].inputs) modifiedJson[nodeId].inputs = {};

      for (const inputKey of Object.keys(inputs)) {
        modifiedJson[nodeId].inputs[inputKey] = inputs[inputKey];
      }
    }

    return modifiedJson;
  }

  async execute(hostUrl: string): Promise<void> {
    const ComfyAPIClientInstance = new ComfyAPIClient(hostUrl);

    // 実行前に必要な前処理（アップロードなど）を各入力ノードに委譲
    for (const inputNodeInstance of this.inputNodeInstances) {
      if (typeof inputNodeInstance.prepare === 'function') {
        await inputNodeInstance.prepare(ComfyAPIClientInstance);
      }
    }

    // APIにPOST
    await ComfyAPIClientInstance.queue(this);
  }
}

// import fs from 'fs';
// ;(async () => {
//   const workflowJson = JSON.parse(fs.readFileSync('workflow_api.json', 'utf-8'));
//   const workflow = new ComfyUiWorkflow(workflowJson);

//   console.log(workflow.getWorkflowParams());
// })();
