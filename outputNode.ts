import * as fs from 'fs';


export class OutputNode {
  title: string = "";
  async save(output: any){};
}

export class Image extends OutputNode {
  constructor() {
    super();
    this.title = "Save Image";
  }

  override async save(output: any) {
    console.log("save image");

    for(const image of output.images) {
      console.log("\t", image.filename);

      const res = await fetch(`http://192.168.0.55:8188/view?filename=${image.filename}&type=${image.type}&subfolder=${image.subfolder}`)

      fs.writeFileSync(image.filename, Buffer.from(await res.arrayBuffer()))
    }
  }
}

export class Text extends OutputNode {
  constructor() {
    super();
    this.title = "output_tags";
  }

  override async save(output: any) {
    console.log("save text:");
    for(const text of output.text) {
      console.log("\t", text);

      fs.writeFileSync("output.txt", text)
    }
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