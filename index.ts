import * as fs from 'fs';
import { program } from 'commander';
import * as comfy from "./comfyui";
import { outputNodeTargetList, OutputNode, Image, Text } from "./outputNode";
import { inputNodeTargetList } from "./inputNode";


interface ComfyReplaceNodeData {
  optionName: string;
  type: string;
  nodeNumber: string;
}

const parseBoolean =(booleanStr: string): boolean => {
  return booleanStr.toLowerCase() === "true";
}



async function main() {
  // workflow.json の読み込み
  const jsonFilePath = process.argv[2];
  const workflow = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

  // 置換するnodeのリスト
  const replaceinputNodeTargetList: ComfyReplaceNodeData[] = []

  const outputNodeDict: { [key: string]: OutputNode } = {}

  // workflow内のinput nodeを取得
  Object.keys(workflow).forEach((nodeNumber) => {
    const inputNode = inputNodeTargetList.find( (inputNode) => inputNode.class_type === workflow[nodeNumber].class_type)
    const outputNode = outputNodeTargetList.find( (outputNode) => outputNode.title === workflow[nodeNumber]._meta.title)

    if( outputNode !== undefined ) {

      const optionName: string = workflow[nodeNumber]._meta.title.replace(" ", "_")
      const explanation: string = "save path"

      outputNodeDict[nodeNumber] = new outputNode.node();

      program.option(`--${optionName} <string>`, explanation)
    }

    if( inputNode !== undefined ) {

      const optionName: string = workflow[nodeNumber]._meta.title
      const type: string = inputNode.input_type
      const explanation: string = inputNode.class_type

      // 置換するnodeのnodeNumberとoptionName, typeをリストに追加
      // optionNameはオプション名に利用
      // nodeNumber, typeはnodeに代入するときのキーに利用
      replaceinputNodeTargetList.push({
        optionName: optionName,
        type: type,
        nodeNumber: nodeNumber
      });

      // オプションの追加、string以外は型に合わせて変換
      if(type === "string") {
        program.option(`--${optionName} <${type}>`, explanation)
      } else if(type === "int") {
        program.option(`--${optionName} <${type}>`, explanation, parseInt)
      } else if(type === "float") {
        program.option(`--${optionName} <${type}>`, explanation, parseFloat)
      } else if(type === "boolean") {
        program.option(`--${optionName} <${type}>`, explanation, parseBoolean)
      }
    }
  })

  // オプションの解析
  program.parse()
  const options = program.opts()

  // 置換
  for(const comfyReplaceNode of replaceinputNodeTargetList) {
    const value = options[comfyReplaceNode.optionName]

    if( value !== undefined ) {
      workflow[comfyReplaceNode.nodeNumber].inputs[comfyReplaceNode.type] = value
      
      console.log(workflow[comfyReplaceNode.nodeNumber])
      console.log(typeof value)
    }
  }

  // workflowをapiになげる
  comfy.queue("http://192.168.0.55:8188", workflow, outputNodeDict)
}


main().catch(err => {
  console.error(err);
  process.exit(1);
});
