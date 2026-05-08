export enum NodeType {
  START = 'start',
  SPEAK = 'speak',         // Bot says something
  LISTEN = 'listen',       // Wait for caller response
  BRANCH = 'branch',       // Route based on response/condition
  API_CALL = 'api_call',   // Fetch data (CRM, backend)
  TRANSFER = 'transfer',   // Transfer to agent/queue
  VOICEMAIL = 'voicemail', // Leave or record a message
  HANGUP = 'hangup',       // End the call
}

export enum InputMethod {
  DTMF = 'dtmf',        // Key press (press 1 for...)
  SPEECH = 'speech',    // Voice recognition
  BOTH = 'both',
}

export enum BranchCondition {
  INTENT = 'intent',
  KEYWORD = 'keyword',
  DTMF_KEY = 'dtmf_key',
  NO_INPUT = 'no_input',
  INVALID = 'invalid',
  SENTIMENT = 'sentiment',
  VARIABLE = 'variable',
  CUSTOM = 'custom',
  ELSE = 'else',
}

export interface BranchRoute {
  id: string;
  label: string;         // e.g. "Yes", "No", "Timeout", "Press 1"
  condition: BranchCondition;
  value: string;         // The match value
  targetNodeId?: string;
}

export interface SpeakScript {
  text: string;
  ssml?: string;         // Text-to-speech markup
  language: string;
  voice?: string;
}

export interface FlowNodeData {
  label: string;
  type: NodeType;

  // SPEAK
  script?: SpeakScript;

  // LISTEN
  inputMethod?: InputMethod;
  maxWait?: number;       // seconds
  maxRetries?: number;
  storeAs?: string;       // variable name to store response

  // BRANCH
  routes?: BranchRoute[];

  // API_CALL
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: string;
  storeResponseAs?: string;

  // TRANSFER
  destination?: string;   // Queue name, phone number, SIP
  transferType?: 'queue' | 'agent' | 'number';
  transferMessage?: string;

  // VOICEMAIL
  greeting?: string;
  maxDuration?: number;

  // HANGUP
  goodbye?: string;

  // Metadata
  metadata: {
    notes?: string;
    isSystemGenerated?: boolean;
    errors?: string[];
    warnings?: string[];
  };
}
