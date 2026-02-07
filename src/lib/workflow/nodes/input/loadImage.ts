import * as fs from 'fs';
import * as path from 'path';
import type { ComfyAPIClient } from '../../comfyui';
import { InputNode } from './inputNodeBase';

interface LoadImageInputs {
  image: string;
  type?: string;
  subfolder?: string;
  overwrite?: boolean;
}

export class LoadImage extends InputNode {
  static _className = 'LoadImage';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as LoadImageInputs;
  }

  set inputs(inputs: LoadImageInputs) {
    this._inputs = inputs;
  }

  async prepare(comfyui: ComfyAPIClient): Promise<void> {
    const inputs = this.inputs;
    const imagePath = inputs.image;

    if (!imagePath) return;

    // すでにサーバー上のファイルを指している（ローカルに存在しない）場合は何もしない
    const resolved = path.resolve(imagePath);
    if (!fs.existsSync(resolved)) return;

    const uploadResult = await comfyui.uploadImage(resolved, {
      type: inputs.type,
      subfolder: inputs.subfolder,
      overwrite: inputs.overwrite,
    });

    // ComfyUI の LoadImage は input ディレクトリを基準にパスを解決する。
    const serverPath = uploadResult.subfolder
      ? path.posix.join(uploadResult.subfolder, uploadResult.name)
      : uploadResult.name;

    this.inputs = {
      ...inputs,
      image: serverPath,
    };
  }
}
