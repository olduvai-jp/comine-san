import { InputNode } from './inputNodeBase';

interface PrimitiveBooleanInputs {
  value: boolean;
}

export class PrimitiveBoolean extends InputNode {
  static _className = 'PrimitiveBoolean';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveBooleanInputs;
  }

  set inputs(inputs: PrimitiveBooleanInputs) {
    this._inputs = inputs;
  }
}

