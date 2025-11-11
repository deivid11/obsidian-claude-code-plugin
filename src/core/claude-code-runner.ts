import { ChildProcess } from 'child_process';
import { Notice } from 'obsidian';
import { ClaudeCodeSettings } from './settings';
import { ResponseContentExtractor } from './streaming/response-content-extractor';
import { StreamEventProcessor } from './streaming/stream-event-processor';
import { SessionManager } from './session-manager';
import { PromptBuilder } from './prompt-builder';
import { CliArgsBuilder } from './cli-args-builder';
import { ProcessSpawner } from './process-spawner';
import { ResponseParser } from './response-parser';

export interface ClaudeCodeRequest {
    noteContent: string;
    userPrompt: string;
    notePath: string;
    selectedText?: string;
    vaultPath?: string;
    bypassPermissions?: boolean;
    runtimeModelOverride?: string;
    conversationalMode?: boolean;  // When true, no file modifications are allowed
}

export interface ClaudeCodeResponse {
    success: boolean;
    modifiedContent?: string;
    assistantMessage?: string;
    error?: string;
    output: string[];
    tokenUsage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    };
    isPermissionRequest?: boolean;
}

export class ClaudeCodeRunner {
    private settings: ClaudeCodeSettings;
    private currentProcess: ChildProcess | null = null;
    private outputCallback: ((line: string, isMarkdown?: boolean, isStreaming?: boolean | string, isAssistantMessage?: boolean) => void) | null = null;
    private currentSessionId: string | null = null;  // Store session ID from init event

    constructor(settings: ClaudeCodeSettings) {
        this.settings = settings;
    }

    /**
     * Run Claude Code with the given request
     */
    async run(request: ClaudeCodeRequest, onOutput?: (line: string, isMarkdown?: boolean, isStreaming?: boolean | string) => void): Promise<ClaudeCodeResponse> {
        this.outputCallback = onOutput || null;

        let claudePath = this.settings.claudeCodePath || 'claude';

        // Expand ~ to home directory
        if (claudePath.startsWith('~')) {
            claudePath = claudePath.replace('~', process.env.HOME || '');
        }

        // Validate that Claude Code is available
        if (!claudePath) {
            return {
                success: false,
                error: 'Claude Code path not configured. Please set it in plugin settings.',
                output: []
            };
        }

        try {
            return await this.executeClaudeCode(claudePath, request);
        } catch (error) {
            return {
                success: false,
                error: `Failed to execute Claude Code: ${error}`,
                output: []
            };
        }
    }

