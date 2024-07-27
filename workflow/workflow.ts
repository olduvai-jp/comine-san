import EventEmitter from 'events';
import { ComfyAPIClient } from './comfyui';
import { InputNode } from './nodes/input/inputNodeBase';
import { PrimitiveStringCrystools } from './nodes/input/primitiveString';
import { PrimitiveIntegerCrystools } from './nodes/input/primitiveInteger';

import { OutputNode } from './nodes/output/outputNodeBase';
import { SaveImage } from './nodes/output/saveImage';
import { ShowAnyToJson } from './nodes/output/showAnyToJson';
import { LoadImageBase64 } from './nodes/input/loadImageBase64';
import { ShowTextPysssss } from './nodes/output/showText';

const inputNodeClasses = [
  PrimitiveStringCrystools,
  PrimitiveIntegerCrystools,
  LoadImageBase64
];

const outputNodeClasses = [
  SaveImage,
  ShowAnyToJson,
  ShowTextPysssss
];

// interfaces

interface ComfuUIWorkflowJson {
  [nodeId: string]: ComfyUINode;
}

interface ComfyUINode {
  class_type: string;
  inputs: any;
  _meta: {
    title: string;
  };
}

export class ComfyUiWorkflow {
  // 入力されたworkflowのjson全文
  private workflowJson: ComfuUIWorkflowJson;

  // インスタンス
  inputNodeInstances: InputNode[] = [];
  outputNodeInstances: OutputNode[] = [];

  outputEmitter = new EventEmitter();

  getWorkflowParams() {
    const params: { [key: string]: any } = {};

    // inputノードの入力を取得
    for(const inputNodeInstance of this.inputNodeInstances) {
      const title = inputNodeInstance.title;
      const inputs = inputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        params[key] = inputs[inputKey];
      })
    }

    // outputノードの入力を取得
    for(const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const inputs = outputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        params[key] = inputs[inputKey];
      })
    }

    return params;
  }

  setWorkflowParams(params: { [key: string]: any }) {

    // inputノードの入力を上書き
    for(const inputNodeInstance of this.inputNodeInstances) {
      const title = inputNodeInstance.title;
      const inputs = inputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        if (params[key] !== undefined) {
          inputs[inputKey] = params[key];
        }
      })

      inputNodeInstance.inputs = inputs;
    }

    // outputノードの入力を上書き
    for(const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const inputs = outputNodeInstance.inputs;

      Object.keys(inputs).forEach((inputKey) => {
        const key = `${title}.${inputKey}`;
        if (params[key] !== undefined) {
          inputs[inputKey] = params[key];
        }
      })

      outputNodeInstance.inputs = inputs;
    }
  }

  getWorkflowResultTypes() {
    const resultTypes: { [key: string]: string } = {};

    for(const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const resultType = outputNodeInstance.resultType();
      resultTypes[title] = resultType;
    }

    return resultTypes;
  }

  getWorkflowResult() {
    const results: { [key: string]: any } = {};
    for(const outputNodeInstance of this.outputNodeInstances) {
      const title = outputNodeInstance.title;
      const result = outputNodeInstance.result();
      results[title] = result;
    }

    return results;
  }

  constructor(workflowJson: ComfuUIWorkflowJson) {
    this.workflowJson = workflowJson;
    
    // Node毎に回す
    Object.keys(workflowJson).forEach((nodeId) => {
      const node = workflowJson[nodeId];

      // input nodeから、class_typeに一致するクラスを探して登録
      for (const inputNodeClass of inputNodeClasses) {
        if (node.class_type == inputNodeClass.class_type) {
          // インスタンス登録
          const inputNode:InputNode = new inputNodeClass(nodeId, node._meta.title, node.inputs);
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
    })
  }

  // パラメーター上書き済みのJSONを返す(POST /prompt 用)
  getModifiedJson() {
    const modifiedJson = JSON.parse(JSON.stringify(this.workflowJson)); // deep copy

    // inputノードの入力をJSONに反映
    for(const inputNodeInstance of this.inputNodeInstances) {
      const nodeId = inputNodeInstance.nodeId;
      const inputs = inputNodeInstance.inputs;

      for (const inputKey of Object.keys(inputs)) {
        modifiedJson[nodeId].inputs[inputKey] = inputs[inputKey];
      }
    }

    return modifiedJson;
  }

  async execute(hostUrl: string) {
    const ComfyAPIClientInstance = new ComfyAPIClient(hostUrl);

    // パラメーター上書き済みのJSONを取得
    const modifiedJson = this.getModifiedJson();

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