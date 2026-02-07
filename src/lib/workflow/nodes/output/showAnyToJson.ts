import EventEmitter from 'events';
import { OutputNode } from './outputNodeBase';
import type { WorkflowResultAtomType, WorkflowResultValue } from '../../resultTypes';

export class ShowAnyToJson extends OutputNode {
  static _className = 'Show any to JSON [Crystools]';

  text = '';

  constructor(nodeId: string, rawTitle: string) {
    super(nodeId, rawTitle);

    this._inputs = {
      //'filename': `${this.title}.png`
    };
  }

  registEventsToEmitter(emitter: EventEmitter): void {
    emitter.on('executed', this.onExecuted.bind(this));
  }

  onExecuted(_: any, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    // console.log('Executed:', JSON.stringify(data, null, 2));

    const textJson = data.output.text;

    this.text = JSON.stringify(textJson);
  }

  resultType(): Record<string, WorkflowResultAtomType> {
    return {
      text: 'string',
    };
  }

  result(): Record<string, WorkflowResultValue> {
    const text = this.text;
    return {
      text,
    };
  }
}
