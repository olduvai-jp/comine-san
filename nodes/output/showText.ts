import EventEmitter from 'events';
import { OutputNode } from './outputNodeBase';
import { ComfyAPIClient } from '../../comfyui';
import * as fs from 'fs/promises';

interface SaveImageOutputs {
  filename: string;
}

export class ShowText extends OutputNode {
  static _className = 'SaveImage';

  filename = '';
  type = '';
  subfolder = '';

  constructor(nodeId: string, rawTitle: string) {
    super(nodeId, rawTitle);

    // override inputs
    this._inputs = {
      'filename': `${this.title}.png`
    }

    console.log('SaveImage constructor');
    console.log('nodeId:', this.nodeId);

  }

  registEventsToEmitter(emitter: EventEmitter): void {
    emitter.on('executed', this.onExecuted.bind(this));
    emitter.on('disconnected', this.onDisconnected.bind(this));
  }

  async imageSave(comfyui: ComfyAPIClient, saveFilePath): Promise<void> {
    const imageBuffer = await comfyui.view({
      filename: this.filename,
      type: this.type,
      subfolder: this.subfolder
    })

    const saveDir = saveFilePath.split('/').slice(0, -1).join('/');
    await fs.mkdir(saveDir, { recursive: true });

    await fs.writeFile(saveFilePath, Buffer.from(imageBuffer));

    console.log('Image saved:', saveFilePath);
  }

  onExecuted(_:any, data: any): void {
    const nodeId = data.node as string;
    if (nodeId !== this.nodeId) return;

    const image = data.output.images[0];
    this.filename = image.filename;
    this.type = image.type;
    this.subfolder = image.subfolder;

  }

  onDisconnected(comfyui: ComfyAPIClient): SaveImageOutputs {
    // 実行結果の確認
    if (this.filename === '') {
      console.error('No image to save. Is the workflow cached?');
      return {
        filename: '',
      };
    }

    // 注意：imageSaveは非同期処理なので、この関数終了時には終わっていない
    const saveFilePath = this._inputs['filename'];
    this.imageSave(comfyui, saveFilePath);

    return {
      filename: saveFilePath,
    };
  }
}