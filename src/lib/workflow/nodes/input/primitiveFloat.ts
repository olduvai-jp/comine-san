import { InputNode } from './inputNodeBase';

interface PrimitiveFloatCrystoolsInputs {
  float: number;
}

export class PrimitiveFloatCrystools extends InputNode {
  static _className = 'Primitive float [Crystools]';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveFloatCrystoolsInputs;
  }

  set inputs(inputs: PrimitiveFloatCrystoolsInputs) {
    this._inputs = inputs;
  }
}
