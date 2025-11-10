/**
 * Claude Code View - Refactored to use modular components
 */

import { ItemView, WorkspaceLeaf, MarkdownView, Notice, TFile } from 'obsidian';
import ClaudeCodePlugin from '../main';
import { ClaudeCodeRunner, ClaudeCodeRequest, ClaudeCodeResponse } from '../core/claude-code-runner';
import { VIEW_TYPE_CLAUDE_CODE, SessionHistoryItem, AgentStep, NoteContext } from '../core/types';
import { UIBuilder } from './ui-builder';
import { OutputRenderer } from './output-renderer';
import { AgentActivityTracker } from './agent-activity-tracker';
import { NoteContextManager } from '../managers/note-context-manager';
import { OutputStatusManager } from './parsers/output-status-manager';
import { DiffGenerator } from './renderers/diff-generator';

export class ClaudeCodeView extends ItemView {
    plugin: ClaudeCodePlugin;

    // UI Elements (references)
    private promptInput: HTMLTextAreaElement;
    private runButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    private outputArea: HTMLDivElement;
    private outputSection: HTMLDivElement;
    private resultArea: HTMLDivElement;
    private currentResultStreamingElement: HTMLElement | null = null;
    private hitFinalContentMarker: boolean = false;
    private previewArea: HTMLDivElement;
    private previewContentContainer: HTMLDivElement;
    private previewTabsContainer: HTMLDivElement;
    private applyButton: HTMLButtonElement;
    private rejectButton: HTMLButtonElement;
    private selectedTextOnlyCheckbox: HTMLInputElement;
    private autoAcceptCheckbox: HTMLInputElement;
    private modelSelect: HTMLSelectElement;
    private currentNoteLabel: HTMLElement;
    private statusIndicator: HTMLElement;
    private statusText: HTMLSpanElement;
    private interactivePromptSection: HTMLElement;
    private permissionApprovalSection: HTMLElement;
    private approvePermissionButton: HTMLButtonElement;
    private denyPermissionButton: HTMLButtonElement;
    private historyList: HTMLUListElement;

    // Managers and Renderers
    private contextManager: NoteContextManager;
    private outputRenderer: OutputRenderer;
    private agentTracker: AgentActivityTracker;

    // State
    private currentNotePath: string = '';
    private isProcessing: boolean = false;

    // Tool timing tracking
    private toolStartTimes: Map<string, number> = new Map();
    private lastToolKey: string | null = null;

    // Execution timing tracking
    private executionStartTime: number = 0;
    private elapsedTimeInterval: NodeJS.Timeout | null = null;
    private baseStatusMessage: string = '';

