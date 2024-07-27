import EventEmitter from "events";

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
    return JSON.parse(JSON.stringify(this._inputs));
  }

  set inputs(inputs: any) {
    this._inputs = inputs;
  }

  get title() {
    return this._title;
  }

  registEventsToEmitter(emitter: EventEmitter) {
    console.error('registEventsToEmitter is not implemented');
  }
  
  onProgress(comfyui:any, data: any) {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Progress:', data);
  }

  onExecuting(comfyui:any, data: any) {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executing:', data);
  }

  onExecuted(comfyui:any, data: any) {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executed:', data);
  }

  onGetArrayBuffer(comfyui:any, data: any) {
    console.log('GetArrayBuffer:', data);
  }

  onDisconnect(comfyui:any) {
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