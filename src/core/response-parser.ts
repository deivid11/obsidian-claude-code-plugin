import { ClaudeCodeResponse } from './claude-code-runner';
import { TokenUsage } from './types';

/**
 * Stream event structure from Claude Code CLI
 */
interface StreamEvent {
    type: string;
    event_type?: string;
    delta?: {
        type?: string;
        text?: string;
    };
    message?: {
        content?: Array<{
            type: string;
            text?: string;
        }>;
    };
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
    // OpenCode event fields
    part?: {
        text?: string;
        tokens?: {
            input?: number;
            output?: number;
        };
    };
    sessionID?: string;
}

/**
 * Parsed stream output from Claude Code
 */
export interface ParsedOutput {
    assistantText: string;
    tokenUsage?: TokenUsage;
}

/**
 * Parses Claude Code output and builds responses
 */
export class ResponseParser {
    /**
     * Parse JSON output lines from Claude Code
     *
     * @param outputLines Array of JSON output lines
     * @returns Parsed output with assistant text and token usage
     */
    static parseOutput(outputLines: string[]): ParsedOutput {
        let assistantText = '';
        let tokenUsage: TokenUsage | undefined = undefined;

        for (const line of outputLines) {
            try {
                const event = JSON.parse(line) as StreamEvent;

                // Claude CLI: Collect text from streaming events (real-time deltas)
                if (event.type === 'stream_event') {
                    if (event.event_type === 'content_block_delta') {
                        if (event.delta?.type === 'text_delta' && event.delta.text) {
                            assistantText += event.delta.text;
                        }
                    }
                }

                // Claude CLI: Also collect from complete assistant messages (fallback)
                if (event.type === 'assistant') {
                    if (event.message?.content) {
                        for (const block of event.message.content) {
                            if (block.type === 'text') {
                                assistantText += block.text + '\n';
                            }
                        }
                    }
                }

                // Claude CLI: Get token usage from result event
                if (event.type === 'result') {
                    if (event.usage) {
                        tokenUsage = {
                            inputTokens: event.usage.input_tokens || 0,
                            outputTokens: event.usage.output_tokens || 0,
                            totalTokens: (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0)
                        };
                    }
                }

                // OpenCode: Collect text from text events
                if (event.type === 'text' && event.part?.text) {
                    assistantText += event.part.text;
                }

                // OpenCode: Get token usage from step_finish event
                if (event.type === 'step_finish' && event.part?.tokens) {
                    const tokens = event.part.tokens;
                    tokenUsage = {
                        inputTokens: tokens.input || 0,
                        outputTokens: tokens.output || 0,
                        totalTokens: (tokens.input || 0) + (tokens.output || 0)
                    };
                }
            } catch {
                // Skip invalid JSON lines
            }
        }

        return {
            assistantText: assistantText.trim(),
            tokenUsage
        };
    }

    /**
     * Build error response
     *
     * @param error Error message
     * @param outputLines Output lines (if any)
     * @returns Error response
     */
    static buildErrorResponse(error: string, outputLines: string[] = []): ClaudeCodeResponse {
        return {
            success: false,
            error,
            output: outputLines
        };
    }
}
