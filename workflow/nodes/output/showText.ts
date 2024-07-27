import EventEmitter from 'events';
import { OutputNode } from './outputNodeBase';
import { ComfyAPIClient } from '../../comfyui';
import * as fs from 'fs/promises';

interface ShowTextPysssssOutputs {
  text: string;
}

export class ShowTextPysssss extends OutputNode {
  static _className = 'ShowText|pysssss';

  text = '';

  constructor(nodeId: string, rawTitle: string) {
    super(nodeId, rawTitle);

    this._inputs = {
      //'filename': `${this.title}.png`
    }
  }

  registEventsToEmitter(emitter: EventEmitter): void {
    emitter.on('executed', this.onExecuted.bind(this));
  }

  onExecuted(_:any, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    const textJson = data.output.text as Array<string>;

    this.text = textJson.join('\n');
  }

  resultType(): ShowTextPysssssOutputs {
    return {
      text: 'string',
    };
  }
  
  result(): ShowTextPysssssOutputs {
    const text = this.text;
    return {
      text,
    };
  }
}