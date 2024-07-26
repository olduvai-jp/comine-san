import { InputNode } from './inputNodeBase';

interface PrimitiveIntegerCrystoolsInputs {
  "int": number;
}

export class PrimitiveIntegerCrystools extends InputNode {
  static _className = 'Primitive integer [Crystools]';

  get inputs() {
    return this._inputs as PrimitiveIntegerCrystoolsInputs;
  }
}