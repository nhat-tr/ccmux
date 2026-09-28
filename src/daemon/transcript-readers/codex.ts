/**
 * Codex transcript reader (`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`).
 *
 * Line shape: `{type, timestamp, payload}`. Current Codex logs store prompts
 * and responses as `response_item` message payloads. Older logs also use
 * `event_msg` payloads: `user_message` for the prompt and `agent_message` for
 * the assistant's text. `task_complete` repeats the final text verbatim in
 * `last_agent_message`, so it is authoritative when present and the response
 * fragments it duplicates are dropped.
 *
 * Non-message `response_item` entries, `token_count` (~800 B, ~28x per
 * session), `web_search_end`, and the rest are skipped.
 */

import type { LineMeaning, TranscriptReader } from "../transcript-read";
import { SKIP_LINE, foldJsonlTurns } from "../transcript-read";

export function classifyCodexLine(entry: unknown): LineMeaning {
  if (!entry || typeof entry !== "object") return SKIP_LINE;
  const record = entry as {
    type?: unknown;
    timestamp?: unknown;
    payload?: unknown;
  };
  const payload = record.payload;
  if (!payload || typeof payload !== "object") return SKIP_LINE;

  if (record.type === "response_item") {
    const message = payload as {
      type?: unknown;
      role?: unknown;
      content?: unknown;
    };
    if (message.type !== "message" || !Array.isArray(message.content)) {
      return SKIP_LINE;
    }
    const text = message.content
      .flatMap((block) => {
        if (!block || typeof block !== "object") return [];
        const content = block as { type?: unknown; text?: unknown };
        if (
          (content.type !== "input_text" && content.type !== "output_text") ||
          typeof content.text !== "string" ||
          !content.text.trim()
        ) {
          return [];
        }
        return [content.text];
      })
      .join("\n")
      .trim();
    if (!text) return SKIP_LINE;
    const timestamp =
      typeof record.timestamp === "string" ? record.timestamp : undefined;
    if (message.role === "user") return { kind: "user", text, timestamp };
    if (message.role === "assistant") {
      return { kind: "assistant", text, timestamp, deduplicate: true };
    }
    return SKIP_LINE;
  }

  if (record.type !== "event_msg") return SKIP_LINE;
  const typed = payload as {
    type?: unknown;
    message?: unknown;
    last_agent_message?: unknown;
  };
  const timestamp =
    typeof record.timestamp === "string" ? record.timestamp : undefined;

  if (typed.type === "task_complete") {
    const text = typed.last_agent_message;
    if (typeof text !== "string" || !text.trim()) return SKIP_LINE;
    return { kind: "assistant", text, timestamp, authoritative: true };
  }

  if (typed.type === "agent_message") {
    const text = typed.message;
    if (typeof text !== "string" || !text.trim()) return SKIP_LINE;
    return { kind: "assistant", text, timestamp, deduplicate: true };
  }

  if (typed.type === "user_message") {
    const text = typed.message;
    if (typeof text !== "string" || !text.trim()) return SKIP_LINE;
    return { kind: "user", text, timestamp };
  }

  return SKIP_LINE;
}

export const codexTranscriptReader: TranscriptReader = {
  agentType: "codex",
  async read(session, turns) {
    if (!session.logPath) return null;
    return foldJsonlTurns(session.logPath, turns, classifyCodexLine);
  },
};
