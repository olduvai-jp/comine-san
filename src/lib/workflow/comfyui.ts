import { WebSocket as WsWebSocket } from 'ws';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ComfyUiWorkflow } from './workflow';

export interface ViewQuery {
  filename?: string;
  type?: string;
  subfolder?: string;
}

export interface UploadImageResponse {
  name: string;
  subfolder: string;
  type: string;
}

export type ComfyLogger = {
  debug?: (...args: any[]) => void;
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

export type ComfyFetch = (
  input: any,
  init?: any
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  arrayBuffer?(): Promise<ArrayBuffer>;
}>;

export type ComfyWebSocketInstance = {
  on(event: 'close', listener: () => void): any;
  on(event: 'error', listener: (err: Error) => void): any;
  on(event: 'message', listener: (data: Buffer) => void): any;
  close(): void;
  readyState: number;
};

export type ComfyWebSocketCtor = {
  new (url: string): ComfyWebSocketInstance;
  CONNECTING: number;
  OPEN: number;
};

const noop = () => {};

function normalizeLogger(logger?: ComfyLogger): Required<ComfyLogger> {
  return {
    debug: logger?.debug ?? noop,
    info: logger?.info ?? noop,
    warn: logger?.warn ?? noop,
    error: logger?.error ?? noop,
  };
}

export class ComfyAPIClient {
  private _url: string;
  private _fetch: ComfyFetch;
  private _WebSocket: ComfyWebSocketCtor;
  private _logger: Required<ComfyLogger>;

  constructor(
    url: string,
    deps?: {
      fetch?: ComfyFetch;
      WebSocket?: ComfyWebSocketCtor;
      logger?: ComfyLogger;
    }
  ) {
    this._url = url.replace(/\/+$/, '');
    this._fetch = deps?.fetch ?? fetch;
    this._WebSocket = deps?.WebSocket ?? WsWebSocket;
    this._logger = normalizeLogger(deps?.logger);
  }

  private get wsUrl(): string {
    const protcol = this._url.startsWith('https') ? 'wss' : 'ws';
    return `${protcol}://${new URL(this._url).host}`;
  }

  private get url(): string {
    return this._url;
  }

  async view(query: ViewQuery): Promise<Buffer> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') params.set(key, value);
    }

    const qs = params.toString();
    const url = qs.length > 0 ? `${this.url}/view?${qs}` : `${this.url}/view`;
    // console.log(url);
    const res = await this._fetch(url);
    if (typeof res.arrayBuffer !== 'function') {
      throw new Error(
        'ComfyFetch response is missing arrayBuffer(); provide a fetch implementation that supports binary responses.'
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async uploadImage(
    filePath: string,
    options: { type?: string; subfolder?: string; overwrite?: boolean } = {}
  ): Promise<UploadImageResponse> {
    const resolvedPath = path.resolve(filePath);
    await fs.promises.access(resolvedPath, fs.constants.R_OK);

    const formData = new FormData();
    const fileBuffer = await fs.promises.readFile(resolvedPath);
    formData.append('image', new Blob([fileBuffer]), path.basename(resolvedPath));
    if (options.type) formData.append('type', options.type);
    if (options.subfolder) formData.append('subfolder', options.subfolder);
    if (options.overwrite) formData.append('overwrite', 'true');

    const res = await this._fetch(`${this.url}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    const rawBody = await res.text();
    let json: any = {};

    if (rawBody.length > 0) {
      try {
        json = JSON.parse(rawBody);
      } catch (_error) {
        const snippet = rawBody.slice(0, 200).replace(/\s+/g, ' ').trim();
        throw new Error(
          `Failed to parse ComfyUI upload response (status ${res.status} ${res.statusText}): ${snippet || '[empty body]'}`
        );
      }
    }

    if (!res.ok) {
      throw new Error(`ComfyUI upload error ${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
    }

    return json as UploadImageResponse;
  }

  async queue(workflow: ComfyUiWorkflow): Promise<void> {
    const uuid = crypto.randomUUID();
    const WebSocketCtor = this._WebSocket;
    const ws = new WebSocketCtor(`${this.wsUrl}/ws?clientId=${uuid}`);
    // ws.binaryType = "arraybuffer";

    let promptId: string | undefined;

    let resolveWsDone: () => void;
    const wsDone = new Promise<void>((resolve) => {
      resolveWsDone = resolve;
    });

    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      workflow.outputEmitter.emit('disconnected', this);
      resolveWsDone();
    };

    // Attach handlers immediately so we don't miss early close/error/message.
    ws.on('close', () => {
      finalize();
    });

    ws.on('error', (err: Error) => {
      this._logger.error(err);
      finalize();
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'progress':
            workflow.outputEmitter.emit('progress', this, message.data);
            break;
          case 'executing':
            workflow.outputEmitter.emit('executing', this, message.data);
            // ComfyUI signals completion with an `executing` message where `node` is null.
            // `promptId` is typically set from the HTTP `/prompt` response, but WS messages can
            // theoretically arrive before that response is parsed. Avoid hanging in that case.
            if (message.data?.node == null) {
              const msgPromptId = message.data?.prompt_id;
              const msgPromptIdStr = typeof msgPromptId === 'string' ? msgPromptId : undefined;

              if (!promptId && typeof msgPromptIdStr === 'string' && msgPromptIdStr.length > 0) {
                promptId = msgPromptIdStr;
              }

              // Close if:
              // - we don't have a promptId yet, or
              // - the message lacks a usable prompt_id (some servers omit it), or
              // - the prompt_id matches.
              //
              // If a prompt_id is present and conflicts, keep the socket open.
              if (!promptId || msgPromptIdStr == null || msgPromptIdStr.length === 0 || msgPromptIdStr === promptId) {
                ws.close();
              }
            }
            break;
          case 'executed':
            workflow.outputEmitter.emit('executed', this, message.data);
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
            this._logger.debug('Unknown message type', message);
            break;
        }
      } catch (e) {
        this._logger.error(e);
      }
    });

    try {
      const res = await this._fetch(`${this.url}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        } catch (_error) {
          const snippet = rawBody.slice(0, 200).replace(/\s+/g, ' ').trim();
          throw new Error(
            `Failed to parse ComfyUI response (status ${res.status} ${res.statusText}): ${snippet || '[empty body]'}`
          );
        }
      }

      if (!res.ok) {
        throw new Error(`ComfyUI server error ${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
      }

      const maybePromptId = (json as any).prompt_id;
      if (typeof maybePromptId !== 'string' || maybePromptId.length === 0) {
        throw new Error(`ComfyUI response missing prompt_id: ${JSON.stringify(json)}`);
      }
      promptId = maybePromptId;
    } catch (err) {
      try {
        if (ws.readyState === WebSocketCtor.OPEN || ws.readyState === WebSocketCtor.CONNECTING) {
          ws.close();
        }
      } catch (_closeErr) {
        // ignore
      }
      finalize();
      await wsDone;
      throw err;
    }

    // Wait until the server closes the socket (or we close it after execution is done).
    await wsDone;
  }
}
