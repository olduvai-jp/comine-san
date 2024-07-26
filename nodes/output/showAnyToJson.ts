import EventEmitter from 'events';
import { OutputNode } from './outputNodeBase';
import { ComfyAPIClient } from '../../comfyui';
import * as fs from 'fs/promises';

interface ShowAnyToJsonOutputs {
  text: string;
}

export class ShowAnyToJson extends OutputNode {
  static _className = 'Show any to JSON [Crystools]';

  text = '';

  constructor(nodeId: string, rawTitle: string) {
    super(nodeId, rawTitle);

    // override inputs
    this._inputs = {
      //'filename': `${this.title}.png`
    }

    console.log('SaveImage constructor');
    console.log('nodeId:', this.nodeId);

  }

  registEventsToEmitter(emitter: EventEmitter): void {
    emitter.on('executed', this.onExecuted.bind(this));
    emitter.on('disconnected', this.onDisconnected.bind(this));
  }

  onExecuted(_:any, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    console.log('Executed:', JSON.stringify(data, null, 2));

    const textJson = data.output.text;

    this.text = JSON.stringify(textJson);
  }

  onDisconnected(comfyui: ComfyAPIClient): ShowAnyToJsonOutputs {
    return {
      text: this.text,
    };
  }
}