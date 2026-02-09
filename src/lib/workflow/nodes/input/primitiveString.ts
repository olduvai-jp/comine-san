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

interface PrimitiveStringInputs {
  value: string;
}

export class PrimitiveString extends InputNode {
  static _className = 'PrimitiveString';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveStringInputs;
  }

  set inputs(inputs: PrimitiveStringInputs) {
    this._inputs = inputs;
  }
}

interface PrimitiveStringMultilineInputs {
  value: string;
}

export class PrimitiveStringMultiline extends InputNode {
  static _className = 'PrimitiveStringMultiline';

  get inputs() {
    return JSON.parse(JSON.stringify(this._inputs)) as PrimitiveStringMultilineInputs;
  }

  set inputs(inputs: PrimitiveStringMultilineInputs) {
    this._inputs = inputs;
  }
}
