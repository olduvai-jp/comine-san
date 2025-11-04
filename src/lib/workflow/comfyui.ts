import { WebSocket } from 'ws';
import * as crypto from 'crypto';
import { ComfyUiWorkflow } from './workflow';

export interface ViewQuery {
  filename?: string;
  type?: string;
  subfolder?: string;
}

export class ComfyAPIClient {
  private _url: string;

  constructor(url: string) {
    this._url = url.replace(/\/+$/, '');
  }

  private get wsUrl(): string {
    const protcol = this._url.startsWith('https') ? 'wss' : 'ws'
    return `${protcol}://${new URL(this._url).host}`;
  }

  private get url(): string {
    return this._url;
  }

  async view(query: ViewQuery): Promise<Buffer> {
    const url = `${this.url}/view?${new URLSearchParams(query as Record<string, string>)}`
    // console.log(url);
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  }

  async queue(workflow: ComfyUiWorkflow): Promise<void> {
    const apiInstance = this;

    const uuid = crypto.randomUUID();
    const ws = new WebSocket(`${this.wsUrl}/ws?clientId=${uuid}`);
    // ws.binaryType = "arraybuffer";

    const res = await fetch(`${this.url}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: workflow.getModifiedJson(),
        client_id: uuid,
      }),
    });

    const rawBody = await res.text();
    let json: any = {};

    if (rawBody.length > 0) {
      try {
        json = JSON.parse(rawBody);
      } catch (error) {
        const snippet = rawBody.slice(0, 200).replace(/\s+/g, " ").trim();
        throw new Error(
          `Failed to parse ComfyUI response (status ${res.status} ${res.statusText}): ${snippet || '[empty body]'}`
        );
      }
    }

    if (!res.ok) {
      throw new Error(
        `ComfyUI server error ${res.status} ${res.statusText}: ${JSON.stringify(json)}`
      );
    }

    //console.log(res.status);

    await new Promise<void>((resolve) => {
      ws.on('close', () => {
        workflow.outputEmitter.emit('disconnected', apiInstance);
        resolve();
      });

      ws.on('error', (err: Error) => {
        console.log(err);
        resolve();
      });

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'progress':
              workflow.outputEmitter.emit('progress', apiInstance, message.data);
              break;
            case 'executing':
              workflow.outputEmitter.emit('executing', apiInstance, message.data);
              if (message.data.prompt_id === (json as any).prompt_id && message.data.node == null) {
                ws.close();
              }
              break;
            case 'executed':
              workflow.outputEmitter.emit('executed', apiInstance, message.data);
              break;
            case 'status':
              break;
            case 'execution_start':
              break;
            case 'execution_cached':
              break;
            case 'crystools.monitor':
              break;
            case 'progress_state':
              break;
            case 'execution_success':
              break;
            default:
              console.log('Unknown message type');
              console.log(message);
              break;
          }
        } catch (e) {
          console.log(e);
        }
      });
    });
  }
}
