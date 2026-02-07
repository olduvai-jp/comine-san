import EventEmitter from 'events';
import { ComfyAPIClient } from '../../comfyui';
import type { WorkflowResultAtomType, WorkflowResultValue } from '../../resultTypes';

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
  private _disconnectAliasGuard: boolean;

  constructor(nodeId: string, title: string) {
    this.nodeId = nodeId;
    this._title = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    this._inputs = {};
    this._disconnectAliasGuard = false;
  }

  get inputs() {
    // このメソッドは、外部からの変更を防ぐため、コピーを返す
    return JSON.parse(JSON.stringify(this._inputs));
  }

  set inputs(inputs: any) {
    this._inputs = inputs;
  }

  get title() {
    return this._title;
  }

  registEventsToEmitter(_emitter: EventEmitter): void {
    throw new Error('registEventsToEmitter is not implemented');
  }

  onProgress(_comfyui: ComfyAPIClient, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Progress:', data);
  }

  onExecuting(_comfyui: ComfyAPIClient, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executing:', data);
  }

  onExecuted(_comfyui: ComfyAPIClient, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executed:', data);
  }

  onGetArrayBuffer(_comfyui: ComfyAPIClient, data: any): void {
    console.log('GetArrayBuffer:', data);
  }

  // Disconnect callback. Historically both `onDisconnect` and `onDisconnected` have been used.
  // Base class supports both names to avoid breaking external subclasses.
  onDisconnect(comfyui: ComfyAPIClient): void {
    if (this._disconnectAliasGuard) return;
    const base = OutputNode.prototype as OutputNode;
    if (this.onDisconnected !== base.onDisconnected) {
      this._disconnectAliasGuard = true;
      try {
        this.onDisconnected(comfyui);
      } finally {
        this._disconnectAliasGuard = false;
      }
    }
  }

  // Alias for `onDisconnect` (kept for backwards compatibility).
  onDisconnected(comfyui: ComfyAPIClient): void {
    if (this._disconnectAliasGuard) return;
    const base = OutputNode.prototype as OutputNode;
    if (this.onDisconnect !== base.onDisconnect) {
      this._disconnectAliasGuard = true;
      try {
        this.onDisconnect(comfyui);
      } finally {
        this._disconnectAliasGuard = false;
      }
    }
  }

  resultType(): Record<string, WorkflowResultAtomType> {
    throw new Error('resultType is not implemented');
    // return {
    //   'any' : 'any'
    // };
  }

  result(): Record<string, WorkflowResultValue> {
    throw new Error('result is not implemented');
    // return {
    //   'any' : 'any'
    // };
  }
}
