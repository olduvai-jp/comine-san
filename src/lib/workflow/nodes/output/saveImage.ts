import EventEmitter from 'events';
import { OutputNode } from './outputNodeBase';
import { ComfyAPIClient } from '../../comfyui';
import * as fs from 'fs/promises';
import path from 'path';

interface SaveImageOutputs {
  filename: string;
}

export class SaveImage extends OutputNode {
  static _className = 'SaveImage';

  filename = '';
  type = '';
  subfolder = '';

  constructor(nodeId: string, rawTitle: string) {
    super(nodeId, rawTitle);

    // override inputs
    this._inputs = {
      filename: `${this.title}.png`,
    };
  }

  registEventsToEmitter(emitter: EventEmitter): void {
    emitter.on('executed', this.onExecuted.bind(this));
    emitter.on('disconnected', this.onDisconnected.bind(this));
  }

  async imageSave(comfyui: ComfyAPIClient, saveFilePath: string): Promise<void> {
    const imageBuffer = await comfyui.view({
      filename: this.filename,
      type: this.type,
      subfolder: this.subfolder,
    });

    const saveDir = saveFilePath.split('/').slice(0, -1).join('/');
    try {
      await fs.mkdir(saveDir, { recursive: true });
    } catch (_error) {
      // noop
    }

    await fs.writeFile(saveFilePath, Buffer.from(imageBuffer));

    console.log('Image saved:', saveFilePath);
  }

  onExecuted(_: any, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    const image = data.output.images[0];
    this.filename = image.filename;
    this.type = image.type;
    this.subfolder = image.subfolder;
  }

  onDisconnected(comfyui: ComfyAPIClient): void {
    // 実行結果の確認
    if (this.filename === '') {
      console.error('No image to save. Is the workflow cached?');
      return;
    }

    // 注意：imageSaveは非同期処理なので、この関数終了時には終わっていない
    const saveFilePath = this._inputs['filename'];
    void this.imageSave(comfyui, saveFilePath);
  }

  resultType(): SaveImageOutputs {
    return {
      filename: 'string',
    };
  }

  result(): SaveImageOutputs {
    const filename = path.resolve(this._inputs['filename']);

    return {
      filename,
    };
  }
}
