import { InputNode } from './inputNodeBase';

interface PrimitiveIntegerCrystoolsInputs {
  int: number;
}

export class PrimitiveIntegerCrystools extends InputNode {
  static _className = 'Primitive integer [Crystools]';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveIntegerCrystoolsInputs;
  }

  set inputs(inputs: PrimitiveIntegerCrystoolsInputs) {
    this._inputs = inputs;
  }
}
