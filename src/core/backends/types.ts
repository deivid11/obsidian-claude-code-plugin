/**
 * Backend abstraction types for CLI integration
 * Allows switching between Claude Code CLI and OpenCode CLI
 */

import type { ClaudeCodeSettings } from '../settings';

/**
 * Supported backend types
 */
export type BackendType = 'claude' | 'opencode';

/**
 * Configuration passed to backend for building CLI arguments
 */
export interface BackendConfig {
    /** Session ID for resuming conversations */
    sessionId?: string;
    /** Model to use (format varies by backend) */
    model?: string;
    /** Working directory for the CLI process */
    workingDir?: string;
    /** Vault path for file access */
    vaultPath?: string;
    /** Permission mode for autonomous operation */
    permissionMode?: 'bypass' | 'interactive';
    /** User prompt/message to send */
    prompt?: string;
    /** Custom system prompt */
    systemPrompt?: string;
}

/**
 * Normalized event format used internally
 * All backends map their events to this format
 */
export interface StandardEvent {
    /** Event type */
    type: 'init' | 'text' | 'thinking' | 'tool_start' | 'tool_result' | 'step_complete' | 'error' | 'block_start' | 'block_end';
    /** Block type for block_start/block_end events */
    blockType?: 'text' | 'thinking';
    /** Session ID from the backend */
    sessionId?: string;
    /** Text content (for text/thinking events) */
    text?: string;
    /** Tool name (for tool events) */
    toolName?: string;
    /** Tool input parameters */
    toolInput?: Record<string, unknown>;
    /** Tool output/result */
    toolOutput?: string;
    /** Token usage statistics */
    tokens?: {
        input: number;
        output: number;
        cached?: number;
    };
    /** Cost in USD */
    cost?: number;
    /** Duration in milliseconds */
    durationMs?: number;
    /** Whether this is a streaming event */
    isStreaming?: boolean;
    /** Model name (for init events) */
    model?: string;
    /** Available tools (for init events) */
    tools?: string[];
    /** Error message (for error events) */
    errorMessage?: string;
}

/**
 * CLI Backend interface
 * Implement this to add support for a new CLI tool
 */
export interface CLIBackend {
    /** Backend identifier */
    readonly name: BackendType;

    /**
     * Build CLI arguments for the given configuration
     * @param config Backend configuration
     * @returns Array of CLI arguments
     */
    buildArgs(config: BackendConfig): string[];

    /**
     * Parse a raw event from CLI output into a normalized StandardEvent
     * @param rawEvent Raw JSON event from CLI stdout
     * @returns Normalized event or null if event should be ignored
     */
    parseEvent(rawEvent: unknown): StandardEvent | null;

    /**
     * Extract session ID from a raw event
     * @param rawEvent Raw JSON event from CLI stdout
     * @returns Session ID or null if not present
     */
    extractSessionId(rawEvent: unknown): string | null;

    /**
     * Get the executable path for this backend
     * @param settings Plugin settings
     * @returns Path to the CLI executable
     */
    getExecutablePath(settings: ClaudeCodeSettings): string;

    /**
     * Detect if this backend is installed
     * @returns Path to installation or null if not found
     */
    detectInstallation(): string | null;

    /**
     * Check if this backend requires stdin input
     * @returns true if prompt should be sent via stdin, false if via args
     */
    requiresStdinInput(): boolean;

    /**
     * Format the stdin input for this backend (if required)
     * @param prompt User prompt
     * @returns Formatted input string or null if not applicable
     */
    formatStdinInput?(prompt: string): string | null;

    /**
     * Reset backend state for a new run
     * Optional - implement if backend has state that needs clearing between runs
     */
    reset?(): void;
}

/**
 * Raw event types from Claude Code CLI
 */
export interface ClaudeRawEvent {
    type: string;
    subtype?: string;
    model?: string;
    tools?: string[];
    session_id?: string;
    message?: {
        content?: Array<{
            type: string;
            text?: string;
            name?: string;
            input?: Record<string, unknown>;
            tool_use_id?: string;
            content?: unknown;
        }>;
    };
    tool_name?: string;
    input?: Record<string, unknown>;
    result?: string | Record<string, unknown>;
    duration_ms?: number;
    total_cost_usd?: number;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
    event?: {
        type: string;
        delta?: {
            type: string;
            text?: string;
        };
        content_block?: {
            type: string;
        };
    };
}

/**
 * Raw event types from OpenCode CLI
 */
export interface OpenCodeRawEvent {
    type: string;
    timestamp?: number;
    sessionID?: string;
    part?: {
        id?: string;
        sessionID?: string;
        messageID?: string;
        type?: string;
        text?: string;
        tool?: string;
        callID?: string;
        state?: {
            status?: string;
            input?: Record<string, unknown>;
            output?: string;
            title?: string;
            metadata?: Record<string, unknown>;
            time?: {
                start?: number;
                end?: number;
            };
        };
        reason?: string;
        snapshot?: string;
        cost?: number;
        tokens?: {
            input?: number;
            output?: number;
            reasoning?: number;
            cache?: {
                read?: number;
                write?: number;
            };
        };
    };
}
