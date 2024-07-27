import EventEmitter from "events";
import { ComfyAPIClient } from "../../comfyui";

// すべてのOutputNodeの基底クラス
// このクラスを継承してOutputNodeを作成する
export class OutputNode {
  static _className: string;

  static get class_type() {
    if (this._className == undefined || this._className == '') throw new Error('ClassName is not defined');
    return this._className;
  }

  nodeId: string;
  _title: string;
  _inputs: any;

  constructor(nodeId: string, title: string) {
    this.nodeId = nodeId;
    this._title = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  get inputs () {
    // このメソッドは、外部からの変更を防ぐため、コピーを返す
    return JSON.parse(JSON.stringify(this._inputs));
  }

  set inputs(inputs: any) {
    this._inputs = inputs;
  }

  get title() {
    return this._title;
  }

  registEventsToEmitter(emitter: EventEmitter) {
    new Error('registEventsToEmitter is not implemented');
  }
  
  onProgress(comfyui: ComfyAPIClient, data: any) {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Progress:', data);
  }

  onExecuting(comfyui: ComfyAPIClient, data: any) {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executing:', data);
  }

  onExecuted(comfyui: ComfyAPIClient, data: any) {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executed:', data);
  }

  onGetArrayBuffer(comfyui: ComfyAPIClient, data: any) {
    console.log('GetArrayBuffer:', data);
  }

  onDisconnect(comfyui: ComfyAPIClient) {
  }

  resultType(): any {
    new Error('resultType is not implemented');
    // return {
    //   'any' : 'any'
    // };
  }

  result(): any {
    new Error('result is not implemented');
    // return {
    //   'any' : 'any'
    // };
  }
}