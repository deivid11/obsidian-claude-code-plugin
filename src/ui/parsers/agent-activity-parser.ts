import { AgentStep } from '../../core/types';

/**
 * Utility for parsing agent activity from output text
 */
export class AgentActivityParser {
    /**
     * Parse and extract agent activity from output text
     *
     * @param text Output text to parse
     * @returns AgentStep object if activity detected, null otherwise
     */
    static parseAgentActivity(text: string): AgentStep | null {
        // System events
        if (text.includes('Resuming session:') || text.includes('✓ Resuming session:')) {
            return this.matchAndCreate(
                text,
                /(?:✓ )?Resuming session: (.+)/,
                '🔄',
                'Resume',
                'resume',
                (match) => this.truncate(match[1], 8, false) + '...'
            );
        }

        if (text.includes('→ Starting new session')) {
            return this.createStep('🆕', 'New', 'session started', 'new-session');
        }

        if (text.includes('Vault access enabled:')) {
            return this.matchAndCreate(
                text,
                /Vault access enabled: (.+)/,
                '🗂️',
                'Vault',
                'vault',
                (match) => this.extractFilename(match[1])
            );
        }

        if (text.includes('🔧 Session initialized:')) {
            return this.matchAndCreate(
                text,
                /🔧 Session initialized: (.+)/,
                '🚀',
                'Initialize',
                'init'
            );
        }

        if (text.includes('💾 Session ID:')) {
            return this.matchAndCreate(
                text,
                /💾 Session ID: (.+)/,
                '💾',
                'Session',
                'session',
                (match) => this.truncate(match[1], 8, false) + '...'
            );
        }

        if (text.includes('📦 Available tools:')) {
            const match = text.match(/📦 Available tools: (.+)/);
            if (match) {
                const tools = match[1].split(', ');
                return this.createStep('📦', 'Tools', `${tools.length} available`, 'tools');
            }
        }

        // Tool usage (special case: action comes from match)
        if (text.includes('Using tool:')) {
            const match = text.match(/Using tool: (\w+)/);
            if (match) {
                // Extract the emoji before "Using tool:" if present
                const emojiMatch = text.match(/^[\s\n]*(.+?) Using tool:/);
                const icon = emojiMatch ? emojiMatch[1].trim() : '🔧';
                return this.createStep(icon, match[1], 'starting...', `tool-${match[1]}`);
            }
        }

        // Bash commands
        if (text.includes('$ ')) {
            return this.matchAndCreate(
                text,
                /\$ (.+)/,
                '⚡',
                'Bash',
                'bash',
                (match) => this.truncate(match[1], 60)
            );
        }

        // Web search with query
        if (text.includes('Query:') && (text.includes('🔍') || text.includes('search'))) {
            return this.matchAndCreate(
                text,
                /(?:🔍 )?Query: "(.+?)"/,
                '🔍',
                'Search',
                'search',
                (match) => this.truncate(match[1], 50)
            );
        }

        // Tool results
        if (text.includes('📥 Tool result')) {
            return this.matchAndCreate(
                text,
                /📥 Tool result \((.+?)\):/,
                '📥',
                'Result',
                'result',
                (match) => this.truncate(match[1], 20)
            );
        }

        // Web fetch with URL
        if (text.includes('🌐 URL:')) {
            return this.matchAndCreate(
                text,
                /🌐 URL: (.+)/,
                '🌐',
                'Fetch',
                'fetch',
                (match) => this.truncate(match[1], 50)
            );
        }

        // File operations with actual filenames
        if (text.includes('📖') && (text.includes('File:') || text.includes('Reading file:'))) {
            return this.matchAndCreate(
                text,
                /(?:File:|Reading file:)\s+(.+)/,
                '📖',
                'Read',
                'read',
                (match) => this.extractFilename(match[1])
            );
        }

        if (text.includes('✍️') && (text.includes('File:') || text.includes('Writing file:'))) {
            return this.matchAndCreate(
                text,
                /(?:File:|Writing file:)\s+(.+)/,
                '✍️',
                'Write',
                'write',
                (match) => this.extractFilename(match[1])
            );
        }

        if (text.includes('✏️') && (text.includes('File:') || text.includes('Editing file:'))) {
            return this.matchAndCreate(
                text,
                /(?:File:|Editing file:)\s+(.+)/,
                '✏️',
                'Edit',
                'edit',
                (match) => this.extractFilename(match[1])
            );
        }

        // Pattern searches
        if (text.includes('Pattern:')) {
            return this.matchAndCreate(
                text,
                /Pattern: (.+)/,
                '🔎',
                'Search',
                'pattern',
                (match) => this.truncate(match[1], 40)
            );
        }

        // Agent launches
        if (text.includes('Agent:') || text.includes('Type:')) {
            return this.matchAndCreate(
                text,
                /(?:Agent:|Type:)\s+(.+)/,
                '🤖',
                'Agent',
                'agent'
            );
        }

        // Completion results
        if (text.includes('✅ Complete!')) {
            return this.createStep('✅', 'Complete', 'Success', 'complete');
        }

        if (text.includes('💰 Cost:')) {
            return this.matchAndCreate(
                text,
                /💰 Cost: \$(\d+\.\d+)/,
                '💰',
                'Cost',
                'cost',
                (match) => `$${match[1]}`
            );
        }

        if (text.includes('📊 Tokens:')) {
            const match = text.match(/📊 Tokens: (\d+) in, (\d+) out/);
            if (match) {
                return this.createStep('📊', 'Tokens', `${match[1]} → ${match[2]}`, 'tokens');
            }
        }

        if (text.includes('⏱️') && text.includes('Duration:')) {
            return this.matchAndCreate(
                text,
                /⏱️\s{2}Duration: (\d+)ms/,
                '⏱️',
                'Duration',
                'duration',
                (match) => `${(parseInt(match[1]) / 1000).toFixed(1)}s`
            );
        }

        // Final response indicator (works with any backend)
        if (text.includes('✓ Claude Code completed') || text.includes('✓ OpenCode completed') || text.match(/✓ .+ completed successfully/)) {
            return this.createStep('🎉', 'Finished', 'Successfully', 'finished');
        }

        return null;
    }

    /**
     * Helper to create AgentStep from parameters
     */
    private static createStep(
        icon: string,
        action: string,
        target: string,
        keyPrefix: string
    ): AgentStep {
        return {
            icon,
            action,
            target,
            key: `${keyPrefix}-${Date.now()}`
        };
    }

    /**
     * Helper to match pattern and create step with optional target transformation
     */
    private static matchAndCreate(
        text: string,
        pattern: RegExp,
        icon: string,
        action: string,
        keyPrefix: string,
        targetTransform?: (match: RegExpMatchArray) => string
    ): AgentStep | null {
        const match = text.match(pattern);
        if (!match) return null;

        const target = targetTransform ? targetTransform(match) : match[1];
        return this.createStep(icon, action, target, keyPrefix);
    }

    /**
     * Helper to extract filename from path
     */
    private static extractFilename(path: string, maxLength: number = 40): string {
        const filename = path.split('/').pop() || path;
        return filename.substring(0, maxLength);
    }

    /**
     * Helper to truncate text
     */
    private static truncate(text: string, maxLength: number, addEllipsis: boolean = true): string {
        if (text.length <= maxLength) return text;
        return addEllipsis ? text.substring(0, maxLength) + '...' : text.substring(0, maxLength);
    }
}
