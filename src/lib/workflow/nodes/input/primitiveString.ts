import { InputNode } from './inputNodeBase';

interface PrimitiveStringCrystoolsInputs {
  string: string;
}

export class PrimitiveStringCrystools extends InputNode {
  static _className = 'Primitive string multiline [Crystools]';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveStringCrystoolsInputs;
  }

  set inputs(inputs: PrimitiveStringCrystoolsInputs) {
    this._inputs = inputs;
  }
}
