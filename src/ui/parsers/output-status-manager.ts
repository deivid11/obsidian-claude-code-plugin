/**
 * Utility for parsing output lines and extracting status information
 */
export class OutputStatusManager {
    /**
     * Parse an output line and extract status information
     *
     * @param line The output line to parse
     * @returns Status message to display, or null if no status should be shown
     */
    static extractStatus(line: string): string | null {
        // Check if line contains tool usage information
        if (line.includes('Using tool:')) {
            const toolMatch = line.match(/Using tool: (\w+)/);
            if (toolMatch) {
                // Extract the icon that precedes "Using tool:"
                const iconMatch = line.match(/^[\s\n]*(.+?) Using tool:/);
                const icon = iconMatch ? iconMatch[1].trim() : '🔧';
                return `${icon} Using ${toolMatch[1]} tool...`;
            }
        } else if (line.includes('$ ')) {
            // Bash command execution
            const cmdMatch = line.match(/\$ (.+)/);
            if (cmdMatch) {
                const cmd = cmdMatch[1].substring(0, 50);
                return `⚡ Running: ${cmd}${cmdMatch[1].length > 50 ? '...' : ''}`;
            }
        } else if (line.includes('🔍 Query:') || line.includes('Query:')) {
            // Web search
            const queryMatch = line.match(/Query: "(.+?)"/);
            if (queryMatch) {
                const query = queryMatch[1].substring(0, 40);
                return `🔍 Searching: ${query}${queryMatch[1].length > 40 ? '...' : ''}`;
            }
        } else if (line.includes('🌐 URL:') || line.includes('URL:')) {
            // Web fetch
            const urlMatch = line.match(/URL: (.+)/);
            if (urlMatch) {
                const url = urlMatch[1].substring(0, 40);
                return `🌐 Fetching: ${url}${urlMatch[1].length > 40 ? '...' : ''}`;
            }
        } else if (line.includes('📖 Reading file:') || line.includes('📖 File:')) {
            // File reading
            const fileMatch = line.match(/(?:Reading file:|File:)\s+(.+)/);
            if (fileMatch) {
                const file = fileMatch[1].split('/').pop() || fileMatch[1];
                return `📖 Reading: ${file.substring(0, 40)}...`;
            }
        } else if (line.includes('✍️  Writing file:') || line.includes('✍️  File:')) {
            // File writing
            const fileMatch = line.match(/(?:Writing file:|File:)\s+(.+)/);
            if (fileMatch) {
                const file = fileMatch[1].split('/').pop() || fileMatch[1];
                return `✍️ Writing: ${file.substring(0, 40)}...`;
            }
        } else if (line.includes('✏️  Editing file:') || line.includes('✏️  File:')) {
            // File editing
            const fileMatch = line.match(/(?:Editing file:|File:)\s+(.+)/);
            if (fileMatch) {
                const file = fileMatch[1].split('/').pop() || fileMatch[1];
                return `✏️ Editing: ${file.substring(0, 40)}...`;
            }
        } else if (line.includes('🔍 Pattern:') || line.includes('Pattern:')) {
            // Grep/Glob search
            const patternMatch = line.match(/Pattern: (.+)/);
            if (patternMatch) {
                const pattern = patternMatch[1].substring(0, 40);
                return `🔎 Searching pattern: ${pattern}${patternMatch[1].length > 40 ? '...' : ''}`;
            }
        } else if (line.includes('🤖 Launching agent:') || line.includes('Agent:')) {
            // Agent/Task tool
            const agentMatch = line.match(/(?:Agent:|Type:)\s+(.+)/);
            if (agentMatch) {
                return `🤖 Launching ${agentMatch[1]} agent...`;
            }
        } else if (line.includes('💬') && !line.includes('[raw]')) {
            // Claude is responding
            return '💬 Claude is responding...';
        } else if (line.includes('✓') && line.includes('complete')) {
            // Tool completed
            return '✅ Processing results...';
        }

        return null;
    }
}
