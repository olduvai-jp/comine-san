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

interface PrimitiveFloatInputs {
  value: number;
}

export class PrimitiveFloat extends InputNode {
  static _className = 'PrimitiveFloat';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveFloatInputs;
  }

  set inputs(inputs: PrimitiveFloatInputs) {
    this._inputs = inputs;
  }
}
