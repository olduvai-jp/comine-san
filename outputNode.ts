import * as fs from 'fs';

export class OutputNode {
  title: string = "";
  result: any[] = []
  outputDir: string = "test"
  
  put(output: any):void{}
  
  async saveToFile(){};
  async saveToJson():Promise<any>{}
}

export class Image extends OutputNode {
  constructor() {
    super();
    this.title = "Save Image";
  }

  override put(output: any){
    this.result = Array.isArray(output.images) ? output.images : []
  }

  override async saveToFile() {
    console.log("save image");

    console.log("images: ",this.result)

    for(const image of this.result) {
      console.log("\t", image.filename);

      const res = await fetch(`http://192.168.0.55:8188/view?filename=${image.filename}&type=${image.type}&subfolder=${image.subfolder}`)

      fs.writeFileSync(`${this.outputDir}/${image.filename}`, Buffer.from(await res.arrayBuffer()))
    }
  }

  override async saveToJson(){
    
    this.saveToFile()

    /*const jsonObject: { [key: string]: any } = {};
    jsonObject[this.title] = this.result.map(a => a.filename);
    return jsonObject;*/
    return this.result.map((a: { filename: string }) => a.filename)
  }
}

export class Text extends OutputNode {
  constructor() {
    super();
    this.title = "output_tags";
  }

  override put(output:any){
    this.result = Array.isArray(output.text) ? output.text : []
  }

  override async saveToFile() {
    console.log("save text:");
    for(const text of this.result) {
      console.log("\t", text);

      fs.writeFileSync(`${this.outputDir}/output.txt`, text)
    }
  }

  override async saveToJson(){
    /*const jsonObject: { [key: string]: any } = {};
    jsonObject[this.title] = this.result;
    return jsonObject;*/
    return this.result
  }
}

export const outputNodeTargetList = [
  { 
    title: "Save Image",
    node: Image
  },
  {
    title: "output_tags",
    node: Text
  }
]