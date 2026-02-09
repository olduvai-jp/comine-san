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

interface PrimitiveIntInputs {
  value: number;
}

export class PrimitiveInt extends InputNode {
  static _className = 'PrimitiveInt';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveIntInputs;
  }

  set inputs(inputs: PrimitiveIntInputs) {
    this._inputs = inputs;
  }
}
