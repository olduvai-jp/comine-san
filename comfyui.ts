import { fstat } from 'fs';
import WebSocket from 'ws';
import { OutputNode } from './outputNode';

const getWebSocketProtocol = (baseUrl: string): string => {
  const url = new URL(baseUrl);
  if (url.protocol === 'https:'){
    return baseUrl.replace('https:', 'wss:');
  } else {
    return baseUrl.replace('http:', 'ws:');
  }
}

export const queue = async(url:string, comfyParams:any, outputNodeDict: {[key: string]: OutputNode} ) => {
  const uuid = crypto.randomUUID();
  const ws = new WebSocket(`${getWebSocketProtocol(url)}/ws?clientId=${uuid}`);

  const res = await fetch(`${url}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: comfyParams,
      client_id: uuid,
    }),
  });

  const json = await res.json();
  
  if (res.status !== 200) {
    console.log(json);
    throw new Error(JSON.stringify(json));
  }
  

  ws.on('message', async (data:Buffer) => {
    
    try {
      const message = JSON.parse(data.toString());

      if(message.type === 'executed') {
        const messageData = message.data
                
        if( Object.keys(outputNodeDict).includes(messageData.node) ) {
          outputNodeDict[messageData.node].save(messageData.output);
          delete outputNodeDict[messageData.node];
        }
      }
    } catch (e) {
      console.log(e);
      ws.close();
    }

    if( Object.keys(outputNodeDict).length === 0 ) {
      ws.close();
    }

  });
}