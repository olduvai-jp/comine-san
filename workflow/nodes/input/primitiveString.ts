import { InputNode } from './inputNodeBase';

interface PrimitiveStringCrystoolsInputs {
  "string": string;
}

export class PrimitiveStringCrystools extends InputNode {
  static _className = 'Primitive string multiline [Crystools]';

  get inputs() {
    return super.inputs as PrimitiveStringCrystoolsInputs;
  }
}