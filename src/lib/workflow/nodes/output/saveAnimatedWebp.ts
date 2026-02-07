import EventEmitter from 'events';
import { OutputNode } from './outputNodeBase';
import { ComfyAPIClient } from '../../comfyui';
import * as fs from 'fs/promises';
import path from 'path';
import type { WorkflowResultAtomType, WorkflowResultValue } from '../../resultTypes';

interface SaveAnimatedWebpInfo {
  filename?: string;
  type?: string;
  subfolder?: string;
}

export class SaveAnimatedWEBP extends OutputNode {
  static _className = 'SaveAnimatedWEBP';

  filename = '';
  type = '';
  subfolder = '';

  constructor(nodeId: string, rawTitle: string) {
    super(nodeId, rawTitle);

    // override inputs
    this._inputs = {
      filename: `${this.title}.webp`,
    };
  }

  registEventsToEmitter(emitter: EventEmitter): void {
    emitter.on('executed', this.onExecuted.bind(this));
    emitter.on('disconnected', this.onDisconnect.bind(this));
  }

  private async animationSave(comfyui: ComfyAPIClient, saveFilePath: string): Promise<void> {
    const animationBuffer = await comfyui.view({
      filename: this.filename,
      type: this.type,
      subfolder: this.subfolder,
    });

    const saveDir = path.dirname(saveFilePath);
    if (saveDir && saveDir !== '.') {
      try {
        await fs.mkdir(saveDir, { recursive: true });
      } catch (_error) {
        // ignore mkdir races
      }
    }

    await fs.writeFile(saveFilePath, Buffer.from(animationBuffer));
    console.log('Animated WebP saved:', saveFilePath);
  }

  private extractInfo(data: any): SaveAnimatedWebpInfo | undefined {
    if (!data?.output) return undefined;

    const candidates: SaveAnimatedWebpInfo[] = [
      ...(Array.isArray(data.output.images) ? data.output.images : []),
      ...(Array.isArray(data.output.webp) ? data.output.webp : []),
      ...(Array.isArray(data.output.output) ? data.output.output : []),
    ];

    return candidates[0];
  }

  onExecuted(_: any, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    const info = this.extractInfo(data);
    if (!info?.filename) {
      console.error('No animated WebP to save. Is the workflow cached?');
      return;
    }

    this.filename = info.filename || '';
    this.type = info.type || '';
    this.subfolder = info.subfolder || '';
  }

  onDisconnected(comfyui: ComfyAPIClient): void {
    if (this.filename === '') {
      console.error('No animated WebP to save. Is the workflow cached?');
      return;
    }

    const saveFilePath = this._inputs['filename'];
    void this.animationSave(comfyui, saveFilePath);
  }

  resultType(): Record<string, WorkflowResultAtomType> {
    return {
      filename: 'string',
    };
  }

  result(): Record<string, WorkflowResultValue> {
    const filename = path.resolve(this._inputs['filename']);
    return {
      filename,
    };
  }
}
