import { InputNode } from './inputNodeBase';

interface PrimitiveFloatCrystoolsInputs {
  "float": number;
}

export class PrimitiveFloatCrystools extends InputNode {
  static _className = 'Primitive float [Crystools]';

  get inputs() {
    return super.inputs as PrimitiveFloatCrystoolsInputs;
  }

  set inputs(inputs: PrimitiveFloatCrystoolsInputs) {
    super.inputs = inputs;
  }
}
