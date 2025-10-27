import fs from 'fs';
import { InputNode } from './inputNodeBase';

interface LoadImageBase64Inputs {
  "image": string;
}

export class LoadImageBase64 extends InputNode {
  static _className = 'ETN_LoadImageBase64';

  get inputs() {
    return super.inputs as LoadImageBase64Inputs;
  }

  set inputs(inputs: LoadImageBase64Inputs) {
    for (const key in inputs) {
      if (this._inputs[key] !== undefined) {
        if ( key === 'image' ) {
          // base64っぽかったらそのまま入れる
          // ファイルパスっぽかったら読み込んでbase64にする
          const image = inputs[key];

          if ( image.match(/^data:image\/[a-z]+;base64,/) ) {
            this._inputs[key] = image;
          } else {
            this._inputs[key] = fs.readFileSync(image, 'base64');
          }
        }
      }
    }
  }
}