    /**
     * Execute Claude Code process and capture output
     */
    private async executeClaudeCode(
        claudePath: string,
        request: ClaudeCodeRequest
    ): Promise<ClaudeCodeResponse> {
        return new Promise((resolve) => {
            const output: string[] = [];
            let errorOutput = '';
            const startTime = Date.now();  // Track overall execution time

            // 1. Setup session
            const sessionInfo = SessionManager.getSessionInfo(
                request.notePath,
                request.vaultPath || ''
            );

            this.sendOutput(sessionInfo.isNewSession
                ? `→ Starting new session\n`
                : `✓ Resuming session: ${sessionInfo.sessionId}\n`
            );

            // 2. Build prompt
            const fullPrompt = PromptBuilder.buildPrompt(
                request,
                sessionInfo.sessionDir,
                this.settings.customSystemPrompt,
                this.settings.allowVaultAccess,
                this.settings.enablePermissionlessMode || request.bypassPermissions
            );

            // 3. Build CLI arguments
            const args = CliArgsBuilder.buildArgs({
                settings: this.settings,
                sessionId: sessionInfo.sessionId,
                vaultPath: request.vaultPath || null,
                bypassPermissions: request.bypassPermissions || false,
                runtimeModelOverride: request.runtimeModelOverride
            });

            // Output configuration info
            if (this.settings.enablePermissionlessMode || request.bypassPermissions) {
                this.sendOutput(`🔓 Permissionless mode enabled\n`);
            } else {
                this.sendOutput(`🔒 Permission mode: interactive (Claude will ask for permission)\n`);
            }

            if (this.settings.allowVaultAccess && request.vaultPath) {
                this.sendOutput(`Vault access enabled: ${request.vaultPath}\n`);
            }

            // 4. Spawn process
            const workingDir = request.vaultPath || process.cwd();
            this.sendOutput(`Working dir: ${workingDir}\n`);
            this.sendOutput(`Starting Claude Code...\n`);
            this.sendOutput(`Session directory: ${sessionInfo.sessionDir}\n`);

            try {
                this.currentProcess = ProcessSpawner.spawn({
                    claudePath,
                    args,
                    workingDir
                });
            } catch (spawnError) {
                this.sendOutput(`\n❌ Failed to spawn process: ${spawnError}`);
                throw spawnError;
            }

            // 5. Send prompt via stdin
            ProcessSpawner.sendInput(this.currentProcess, fullPrompt);

            // Set timeout if configured
            let timeoutId: NodeJS.Timeout | null = null;
            if (this.settings.timeoutSeconds > 0) {
                timeoutId = setTimeout(() => {
                    if (this.currentProcess) {
                        this.sendOutput(`\nTimeout after ${this.settings.timeoutSeconds} seconds, terminating...`);
                        this.currentProcess.kill();
                    }
                }, this.settings.timeoutSeconds * 1000);
            }

            // Capture stdout (stream-json format - one JSON object per line)
            let buffer = '';
            this.currentProcess.stdout?.on('data', (data: Buffer) => {
                //console.log(data.toString());
                
                buffer += data.toString();
                const lines = buffer.split('\n');

                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || '';

                // Process complete lines
                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const event = JSON.parse(line);
                        console.log(event);
                        
                        output.push(line);

                        // Process the event (will handle streaming output)
                        this.handleStreamEvent(event);
                    } catch (e) {
                        this.sendOutput(`[raw] ${line}`);
                    }
                }
            });

            // Capture stderr
            this.currentProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                errorOutput += text;
                this.sendOutput(`[stderr] ${text}`);
            });

            // Add debug logging
            this.sendOutput(`\n[DEBUG] Process spawned, PID: ${this.currentProcess.pid}`);
            this.sendOutput(`[DEBUG] Working dir: ${workingDir}`);
            this.sendOutput(`[DEBUG] Session dir: ${sessionInfo.sessionDir}`);
            this.sendOutput(`[DEBUG] Waiting for output...\n`);

            // Handle process exit (happens before close)
            this.currentProcess.on('exit', (code: number, signal: string) => {
                this.sendOutput(`\n[DEBUG] Process exited with code: ${code}, signal: ${signal}`);
            });

            // Handle process completion
            this.currentProcess.on('close', (code: number) => {
                this.sendOutput(`\n[DEBUG] Process closed with code: ${code}`);

                // Check if .claude directory was created (debug only)
                const fs = require('fs');
                const path = require('path');
                const claudeDir = path.join(sessionInfo.sessionDir, '.claude');
                const claudeDirCreated = fs.existsSync(claudeDir);
                this.sendOutput(`\n[DEBUG] .claude directory after run: ${claudeDirCreated ? 'EXISTS' : 'NOT FOUND'}`);
                if (claudeDirCreated) {
                    // List contents
                    try {
                        const contents = fs.readdirSync(claudeDir);
                        this.sendOutput(`\n[DEBUG] .claude contents: ${contents.join(', ')}`);
                    } catch (e) {
                        this.sendOutput(`\n[DEBUG] Error reading .claude: ${e}`);
                    }
                }

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                this.currentProcess = null;

                if (code === 0) {
                    this.sendOutput(`\n[DEBUG] Processing ${output.length} output lines`);

                    // 6. Parse output
                    const parsed = ResponseParser.parseOutput(output);
                    const isPermissionRequest = ResponseContentExtractor.detectPermissionRequest(parsed.assistantText);

                    this.sendOutput(`\n[DEBUG] Full response length: ${parsed.assistantText.length} chars`);

                    // 7. Save session data
                    try {
                        SessionManager.saveConversationHistory(
                            sessionInfo.sessionDir,
                            request.userPrompt,
                            parsed.assistantText
                        );
                        this.sendOutput(`\n💾 Conversation history saved\n`);

                        if (this.currentSessionId) {
                            SessionManager.saveSessionId(sessionInfo.sessionDir, this.currentSessionId);
                            this.sendOutput(`💾 Session ID saved: ${this.currentSessionId}\n`);
                        }
                    } catch (e) {
                        this.sendOutput(`\n⚠ Error saving session data: ${e}\n`);
                    }

                    // 8. Build and return response
                    const response = ResponseParser.buildResponse(parsed, output, isPermissionRequest);
                    const totalDuration = Date.now() - startTime;

                    if (response.success) {
                        if (response.modifiedContent) {
                            this.sendOutput(`\n✓ Claude Code completed successfully in ${(totalDuration / 1000).toFixed(2)}s`);
                        } else if (isPermissionRequest) {
                            this.sendOutput(`\n⚠️ Permission request detected - waiting for user approval`);
                        } else {
                            this.sendOutput(`\n✓ Analysis completed (no file modifications) in ${(totalDuration / 1000).toFixed(2)}s`);
                        }
                    } else {
                        this.sendOutput(`\n✗ No markdown content found in response`);
                    }

                    resolve(response);
                } else {
                    // Error
                    this.sendOutput(`\n✗ Claude Code failed with code ${code}`);
                    if (errorOutput) {
                        this.sendOutput(`Error output: ${errorOutput}`);
                    }

                    resolve(ResponseParser.buildErrorResponse(
                        `Claude Code exited with code ${code}. ${errorOutput}`,
                        output
                    ));
                }
            });

            // Handle process errors
            this.currentProcess.on('error', (err: Error) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                this.currentProcess = null;
                this.sendOutput(`\n✗ Error: ${err.message}`);

                resolve(ResponseParser.buildErrorResponse(
                    `Failed to spawn Claude Code: ${err.message}`,
                    output
                ));
            });
        });
    }

    /**
     * Send input to the current Claude Code process stdin
     */
    sendInput(input: string): boolean {
        if (this.currentProcess && this.currentProcess.stdin) {
            try {
                this.currentProcess.stdin.write(input);
                this.sendOutput(`\n[User input sent]: ${input.trim()}`);
                return true;
            } catch (error) {
                console.error('Failed to write to stdin:', error);
                this.sendOutput(`\n✗ Failed to send input: ${error}`);
                return false;
            }
        }
        console.error('Cannot send input: no active process or stdin not available');
        return false;
    }

    /**
     * Terminate the current Claude Code process if running
     */
    terminate(): void {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            this.sendOutput('\n⚠ Process terminated by user');
        }
    }

    /**
     * Check if Claude Code is currently running
     */
    isRunning(): boolean {
        return this.currentProcess !== null;
    }

    /**
     * Handle stream-json events
     */
    private handleStreamEvent(event: any): void {
        StreamEventProcessor.processEvent(
            event,
            (text: string, isMarkdown?: boolean, isStreaming?: boolean | 'finish', isAssistantMessage?: boolean) => this.sendOutput(text, isMarkdown, isStreaming, isAssistantMessage),
            (sessionId: string) => { this.currentSessionId = sessionId; }
        );
    }

    /**
     * Send output to callback
     */
    private sendOutput(text: string, isMarkdown: boolean = false, isStreaming?: boolean | string, isAssistantMessage?: boolean): void {
        if (this.outputCallback) {
            if (isAssistantMessage) {
                console.log('[ClaudeCodeRunner sendOutput] isAssistantMessage=', isAssistantMessage, 'text=', text.substring(0, 20));
            }
            this.outputCallback(text, isMarkdown, isStreaming, isAssistantMessage);
        }
    }

    /**
     * Extract final content after the separator
     * If separator is present, it's an edit request
     * If no separator, it's a question/analysis (no file changes)
     */
    private extractFinalContent(content: string): string {
        const result = ResponseContentExtractor.extractFinalContent(content);

        if (!result.hasChanges) {
            // No separator means this was a question/analysis, not an edit request
            this.sendOutput(`\n💬 Claude provided analysis (no file changes)\n`);
        }

        return result.content;
    }

    /**
     * Detect if Claude's response is asking for permission to perform an action
     */
    private detectPermissionRequest(text: string): boolean {
        return ResponseContentExtractor.detectPermissionRequest(text);
    }

    /**
     * Update settings
     */
    updateSettings(settings: ClaudeCodeSettings): void {
        this.settings = settings;
    }
}
