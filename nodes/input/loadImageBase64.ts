import fs from 'fs';
import { InputNode } from './inputNodeBase';

interface LoadImageBase64Inputs {
  "image": string;
}

export class LoadImageBase64 extends InputNode {
  static _className = 'Primitive string multiline [Crystools]';

  get inputs() {
    return this._inputs as LoadImageBase64Inputs;
  }

  set inputs(inputs: LoadImageBase64Inputs) {
    // TODO: inputs[key] って外から触るとこれ動くのか？

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