export class InputNode {
  static _className: string;
  static _inputType: string;

  static get class_type() {
    if (this._className == undefined || this._className == '') throw new Error('ClassName is not defined');
    return this._className;
  }

  static get inputType() {
    if (this._inputType == undefined || this._inputType == '') throw new Error('InputType is not defined');
    return this._inputType;
  }

  nodeId: string;
  _title: string;
  _inputs: any;

  get title() {
    return this._title;
  }

  get inputs () {
    return this._inputs;
  }

  constructor(nodeId: string, title: string, inputs: any) {
    this.nodeId = nodeId;
    this._title = title;
    this._inputs = inputs;
  }

}
