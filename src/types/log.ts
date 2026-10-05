/**
 * Log entry types from Claude Code JSONL logs
 */

/**
 * Base log entry structure
 */
export interface BaseLogEntry {
  parentUuid: string | null;
  uuid: string;
  timestamp: string;
}

/**
 * Progress event types
 */
export type ProgressType = "SessionStart" | "SessionEnd" | "Stop";

/**
 * Bash progress data - streaming output from running Bash command
 */
export interface BashProgressData {
  type: "bash_progress";
  output: string;
  fullOutput?: string;
  elapsedTimeSeconds?: number;
  totalLines?: number;
}

/**
 * Progress log entry - can have either progress.type or data.type
 */
export interface ProgressLogEntry extends BaseLogEntry {
  type: "progress";
  progress?: {
    type: ProgressType;
  };
  data?: BashProgressData;
  toolUseID?: string;
}

/**
 * Result log entry - indicates turn completed
 */
export interface ResultLogEntry extends BaseLogEntry {
  type: "result";
  result: {
    type: "success" | "error";
    duration_ms?: number;
  };
}

/**
 * Tool use content block
 */
export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Text content block
 */
export interface TextBlock {
  type: "text";
  text: string;
}

/**
 * Content block union
 */
export type ContentBlock = ToolUseBlock | TextBlock | { type: string };

/**
 * Assistant message
 */
export interface AssistantMessage {
  role: "assistant";
  content: ContentBlock[];
  stop_reason?: string;
  /** API model ID that produced the response, or `<synthetic>` for a
   * message Claude Code wrote itself (no request was sent). */
  model?: string;
  usage?: AssistantUsage;
}

/**
 * Token counts the API reported for the request behind an assistant message.
 * Every input field is part of the same request's prompt: the uncached
 * remainder, the prefix written to cache, and the prefix read from cache.
 */
export interface AssistantUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
}

/**
 * Assistant log entry
 */
export interface AssistantLogEntry extends BaseLogEntry {
  type: "assistant";
  message: AssistantMessage;
  version?: string;
  gitBranch?: string;
}

/**
 * Tool result content
 */
export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * User message
 */
export interface UserMessage {
  role: "user";
  content: string | ToolResultContent[];
}

/**
 * User log entry
 */
export interface UserLogEntry extends BaseLogEntry {
  type: "user";
  message: UserMessage;
  cwd?: string;
  version?: string;
  gitBranch?: string;
}

/**
 * Summary log entry
 */
export interface SummaryLogEntry extends BaseLogEntry {
  type: "summary";
  summary: string;
}

/**
 * System log entry - turn_duration, stop_hook_summary, etc.
 */
export interface SystemLogEntry extends BaseLogEntry {
  type: "system";
  subtype: string;
  durationMs?: number;
}

/**
 * Queue operation log entry - enqueue/dequeue of user input
 */
export interface QueueOperationLogEntry {
  type: "queue-operation";
  operation: "enqueue" | "dequeue";
  timestamp: string;
  sessionId: string;
  content?: string;
}

/**
 * Union of all log entry types
 */
export type LogEntry =
  | ProgressLogEntry
  | ResultLogEntry
  | AssistantLogEntry
  | UserLogEntry
  | SummaryLogEntry
  | SystemLogEntry
  | QueueOperationLogEntry
  // Sidecar lines Claude Code appends after a turn (`last-prompt`,
  // `ai-title`, `mode`, `permission-mode`, `atis-latch`) carry no timestamp.
  | (Omit<BaseLogEntry, "timestamp"> & { type: string; timestamp?: string });
