/**
 * Backend module exports and factory
 */

import { ClaudeBackend } from './claude-backend';
import { OpenCodeBackend } from './opencode-backend';
import type { CLIBackend, BackendType, StandardEvent, BackendConfig } from './types';

// Re-export types
export type { CLIBackend, BackendType, StandardEvent, BackendConfig };
export type { ClaudeRawEvent, OpenCodeRawEvent } from './types';

// Export backend classes
export { ClaudeBackend } from './claude-backend';
export { OpenCodeBackend } from './opencode-backend';

/**
 * Create a backend instance by type
 * @param type Backend type ('claude' or 'opencode')
 * @returns Backend instance
 */
export function createBackend(type: BackendType): CLIBackend {
    switch (type) {
        case 'claude':
            return new ClaudeBackend();
        case 'opencode':
            return new OpenCodeBackend();
        default:
            throw new Error(`Unknown backend type: ${type as string}`);
    }
}

/**
 * Get display name for a backend type
 */
export function getBackendDisplayName(type: BackendType): string {
    switch (type) {
        case 'claude':
            return 'Claude Code';
        case 'opencode':
            return 'OpenCode';
        default:
            return type;
    }
}

/**
 * List of all available backend types
 */
export const AVAILABLE_BACKENDS: BackendType[] = ['claude', 'opencode'];
