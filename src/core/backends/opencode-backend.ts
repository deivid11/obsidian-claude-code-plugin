/**
 * OpenCode CLI Backend Adapter
 * Handles communication with the OpenCode CLI
 */

import * as path from 'path';
import * as fs from 'fs';
import type { ClaudeCodeSettings } from '../settings';
import type { CLIBackend, BackendConfig, StandardEvent, OpenCodeRawEvent, BackendType } from './types';

/**
 * Backend adapter for OpenCode CLI
 */
export class OpenCodeBackend implements CLIBackend {
    readonly name: BackendType = 'opencode';

    /** Track if we've seen the first step_start (used for init) */
    private hasSeenInit = false;

    /**
     * Build CLI arguments for OpenCode
     */
    buildArgs(config: BackendConfig): string[] {
        const args: string[] = ['run'];

        // JSON output format
        args.push('--format', 'json');

        // Resume existing session if available
        if (config.sessionId) {
            args.push('--session', config.sessionId);
        }

        // Model selection (OpenCode uses provider/model format)
        if (config.model) {
            args.push('-m', config.model);
        }

        // Note: Prompt is passed via stdin, not as argument
        // This avoids shell escaping issues with special characters

        return args;
    }

    /**
     * Parse OpenCode CLI event into normalized format
     */
    parseEvent(rawEvent: unknown): StandardEvent | null {
        const event = rawEvent as OpenCodeRawEvent;

        switch (event.type) {
            case 'step_start':
                return this.parseStepStartEvent(event);

            case 'text':
                return this.parseTextEvent(event);

            case 'tool_use':
                return this.parseToolUseEvent(event);

            case 'step_finish':
                return this.parseStepFinishEvent(event);

            default:
                return null;
        }
    }

    private parseStepStartEvent(event: OpenCodeRawEvent): StandardEvent | null {
        // First step_start is treated as init
        if (!this.hasSeenInit) {
            this.hasSeenInit = true;
            return {
                type: 'init',
                sessionId: event.sessionID,
            };
        }
        // Subsequent step_starts are ignored
        return null;
    }

    private parseTextEvent(event: OpenCodeRawEvent): StandardEvent | null {
        const text = event.part?.text;
        if (!text) return null;

        return {
            type: 'text',
            text: text,
            sessionId: event.sessionID,
            isStreaming: true,  // OpenCode text events are streaming
        };
    }

    private parseToolUseEvent(event: OpenCodeRawEvent): StandardEvent | null {
        const part = event.part;
        if (!part) return null;

        const toolName = part.tool || 'unknown';
        const state = part.state;

        if (!state) {
            return {
                type: 'tool_start',
                toolName,
                sessionId: event.sessionID,
            };
        }

        // OpenCode includes both input and output in the same event when completed
        if (state.status === 'completed') {
            return {
                type: 'tool_result',
                toolName,
                toolInput: state.input,
                toolOutput: state.output,
                sessionId: event.sessionID,
            };
        } else {
            return {
                type: 'tool_start',
                toolName,
                toolInput: state.input,
                sessionId: event.sessionID,
            };
        }
    }

    private parseStepFinishEvent(event: OpenCodeRawEvent): StandardEvent {
        const part = event.part;
        const tokens = part?.tokens;

        return {
            type: 'step_complete',
            cost: part?.cost || 0,
            tokens: tokens ? {
                input: tokens.input || 0,
                output: tokens.output || 0,
                cached: tokens.cache?.read || 0,
            } : undefined,
            sessionId: event.sessionID,
        };
    }

    /**
     * Extract session ID from raw event
     */
    extractSessionId(rawEvent: unknown): string | null {
        const event = rawEvent as OpenCodeRawEvent;
        return event.sessionID || null;
    }

    /**
     * Get executable path from settings
     */
    getExecutablePath(settings: ClaudeCodeSettings): string {
        if (settings.opencodeAutoDetect) {
            const detected = this.detectInstallation();
            if (detected) return detected;
        }
        return settings.opencodePath || 'opencode';
    }

    /**
     * Detect OpenCode CLI installation
     */
    detectInstallation(): string | null {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const isWindows = process.platform === 'win32';

        const possiblePaths = isWindows ? [
            path.join(homeDir, 'AppData', 'Roaming', 'npm', 'opencode.cmd'),
            path.join(homeDir, '.bun', 'bin', 'opencode.exe'),
            path.join(homeDir, '.opencode', 'bin', 'opencode.exe'),
        ] : [
            path.join(homeDir, '.local', 'bin', 'opencode'),
            path.join(homeDir, '.bun', 'bin', 'opencode'),
            path.join(homeDir, '.opencode', 'bin', 'opencode'),
            '/usr/local/bin/opencode',
            '/usr/bin/opencode',
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    /**
     * OpenCode requires stdin input for the prompt
     * This avoids shell escaping issues with special characters in long prompts
     */
    requiresStdinInput(): boolean {
        return true;
    }

    /**
     * Format stdin input for OpenCode
     * OpenCode accepts plain text via stdin (no JSON wrapping needed)
     */
    formatStdinInput(prompt: string): string {
        return prompt;
    }

    /**
     * Reset state for new session
     */
    reset(): void {
        this.hasSeenInit = false;
    }
}
