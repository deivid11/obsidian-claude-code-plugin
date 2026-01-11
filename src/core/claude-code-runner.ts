import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { StringDecoder } from 'string_decoder';
import { ClaudeCodeSettings } from './settings';
import { SessionManager } from './session-manager';
import { PromptBuilder } from './prompt-builder';
import { ProcessSpawner } from './process-spawner';
import { ResponseParser } from './response-parser';
import { ResponseContentExtractor } from './streaming/response-content-extractor';
import { ToolOutputFormatter } from './streaming/tool-output-formatter';
import { createBackend, type CLIBackend, type StandardEvent } from './backends';

export interface ClaudeCodeRequest {
    noteContent?: string;  // Optional for standalone sessions
    userPrompt: string;
    notePath?: string;  // Optional for standalone sessions
    selectedText?: string;
    vaultPath?: string;
    configDir: string;  // Obsidian config directory from Vault.configDir
    bypassPermissions?: boolean;
    runtimeModelOverride?: string;
    conversationalMode?: boolean;  // When true, no file modifications are allowed
    sessionDir?: string;  // For standalone sessions - use existing session directory
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
    private backend: CLIBackend;
    private hasSeenTextBlock: boolean = false;  // Track if we've seen a text block (for separators)

    constructor(settings: ClaudeCodeSettings) {
        this.settings = settings;
        this.backend = createBackend(settings.backend);
    }

    /**
     * Update settings and recreate backend if needed
     */
    updateSettings(settings: ClaudeCodeSettings): void {
        if (this.settings.backend !== settings.backend) {
            this.backend = createBackend(settings.backend);
        }
        this.settings = settings;
    }

    /**
     * Run Claude Code with the given request
     */
    async run(request: ClaudeCodeRequest, onOutput?: (line: string, isMarkdown?: boolean, isStreaming?: boolean | string) => void): Promise<ClaudeCodeResponse> {
        this.outputCallback = onOutput || null;

        // Ensure backend is up to date
        if (this.backend.name !== this.settings.backend) {
            this.backend = createBackend(this.settings.backend);
        }

        // Get executable path from backend
        let execPath = this.backend.getExecutablePath(this.settings);

        // Expand ~ to home directory (use USERPROFILE on Windows, HOME on Unix)
        if (execPath.startsWith('~')) {
            const homeDir = process.env.HOME || process.env.USERPROFILE || '';
            execPath = execPath.replace('~', homeDir);
        }

        // Validate that executable is available
        if (!execPath) {
            const backendName = this.backend.name === 'claude' ? 'Claude Code' : 'OpenCode';
            return {
                success: false,
                error: `${backendName} path not configured. Please set it in plugin settings.`,
                output: []
            };
        }

        try {
            return await this.executeClaudeCode(execPath, request);
        } catch (error) {
            return {
                success: false,
                error: `Failed to execute ${this.backend.name}: ${error}`,
                output: []
            };
        }
    }

