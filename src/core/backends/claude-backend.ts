/**
 * Claude Code CLI Backend Adapter
 * Handles communication with the Claude Code CLI
 */

import * as path from 'path';
import * as fs from 'fs';
import type { ClaudeCodeSettings } from '../settings';
import type { CLIBackend, BackendConfig, StandardEvent, ClaudeRawEvent, BackendType } from './types';

/**
 * Backend adapter for Claude Code CLI
 */
export class ClaudeBackend implements CLIBackend {
    readonly name: BackendType = 'claude';

    /**
     * Build CLI arguments for Claude Code
     */
    buildArgs(config: BackendConfig): string[] {
        const args: string[] = [];

        // Output format arguments
        args.push('--print');
        args.push('--verbose');
        args.push('--output-format', 'stream-json');
        args.push('--input-format', 'stream-json');
        args.push('--replay-user-messages');
        args.push('--include-partial-messages');

        // Resume existing session if available
        if (config.sessionId) {
            args.push('--resume', config.sessionId);
        }

        // Permission mode
        if (config.permissionMode === 'bypass') {
            args.push('--permission-mode', 'bypassPermissions');
        } else {
            args.push('--permission-mode', 'acceptEdits');
        }

        // Vault access
        if (config.vaultPath) {
            args.push('--add-dir', config.vaultPath);
        }

        // Model selection
        if (config.model) {
            args.push('--model', config.model);
        }

        return args;
    }

    /**
     * Parse Claude CLI event into normalized format
     */
    parseEvent(rawEvent: unknown): StandardEvent | null {
        const event = rawEvent as ClaudeRawEvent;

        switch (event.type) {
            case 'system':
                return this.parseSystemEvent(event);

            case 'assistant':
                return this.parseAssistantEvent(event);

            case 'tool_use':
                return this.parseToolUseEvent(event);

            case 'result':
                return this.parseResultEvent(event);

            case 'stream_event':
                return this.parseStreamEvent(event);

            default:
                return null;
        }
    }

    private parseSystemEvent(event: ClaudeRawEvent): StandardEvent | null {
        if (event.subtype === 'init') {
            return {
                type: 'init',
                sessionId: event.session_id,
                model: event.model,
                tools: event.tools,
            };
        }
        return null;
    }

    private parseAssistantEvent(event: ClaudeRawEvent): StandardEvent | null {
        if (!event.message?.content) return null;

        // Process content blocks
        for (const block of event.message.content) {
            if (block.type === 'thinking' && block.text) {
                return {
                    type: 'thinking',
                    text: block.text,
                };
            } else if (block.type === 'text' && block.text) {
                return {
                    type: 'text',
                    text: block.text,
                };
            } else if (block.type === 'tool_use' && block.name) {
                return {
                    type: 'tool_start',
                    toolName: block.name,
                    toolInput: block.input,
                };
            }
        }
        return null;
    }

    private parseToolUseEvent(event: ClaudeRawEvent): StandardEvent | null {
        const toolName = event.tool_name || 'unknown';

        if (event.subtype === 'input' && event.input) {
            return {
                type: 'tool_start',
                toolName,
                toolInput: event.input,
            };
        } else if (event.subtype === 'result') {
            const output = typeof event.result === 'string'
                ? event.result
                : JSON.stringify(event.result);
            return {
                type: 'tool_result',
                toolName,
                toolOutput: output,
            };
        }
        return null;
    }

    private parseResultEvent(event: ClaudeRawEvent): StandardEvent {
        return {
            type: 'step_complete',
            durationMs: event.duration_ms,
            cost: event.total_cost_usd,
            tokens: event.usage ? {
                input: event.usage.input_tokens,
                output: event.usage.output_tokens,
            } : undefined,
        };
    }

    private parseStreamEvent(event: ClaudeRawEvent): StandardEvent | null {
        const streamEvent = event.event;
        if (!streamEvent) return null;

        if (streamEvent.type === 'content_block_delta') {
            if (streamEvent.delta?.type === 'text_delta' && streamEvent.delta.text) {
                return {
                    type: 'text',
                    text: streamEvent.delta.text,
                    isStreaming: true,
                };
            } else if (streamEvent.delta?.type === 'thinking_delta' && streamEvent.delta.text) {
                return {
                    type: 'thinking',
                    text: streamEvent.delta.text,
                    isStreaming: true,
                };
            }
        } else if (streamEvent.type === 'content_block_start') {
            const blockType = streamEvent.content_block?.type;
            if (blockType === 'text' || blockType === 'thinking') {
                return {
                    type: 'block_start',
                    blockType: blockType,
                };
            }
        } else if (streamEvent.type === 'content_block_stop') {
            return {
                type: 'block_end',
            };
        }
        return null;
    }

    /**
     * Extract session ID from raw event
     */
    extractSessionId(rawEvent: unknown): string | null {
        const event = rawEvent as ClaudeRawEvent;
        if (event.type === 'system' && event.subtype === 'init') {
            return event.session_id || null;
        }
        return null;
    }

    /**
     * Get executable path from settings
     */
    getExecutablePath(settings: ClaudeCodeSettings): string {
        if (settings.autoDetectPath) {
            const detected = this.detectInstallation();
            if (detected) return detected;
        }
        return settings.claudeCodePath || 'claude';
    }

    /**
     * Detect Claude CLI installation
     */
    detectInstallation(): string | null {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const isWindows = process.platform === 'win32';

        const possiblePaths = isWindows ? [
            path.join(homeDir, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
            path.join(homeDir, 'AppData', 'Local', 'Programs', 'claude', 'claude.exe'),
            path.join(homeDir, '.bun', 'bin', 'claude.exe'),
        ] : [
            path.join(homeDir, '.local', 'bin', 'claude'),
            path.join(homeDir, '.bun', 'bin', 'claude'),
            '/usr/local/bin/claude',
            '/usr/bin/claude',
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    /**
     * Claude requires stdin input
     */
    requiresStdinInput(): boolean {
        return true;
    }

    /**
     * Format stdin input for Claude CLI
     */
    formatStdinInput(prompt: string): string {
        return JSON.stringify({
            type: 'user',
            message: {
                role: 'user',
                content: prompt,
            },
        });
    }
}
