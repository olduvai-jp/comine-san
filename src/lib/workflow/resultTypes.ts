export type WorkflowResultAtomType = 'string' | 'number' | 'boolean' | 'json' | 'unknown';

export type WorkflowResultTypes = Record<string, Record<string, WorkflowResultAtomType>>;

// JSON-serializable-ish value (no functions, symbols, bigint, etc).
// We intentionally exclude `undefined` to keep results stable when stringified/logged.
export type WorkflowResultValue =
  | null
  | string
  | number
  | boolean
  | WorkflowResultValue[]
  | { [key: string]: WorkflowResultValue };

// Output nodes return objects (e.g. { filename: string }), keyed by output node title.
export type WorkflowResults = Record<string, Record<string, WorkflowResultValue>>;