    /**
     * Execute CLI backend process and capture output
     */
    private async executeClaudeCode(
        execPath: string,
        request: ClaudeCodeRequest
    ): Promise<ClaudeCodeResponse> {
        return new Promise((resolve) => {
            const output: string[] = [];
            let errorOutput = '';
            const startTime = Date.now();  // Track overall execution time

            // 1. Setup session (pass backend type so session IDs are stored separately)
            let sessionInfo;
            if (request.sessionDir) {
                // Use existing session directory (for standalone sessions)
                const sessionIdFile = path.join(request.sessionDir, `session_id_${this.backend.name}.txt`);
                let sessionId: string | null = null;
                let isNewSession = true;
                if (fs.existsSync(sessionIdFile)) {
                    try {
                        sessionId = fs.readFileSync(sessionIdFile, 'utf8').trim();
                        if (sessionId) isNewSession = false;
                    } catch { /* ignore */ }
                }
                sessionInfo = {
                    sessionDir: request.sessionDir,
                    sessionId,
                    isNewSession,
                    sessionHash: path.basename(request.sessionDir)
                };
            } else {
                sessionInfo = SessionManager.getSessionInfo(
                    request.notePath || null,
                    request.vaultPath || '',
                    request.configDir,
                    this.backend.name
                );
            }

            // Reset backend state for new run (important for OpenCode's hasSeenInit)
            if (this.backend.reset) {
                this.backend.reset();
            }

            // Reset text block tracking for separators
            this.hasSeenTextBlock = false;

            // Save session metadata (tracks note path, backend, timestamps)
            SessionManager.saveSessionMetadata(
                sessionInfo.sessionDir,
                request.notePath || null,
                this.backend.name
            );

            this.sendOutput(sessionInfo.isNewSession
                ? `→ Starting new session\n`
                : `✓ Resuming session: ${sessionInfo.sessionId}\n`
            );

            // 1a. Create note.md file in session directory for Claude to edit (only if we have content)
            const noteFilePath = path.join(sessionInfo.sessionDir, 'note.md');
            const contentToEdit = request.selectedText || request.noteContent;
            if (contentToEdit) {
                try {
                    fs.writeFileSync(noteFilePath, contentToEdit, 'utf8');
                    this.sendOutput(`📝 Created note.md for editing\n`);
                } catch (e) {
                    this.sendOutput(`⚠️ Error creating note.md: ${e}\n`);
                }
            }

            // 2. Build prompt
            const fullPrompt = PromptBuilder.buildPrompt(
                request,
                sessionInfo.sessionDir,
                this.settings.customSystemPrompt,
                this.settings.allowVaultAccess,
                this.settings.enablePermissionlessMode || request.bypassPermissions
            );

            // 3. Build CLI arguments using backend
            const model = this.backend.name === 'opencode'
                ? this.settings.opencodeModel
                : (request.runtimeModelOverride || this.settings.modelAlias);

            const args = this.backend.buildArgs({
                sessionId: sessionInfo.sessionId || undefined,
                model: model || undefined,
                workingDir: sessionInfo.sessionDir,
                vaultPath: this.settings.allowVaultAccess ? request.vaultPath : undefined,
                permissionMode: (this.settings.enablePermissionlessMode || request.bypassPermissions) ? 'bypass' : 'interactive',
                prompt: this.backend.requiresStdinInput() ? undefined : fullPrompt,
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

            // Debug environment before spawning
            this.sendOutput(`[DEBUG] Checking environment...\n`);
            this.sendOutput(`[DEBUG] SHELL: ${process.env.SHELL}\n`);
            this.sendOutput(`[DEBUG] HOME: ${process.env.HOME}\n`);
            this.sendOutput(`[DEBUG] Backend: ${this.backend.name}\n`);
            this.sendOutput(`[DEBUG] Executable path: ${execPath}\n`);

            // Build custom environment variables from settings (Claude-specific)
            const customEnvVars: Record<string, string> = {};
            if (this.backend.name === 'claude') {
                if (this.settings.anthropicBaseUrl) {
                    customEnvVars['ANTHROPIC_BASE_URL'] = this.settings.anthropicBaseUrl;
                }
                if (this.settings.anthropicAuthToken) {
                    customEnvVars['ANTHROPIC_AUTH_TOKEN'] = this.settings.anthropicAuthToken;
                }
                if (this.settings.anthropicModel) {
                    customEnvVars['ANTHROPIC_MODEL'] = this.settings.anthropicModel;
                }
                if (this.settings.anthropicSmallFastModel) {
                    customEnvVars['ANTHROPIC_SMALL_FAST_MODEL'] = this.settings.anthropicSmallFastModel;
                }
            }

            try {
                this.currentProcess = ProcessSpawner.spawn({
                    claudePath: execPath,
                    args,
                    workingDir,
                    onDebugOutput: (msg) => this.sendOutput(msg),
                    customEnvVars: Object.keys(customEnvVars).length > 0 ? customEnvVars : undefined
                });
                this.sendOutput(`[DEBUG] Process spawned successfully, PID: ${this.currentProcess.pid}\n`);
            } catch (spawnError) {
                this.sendOutput(`\n❌ Failed to spawn process: ${spawnError}`);
                throw spawnError;
            }

            // 5. Send prompt via stdin (only for backends that require it)
            if (this.backend.requiresStdinInput()) {
                if (this.backend.formatStdinInput) {
                    // Backend provides its own formatting (e.g., OpenCode: plain text)
                    const stdinInput = this.backend.formatStdinInput(fullPrompt);
                    if (stdinInput && this.currentProcess.stdin) {
                        this.currentProcess.stdin.write(stdinInput, 'utf8');
                        this.currentProcess.stdin.end();
                    }
                } else {
                    // Fallback for Claude-style stdin (JSON wrapped)
                    ProcessSpawner.sendInput(this.currentProcess, fullPrompt);
                }
            }

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
            // Use StringDecoder to properly handle multi-byte UTF-8 characters
            // that may be split across chunk boundaries (e.g., ½, ¼, ¾, etc.)
            const stdoutDecoder = new StringDecoder('utf8');
            let buffer = '';
            this.currentProcess.stdout?.on('data', (data: Buffer) => {
                // Use StringDecoder to properly decode UTF-8, handling split multi-byte chars
                buffer += stdoutDecoder.write(data);
                const lines = buffer.split('\n');

                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || '';

                // Process complete lines
                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const rawEvent = JSON.parse(line) as Record<string, unknown>;

                        output.push(line);

                        // Extract session ID from raw event (backend-specific)
                        const sessionId = this.backend.extractSessionId(rawEvent);
                        if (sessionId && !this.currentSessionId) {
                            this.currentSessionId = sessionId;
                        }

                        // Parse event using backend (for normalized handling)
                        const normalizedEvent = this.backend.parseEvent(rawEvent);
                        if (normalizedEvent) {
                            this.handleNormalizedEvent(normalizedEvent);
                        }

                        // Note: Legacy handleStreamEvent removed - normalized handler now covers all events
                        // This fixes the double-output bug where both handlers were processing the same events
                    } catch {
                        this.sendOutput(`[raw] ${line}`);
                    }
                }
            });

            // Capture stderr (also use StringDecoder for proper UTF-8 handling)
            const stderrDecoder = new StringDecoder('utf8');
            this.currentProcess.stderr?.on('data', (data: Buffer) => {
                const text = stderrDecoder.write(data);
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

                    // 7. Read the modified note.md file (if it was modified)
                    let modifiedContent: string | undefined = undefined;
                    try {
                        if (fs.existsSync(noteFilePath)) {
                            const noteContent = fs.readFileSync(noteFilePath, 'utf8');

                            // Check if content actually changed
                            if (noteContent !== contentToEdit && !request.conversationalMode) {
                                modifiedContent = noteContent;
                                this.sendOutput(`\n✅ note.md was modified by Claude\n`);
                            } else {
                                this.sendOutput(`\n ℹ️  note.md unchanged (likely a question/analysis)\n`);
                            }
                        } else {
                            this.sendOutput(`\n⚠️  note.md not found after execution\n`);
                        }
                    } catch (e) {
                        this.sendOutput(`\n⚠️  Error reading note.md: ${e}\n`);
                    }

                    // 8. Save session data
                    try {
                        SessionManager.saveConversationHistory(
                            sessionInfo.sessionDir,
                            request.userPrompt,
                            parsed.assistantText
                        );
                        this.sendOutput(`\n💾 Conversation history saved\n`);

                        if (this.currentSessionId) {
                            SessionManager.saveSessionId(sessionInfo.sessionDir, this.currentSessionId, this.backend.name);
                            this.sendOutput(`💾 Session ID saved: ${this.currentSessionId}\n`);
                        }
                    } catch (e) {
                        this.sendOutput(`\n⚠ Error saving session data: ${e}\n`);
                    }

                    // 9. Build and return response
                    const totalDuration = Date.now() - startTime;
                    const response: ClaudeCodeResponse = {
                        success: true,
                        modifiedContent: modifiedContent,
                        assistantMessage: parsed.assistantText,
                        output: output,
                        tokenUsage: parsed.tokenUsage,
                        isPermissionRequest
                    };

                    if (response.success) {
                        if (modifiedContent) {
                            this.sendOutput(`\n✓ Claude Code completed successfully in ${(totalDuration / 1000).toFixed(2)}s`);
                        } else if (isPermissionRequest) {
                            this.sendOutput(`\n⚠️ Permission request detected - waiting for user approval`);
                        } else {
                            this.sendOutput(`\n✓ Analysis completed (no file modifications) in ${(totalDuration / 1000).toFixed(2)}s`);
                        }
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
     * Handle normalized events from any backend
     */
    private handleNormalizedEvent(event: StandardEvent): void {
        switch (event.type) {
            case 'init':
                if (event.sessionId) {
                    this.currentSessionId = event.sessionId;
                    this.sendOutput(`\n🔧 Session: ${event.sessionId}\n`);
                }
                if (event.model) {
                    this.sendOutput(`📦 Model: ${event.model}\n`);
                }
                if (event.tools && event.tools.length > 0) {
                    this.sendOutput(`🛠️ Tools: ${event.tools.join(', ')}\n`);
                }
                break;

            case 'text':
                if (event.text) {
                    this.sendOutput(event.text, true, event.isStreaming, true);
                }
                break;

            case 'thinking':
                // Note: The "🧠 Reasoning:" header is added in block_start
                if (event.text) {
                    this.sendOutput(event.text, true, event.isStreaming, true);
                }
                break;

            case 'tool_start': {
                const toolIcon = ToolOutputFormatter.getToolIcon(event.toolName || 'unknown');
                this.sendOutput(`\n${toolIcon} Using tool: ${event.toolName}\n`);
                if (event.toolInput) {
                    const inputStr = JSON.stringify(event.toolInput, null, 2);
                    if (inputStr.length < 500) {
                        this.sendOutput(`   Input: ${inputStr}\n`);
                    }
                }
                break;
            }

            case 'tool_result': {
                // Output "Using tool" first for UI tracking (agent activity parser)
                const resultToolIcon = ToolOutputFormatter.getToolIcon(event.toolName || 'unknown');
                this.sendOutput(`\n${resultToolIcon} Using tool: ${event.toolName}\n`);
                if (event.toolInput) {
                    const inputStr = JSON.stringify(event.toolInput, null, 2);
                    if (inputStr.length < 500) {
                        this.sendOutput(`   Input: ${inputStr}\n`);
                    }
                }
                // Then output the completion
                this.sendOutput(`✓ ${event.toolName} completed\n`);
                if (event.toolOutput) {
                    const outputStr = String(event.toolOutput);
                    if (outputStr.length < 500) {
                        this.sendOutput(`   Output: ${outputStr.substring(0, 200)}${outputStr.length > 200 ? '...' : ''}\n`);
                    } else {
                        this.sendOutput(`   Output: (${outputStr.length} chars)\n`);
                    }
                }
                break;
            }

            case 'step_complete':
                // Signal end of streaming for Result section
                this.sendOutput(`\n`, false, 'finish', true);

                if (event.tokens) {
                    this.sendOutput(`\n📊 Tokens: ${event.tokens.input} in, ${event.tokens.output} out`);
                    if (event.tokens.cached) {
                        this.sendOutput(` (${event.tokens.cached} cached)`);
                    }
                    this.sendOutput(`\n`);
                }
                if (event.cost !== undefined && event.cost > 0) {
                    this.sendOutput(`💰 Cost: $${event.cost.toFixed(4)}\n`);
                }
                if (event.durationMs) {
                    this.sendOutput(`⏱️ Duration: ${event.durationMs}ms\n`);
                }
                break;

            case 'error':
                this.sendOutput(`\n❌ Error: ${event.errorMessage || 'Unknown error'}\n`);
                break;

            case 'block_start':
                // Add separator before new text blocks (except the first one)
                if (event.blockType === 'text') {
                    if (this.hasSeenTextBlock) {
                        // Add a visual separator between text blocks
                        this.sendOutput(`\n\n---\n\n`, false, false, true);
                    }
                    this.hasSeenTextBlock = true;
                } else if (event.blockType === 'thinking') {
                    this.sendOutput(`\n🧠 **Reasoning:**\n`, false, false);
                }
                break;

            case 'block_end':
                // Signal end of streaming for the current block
                this.sendOutput(`\n`, false, 'finish', true);
                break;
        }
    }

    /**
     * Send output to callback
     */
    private sendOutput(text: string, isMarkdown: boolean = false, isStreaming?: boolean | string, isAssistantMessage?: boolean): void {
        if (this.outputCallback) {
            this.outputCallback(text, isMarkdown, isStreaming, isAssistantMessage);
        }
    }

}
