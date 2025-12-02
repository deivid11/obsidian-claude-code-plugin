/**
 * Utility for formatting tool usage information in a consistent way
 */
export class ToolOutputFormatter {
    /**
     * Format tool usage information from tool_use event or message block
     *
     * @param toolName Name of the tool being used
     * @param toolInput Input parameters for the tool
     * @param format Format style: 'compact' for message blocks, 'verbose' for events
     * @returns Array of formatted output lines
     */
    static formatToolUsage(toolName: string, toolInput: any, format: 'compact' | 'verbose' = 'compact'): string[] {
        const lines: string[] = [];

        if (format === 'verbose') {
            // Used for tool_use events - more verbose headers
            lines.push(...this.formatVerboseHeader(toolName));
        }

        // Format tool-specific parameters
        lines.push(...this.formatToolSpecificParams(toolName, toolInput, format));

        return lines;
    }

    /**
     * Format verbose header for tool_use events
     */
    private static formatVerboseHeader(toolName: string): string[] {
        const headers: { [key: string]: string } = {
            'Bash': '\n🔧 Bash executing:\n',
            'Glob': '\n🔍 Glob searching:\n',
            'Grep': '\n🔎 Grep searching:\n',
            'Read': '\n📖 Reading file:\n',
            'Write': '\n✍️  Writing file:\n',
            'Edit': '\n✏️  Editing file:\n',
            'WebFetch': '\n🌐 Fetching webpage:\n',
            'WebSearch': '\n🔍 Web searching:\n',
            'Task': '\n🤖 Launching agent:\n'
        };

        return [headers[toolName] || `\n🛠️  ${toolName}:\n`];
    }

