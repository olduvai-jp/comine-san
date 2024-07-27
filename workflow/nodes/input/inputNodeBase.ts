// すべてのInputNodeの基底クラス
// このクラスを継承してInputNodeを作成する
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
    // このメソッドは、外部からの変更を防ぐため、コピーを返す
    return JSON.parse(JSON.stringify(this._inputs));
  }

  set inputs(inputs: any) {
    this._inputs = inputs;
  }

  constructor(nodeId: string, title: string, inputs: any) {
    this.nodeId = nodeId;
    this._title = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    this._inputs = inputs;
  }

}
