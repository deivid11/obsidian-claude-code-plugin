import { ToolOutputFormatter } from './tool-output-formatter';

/**
 * Output callback type for stream event processing
 */
export type OutputCallback = (text: string, isMarkdown?: boolean, isStreaming?: boolean | 'finish', isAssistantMessage?: boolean) => void;

/**
 * Session ID callback type for storing session information
 */
export type SessionIdCallback = (sessionId: string) => void;

/**
 * Utility for processing stream events from Claude Code CLI
 */
export class StreamEventProcessor {
    /**
     * Process a single stream event and generate output
     *
     * @param event The stream event to process
     * @param sendOutput Callback to send output text
     * @param setSessionId Optional callback to store session ID
     */
    static processEvent(
        event: any,
        sendOutput: OutputCallback,
        setSessionId?: SessionIdCallback
    ): void {
        switch (event.type) {
            case 'system':
                this.handleSystemEvent(event, sendOutput, setSessionId);
                break;

            case 'assistant':
                this.handleAssistantEvent(event, sendOutput);
                break;

            case 'tool_use':
                this.handleToolUseEvent(event, sendOutput);
                break;

            case 'user':
                this.handleUserEvent(event, sendOutput);
                break;

            case 'result':
                this.handleResultEvent(event, sendOutput);
                break;

            case 'stream_event':
                this.handleStreamEvent(event, sendOutput);
                break;

            default:
                this.handleUnknownEvent(event, sendOutput);
                break;
        }
    }

    /**
     * Handle system initialization events
     */
    private static handleSystemEvent(
        event: any,
        sendOutput: OutputCallback,
        setSessionId?: SessionIdCallback
    ): void {
        if (event.subtype === 'init') {
            sendOutput(`\n🔧 Session initialized: ${event.model}\n`);
            sendOutput(`📦 Available tools: ${event.tools?.join(', ') || 'none'}\n`);

            // Store session_id for future --resume usage
            if (event.session_id && setSessionId) {
                setSessionId(event.session_id);
                sendOutput(`💾 Session ID: ${event.session_id}\n`);
            }
        }
    }

    /**
     * Handle assistant message events
     */
    private static handleAssistantEvent(event: any, sendOutput: OutputCallback): void {
        // Extract text content from assistant message
        if (event.message?.content) {
            for (const block of event.message.content) {
                if (block.type === 'text') {
                    // Send assistant text as markdown for rendering
                    // Mark as assistant message so it can be shown in Result section
                    sendOutput(block.text, true, false, true);
                } else if (block.type === 'tool_use') {
                    // Display detailed tool usage from assistant message
                    const toolName = block.name;
                    const toolInput = block.input;

                    sendOutput(`\n🔧 Using tool: ${toolName}\n`);

                    // Use formatter for tool-specific parameters
                    const formatted = ToolOutputFormatter.formatToolUsage(toolName, toolInput, 'compact');
                    for (const line of formatted) {
                        sendOutput(line);
                    }
                }
            }
        }
    }

    /**
     * Handle tool use events
     */
    private static handleToolUseEvent(event: any, sendOutput: OutputCallback): void {
        const toolName = event.tool_name || 'unknown';

        if (event.subtype === 'input' && event.input) {
            // Use formatter for tool-specific parameters
            const formatted = ToolOutputFormatter.formatToolUsage(toolName, event.input, 'verbose');
            for (const line of formatted) {
                sendOutput(line);
            }
        } else if (event.subtype === 'result') {
            // Show result summary for some tools
            const resultLines = ToolOutputFormatter.formatToolResult(toolName, event.result);
            for (const line of resultLines) {
                sendOutput(line);
            }

            // Special handling for Glob/Grep result counts
            if ((toolName === 'Glob' || toolName === 'Grep') && event.result) {
                const resultStr = typeof event.result === 'string' ? event.result : JSON.stringify(event.result);
                const lines = resultStr.split('\n').filter((l: string) => l.trim());
                sendOutput(`   ✓ Found ${lines.length} results\n`);
            }
        }
    }

    /**
     * Handle user/tool result events
     */
    private static handleUserEvent(event: any, sendOutput: OutputCallback): void {
        // Tool results coming back from Claude Code
        if (event.message?.content) {
            for (const block of event.message.content) {
                if (block.type === 'tool_result') {
                    sendOutput(`\n📥 Tool result (${block.tool_use_id}):\n`);

                    // Display result content (truncate if too long)
                    const content = typeof block.content === 'string'
                        ? block.content
                        : JSON.stringify(block.content);

                    const lines = content.split('\n');
                    if (lines.length > 10) {
                        sendOutput(`   ${lines.slice(0, 10).join('\n')}\n`);
                        sendOutput(`   ... (${lines.length - 10} more lines)\n`);
                    } else if (content.length > 500) {
                        sendOutput(`   ${content.substring(0, 500)}...\n`);
                        sendOutput(`   (${content.length - 500} more characters)\n`);
                    } else {
                        sendOutput(`   ${content}\n`);
                    }
                }
            }
        }
    }

    /**
     * Handle final result events
     */
    private static handleResultEvent(event: any, sendOutput: OutputCallback): void {
        sendOutput(`\n✅ Complete!\n`);
        sendOutput(`⏱️  Duration: ${event.duration_ms}ms\n`);
        sendOutput(`💰 Cost: $${event.total_cost_usd?.toFixed(4) || '0.0000'}\n`);
        if (event.usage) {
            sendOutput(`📊 Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out\n`);
        }
    }

    /**
     * Handle real-time streaming events
     */
    private static handleStreamEvent(event: any, sendOutput: OutputCallback): void {
        // The actual event is nested inside event.event
        const streamEvent = event.event || event;

        // Real-time streaming events with text deltas
        if (streamEvent.type === 'content_block_delta') {
            if (streamEvent.delta?.type === 'text_delta' && streamEvent.delta.text) {
                // Stream text in real-time - mark as streaming to accumulate
                // Also mark as assistant message for Result section
                console.debug('[Stream Processor] Sending text delta as assistant message');
                sendOutput(streamEvent.delta.text, false, true, true);
            }
        } else if (streamEvent.type === 'content_block_start') {
            // Start of new content block (text or tool use)
            if (streamEvent.content_block?.type === 'text') {
                // Text block starting
                sendOutput(`\n💬 Claude: `, false, false);
            }
        } else if (streamEvent.type === 'content_block_stop') {
            // End of content block - signal end of streaming
            // Mark as assistant message so the result streaming finishes properly
            sendOutput(`\n`, false, 'finish', true);
        }
    }

    /**
     * Handle unknown event types (debugging)
     */
    private static handleUnknownEvent(event: any, sendOutput: OutputCallback): void {
        // Display ALL unknown events for debugging
        sendOutput(`\n🔍 [${event.type}${event.subtype ? ' / ' + event.subtype : ''}]\n`);

        // Show key fields from the event
        const displayFields = ['session_id', 'uuid', 'duration_ms', 'model', 'is_error'];
        for (const field of displayFields) {
            if (event[field] !== undefined) {
                sendOutput(`   ${field}: ${event[field]}\n`);
            }
        }

        // Show message content if present
        if (event.message) {
            sendOutput(`   message: ${JSON.stringify(event.message).substring(0, 200)}...\n`);
        }
    }
}