    /**
     * Format tool-specific parameters
     */
    private static formatToolSpecificParams(toolName: string, toolInput: any, format: 'compact' | 'verbose'): string[] {
        const lines: string[] = [];

        if (!toolInput) {
            return lines;
        }

        switch (toolName) {
            case 'Bash':
                if (toolInput.command) {
                    lines.push(`   $ ${toolInput.command}\n`);
                    if (toolInput.description) {
                        lines.push(`   📝 ${toolInput.description}\n`);
                    }
                }
                break;

            case 'WebSearch':
                if (toolInput.query) {
                    const prefix = format === 'compact' ? '   🔍 Query:' : '   Query:';
                    lines.push(`${prefix} "${toolInput.query}"\n`);
                    if (toolInput.allowed_domains?.length) {
                        const label = format === 'compact' ? '   ✓ Allowed:' : '   Allowed domains:';
                        lines.push(`${label} ${toolInput.allowed_domains.join(', ')}\n`);
                    }
                    if (toolInput.blocked_domains?.length) {
                        const label = format === 'compact' ? '   ✗ Blocked:' : '   Blocked domains:';
                        lines.push(`${label} ${toolInput.blocked_domains.join(', ')}\n`);
                    }
                }
                break;

            case 'WebFetch':
                if (toolInput.url) {
                    const prefix = format === 'compact' ? '   🌐 URL:' : '   URL:';
                    lines.push(`${prefix} ${toolInput.url}\n`);
                    if (toolInput.prompt) {
                        const label = format === 'compact' ? '   📋 Task:' : '   Task:';
                        const truncated = toolInput.prompt.substring(0, format === 'compact' ? 100 : 150);
                        const ellipsis = toolInput.prompt.length > (format === 'compact' ? 100 : 150) ? '...' : '';
                        lines.push(`${label} ${truncated}${ellipsis}\n`);
                    }
                }
                break;

            case 'Glob':
                if (toolInput.pattern) {
                    const prefix = format === 'compact' ? '   🔍 Pattern:' : '   Pattern:';
                    lines.push(`${prefix} ${toolInput.pattern}\n`);
                    if (toolInput.path) {
                        const searchPath = format === 'verbose' ? toolInput.path : toolInput.path;
                        lines.push(`   📁 Path: ${searchPath}\n`);
                    } else if (format === 'verbose') {
                        lines.push(`   Path: .\n`);
                    }
                }
                break;

            case 'Grep':
                if (toolInput.pattern) {
                    const prefix = format === 'compact' ? '   🔎 Pattern:' : '   Pattern:';
                    lines.push(`${prefix} "${toolInput.pattern}"\n`);
                    if (toolInput.path) {
                        const searchPath = format === 'verbose' ? toolInput.path : toolInput.path;
                        lines.push(`   📁 Path: ${searchPath}\n`);
                    } else if (format === 'verbose') {
                        lines.push(`   Path: .\n`);
                    }
                    if (toolInput.output_mode) {
                        const label = format === 'compact' ? '   📊 Mode:' : '   Mode:';
                        lines.push(`${label} ${toolInput.output_mode}\n`);
                    }
                }
                break;

            case 'Read':
                if (toolInput.file_path) {
                    const prefix = format === 'compact' ? '   📖 File:' : '   ';
                    lines.push(`${prefix}${toolInput.file_path}\n`);
                    if (format === 'verbose' && (toolInput.offset || toolInput.limit)) {
                        const start = toolInput.offset || 0;
                        const end = toolInput.limit ? start + toolInput.limit : 'EOF';
                        lines.push(`   Lines: ${start} to ${end}\n`);
                    }
                }
                break;

            case 'Write':
                if (toolInput.file_path) {
                    const prefix = format === 'compact' ? '   ✍️  File:' : '   ';
                    lines.push(`${prefix}${toolInput.file_path}\n`);
                    const contentLength = toolInput.content?.length || 0;
                    const label = format === 'compact' ? '   📏 Size:' : '   Size:';
                    lines.push(`${label} ${contentLength} char${contentLength === 1 ? '' : 's'}\n`);
                }
                break;

            case 'Edit':
                if (toolInput.file_path) {
                    const prefix = format === 'compact' ? '   ✏️  File:' : '   ';
                    lines.push(`${prefix}${toolInput.file_path}\n`);
                    if (format === 'verbose' && toolInput.replace_all) {
                        lines.push(`   Mode: Replace all occurrences\n`);
                    }
                }
                break;

            case 'Task':
                if (toolInput.subagent_type) {
                    const prefix = format === 'compact' ? '   🤖 Agent:' : '   Type:';
                    lines.push(`${prefix} ${toolInput.subagent_type}\n`);
                }
                if (toolInput.description) {
                    lines.push(`   📋 Task: ${toolInput.description}\n`);
                }
                if (format === 'verbose' && toolInput.prompt) {
                    const shortPrompt = toolInput.prompt.substring(0, 150);
                    lines.push(`   Prompt: ${shortPrompt}${toolInput.prompt.length > 150 ? '...' : ''}\n`);
                }
                break;

            case 'TodoWrite': {
                // TodoWrite needs the full JSON for parsing, so don't truncate
                const todoInputStr = JSON.stringify(toolInput, null, 2);
                lines.push(`   ${todoInputStr}\n`);
                break;
            }

            default: {
                // Generic display for other tools
                const inputStr = JSON.stringify(toolInput, null, 2);
                if (format === 'compact') {
                    const linesArr = inputStr.split('\n');
                    if (linesArr.length > 10) {
                        lines.push(`   ${linesArr.slice(0, 10).join('\n')}\n   ...\n`);
                    } else {
                        lines.push(`   ${inputStr}\n`);
                    }
                } else {
                    if (inputStr.length > 300) {
                        lines.push(`   ${inputStr.substring(0, 300)}...\n`);
                    } else {
                        lines.push(`   ${inputStr}\n`);
                    }
                }
                break;
            }
        }

        return lines;
    }

    /**
     * Format tool result output
     *
     * @param toolName Name of the tool
     * @param result Result object from the tool
     * @returns Array of formatted output lines
     */
    static formatToolResult(toolName: string, result: any): string[] {
        const lines: string[] = [];

        if (toolName === 'Bash' && result?.stdout) {
            const output = result.stdout.trim();
            if (output) {
                const outputLines = output.split('\n');
                lines.push(`   ✓ Output (${outputLines.length} lines):\n`);
                // Show first few lines of output
                const preview = outputLines.slice(0, 3).join('\n');
                lines.push(`   ${preview}${outputLines.length > 3 ? '\n   ...' : ''}\n`);
            } else {
                lines.push(`   ✓ ${toolName} complete\n`);
            }
        } else if (result) {
            lines.push(`   ✓ ${toolName} complete\n`);
        }

        return lines;
    }
}