    // Event listener cleanup tracking
    private eventListeners: Array<{
        element: HTMLElement | Window;
        event: string;
        handler: EventListener;
    }> = [];
    private promptInputKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ClaudeCodePlugin) {
        super(leaf);
        this.plugin = plugin;

        // Initialize managers
        this.contextManager = new NoteContextManager(
            this.plugin.settings,
            '.obsidian/claude-code-sessions'
        );
        this.agentTracker = new AgentActivityTracker();

        // Listen for active file changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.onActiveNoteChange();
            })
        );
    }

    getViewType(): string {
        return VIEW_TYPE_CLAUDE_CODE;
    }

    getDisplayText(): string {
        return 'Claude Code';
    }

    getIcon(): string {
        return 'bot';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('claude-code-view');

        // Load persisted contexts from disk
        const vaultPath = (this.app.vault.adapter as any).basePath;
        if (vaultPath) {
            await this.contextManager.loadContexts(vaultPath);
        }

        // Get current active note
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            this.currentNotePath = activeFile.path;
        }

        // Build UI using modular components
        this.buildUI(container);

        // Initialize output renderer now that outputArea exists
        this.outputRenderer = new OutputRenderer(this.outputArea, this, this.currentNotePath, this.outputSection);

        // Load context for current note
        if (this.currentNotePath) {
            this.loadNoteContext(this.currentNotePath);
        }
    }

    /**
     * Build the entire UI using modular components
     */
    private buildUI(container: HTMLElement): void {
        // Header
        this.currentNoteLabel = UIBuilder.buildHeader(container);
        this.updateCurrentNoteLabel();

        // Input section
        const inputElements = UIBuilder.buildInputSection(
            container,
            this.plugin.settings.autoAcceptChanges,
            () => this.handleRunClaudeCode(),
            () => this.handleCancel()
        );
        this.promptInput = inputElements.promptInput;
        this.selectedTextOnlyCheckbox = inputElements.selectedTextOnlyCheckbox;
        this.autoAcceptCheckbox = inputElements.autoAcceptCheckbox;
        this.modelSelect = inputElements.modelSelect;
        this.runButton = inputElements.runButton;
        this.cancelButton = inputElements.cancelButton;
        // Note: statusIndicator and statusText are now part of Result section (see below)

        // Save model selection when changed
        this.modelSelect.addEventListener('change', () => {
            const context = this.getCurrentContext();
            context.selectedModel = this.modelSelect.value;
        });

        // Add keyboard shortcut to prompt input
        this.promptInputKeydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.handleRunClaudeCode();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const start = this.promptInput.selectionStart ?? 0;
                const end = this.promptInput.selectionEnd ?? 0;
                const value = this.promptInput.value;
                this.promptInput.value = value.substring(0, start) + '\n' + value.substring(end);
                this.promptInput.selectionStart = this.promptInput.selectionEnd = start + 1;
            }
        };
        this.promptInput.addEventListener('keydown', this.promptInputKeydownHandler);

        // Interactive prompt section
        this.interactivePromptSection = UIBuilder.buildInteractivePromptSection(
            container,
            (response) => this.respondToPrompt(response)
        );

        // Result section (first) - includes status indicator
        const resultElements = UIBuilder.buildResultSection(container);
        this.resultArea = resultElements.resultArea;
        this.statusIndicator = resultElements.statusArea;
        this.statusText = resultElements.statusText;

        // Permission approval section (after result)
        const permissionElements = UIBuilder.buildPermissionApprovalSection(
            container,
            () => this.handleApprovePermission(),
            () => this.handleDenyPermission()
        );
        this.permissionApprovalSection = permissionElements.permissionApprovalSection;
        this.approvePermissionButton = permissionElements.approvePermissionButton;
        this.denyPermissionButton = permissionElements.denyPermissionButton;

        // Preview section (second - after result)
        const previewElements = UIBuilder.buildPreviewSection(
            container,
            () => this.handleApplyChanges(),
            () => this.handleRejectChanges()
        );
        this.previewArea = previewElements.previewArea;
        this.previewContentContainer = previewElements.previewContentContainer;
        this.previewTabsContainer = previewElements.previewTabsContainer;
        this.applyButton = previewElements.applyButton;
        this.rejectButton = previewElements.rejectButton;

        // Combined agent section (plan + activity) (third)
        UIBuilder.buildAgentSection(container);

        // Initialize agent tracker with the activity column
        const activityColumn = container.querySelector('.claude-code-activity-column');
        if (activityColumn) {
            this.agentTracker.initialize(activityColumn as HTMLElement);
        }

        // Output section (fourth)
        const outputSectionResult = UIBuilder.buildOutputSection(container);
        this.outputArea = outputSectionResult.outputArea;
        this.outputSection = outputSectionResult.outputSection;

        // History section (fifth)
        this.historyList = UIBuilder.buildHistorySection(
            container,
            () => this.clearHistory()
        );
    }

    /**
     * Update the current note label
     */
    private updateCurrentNoteLabel(): void {
        if (this.currentNotePath) {
            const fileName = this.currentNotePath.split('/').pop() || 'Unknown';
            this.currentNoteLabel.textContent = `📝 ${fileName}`;
        } else {
            this.currentNoteLabel.textContent = '📝 No note selected';
        }
    }

    /**
     * Handle active note change
     */
    private onActiveNoteChange(): void {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.path !== this.currentNotePath) {
            this.currentNotePath = activeFile.path;
            this.updateCurrentNoteLabel();
            this.loadNoteContext(this.currentNotePath);
        }
    }

    /**
     * Load context for a specific note
     */
    private loadNoteContext(notePath: string): void {
        const context = this.contextManager.getContext(notePath);

        // Update output renderer with new note path
        this.outputRenderer?.setNotePath(notePath);

        // Restore output
        this.outputRenderer?.clear();
        for (const line of context.outputLines) {
            this.outputRenderer?.appendLine(line);
        }

        // Restore agent activity
        this.agentTracker.restore(context.agentSteps);

        // Restore todos from output
        console.log('[Load Note Context] Output lines count:', context.outputLines.length);
        console.log('[Load Note Context] Agent steps count:', context.agentSteps.length);

        if (context.outputLines.length > 0) {
            // Try to parse todos from the restored output
            this.parseTodosFromOutput();
        } else {
            // No output, clear the todo list
            console.log('[Load Note Context] Clearing todo list - no output');
            this.clearTodoList();
        }

        // Update history
        this.updateHistoryDisplay(context.history);

        // Restore model selection
        if (context.selectedModel !== undefined) {
            this.modelSelect.value = context.selectedModel;
        } else {
            this.modelSelect.value = this.plugin.settings.modelAlias;
        }

        // Clear result section if there's no current response
        if (!context.currentResponse || !context.currentResponse.assistantMessage) {
            this.hideResult();
        } else {
            // Restore result if exists
            this.showResult(context.currentResponse.assistantMessage);
        }

        // Hide preview section (will be shown if user clicks on result)
        this.hidePreview();
    }

    /**
     * Get current note's context
     */
    private getCurrentContext(): NoteContext {
        return this.contextManager.getContext(this.currentNotePath);
    }

    /**
     * Handle Run Claude Code button click
     */
    private async handleRunClaudeCode(): Promise<void> {
        // Prevent concurrent runs
        if (this.isProcessing) {
            new Notice('Already processing a request. Please wait.');
            return;
        }

        const prompt = this.promptInput.value.trim();
        if (!prompt) {
            new Notice('Please enter a prompt');
            return;
        }

        this.isProcessing = true;

        try {
            // Clear the prompt input
            this.promptInput.value = '';

            // Get active file
            const file = this.app.workspace.getActiveFile();
            if (!file) {
                new Notice('No active note found. Please open a markdown note first.');
                return;
            }

            // Find the leaf that contains this file
            const leaves = this.app.workspace.getLeavesOfType('markdown');
            let activeView: MarkdownView | null = null;

            // Try to find the leaf with the active file
            for (const leaf of leaves) {
                const view = leaf.view as MarkdownView;
                if (view.file && view.file.path === file.path) {
                    activeView = view;
                    break;
                }
            }

            // Fallback: just use the first markdown view if we couldn't match by file
            if (!activeView && leaves.length > 0) {
                activeView = leaves[0].view as MarkdownView;
            }

            if (!activeView || !activeView.editor) {
                new Notice('No markdown editor found. Please make sure you have a note open.');
                return;
            }

            const editor = activeView.editor;
            const selectedText = editor.getSelection();
            const useSelectedTextOnly = this.selectedTextOnlyCheckbox.checked && selectedText;
            const noteContent = editor.getValue();

            // Get vault path
            const vaultPath = (this.app.vault.adapter as any).basePath;
            if (!vaultPath) {
                new Notice('Could not determine vault path');
                return;
            }

            // Get context
            const context = this.getCurrentContext();

            // Prepare request
            context.currentRequest = {
            noteContent,
            userPrompt: prompt,
            notePath: file.path,
            selectedText: useSelectedTextOnly ? selectedText : undefined,
            vaultPath: vaultPath,
            runtimeModelOverride: this.modelSelect.value || undefined
            };

            // Update UI
            this.runButton.disabled = true;
            this.runButton.textContent = 'Running...';
            this.cancelButton.style.display = 'inline-block';
            context.outputLines = [];
            this.outputRenderer.clear();
            this.agentTracker.clear();
            this.clearTodoList();
            this.hidePreview();
            this.hideResult();

            // Clear result area for new streaming messages
            this.resultArea.empty();
            this.currentResultStreamingElement = null;
            this.hitFinalContentMarker = false;

            // Show initial status with elapsed time tracking
            this.showStatus('🤔 Claude is processing... 0.0s');
            this.startElapsedTimeTracking('🤔 Claude is processing');

            // Capture the note path for this specific run
            const runNotePath = file.path;

            // Run Claude Code
            context.isRunning = true;
            const response = await context.runner.run(
            context.currentRequest,
            (line: string, isMarkdown?: boolean, isStreaming?: boolean | string, isAssistantMessage?: boolean) => {
                // Append output to the SPECIFIC note context that started this run
                this.appendOutputToNote(runNotePath, line, isMarkdown, isStreaming, isAssistantMessage);

                // Only update status if this is still the active note
                if (this.currentNotePath === runNotePath) {
                    this.updateStatusFromOutput(line);
                }
            }
            );

            context.isRunning = false;
            context.currentResponse = response;

            // Hide status
            this.hideStatus();

            // Update UI
            this.runButton.disabled = false;
            this.runButton.textContent = 'Run Claude Code';
            this.cancelButton.style.display = 'none';

            // Handle response
            if (response.success) {
            // Add to history
            context.history.push({
                prompt: prompt,
                timestamp: new Date(),
                success: true,
                notePath: file.path,
                response: response,
                request: context.currentRequest,
                outputLines: context.outputLines
            });

            this.updateHistoryDisplay(context.history);

            // Save context with error handling
            try {
                await this.contextManager.saveContext(file.path, vaultPath);
            } catch (error) {
                console.error('Failed to save context:', error);
            }

            // Show preview or auto-apply
            if (response.modifiedContent && response.modifiedContent.trim()) {
                if (this.autoAcceptCheckbox.checked) {
                    // Only update UI if this is still the active note
                    if (this.currentNotePath === runNotePath) {
                        this.showStatus('✅ Auto-applying changes...');
                    }
                    this.applyChangesToEditor(response.modifiedContent, editor);
                    // Hide status after auto-applying
                    if (this.currentNotePath === runNotePath) {
                        this.hideStatus();
                    }
                    new Notice('✓ Changes applied automatically');
                } else {
                    this.showPreview(response.modifiedContent);
                }
            } else {
                // Check if this is a permission request
                if (response.isPermissionRequest) {
                    // Show permission approval UI
                    this.showPermissionApprovalSection();
                    // Show the request in the result panel (only if not already streamed)
                    const resultSection = document.getElementById('claude-code-result-section');
                    const hasStreamedContent = resultSection && resultSection.style.display === 'block' && this.resultArea.children.length > 0;

                    if (!hasStreamedContent && response.assistantMessage && response.assistantMessage.trim()) {
                        this.showResult(response.assistantMessage);
                    }
                    new Notice('⚠️ Claude is requesting permission - please approve or deny');
                } else {
                    // No file changes - show result panel with Claude's response
                    // Only call showResult if we haven't been streaming (streaming already rendered the result)
                    const resultSection = document.getElementById('claude-code-result-section');
                    const hasStreamedContent = resultSection && resultSection.style.display === 'block' && this.resultArea.children.length > 0;

                    if (!hasStreamedContent && response.assistantMessage && response.assistantMessage.trim()) {
                        this.showResult(response.assistantMessage);
                        new Notice('✓ Claude Code completed');
                    } else if (hasStreamedContent) {
                        // Result was already streamed, just show notice
                        new Notice('✓ Claude Code completed');
                    } else {
                        new Notice('✓ Claude Code completed (no file changes)');
                    }
                }
            }
            } else {
            // Only update UI if this is still the active note
            if (this.currentNotePath === runNotePath) {
                this.showErrorStatus('❌ Failed - see error below');
            }
            new Notice(`✗ ${response.error || 'Unknown error'}`);
            context.history.push({
                prompt: prompt,
                timestamp: new Date(),
                success: false,
                notePath: file.path,
                response: response,
                request: context.currentRequest
            });
            this.updateHistoryDisplay(context.history);
            }
        } finally {
            // Always reset processing flag
            this.isProcessing = false;
        }
    }

    /**
     * Append output to a specific note's context
     */
    private appendOutputToNote(notePath: string, text: string, isMarkdown: boolean = false, isStreaming: boolean | string = false, isAssistantMessage: boolean = false): void {
        const context = this.contextManager.getContext(notePath);
        context.outputLines.push(text);

        // Only display if this is the current note
        if (notePath === this.currentNotePath) {
            // Handle streaming text accumulation
            if (isStreaming === true) {
                this.outputRenderer.appendStreamingText(text);

                // Also append to Result section if it's an assistant message
                console.log('[Append Output] isStreaming=true, isAssistantMessage=', isAssistantMessage);
                if (isAssistantMessage) {
                    this.appendToResult(text);
                }

                return; // Don't process agent activity for partial text
            } else if (isStreaming === 'finish') {
                this.outputRenderer.finishStreamingBlock();

                // Also finish result streaming if there's an active stream
                if (isAssistantMessage) {
                    this.finishResultStreaming();
                }

                // Fall through to process the newline normally
            } else if (isAssistantMessage && !isStreaming) {
                // Handle non-streaming assistant messages (e.g., from assistant events)
                // Only add if we haven't been streaming (avoid duplicates)
                const hasStreamingContent = this.currentResultStreamingElement !== null ||
                                          (this.resultArea && this.resultArea.children.length > 0);

                if (!hasStreamingContent) {
                    console.log('[Append Output] Non-streaming assistant message, adding to result');
                    this.showResultMarkdown(text);
                } else {
                    console.log('[Append Output] Non-streaming assistant message, but already have streaming content - skipping');
                }
                // Fall through to also add to output
            }

            this.outputRenderer.appendLine(text, isMarkdown);

            // Parse and track agent activity with timing
            const agentStep = OutputRenderer.parseAgentActivity(text);
            if (agentStep) {
                // Detect if this is a tool start
                if (this.isToolStart(text)) {
                    // Store start time and remember this tool's key
                    const now = Date.now();
                    this.toolStartTimes.set(agentStep.key, now);
                    this.lastToolKey = agentStep.key;
                    agentStep.startTime = now;
                }
                // Detect if this is a tool completion
                else if (this.isToolComplete(text)) {
                    // Match to the last started tool
                    if (this.lastToolKey && this.toolStartTimes.has(this.lastToolKey)) {
                        const startTime = this.toolStartTimes.get(this.lastToolKey)!;
                        const duration = Date.now() - startTime;

                        // Update the original step with duration
                        this.agentTracker.addStep({
                            ...agentStep,
                            key: this.lastToolKey,
                            duration: duration
                        });

                        this.toolStartTimes.delete(this.lastToolKey);
                        this.lastToolKey = null;
                        context.agentSteps.push(agentStep);
                        return; // Skip the normal addStep below since we already called it
                    }
                }

                context.agentSteps.push(agentStep);
                this.agentTracker.addStep(agentStep);
            }
        }
    }

    /**
     * Check if output line indicates a tool is starting
     */
    private isToolStart(text: string): boolean {
        return text.includes('🔧 Using tool:') ||
               text.includes('$ ') ||
               text.includes('🔍 Glob searching:') ||
               text.includes('🔎 Grep searching:') ||
               text.includes('📖 Reading file:') ||
               text.includes('✍️  Writing file:') ||
               text.includes('✏️  Editing file:') ||
               text.includes('🌐 Fetching webpage:') ||
               text.includes('🔍 Web searching:') ||
               text.includes('🤖 Launching agent:');
    }

    /**
     * Check if output line indicates a tool completed
     */
    private isToolComplete(text: string): boolean {
        // Match specific tool completion patterns from stream-event-processor.ts
        return text.includes('✓ Found') ||           // Glob/Grep results
               text.includes('✓ Output') ||          // Bash output
               text.includes('complete') ||          // Generic completion
               text.includes('📥 Tool result');      // Tool result event
    }

    /**
     * Update status based on output line
     */
    private updateStatusFromOutput(line: string): void {
        const status = OutputStatusManager.extractStatus(line);
        if (status) {
            this.showStatus(status);
        }

        // Detect TodoWrite tool usage (with or without emoji)
        if (line.includes('Using tool: TodoWrite') || line.includes('🔧 Using tool: TodoWrite')) {
            // Schedule parsing after a short delay to ensure all output is captured
            setTimeout(() => this.parseTodosFromOutput(), 100);
        }
    }

    /**
     * Parse todos from the output lines
     */
    private parseTodosFromOutput(): void {
        const context = this.getCurrentContext();

        console.log('[Parse Todos] Total output lines:', context.outputLines.length);

        // Find ALL TodoWrite tool usage lines
        const todoWriteIndices: number[] = [];
        context.outputLines.forEach((line, index) => {
            if (line.includes('Using tool: TodoWrite')) {
                todoWriteIndices.push(index);
            }
        });

        console.log('[Parse Todos] Found TodoWrite at indices:', todoWriteIndices);

        if (todoWriteIndices.length === 0) {
            console.log('[Parse Todos] No TodoWrite found in output lines');
            return;
        }

        // Use the LAST TodoWrite (most recent update)
        const lastTodoWriteIndex = todoWriteIndices[todoWriteIndices.length - 1];

        console.log('[Parse Todos] Using last TodoWrite at index:', lastTodoWriteIndex);

        if (lastTodoWriteIndex + 1 < context.outputLines.length) {
            // The next line after "Using tool: TodoWrite" should contain the JSON
            const jsonLine = context.outputLines[lastTodoWriteIndex + 1];

            console.log('[Parse Todos] JSON line length:', jsonLine.length);
            console.log('[Parse Todos] JSON line preview:', jsonLine.substring(0, 300));

            try {
                // The JSON is the entire line, just trim whitespace
                const jsonStr = jsonLine.trim();

                console.log('[Parse Todos] Trimmed JSON length:', jsonStr.length);
                console.log('[Parse Todos] First char:', jsonStr[0], 'Last char:', jsonStr[jsonStr.length - 1]);

                const toolInput = JSON.parse(jsonStr);

                if (toolInput.todos && Array.isArray(toolInput.todos)) {
                    console.log('[Parse Todos] Found todos count:', toolInput.todos.length);
                    console.log('[Parse Todos] Todos:', JSON.stringify(toolInput.todos, null, 2));
                    this.updateTodoList(toolInput.todos);
                } else {
                    console.log('[Parse Todos] No todos array found in parsed JSON');
                    console.log('[Parse Todos] Parsed object keys:', Object.keys(toolInput));
                }
            } catch (error) {
                console.error('[Parse Todos] Failed to parse todos JSON:', error);
                console.error('[Parse Todos] Error details:', error instanceof Error ? error.message : error);
                // Try to show where the JSON is breaking
                const jsonStr = jsonLine.trim();
                console.error('[Parse Todos] Full JSON string:', jsonStr);
            }
        }
    }

    /**
     * Show status indicator
     */
    private showStatus(message: string): void {
        // Show Result section
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.style.display = 'block';
        }

        // Show status area, hide result area
        this.statusIndicator.style.display = 'flex';
        this.resultArea.style.display = 'none';
        this.statusText.textContent = message;
    }

    /**
     * Show error status without progress bar animation
     */
    private showErrorStatus(message: string): void {
        this.stopElapsedTimeTracking();

        // Show Result section
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.style.display = 'block';
        }

        // Show status area, hide result area
        this.statusIndicator.style.display = 'flex';
        this.resultArea.style.display = 'none';
        this.statusText.textContent = message;
    }

    /**
     * Start elapsed time tracking
     */
    private startElapsedTimeTracking(baseMessage?: string): void {
        this.executionStartTime = Date.now();
        this.baseStatusMessage = baseMessage || '🤔 Claude is processing';

        // Update status every second with elapsed time
        this.elapsedTimeInterval = setInterval(() => {
            const elapsed = Date.now() - this.executionStartTime;
            const seconds = (elapsed / 1000).toFixed(1);
            this.statusText.textContent = `${this.baseStatusMessage}... ${seconds}s`;
        }, 100); // Update every 100ms for smooth display
    }

    /**
     * Stop elapsed time tracking
     */
    private stopElapsedTimeTracking(): void {
        if (this.elapsedTimeInterval) {
            clearInterval(this.elapsedTimeInterval);
            this.elapsedTimeInterval = null;
        }
    }

    /**
     * Hide status indicator
     */
    private hideStatus(): void {
        this.stopElapsedTimeTracking();
        this.statusIndicator.style.display = 'none';

        // If there's content in the result area, keep it and the section visible
        if (this.resultArea.children.length > 0) {
            this.resultArea.style.display = 'block';
            const resultSection = document.getElementById('claude-code-result-section');
            if (resultSection) {
                resultSection.style.display = 'block';
            }
        }
    }

    /**
     * Show preview of changes
     */
    private async showPreview(modifiedContent: string): Promise<void> {
        const previewSection = document.getElementById('claude-code-preview-section');
        if (previewSection) {
            previewSection.style.display = 'block';
        }

        this.previewArea.empty();

        // Remove old rendered and diff views if they exist
        const oldRendered = this.previewContentContainer.querySelector('.claude-code-preview-rendered');
        if (oldRendered) oldRendered.remove();
        const oldDiff = this.previewContentContainer.querySelector('.claude-code-preview-diff');
        if (oldDiff) oldDiff.remove();

        // Get original content
        const context = this.getCurrentContext();
        const originalContent = context.currentRequest?.selectedText || context.currentRequest?.noteContent || '';

        // Show character count comparison
        const statsDiv = this.previewArea.createEl('div', { cls: 'claude-code-preview-stats' });
        statsDiv.createEl('span', { text: `Original: ${originalContent.length} chars` });
        statsDiv.createEl('span', { text: ` → Modified: ${modifiedContent.length} chars` });
        statsDiv.createEl('span', { text: ` (${modifiedContent.length - originalContent.length >= 0 ? '+' : ''}${modifiedContent.length - originalContent.length})` });

        // Show the modified content in a code block (Raw tab)
        const previewContent = this.previewArea.createEl('pre', { cls: 'claude-code-preview-content' });
        previewContent.createEl('code', { text: modifiedContent });

        // Create diff view
        const diffArea = this.previewContentContainer.createEl('div', {
            cls: 'claude-code-preview-diff'
        });
        diffArea.style.display = 'none';
        diffArea.innerHTML = this.generateDiff(originalContent, modifiedContent);

        // Create rendered markdown view
        const renderedArea = this.previewContentContainer.createEl('div', {
            cls: 'claude-code-preview-rendered'
        });
        renderedArea.style.display = 'none';

        // Render the markdown
        const { MarkdownRenderer } = require('obsidian');
        MarkdownRenderer.renderMarkdown(
            modifiedContent,
            renderedArea,
            this.currentNotePath,
            this
        );
    }

    /**
     * Hide preview
     */
    private hidePreview(): void {
        const previewSection = document.getElementById('claude-code-preview-section');
        if (previewSection) {
            previewSection.style.display = 'none';
        }
    }

    /**
     * Append text to result panel (for streaming assistant messages)
     */
    private appendToResult(text: string): void {
        console.log('[Append To Result] Called with text:', text.substring(0, 50));

        // If we've already hit the FINAL-CONTENT marker, ignore all subsequent chunks
        if (this.hitFinalContentMarker) {
            console.log('[Append To Result] Already hit FINAL-CONTENT marker flag, ignoring chunk');
            return;
        }

        // Show the result section if not already visible
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            console.log('[Append To Result] Showing result section');
            resultSection.style.display = 'block';
        }

        // Hide status area, show result area
        this.statusIndicator.style.display = 'none';
        this.resultArea.style.display = 'block';

        // Create streaming element if needed (with markdown-rendered class)
        if (!this.currentResultStreamingElement) {
            console.log('[Append To Result] Creating streaming element');
            this.currentResultStreamingElement = this.resultArea.createEl('div', {
                cls: 'claude-code-result-streaming markdown-rendered'
            });
        }

        // Check if we've already encountered FINAL-CONTENT marker in the existing text
        const currentText = this.currentResultStreamingElement.textContent || '';
        if (currentText.includes('---FINAL-CONTENT---')) {
            console.log('[Append To Result] Found FINAL-CONTENT in existing text, cleaning up and setting flag');
            this.cleanupFinalContentFromStream();
            this.hitFinalContentMarker = true;
            return;
        }

        // Check if this chunk would introduce the FINAL-CONTENT marker
        const combinedText = currentText + text;
        if (combinedText.includes('---FINAL-CONTENT---')) {
            // Find how much of this chunk we can add before the marker
            const finalContentIndex = combinedText.indexOf('---FINAL-CONTENT---');
            const textBeforeMarker = combinedText.substring(currentText.length, finalContentIndex);

            if (textBeforeMarker.length > 0) {
                // Add only the text before the marker
                console.log('[Append To Result] Chunk contains FINAL-CONTENT, adding only text before marker');
                this.currentResultStreamingElement.createEl('span', {
                    cls: 'streaming-text-chunk',
                    text: textBeforeMarker
                });
            }

            console.log('[Append To Result] Hit FINAL-CONTENT marker, cleaning up and setting flag');
            this.cleanupFinalContentFromStream();
            this.hitFinalContentMarker = true;
            return;
        }

        // Normal case: add the full chunk
        const textSpan = this.currentResultStreamingElement.createEl('span', {
            cls: 'streaming-text-chunk',
            text: text
        });

        console.log('[Append To Result] Appended chunk, total children:', this.currentResultStreamingElement.children.length);

        // Auto-scroll to bottom
        this.resultArea.scrollTop = this.resultArea.scrollHeight;
    }

    /**
     * Clean up FINAL-CONTENT marker and everything after it from the streaming element
     */
    private cleanupFinalContentFromStream(): void {
        if (!this.currentResultStreamingElement) return;

        const fullText = this.currentResultStreamingElement.textContent || '';
        const finalContentIndex = fullText.indexOf('---FINAL-CONTENT---');

        if (finalContentIndex === -1) return; // No marker found

        console.log('[Cleanup FINAL-CONTENT] Removing marker and content after it');

        // Get the text we want to keep (before the marker)
        const textToKeep = fullText.substring(0, finalContentIndex).trim();

        // Clear all current content
        this.currentResultStreamingElement.empty();

        // Re-add only the text before the marker as a single chunk
        this.currentResultStreamingElement.createEl('span', {
            cls: 'streaming-text-chunk',
            text: textToKeep
        });

        console.log('[Cleanup FINAL-CONTENT] Cleaned up, kept text length:', textToKeep.length);
    }

    /**
     * Show markdown content in result section (for non-streaming assistant messages)
     */
    private showResultMarkdown(text: string): void {
        console.log('[Show Result Markdown] Called with text length:', text.length);

        // Filter out FINAL-CONTENT and everything after it
        let filteredText = text;
        const finalContentIndex = text.indexOf('---FINAL-CONTENT---');
        if (finalContentIndex !== -1) {
            filteredText = text.substring(0, finalContentIndex).trim();
            console.log('[Show Result Markdown] Filtered FINAL-CONTENT, new length:', filteredText.length);
        }

        // Show the result section
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.style.display = 'block';
        }

        // Hide status area, show result area
        this.statusIndicator.style.display = 'none';
        this.resultArea.style.display = 'block';

        // Create a new div for this markdown content
        const contentDiv = this.resultArea.createEl('div', {
            cls: 'markdown-rendered'
        });

        // Render as markdown
        const { MarkdownRenderer } = require('obsidian');
        try {
            MarkdownRenderer.renderMarkdown(
                filteredText,
                contentDiv,
                this.currentNotePath,
                this
            );
        } catch (e) {
            console.error('[Show Result Markdown] Render error:', e);
            contentDiv.textContent = filteredText;
        }

        // Auto-scroll to bottom
        this.resultArea.scrollTop = this.resultArea.scrollHeight;
    }

    /**
     * Finish the streaming result block
     */
    private finishResultStreaming(): void {
        if (this.currentResultStreamingElement) {
            // Render the accumulated text as markdown
            let fullText = this.currentResultStreamingElement.textContent || '';
            console.log('[Finish Result Streaming] Full text length:', fullText.length);
            console.log('[Finish Result Streaming] First 100 chars:', fullText.substring(0, 100));
            console.log('[Finish Result Streaming] Last 100 chars:', fullText.substring(fullText.length - 100));

            // Remove everything after and including ---FINAL-CONTENT---
            const finalContentIndex = fullText.indexOf('---FINAL-CONTENT---');
            console.log('[Finish Result Streaming] FINAL-CONTENT index:', finalContentIndex);
            if (finalContentIndex !== -1) {
                fullText = fullText.substring(0, finalContentIndex).trim();
                console.log('[Finish Result Streaming] After filtering, length:', fullText.length);
            }

            // Clear the streaming element and re-render as markdown
            this.currentResultStreamingElement.empty();
            this.currentResultStreamingElement.removeClass('claude-code-result-streaming');
            this.currentResultStreamingElement.addClass('markdown-rendered');

            const { MarkdownRenderer } = require('obsidian');
            try {
                MarkdownRenderer.renderMarkdown(
                    fullText,
                    this.currentResultStreamingElement,
                    this.currentNotePath,
                    this
                );
            } catch (e) {
                console.error('[Result Markdown Render Error]', e);
                this.currentResultStreamingElement.textContent = fullText;
            }

            this.currentResultStreamingElement = null;
        }
    }

    /**
     * Show result panel with Claude's response
     */
    private showResult(message: string): void {
        this.resultArea.empty();

        // Filter out FINAL-CONTENT and everything after it
        let filteredMessage = message;
        const finalContentIndex = message.indexOf('---FINAL-CONTENT---');
        if (finalContentIndex !== -1) {
            filteredMessage = message.substring(0, finalContentIndex).trim();
            console.log('[Show Result] Filtered FINAL-CONTENT, original length:', message.length, 'filtered length:', filteredMessage.length);
        }

        // Render as markdown
        const { MarkdownRenderer } = require('obsidian');
        MarkdownRenderer.renderMarkdown(
            filteredMessage,
            this.resultArea,
            this.currentNotePath,
            this
        );

        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.style.display = 'block';
        }

        // Hide status area, show result area
        this.statusIndicator.style.display = 'none';
        this.resultArea.style.display = 'block';
    }

    /**
     * Hide result panel
     */
    private hideResult(): void {
        // Hide the result area but don't hide the entire section if status is showing
        this.resultArea.style.display = 'none';
        this.resultArea.empty();

        // Only hide the entire section if status is also not visible
        if (this.statusIndicator.style.display === 'none') {
            const resultSection = document.getElementById('claude-code-result-section');
            if (resultSection) {
                resultSection.style.display = 'none';
            }
        }
    }

    /**
     * Show permission approval section
     */
    private showPermissionApprovalSection(): void {
        if (this.permissionApprovalSection) {
            this.permissionApprovalSection.style.display = 'block';
        }
    }

    /**
     * Hide permission approval section
     */
    private hidePermissionApprovalSection(): void {
        if (this.permissionApprovalSection) {
            this.permissionApprovalSection.style.display = 'none';
        }
    }

    /**
     * Handle approve permission button click
     */
    private async handleApprovePermission(): Promise<void> {
        const context = this.getCurrentContext();
        if (!context.currentRequest) {
            new Notice('No pending request found');
            return;
        }

        // Hide permission approval section
        this.hidePermissionApprovalSection();

        // Get active file
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('No active note found');
            return;
        }

        // Find markdown view
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        let activeView: MarkdownView | null = null;
        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            if (view.file && view.file.path === file.path) {
                activeView = view;
                break;
            }
        }

        if (!activeView || !activeView.editor) {
            new Notice('No markdown editor found');
            return;
        }

        const editor = activeView.editor;

        // Prepare a new prompt telling Claude to proceed with bypass permissions
        const approvalPrompt = "Yes, I approve. You have permissionless mode enabled - please proceed with the action you were asking about. Don't hesitate to execute it.";

        // Create a new request with bypass permissions enabled
        const newRequest: ClaudeCodeRequest = {
            ...context.currentRequest,
            userPrompt: approvalPrompt,
            bypassPermissions: true
        };

        // Update UI
        this.runButton.disabled = true;
        this.runButton.textContent = 'Running with permissions...';
        this.cancelButton.style.display = 'inline-block';
        this.outputRenderer.clear();
        this.hidePreview();
        this.hideResult();

        // Show status with elapsed time tracking
        this.showStatus('🔓 Running authorized tasks ... 0.0s');
        this.startElapsedTimeTracking('🔓 Running authorized tasks');

        // Capture the note path for this specific run
        const runNotePath = file.path;

        // Run Claude Code with bypass permissions
        context.isRunning = true;
        const response = await context.runner.run(
            newRequest,
            (line: string, isMarkdown?: boolean, isStreaming?: boolean | string, isAssistantMessage?: boolean) => {
                this.appendOutputToNote(runNotePath, line, isMarkdown, isStreaming, isAssistantMessage);
                if (this.currentNotePath === runNotePath) {
                    this.updateStatusFromOutput(line);
                }
            }
        );

        context.isRunning = false;
        context.currentResponse = response;

        // Hide status
        this.hideStatus();

        // Update UI
        this.runButton.disabled = false;
        this.runButton.textContent = 'Run Claude Code';
        this.cancelButton.style.display = 'none';

        // Handle response (same as regular run)
        if (response.success) {
            context.history.push({
                prompt: approvalPrompt,
                timestamp: new Date(),
                success: true,
                notePath: file.path,
                response: response,
                request: newRequest,
                outputLines: context.outputLines
            });

            this.updateHistoryDisplay(context.history);

            const vaultPath = (this.app.vault.adapter as any).basePath;
            await this.contextManager.saveContext(file.path, vaultPath);

            if (response.modifiedContent && response.modifiedContent.trim()) {
                if (this.autoAcceptCheckbox.checked) {
                    if (this.currentNotePath === runNotePath) {
                        this.showStatus('✅ Auto-applying changes...');
                    }
                    this.applyChangesToEditor(response.modifiedContent, editor);
                    if (this.currentNotePath === runNotePath) {
                        this.hideStatus();
                    }
                    new Notice('✓ Changes applied automatically');
                } else {
                    this.showPreview(response.modifiedContent);
                }
            } else {
                // Only call showResult if we haven't been streaming (streaming already rendered the result)
                const resultSection = document.getElementById('claude-code-result-section');
                const hasStreamedContent = resultSection && resultSection.style.display === 'block' && this.resultArea.children.length > 0;

                if (!hasStreamedContent && response.assistantMessage && response.assistantMessage.trim()) {
                    this.showResult(response.assistantMessage);
                    new Notice('✓ Claude Code completed');
                } else if (hasStreamedContent) {
                    // Result was already streamed, just show notice
                    new Notice('✓ Claude Code completed');
                } else {
                    new Notice('✓ Claude Code completed (no file changes)');
                }
            }
        } else {
            if (this.currentNotePath === runNotePath) {
                this.showErrorStatus('❌ Failed - see error below');
            }
            new Notice(`✗ Claude Code failed: ${response.error || 'Unknown error'}`);
        }
    }

    /**
     * Handle deny permission button click
     */
    private handleDenyPermission(): void {
        this.hidePermissionApprovalSection();
        new Notice('Permission denied - Claude will not proceed');
    }

    /**
     * Handle apply changes
     */
    private async handleApplyChanges(): Promise<void> {
        const context = this.getCurrentContext();

        if (!context.currentResponse?.modifiedContent) {
            new Notice('⚠ No changes to apply');
            console.error('[Apply Changes] No modified content found in context');
            return;
        }

        // Get the active file
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('⚠ No active file');
            console.error('[Apply Changes] No active file found');
            return;
        }

        // Find the markdown view for this file
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        let targetView: MarkdownView | null = null;

        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            if (view.file && view.file.path === file.path) {
                targetView = view;
                break;
            }
        }

        // Fallback: use first markdown view
        if (!targetView && leaves.length > 0) {
            targetView = leaves[0].view as MarkdownView;
        }

        if (!targetView || !targetView.editor) {
            new Notice('⚠ No markdown editor found');
            console.error('[Apply Changes] No markdown view or editor found');
            return;
        }

        try {
            this.applyChangesToEditor(context.currentResponse.modifiedContent, targetView.editor);
            this.hidePreview();
            new Notice('✓ Changes applied successfully');
        } catch (error) {
            new Notice('✗ Failed to apply changes');
            console.error('[Apply Changes] Error:', error);
        }
    }

    /**
     * Apply changes to editor
     */
    private applyChangesToEditor(content: string, editor: any): void {
        const context = this.getCurrentContext();
        const cursorBefore = editor.getCursor();

        // Check if we were editing selected text only
        if (context.currentRequest?.selectedText) {
            // Replace selected text only
            editor.replaceSelection(content);
        } else {
            // Replace entire note
            editor.setValue(content);
        }

        if (this.plugin.settings.preserveCursorPosition) {
            editor.setCursor(cursorBefore);
        }
    }

    /**
     * Handle reject changes
     */
    private handleRejectChanges(): void {
        this.hidePreview();
        new Notice('Changes rejected');
    }

    /**
     * Handle cancel
     */
    private handleCancel(): void {
        const context = this.getCurrentContext();
        context.runner.terminate();
        context.isRunning = false;
        this.runButton.disabled = false;
        this.runButton.textContent = 'Run Claude Code';
        this.cancelButton.style.display = 'none';
        this.hideStatus();
        new Notice('Cancelled');
    }

    /**
     * Respond to interactive prompt (placeholder for future use)
     */
    private respondToPrompt(response: string): void {
        // Future implementation for interactive Q&A
        console.log('Interactive response:', response);
    }

    /**
     * Generate diff HTML between original and modified content
     */
    private generateDiff(original: string, modified: string): string {
        return DiffGenerator.generateDiff(original, modified);
    }

    /**
     * Update history display
     */
    private updateHistoryDisplay(history: SessionHistoryItem[]): void {
        this.historyList.empty();

        if (history.length === 0) {
            return;
        }

        const historySection = document.getElementById('claude-code-history-section');
        if (historySection) {
            historySection.style.display = 'block';
        }

        for (const item of history.slice().reverse()) {
            const li = this.historyList.createEl('li');
            const icon = item.success ? '✓' : '✗';
            const time = new Date(item.timestamp).toLocaleTimeString();
            li.createEl('span', { text: `${icon} ${time}`, cls: 'history-time' });

            // Trim prompt to 100 characters
            const displayPrompt = item.prompt.length > 100
                ? item.prompt.substring(0, 100) + '...'
                : item.prompt;
            li.createEl('span', { text: displayPrompt, cls: 'history-prompt' });

            // Add click handler to restore from history
            li.addEventListener('click', () => this.restoreFromHistory(item));
            li.style.cursor = 'pointer';
        }
    }

    /**
     * Restore state from a history item
     */
    private restoreFromHistory(item: SessionHistoryItem): void {
        const context = this.getCurrentContext();

        // Restore prompt
        this.promptInput.value = item.prompt;

        // Restore output if available
        if (item.outputLines && item.outputLines.length > 0) {
            this.outputRenderer.clear();
            for (const line of item.outputLines) {
                this.outputRenderer.appendLine(line);
            }
        }

        // Restore response and request
        if (item.response) {
            context.currentResponse = item.response;
        }
        if (item.request) {
            context.currentRequest = item.request;
        }

        // Show preview if there's a successful response with content
        if (item.success && item.response?.modifiedContent) {
            this.showPreview(item.response.modifiedContent);
            new Notice('History item restored with proposed changes');
        } else {
            this.hidePreview();
            new Notice('History item restored');
        }
    }

    /**
     * Clear history
     */
    private clearHistory(): void {
        this.contextManager.clearHistory(this.currentNotePath);
        this.updateHistoryDisplay([]);
        const historySection = document.getElementById('claude-code-history-section');
        if (historySection) {
            historySection.style.display = 'none';
        }
        new Notice('History cleared');
    }

    /**
     * Clear the todo list display
     */
    private clearTodoList(): void {
        const planColumn = document.querySelector('.claude-code-plan-column') as HTMLElement;
        const todoList = document.getElementById('claude-code-todo-list');
        const emptyPlan = document.getElementById('claude-code-empty-plan');

        console.log('[Clear Todo List] Called');

        if (!todoList || !planColumn) {
            console.log('[Clear Todo List] Elements not found');
            return;
        }

        // Clear the list
        todoList.empty();

        // Hide empty message and list
        if (emptyPlan) {
            emptyPlan.style.display = 'none';
        }
        todoList.style.display = 'none';

        // Hide the PLAN COLUMN only
        planColumn.style.display = 'none';

        console.log('[Clear Todo List] Plan column hidden');
    }

    /**
     * Update Claude's todo list display
     */
    private updateTodoList(todos: Array<{content: string, status: string, activeForm: string}>): void {
        const agentContainer = document.getElementById('claude-code-agent-container');
        const planColumn = document.querySelector('.claude-code-plan-column') as HTMLElement;
        const todoList = document.getElementById('claude-code-todo-list');
        const emptyPlan = document.getElementById('claude-code-empty-plan');

        if (!agentContainer || !todoList || !planColumn) return;

        // Clear existing todos
        todoList.empty();

        if (todos.length === 0) {
            // Hide the plan column - no plan
            planColumn.style.display = 'none';
            if (emptyPlan) emptyPlan.style.display = 'none';
            todoList.style.display = 'none';

            // Hide the entire container only if there are no agent steps either
            const agentStepsContainer = document.getElementById('claude-code-agent-steps');
            if (agentStepsContainer && agentStepsContainer.children.length === 0) {
                agentContainer.removeClass('is-visible');
                agentContainer.addClass('is-hidden');
            }
        } else {
            // Show the agent container and plan column
            agentContainer.removeClass('is-hidden');
            agentContainer.addClass('is-visible');
            planColumn.style.display = 'flex';

            // Hide empty message and show todos
            if (emptyPlan) emptyPlan.style.display = 'none';
            todoList.style.display = 'flex';

            // Add each todo
            for (const todo of todos) {
                const todoItem = todoList.createEl('div', { cls: 'claude-code-todo-item' });

                // Status icon
                let icon = '⏳';
                let statusClass = 'pending';
                if (todo.status === 'in_progress') {
                    icon = '🔄';
                    statusClass = 'in-progress';
                } else if (todo.status === 'completed') {
                    icon = '✅';
                    statusClass = 'completed';
                }

                todoItem.createEl('span', {
                    cls: `claude-code-todo-icon ${statusClass}`,
                    text: icon
                });

                // Content
                const text = todo.status === 'in_progress' ? todo.activeForm : todo.content;
                todoItem.createEl('span', {
                    cls: 'claude-code-todo-content',
                    text: text
                });
            }
        }
    }

    /**
     * Update settings
     */
    updateSettings(): void {
        this.autoAcceptCheckbox.checked = this.plugin.settings.autoAcceptChanges;
        this.modelSelect.value = this.plugin.settings.modelAlias;
    }

    async onClose(): Promise<void> {
        // Clean up event listeners
        if (this.promptInputKeydownHandler) {
            this.promptInput.removeEventListener('keydown', this.promptInputKeydownHandler);
            this.promptInputKeydownHandler = null;
        }

        for (const { element, event, handler } of this.eventListeners) {
            element.removeEventListener(event, handler);
        }
        this.eventListeners = [];

        // Save all contexts
        const vaultPath = (this.app.vault.adapter as any).basePath;
        if (vaultPath) {
            try {
                await this.contextManager.saveAllContexts(vaultPath);
            } catch (error) {
                console.error('Failed to save contexts on close:', error);
            }
        }
    }
}
