import * as fs from 'fs';

const saveImage = async(output: any) => {
  console.log("save image");

  for(const image of output.images) {
    console.log("\t", image.filename);

    const res = await fetch(`http://192.168.0.55:8188/view?filename=${image.filename}&type=${image.type}&subfolder=${image.subfolder}`)

    fs.writeFileSync(image.filename, Buffer.from(await res.arrayBuffer()))
  }
}

const saveText = async(output: any) => {
  console.log("save text:");
  
  for(const text of output.text) {
    console.log("\t", text);

    fs.writeFileSync("output.txt", text)
  }
}

export interface OutputNode {
  title: string;
  save: (output: any) => void;
}

export const outputNodeTargetList: OutputNode[] = [
  { 
    title: "Save Image",
    save: saveImage
  },
  {
    title: "output_tags",
    save: saveText
  }
]