/**
 * Claude Code View - Refactored to use modular components
 */

import { ItemView, WorkspaceLeaf, MarkdownView, Notice, MarkdownRenderer, Editor, FileSystemAdapter, TFile } from 'obsidian';
import ClaudeCodePlugin from '../main';
import { ClaudeCodeRequest } from '../core/claude-code-runner';
import { VIEW_TYPE_CLAUDE_CODE, SessionHistoryItem, NoteContext } from '../core/types';
import { UIBuilder } from './ui-builder';
import { t } from '../i18n';
import { getBackendDisplayName } from '../core/backends';
import { SessionManager } from '../core/session-manager';

/** Interface for streaming element with accumulated text */
interface StreamingElementData {
    accumulatedText: string;
    fullText?: string;
}

/** Interface for parsed tool input with todos */
interface TodoToolInput {
    todos?: Array<{ content: string; status: string; activeForm: string }>;
}
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
    private lastPromptArea: HTMLDivElement;
    private toolHistoryArea: HTMLDivElement;
    private currentResultStreamingElement: HTMLElement | null = null;
    private hitFinalContentMarker: boolean = false;
    private userHasScrolled: boolean = false;
    private lastRenderedText: string = ''; // Track what we've already rendered
    private resultBlockCount: number = 0; // Track number of result blocks for collapsing earlier ones
    private previewArea: HTMLDivElement;
    private previewContentContainer: HTMLDivElement;
    private selectedTextOnlyCheckbox: HTMLInputElement;
    private autoAcceptCheckbox: HTMLInputElement;
    private conversationalModeCheckbox: HTMLInputElement;
    private modelSelect: HTMLSelectElement;
    private currentNoteLabel: HTMLElement;
    private statusIndicator: HTMLElement;
    private statusText: HTMLSpanElement;
    private permissionApprovalSection: HTMLElement;
    private historyList: HTMLUListElement;
    private sessionsSection: HTMLDivElement;

    // Managers and Renderers
    private contextManager: NoteContextManager;
    private outputRenderer: OutputRenderer;
    private agentTracker: AgentActivityTracker;

    // State
    private currentNotePath: string = '';
    private currentBackend: string = '';

    // Tool timing tracking
    private toolStartTimes: Map<string, number> = new Map();
    private lastToolKey: string | null = null;

    // Tool history tracking (for displaying icons in Result section)
    private toolUsageHistory: Array<{ name: string; count: number }> = [];

    // Execution timing tracking (interval is view-level, but start time is per-note in context)
    private elapsedTimeInterval: NodeJS.Timeout | null = null;

    // Event listener cleanup tracking
    private eventListeners: Array<{
        element: HTMLElement | Window;
        event: string;
        handler: EventListener;
    }> = [];
    private promptInputKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

    // Tab state
    private currentTab: string = 'assistant';
    private sessionsRefreshInterval: NodeJS.Timeout | null = null;

    // Standalone session state
    private activeStandaloneSession: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ClaudeCodePlugin) {
        super(leaf);
        this.plugin = plugin;

        // Initialize managers
        this.contextManager = new NoteContextManager(
            this.plugin.settings,
            `${this.app.vault.configDir}/claude-code-sessions`
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
        return getBackendDisplayName(this.plugin.settings.backend);
    }

    getIcon(): string {
        return 'bot';
    }

    /**
     * Get the display name for the current backend
     */
    private getBackendName(): string {
        return getBackendDisplayName(this.plugin.settings.backend);
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('claude-code-view');

        // Load persisted contexts from disk
        const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
        if (vaultPath) {
            this.contextManager.loadContexts(vaultPath);
        }

        // Get current active note
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            this.currentNotePath = activeFile.path;
        }

        // Track current backend for detecting changes
        this.currentBackend = this.plugin.settings.backend;

        // Build UI using modular components
        this.buildUI(container);

        // Initialize output renderer now that outputArea exists
        this.outputRenderer = new OutputRenderer(this.outputArea, this, this.app, this.currentNotePath, this.outputSection);

        // Load context for current note
        if (this.currentNotePath) {
            this.loadNoteContext(this.currentNotePath);
        }
    }

    /**
     * Build the entire UI using modular components
     */
    private buildUI(container: HTMLElement): void {
        const backendName = this.getBackendName();

        // Header
        this.currentNoteLabel = UIBuilder.buildHeader(container, backendName, () => this.openPluginSettings());
        this.updateCurrentNoteLabel();

        // Tab navigation
        const tabBar = container.createEl('div', { cls: 'claude-code-tab-bar' });
        const assistantTab = tabBar.createEl('button', {
            cls: 'claude-code-tab active',
            text: '💬 ' + t('tabs.assistant')
        });
        assistantTab.dataset.tab = 'assistant';
        const sessionsTab = tabBar.createEl('button', {
            cls: 'claude-code-tab',
            text: '📁 ' + t('tabs.sessions')
        });
        sessionsTab.dataset.tab = 'sessions';

        // Tab content containers
        const tabContent = container.createEl('div', { cls: 'claude-code-tab-content' });

        // Assistant tab content (note-centric)
        const assistantContent = tabContent.createEl('div', {
            cls: 'claude-code-tab-pane active',
            attr: { 'data-tab': 'assistant' }
        });

        // Sessions tab content (global)
        const sessionsContent = tabContent.createEl('div', {
            cls: 'claude-code-tab-pane',
            attr: { 'data-tab': 'sessions' }
        });

        // Tab click handlers
        assistantTab.addEventListener('click', () => this.switchTab('assistant'));
        sessionsTab.addEventListener('click', () => this.switchTab('sessions'));

        // === Build Assistant Tab Content ===

        // Input section
        const inputElements = UIBuilder.buildInputSection(
            assistantContent,
            this.plugin.settings.autoAcceptChanges,
            () => void this.handleRunClaudeCode(),
            () => this.handleCancel(),
            backendName
        );
        this.promptInput = inputElements.promptInput;
        this.selectedTextOnlyCheckbox = inputElements.selectedTextOnlyCheckbox;
        this.autoAcceptCheckbox = inputElements.autoAcceptCheckbox;
        this.conversationalModeCheckbox = inputElements.conversationalModeCheckbox;
        this.modelSelect = inputElements.modelSelect;
        this.runButton = inputElements.runButton;
        this.cancelButton = inputElements.cancelButton;

        // When conversational mode is toggled, disable file-related options
        this.conversationalModeCheckbox.addEventListener('change', () => {
            const isConversational = this.conversationalModeCheckbox.checked;
            this.selectedTextOnlyCheckbox.disabled = isConversational;
            this.autoAcceptCheckbox.disabled = isConversational;
            if (isConversational) {
                this.selectedTextOnlyCheckbox.checked = false;
                this.autoAcceptCheckbox.checked = false;
            }
        });
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
                void this.handleRunClaudeCode();
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
         UIBuilder.buildInteractivePromptSection(
            assistantContent,
            (response) => this.respondToPrompt(response),
            backendName
        );

        // Result section (first) - includes status indicator
        const resultElements = UIBuilder.buildResultSection(assistantContent);
        this.resultArea = resultElements.resultArea;
        this.statusIndicator = resultElements.statusArea;
        this.statusText = resultElements.statusText;
        this.lastPromptArea = resultElements.lastPromptArea;
        this.toolHistoryArea = resultElements.toolHistoryArea;

        // Setup smart auto-scroll detection
        this.setupSmartAutoScroll();

        // Permission approval section (after result)
        const permissionElements = UIBuilder.buildPermissionApprovalSection(
            assistantContent,
            () => void this.handleApprovePermission(),
            () => this.handleDenyPermission(),
            backendName
        );
        this.permissionApprovalSection = permissionElements.permissionApprovalSection;

        // Preview section (second - after result)
        const previewElements = UIBuilder.buildPreviewSection(
            assistantContent,
            () => this.handleApplyChanges(),
            () => this.handleRejectChanges()
        );
        this.previewArea = previewElements.previewArea;
        this.previewContentContainer = previewElements.previewContentContainer;

        // Combined agent section (plan + activity) (third)
        UIBuilder.buildAgentSection(assistantContent);

        // Initialize agent tracker with the activity column
        const activityColumn = assistantContent.querySelector('.claude-code-activity-column');
        if (activityColumn) {
            this.agentTracker.initialize(activityColumn as HTMLElement);
        }

        // Output section (fourth)
        const outputSectionResult = UIBuilder.buildOutputSection(assistantContent);
        this.outputArea = outputSectionResult.outputArea;
        this.outputSection = outputSectionResult.outputSection;

        // History section (fifth)
        this.historyList = UIBuilder.buildHistorySection(
            assistantContent,
            () => this.clearHistory()
        );

        // === Build Sessions Tab Content ===
        this.sessionsSection = UIBuilder.buildSessionsSection(
            sessionsContent,
            () => this.createNewSession(),
            (sessionDir) => this.openSession(sessionDir),
            (sessionDir) => this.deleteSession(sessionDir),
            (notePath) => void this.openNoteByPath(notePath)
        );

        // Load and display sessions
        this.refreshSessionsList();
    }

    /**
     * Switch between tabs
     */
    private switchTab(tabName: string): void {
        this.currentTab = tabName;

        // Update tab buttons
        const tabs = this.containerEl.querySelectorAll('.claude-code-tab');
        tabs.forEach(tab => {
            tab.removeClass('active');
            if ((tab as HTMLElement).dataset.tab === tabName) {
                tab.addClass('active');
            }
        });

        // Update tab panes
        const panes = this.containerEl.querySelectorAll('.claude-code-tab-pane');
        panes.forEach(pane => {
            pane.removeClass('active');
            if ((pane as HTMLElement).dataset.tab === tabName) {
                pane.addClass('active');
            }
        });

        // Manage sessions tab refresh interval
        if (tabName === 'sessions') {
            this.refreshSessionsList();
            this.startSessionsAutoRefresh();
        } else {
            this.stopSessionsAutoRefresh();
        }
    }

    /**
     * Start auto-refresh interval for sessions tab (to update running states)
     */
    private startSessionsAutoRefresh(): void {
        this.stopSessionsAutoRefresh(); // Clear any existing interval

        // Check every 2 seconds if there are running sessions
        this.sessionsRefreshInterval = setInterval(() => {
            const runningPaths = this.contextManager.getRunningNotePaths();
            if (runningPaths.length > 0 || this.currentTab === 'sessions') {
                // Only refresh if we're still on sessions tab
                if (this.currentTab === 'sessions') {
                    this.refreshSessionsList();
                }
            } else {
                // No running sessions, stop refreshing
                this.stopSessionsAutoRefresh();
            }
        }, 2000);
    }

    /**
     * Stop auto-refresh interval for sessions tab
     */
    private stopSessionsAutoRefresh(): void {
        if (this.sessionsRefreshInterval) {
            clearInterval(this.sessionsRefreshInterval);
            this.sessionsRefreshInterval = null;
        }
    }

    /**
     * Update the current note label
     */
    private updateCurrentNoteLabel(): void {
        // Check if this is a standalone session (path starts with 'standalone:')
        const isStandalone = this.currentNotePath.startsWith('standalone:');

        if (this.currentNotePath && !isStandalone) {
            // Regular note-based session
            const fileName = this.currentNotePath.split('/').pop() || 'Unknown';
            const context = this.contextManager.getContext(this.currentNotePath);
            const runningIndicator = context.isRunning ? ' 🔄' : '';
            this.currentNoteLabel.textContent = `📝 ${fileName}${runningIndicator}`;
        } else if (isStandalone || this.activeStandaloneSession) {
            // Standalone session mode - show (No note) as requested
            const context = this.contextManager.getContext(this.currentNotePath);
            const runningIndicator = context.isRunning ? ' 🔄' : '';
            this.currentNoteLabel.textContent = '📝 ' + t('header.noNoteSelected') + runningIndicator;
        } else {
            this.currentNoteLabel.textContent = '📝 ' + t('header.noNoteSelected');
        }

        // Show count of other running processes
        this.updateRunningIndicator();
    }

    /**
     * Update the indicator showing how many other notes have running processes
     */
    private updateRunningIndicator(): void {
        const runningPaths = this.contextManager.getRunningNotePaths();
        const otherRunning = runningPaths.filter(p => p !== this.currentNotePath);

        // Find or create indicator element
        let indicator = this.currentNoteLabel.parentElement?.querySelector('.claude-code-running-indicator') as HTMLElement;

        if (otherRunning.length > 0) {
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.addClass('claude-code-running-indicator');
                this.currentNoteLabel.parentElement?.appendChild(indicator);
            }
            const noteNames = otherRunning.map(p => p.split('/').pop() || 'Unknown').join(', ');
            indicator.textContent = ` (${otherRunning.length} other running)`;
            indicator.setAttribute('title', `Running: ${noteNames}`);
            indicator.removeClass('claude-code-hidden');
        } else if (indicator) {
            indicator.addClass('claude-code-hidden');
        }
    }

    /**
     * Handle active note change
     */
    private onActiveNoteChange(): void {
        const activeFile = this.app.workspace.getActiveFile();

        // In standalone mode, preserve it unless user explicitly clicks on a different markdown file
        if (this.activeStandaloneSession) {
            // Only exit standalone mode if user opens a DIFFERENT file (not just clicking around)
            // AND the active leaf is actually focused on a markdown view
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            const isMarkdownLeafActive = activeView !== null;

            // Only switch if:
            // 1. A markdown file is actively focused (not just the sidebar)
            // 2. The file is different from any previous file
            // 3. We're not in the same view we started from
            if (isMarkdownLeafActive && activeFile) {
                this.activeStandaloneSession = null;
                this.currentNotePath = activeFile.path;
                this.updateCurrentNoteLabel();
                this.loadNoteContext(this.currentNotePath);
            }
            // Otherwise, stay in standalone mode
            return;
        }

        // Normal mode - switch to the active file if different
        // Also handle case where currentNotePath might have standalone prefix
        const currentRealPath = this.currentNotePath.startsWith('standalone:') ? '' : this.currentNotePath;
        if (activeFile && activeFile.path !== currentRealPath) {
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
        console.debug('[Load Note Context] Output lines count:', context.outputLines.length);
        console.debug('[Load Note Context] Agent steps count:', context.agentSteps.length);
        console.debug('[Load Note Context] isRunning:', context.isRunning);

        if (context.outputLines.length > 0) {
            // Try to parse todos from the restored output
            this.parseTodosFromOutput();
        } else {
            // No output, clear the todo list
            console.debug('[Load Note Context] Clearing todo list - no output');
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

        // Restore last prompt if available
        if (context.lastPrompt) {
            this.showLastPrompt(context.lastPrompt);
        } else {
            this.hideLastPrompt();
        }

        // Update UI based on running state
        if (context.isRunning) {
            // Note is currently running - show running state
            this.runButton.disabled = true;
            this.runButton.textContent = t('input.runningButton');
            this.cancelButton.removeClass('claude-code-hidden');
            this.cancelButton.addClass('claude-code-inline-visible');

            // Show status area (must be visible before resuming timer)
            const statusMessage = context.baseStatusMessage || ('🤔 ' + t('status.processing', { backend: this.getBackendName() }));
            this.showStatus(statusMessage + '... 0.0s');

            // Resume elapsed time tracking with the note's own start time
            this.resumeElapsedTimeTracking();

            // Restore any accumulated streaming result text
            if (context.currentResultText) {
                this.restoreStreamingResult(context.currentResultText);
            }
        } else {
            // Stop timer when switching to non-running note
            this.stopElapsedTimeTracking();
            // Note is not running - show idle state
            this.runButton.disabled = false;
            this.runButton.textContent = t('input.runButton', { backend: this.getBackendName() });
            this.cancelButton.addClass('claude-code-hidden');
            this.cancelButton.removeClass('claude-code-inline-visible');

            // Hide status indicator for non-running notes
            this.hideStatus();

            // Clear result section if there's no current response
            if (!context.currentResponse || !context.currentResponse.assistantMessage) {
                this.hideResult();
            } else {
                // Restore result if exists
                this.showResult(context.currentResponse.assistantMessage);
            }
        }

        // Restore preview section if there's pending content, otherwise hide
        if (context.pendingPreviewContent) {
            this.restorePreview(context.pendingPreviewContent, context.originalPreviewContent || '');
        } else {
            this.hidePreviewUI();  // Just hide UI, don't clear context
        }

        // Restore permission approval section if there's a pending permission request
        if (context.currentResponse?.isPermissionRequest && !context.isRunning) {
            this.showPermissionApprovalSection();
        } else {
            this.hidePermissionApprovalSection();
        }
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
        const context = this.getCurrentContext();

        // Prevent concurrent runs on the same note
        if (context.isRunning) {
            new Notice(t('notice.alreadyProcessing'));
            return;
        }

        const prompt = this.promptInput.value.trim();
        if (!prompt) {
            new Notice(t('notice.enterPrompt'));
            return;
        }

        // Reset scroll state for new request
        this.resetScrollState();

        try {
            // Clear the prompt input
            this.promptInput.value = '';

            // Get vault path (needed for all requests)
            const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
            if (!vaultPath) {
                new Notice(t('notice.noVaultPath'));
                return;
            }

            // Check if this is a standalone session or if we need to create one
            let isStandaloneSession = !!this.activeStandaloneSession;

            let file: TFile | null = null;
            let noteContent: string | undefined;
            let selectedText: string | undefined;
            let activeView: MarkdownView | null = null;

            if (!isStandaloneSession) {
                // Try to get active file for note-based sessions
                file = this.app.workspace.getActiveFile();
                if (!file) {
                    // No active note - automatically create a standalone session
                    const backend = this.plugin.settings.backend;
                    const sessionInfo = SessionManager.createStandaloneSession(
                        vaultPath,
                        this.app.vault.configDir,
                        backend
                    );
                    this.activeStandaloneSession = sessionInfo.sessionDir;
                    this.currentNotePath = `standalone:${sessionInfo.sessionDir}`;
                    isStandaloneSession = true;
                    this.updateCurrentNoteLabel();
                    this.refreshSessionsList();
                } else {
                    // We have a file - get editor content
                    // Find the leaf that contains this file
                    const leaves = this.app.workspace.getLeavesOfType('markdown');

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
                        new Notice(t('notice.noEditor'));
                        return;
                    }

                    const editor = activeView.editor;
                    selectedText = editor.getSelection();
                    const useSelectedTextOnly = this.selectedTextOnlyCheckbox.checked && selectedText;
                    noteContent = editor.getValue();
                    selectedText = useSelectedTextOnly ? selectedText : undefined;
                }
            }

            // Prepare request
            context.currentRequest = {
                noteContent,
                userPrompt: prompt,
                notePath: file?.path,
                selectedText,
                vaultPath: vaultPath,
                configDir: this.app.vault.configDir,
                runtimeModelOverride: this.modelSelect.value || undefined,
                conversationalMode: this.conversationalModeCheckbox.checked,
                sessionDir: isStandaloneSession ? this.activeStandaloneSession! : undefined
            };

            // Update UI
            this.runButton.disabled = true;
            this.runButton.textContent = t('input.runningButton');
            this.cancelButton.removeClass('claude-code-hidden');
            this.cancelButton.addClass('claude-code-inline-visible');
            context.outputLines = [];
            this.outputRenderer.clear();
            this.agentTracker.clear();
            this.clearTodoList();
            this.hidePreview();

            // Clear result area for new streaming messages (don't hide entire section)
            this.resultArea.empty();
            this.resultArea.addClass('claude-code-hidden');
            this.currentResultStreamingElement = null;
            this.hitFinalContentMarker = false;
            this.resultBlockCount = 0;  // Reset block counter
            context.currentResultText = undefined;  // Clear per-note result text
            this.toolUsageHistory = [];  // Clear tool history for new run
            this.clearToolHistoryDisplay();  // Clear tool history UI

            // Show the last prompt and status together (keeps prompt visible during processing)
            this.showLastPrompt(prompt);
            this.showStatus('🤔 ' + t('status.processing', { backend: this.getBackendName() }) + '... 0.0s');
            this.startElapsedTimeTracking('🤔 ' + t('status.processing', { backend: this.getBackendName() }));

            // Capture the note path for this specific run (or session dir for standalone)
            const runNotePath = file?.path || `standalone:${this.activeStandaloneSession}`;

            // Get session directory for file tracking (works for both standalone and note-based sessions)
            let sessionDirForTracking: string | null = null;
            if (isStandaloneSession && this.activeStandaloneSession) {
                sessionDirForTracking = this.activeStandaloneSession;
            } else if (file) {
                // For note-based sessions, calculate the session directory
                const sessionInfo = SessionManager.getSessionInfo(
                    file.path,
                    vaultPath,
                    this.app.vault.configDir,
                    this.plugin.settings.backend
                );
                sessionDirForTracking = sessionInfo.sessionDir;
            }

            // Track files created during execution for auto-linking to session
            const createdFiles: string[] = [];
            const fileCreateHandler = (createdFile: TFile) => {
                if (createdFile.extension === 'md') {
                    createdFiles.push(createdFile.path);
                }
            };

            // Register file creation listener
            const createEventRef = this.app.vault.on('create', fileCreateHandler);

            // Run Claude Code
            context.isRunning = true;
            this.updateCurrentNoteLabel();  // Update header to show running state
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

            // Unregister file creation listener
            this.app.vault.offref(createEventRef);

            // Link any created files to the session
            if (sessionDirForTracking && createdFiles.length > 0) {
                for (const createdPath of createdFiles) {
                    SessionManager.addLinkedNote(sessionDirForTracking, createdPath, false);
                }
                // Refresh sessions list to show the new linked notes
                this.refreshSessionsList();
            }

            context.isRunning = false;
            context.currentResponse = response;
            context.executionStartTime = undefined;  // Clear per-note timing
            context.baseStatusMessage = undefined;

            // Hide status
            this.hideStatus();

            // Update UI
            this.runButton.disabled = false;
            this.runButton.textContent = t('input.runButton', { backend: this.getBackendName() });
            this.cancelButton.addClass('claude-code-hidden');
            this.cancelButton.removeClass('claude-code-inline-visible');

            // Update header to reflect running state change
            this.updateCurrentNoteLabel();

            // Handle response
            if (response.success) {
            // Add to history
            context.history.push({
                prompt: prompt,
                timestamp: new Date(),
                success: true,
                notePath: runNotePath,
                response: response,
                request: context.currentRequest,
                outputLines: context.outputLines
            });

            this.updateHistoryDisplay(context.history);

            // Save context with error handling (only for note-based sessions)
            if (file) {
                try {
                    this.contextManager.saveContext(file.path, vaultPath);
                } catch (error) {
                    console.error('Failed to save context:', error);
                }
            }

            // Show preview or auto-apply (only for note-based sessions with an editor)
            if (response.modifiedContent && response.modifiedContent.trim() && activeView?.editor) {
                if (this.autoAcceptCheckbox.checked) {
                    // Only update UI if this is still the active note
                    if (this.currentNotePath === runNotePath) {
                        this.showStatus('✅ ' + t('status.autoApplying'));
                    }
                    this.applyChangesToEditor(response.modifiedContent, activeView.editor);
                    // Hide status after auto-applying
                    if (this.currentNotePath === runNotePath) {
                        this.hideStatus();
                    }
                    new Notice('✓ ' + t('notice.changesApplied'));
                } else {
                    this.showPreview(response.modifiedContent, runNotePath);
                }
            } else {
                // Check if this is a permission request
                if (response.isPermissionRequest) {
                    // Only show UI if this is still the active note
                    if (this.currentNotePath === runNotePath) {
                        // Show permission approval UI
                        this.showPermissionApprovalSection();
                        // Show the request in the result panel (only if not already streamed)
                        const resultSection = document.getElementById('claude-code-result-section');
                        const hasStreamedContent = resultSection && resultSection.hasClass('claude-code-visible') && this.resultArea.children.length > 0;

                        if (!hasStreamedContent && response.assistantMessage && response.assistantMessage.trim()) {
                            this.showResult(response.assistantMessage);
                        }
                    }
                    new Notice('⚠️ ' + t('notice.permissionRequest', { backend: this.getBackendName() }));
                } else {
                    // No file changes - show result panel with Claude's response
                    // Only update UI if this is still the active note
                    if (this.currentNotePath === runNotePath) {
                        // Only call showResult if we haven't been streaming (streaming already rendered the result)
                        const resultSection = document.getElementById('claude-code-result-section');
                        const hasStreamedContent = resultSection && resultSection.hasClass('claude-code-visible') && this.resultArea.children.length > 0;

                        if (!hasStreamedContent && response.assistantMessage && response.assistantMessage.trim()) {
                            this.showResult(response.assistantMessage);
                            new Notice('✓ ' + t('notice.completed', { backend: this.getBackendName() }));
                        } else if (hasStreamedContent) {
                            // Result was already streamed - make earlier blocks collapsible
                            this.makeEarlierBlocksCollapsible();
                            new Notice('✓ ' + t('notice.completed', { backend: this.getBackendName() }));
                        } else {
                            new Notice('✓ ' + t('notice.completedNoChanges', { backend: this.getBackendName() }));
                        }
                    } else {
                        // Silently complete - user is on a different note
                        new Notice('✓ ' + t('notice.completed', { backend: this.getBackendName() }));
                    }
                }
            }
            } else {
            // Only update UI if this is still the active note
            if (this.currentNotePath === runNotePath) {
                this.showErrorStatus('❌ ' + t('status.failed'));
            }
            new Notice(`✗ ${response.error || 'Unknown error'}`);
            context.history.push({
                prompt: prompt,
                timestamp: new Date(),
                success: false,
                notePath: runNotePath,
                response: response,
                request: context.currentRequest
            });
            this.updateHistoryDisplay(context.history);
            }
        } catch (error) {
            // If an error occurred during execution, make sure to reset the running state
            context.isRunning = false;
            context.executionStartTime = undefined;
            context.baseStatusMessage = undefined;
            throw error;
        }
    }

    /**
     * Append output to a specific note's context
     */
    private appendOutputToNote(notePath: string, text: string, isMarkdown: boolean = false, isStreaming: boolean | string = false, isAssistantMessage: boolean = false): void {
        const context = this.contextManager.getContext(notePath);
        context.outputLines.push(text);

        // Store streaming result text in the CORRECT note's context (not current note)
        if (isAssistantMessage && isStreaming === true) {
            // Accumulate result text in the target note's context
            context.currentResultText = (context.currentResultText || '') + text;
        }

        // Parse and store agent activity in the note's context (regardless of current view)
        // Skip for streaming partial text
        if (isStreaming !== true) {
            const agentStep = OutputRenderer.parseAgentActivity(text);
            if (agentStep) {
                context.agentSteps.push(agentStep);
            }
        }

        // Only update UI if this is the current note being viewed
        if (notePath === this.currentNotePath) {
            // Handle streaming text accumulation
            if (isStreaming === true) {
                this.outputRenderer.appendStreamingText(text);

                // Also append to Result section if it's an assistant message
                if (isAssistantMessage) {
                    this.appendToResultUI(text);
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
                    console.debug('[Append Output] Non-streaming assistant message, adding to result');
                    this.showResultMarkdown(text);
                } else {
                    console.debug('[Append Output] Non-streaming assistant message, but already have streaming content - skipping');
                }
                // Fall through to also add to output
            }

            this.outputRenderer.appendLine(text, isMarkdown);

            // Update UI agent activity tracker with timing (UI only)
            const agentStep = OutputRenderer.parseAgentActivity(text);
            if (agentStep) {
                // Detect if this is a tool start
                if (this.isToolStart(text)) {
                    // Store start time and remember this tool's key
                    const now = Date.now();
                    this.toolStartTimes.set(agentStep.key, now);
                    this.lastToolKey = agentStep.key;
                    agentStep.startTime = now;

                    // Track tool usage for history display
                    this.trackToolUsage(agentStep.action);
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
                        return;
                    }
                }

                this.agentTracker.addStep(agentStep);
            }
        }
    }

    /**
     * Check if output line indicates a tool is starting
     */
    private isToolStart(text: string): boolean {
        return text.includes('Using tool:') ||
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
     * Tool icon mapping for display
     */
    private static readonly TOOL_ICONS: Record<string, { icon: string; description: string }> = {
        // Claude CLI tools (capitalized)
        'Read': { icon: '📖', description: 'Read file contents' },
        'Write': { icon: '✍️', description: 'Write file contents' },
        'Edit': { icon: '✏️', description: 'Edit file contents' },
        'Bash': { icon: '💻', description: 'Execute shell command' },
        'Glob': { icon: '🔍', description: 'Search files by pattern' },
        'Grep': { icon: '🔎', description: 'Search file contents' },
        'WebFetch': { icon: '🌐', description: 'Fetch web content' },
        'WebSearch': { icon: '🔎', description: 'Search the web' },
        'Task': { icon: '🤖', description: 'Launch sub-agent' },
        'TodoWrite': { icon: '📋', description: 'Update task list' },
        'AskUserQuestion': { icon: '❓', description: 'Ask user a question' },
        'NotebookEdit': { icon: '📓', description: 'Edit Jupyter notebook' },
        // OpenCode tools (lowercase)
        'read': { icon: '📖', description: 'Read file contents' },
        'write': { icon: '✍️', description: 'Write file contents' },
        'edit': { icon: '✏️', description: 'Edit file contents' },
        'bash': { icon: '💻', description: 'Execute shell command' },
        'glob': { icon: '🔍', description: 'Search files by pattern' },
        'grep': { icon: '🔎', description: 'Search file contents' },
        'webfetch': { icon: '🌍', description: 'Fetch web content' },
        'websearch': { icon: '🌐', description: 'Search the web' },
        'todoread': { icon: '📋', description: 'Read task list' },
        'todowrite': { icon: '📝', description: 'Update task list' },
        'list': { icon: '📁', description: 'List directory contents' },
        'patch': { icon: '🩹', description: 'Apply patch to file' },
        'think': { icon: '🧠', description: 'Extended thinking' },
        'default': { icon: '🔧', description: 'Tool execution' }
    };

    /**
     * Track tool usage in history
     */
    private trackToolUsage(toolName: string): void {
        // Check if tool already exists in history
        const existing = this.toolUsageHistory.find(t => t.name === toolName);
        if (existing) {
            existing.count++;
        } else {
            this.toolUsageHistory.push({ name: toolName, count: 1 });
        }

        // Update the display
        this.updateToolHistoryDisplay();
    }

    /**
     * Clear tool history display
     */
    private clearToolHistoryDisplay(): void {
        if (this.toolHistoryArea) {
            this.toolHistoryArea.empty();
            this.toolHistoryArea.addClass('claude-code-hidden');
        }
    }

    /**
     * Update tool history display with current tools
     */
    private updateToolHistoryDisplay(): void {
        if (!this.toolHistoryArea || this.toolUsageHistory.length === 0) {
            return;
        }

        // Clear and rebuild
        this.toolHistoryArea.empty();
        this.toolHistoryArea.removeClass('claude-code-hidden');

        // Add label
        this.toolHistoryArea.createEl('span', {
            cls: 'claude-code-tool-history-label',
            text: '🛠️ '
        });

        // Add tool icons
        for (const tool of this.toolUsageHistory) {
            const toolInfo = ClaudeCodeView.TOOL_ICONS[tool.name] || ClaudeCodeView.TOOL_ICONS['default'];
            const toolEl = this.toolHistoryArea.createEl('span', {
                cls: 'claude-code-tool-icon',
                text: toolInfo.icon
            });

            // Add count badge if more than 1
            if (tool.count > 1) {
                toolEl.createEl('span', {
                    cls: 'claude-code-tool-count',
                    text: String(tool.count)
                });
            }

            // Set tooltip with tool name and description
            toolEl.setAttribute('title', `${tool.name}: ${toolInfo.description}${tool.count > 1 ? ` (×${tool.count})` : ''}`);
        }
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
        if (line.includes('Using tool: TodoWrite')) {
            // Schedule parsing after a short delay to ensure all output is captured
            setTimeout(() => this.parseTodosFromOutput(), 100);
        }
    }

    /**
     * Parse todos from the output lines
     */
    private parseTodosFromOutput(): void {
        const context = this.getCurrentContext();

        console.debug('[Parse Todos] Total output lines:', context.outputLines.length);

        // Find ALL TodoWrite tool usage lines
        const todoWriteIndices: number[] = [];
        context.outputLines.forEach((line, index) => {
            if (line.includes('Using tool: TodoWrite')) {
                todoWriteIndices.push(index);
            }
        });

        console.debug('[Parse Todos] Found TodoWrite at indices:', todoWriteIndices);

        if (todoWriteIndices.length === 0) {
            console.debug('[Parse Todos] No TodoWrite found in output lines');
            return;
        }

        // Use the LAST TodoWrite (most recent update)
        const lastTodoWriteIndex = todoWriteIndices[todoWriteIndices.length - 1];

        console.debug('[Parse Todos] Using last TodoWrite at index:', lastTodoWriteIndex);

        if (lastTodoWriteIndex + 1 < context.outputLines.length) {
            // The next line after "Using tool: TodoWrite" should contain the JSON
            const jsonLine = context.outputLines[lastTodoWriteIndex + 1];

            console.debug('[Parse Todos] JSON line length:', jsonLine.length);
            console.debug('[Parse Todos] JSON line preview:', jsonLine.substring(0, 300));

            try {
                // The JSON is the entire line, just trim whitespace
                const jsonStr = jsonLine.trim();

                console.debug('[Parse Todos] Trimmed JSON length:', jsonStr.length);
                console.debug('[Parse Todos] First char:', jsonStr[0], 'Last char:', jsonStr[jsonStr.length - 1]);

                const toolInput = JSON.parse(jsonStr) as TodoToolInput;

                if (toolInput.todos && Array.isArray(toolInput.todos)) {
                    console.debug('[Parse Todos] Found todos count:', toolInput.todos.length);
                    console.debug('[Parse Todos] Todos:', JSON.stringify(toolInput.todos, null, 2));
                    this.updateTodoList(toolInput.todos);
                } else {
                    console.debug('[Parse Todos] No todos array found in parsed JSON');
                    console.debug('[Parse Todos] Parsed object keys:', Object.keys(toolInput as object));
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
            resultSection.removeClass('claude-code-hidden');
            resultSection.addClass('claude-code-visible');
        }

        // Show status area
        this.statusIndicator.removeClass('claude-code-hidden');
        this.statusIndicator.addClass('claude-code-flex-visible');
        this.statusText.textContent = message;

        // Keep result area visible if it has content (reasoning steps)
        // Only hide if there's no content yet
        if (this.resultArea.children.length === 0) {
            this.resultArea.addClass('claude-code-hidden');
            this.resultArea.removeClass('claude-code-visible');
        }
    }

    /**
     * Show error status without progress bar animation
     */
    private showErrorStatus(message: string): void {
        this.stopElapsedTimeTracking();

        // Show Result section
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.removeClass('claude-code-hidden');
            resultSection.addClass('claude-code-visible');
        }

        // Show status area, hide result area
        this.statusIndicator.removeClass('claude-code-hidden');
        this.statusIndicator.addClass('claude-code-flex-visible');
        this.resultArea.addClass('claude-code-hidden');
        this.resultArea.removeClass('claude-code-visible');
        this.statusText.textContent = message;
    }

    /**
     * Start elapsed time tracking (stores timing in per-note context)
     */
    private startElapsedTimeTracking(baseMessage?: string): void {
        const context = this.getCurrentContext();
        context.executionStartTime = Date.now();
        context.baseStatusMessage = baseMessage || '🤔 Claude is processing';

        // Stop any existing interval before starting a new one
        this.stopElapsedTimeTracking();

        // Update status every 100ms with elapsed time
        this.elapsedTimeInterval = setInterval(() => {
            const ctx = this.getCurrentContext();
            if (ctx.executionStartTime) {
                const elapsed = Date.now() - ctx.executionStartTime;
                const seconds = (elapsed / 1000).toFixed(1);
                this.statusText.textContent = `${ctx.baseStatusMessage || '🤔 Processing'}... ${seconds}s`;
            }
        }, 100);
    }

    /**
     * Resume elapsed time tracking for current note (used when switching back to a running note)
     */
    private resumeElapsedTimeTracking(): void {
        const context = this.getCurrentContext();
        if (!context.executionStartTime || !context.isRunning) {
            return;
        }

        // Stop any existing interval
        this.stopElapsedTimeTracking();

        // Start interval using the note's existing start time
        this.elapsedTimeInterval = setInterval(() => {
            const ctx = this.getCurrentContext();
            if (ctx.executionStartTime) {
                const elapsed = Date.now() - ctx.executionStartTime;
                const seconds = (elapsed / 1000).toFixed(1);
                this.statusText.textContent = `${ctx.baseStatusMessage || '🤔 Processing'}... ${seconds}s`;
            }
        }, 100);
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
        this.statusIndicator.addClass('claude-code-hidden');
        this.statusIndicator.removeClass('claude-code-flex-visible');

        // If there's content in the result area, keep it and the section visible
        if (this.resultArea.children.length > 0) {
            this.resultArea.removeClass('claude-code-hidden');
            this.resultArea.addClass('claude-code-visible');
            const resultSection = document.getElementById('claude-code-result-section');
            if (resultSection) {
                resultSection.removeClass('claude-code-hidden');
                resultSection.addClass('claude-code-visible');
            }
        }
    }

    /**
     * Show the last prompt that was sent
     */
    private showLastPrompt(prompt: string): void {
        const context = this.getCurrentContext();
        context.lastPrompt = prompt;

        this.lastPromptArea.empty();
        this.lastPromptArea.removeClass('claude-code-hidden');

        // Create the prompt display with a label
        this.lastPromptArea.createEl('span', {
            cls: 'claude-code-last-prompt-label',
            text: '💬 '
        });

        // Truncate long prompts for display
        const displayPrompt = prompt.length > 200
            ? prompt.substring(0, 200) + '...'
            : prompt;

        this.lastPromptArea.createEl('span', {
            cls: 'claude-code-last-prompt-text',
            text: displayPrompt
        });

        // Show full prompt on hover if truncated
        if (prompt.length > 200) {
            this.lastPromptArea.setAttribute('title', prompt);
        }
    }

    /**
     * Hide the last prompt display
     */
    private hideLastPrompt(): void {
        this.lastPromptArea.addClass('claude-code-hidden');
        this.lastPromptArea.empty();
    }

    /**
     * Show preview of changes
     * @param modifiedContent The modified content to preview
     * @param forNotePath Optional: the note path this preview belongs to (defaults to current note)
     */
    private showPreview(modifiedContent: string, forNotePath?: string): void {
        // Get the context for the specified note (or current note if not specified)
        const targetNotePath = forNotePath || this.currentNotePath;
        const context = this.contextManager.getContext(targetNotePath);
        const originalContent = context.currentRequest?.selectedText || context.currentRequest?.noteContent || '';

        // Store preview state in the TARGET note's context
        context.pendingPreviewContent = modifiedContent;
        context.originalPreviewContent = originalContent;

        // Only show the UI if this is for the currently active note
        if (targetNotePath !== this.currentNotePath) {
            // Preview stored in context, but don't show UI since user is on a different note
            return;
        }

        const previewSection = document.getElementById('claude-code-preview-section');
        if (previewSection) {
            previewSection.removeClass('claude-code-hidden');
            previewSection.addClass('claude-code-visible');
        }

        this.previewArea.empty();

        // Remove old rendered and diff views if they exist
        const oldRendered = this.previewContentContainer.querySelector('.claude-code-preview-rendered');
        if (oldRendered) oldRendered.remove();
        const oldDiff = this.previewContentContainer.querySelector('.claude-code-preview-diff');
        if (oldDiff) oldDiff.remove();

        // Show character count comparison
        const statsDiv = this.previewArea.createEl('div', { cls: 'claude-code-preview-stats' });
        statsDiv.createEl('span', { text: `${t('preview.originalLabel')} ${originalContent.length} ${t('preview.charsLabel')}` });
        statsDiv.createEl('span', { text: ` → ${t('preview.modifiedLabel')} ${modifiedContent.length} ${t('preview.charsLabel')}` });
        statsDiv.createEl('span', { text: ` (${modifiedContent.length - originalContent.length >= 0 ? '+' : ''}${modifiedContent.length - originalContent.length})` });

        // Show the modified content in a code block (Raw tab)
        const previewContent = this.previewArea.createEl('pre', { cls: 'claude-code-preview-content' });
        previewContent.createEl('code', { text: modifiedContent });
        this.previewArea.addClass('claude-code-hidden'); // Hidden by default, Diff tab is active

        // Create diff view (shown by default)
        const diffArea = this.previewContentContainer.createEl('div', {
            cls: 'claude-code-preview-diff claude-code-visible'
        });

        // Use safe DOM manipulation
        const diffElement = this.generateDiffElement(originalContent, modifiedContent);
        diffArea.appendChild(diffElement);

        // Create rendered markdown view
        const renderedArea = this.previewContentContainer.createEl('div', {
            cls: 'claude-code-preview-rendered claude-code-hidden'
        });

        // Render the markdown
        void MarkdownRenderer.render(
            this.app,
            modifiedContent,
            renderedArea,
            this.currentNotePath,
            this
        );
    }

    /**
     * Hide preview and clear context state
     */
    private hidePreview(): void {
        this.hidePreviewUI();

        // Clear preview state from context
        const context = this.getCurrentContext();
        context.pendingPreviewContent = undefined;
        context.originalPreviewContent = undefined;
    }

    /**
     * Hide preview UI only (without clearing context state)
     * Used when switching notes to preserve each note's preview state
     */
    private hidePreviewUI(): void {
        const previewSection = document.getElementById('claude-code-preview-section');
        if (previewSection) {
            previewSection.addClass('claude-code-hidden');
            previewSection.removeClass('claude-code-visible');
        }
    }

    /**
     * Restore preview from stored context state (used when switching notes)
     */
    private restorePreview(modifiedContent: string, originalContent: string): void {
        const previewSection = document.getElementById('claude-code-preview-section');
        if (previewSection) {
            previewSection.removeClass('claude-code-hidden');
            previewSection.addClass('claude-code-visible');
        }

        this.previewArea.empty();

        // Remove old rendered and diff views if they exist
        const oldRendered = this.previewContentContainer.querySelector('.claude-code-preview-rendered');
        if (oldRendered) oldRendered.remove();
        const oldDiff = this.previewContentContainer.querySelector('.claude-code-preview-diff');
        if (oldDiff) oldDiff.remove();

        // Show character count comparison
        const statsDiv = this.previewArea.createEl('div', { cls: 'claude-code-preview-stats' });
        statsDiv.createEl('span', { text: `${t('preview.originalLabel')} ${originalContent.length} ${t('preview.charsLabel')}` });
        statsDiv.createEl('span', { text: ` → ${t('preview.modifiedLabel')} ${modifiedContent.length} ${t('preview.charsLabel')}` });
        statsDiv.createEl('span', { text: ` (${modifiedContent.length - originalContent.length >= 0 ? '+' : ''}${modifiedContent.length - originalContent.length})` });

        // Show the modified content in a code block (Raw tab)
        const previewContent = this.previewArea.createEl('pre', { cls: 'claude-code-preview-content' });
        previewContent.createEl('code', { text: modifiedContent });
        this.previewArea.addClass('claude-code-hidden'); // Hidden by default, Diff tab is active

        // Create diff view (shown by default)
        const diffArea = this.previewContentContainer.createEl('div', {
            cls: 'claude-code-preview-diff claude-code-visible'
        });

        // Use safe DOM manipulation
        const diffElement = this.generateDiffElement(originalContent, modifiedContent);
        diffArea.appendChild(diffElement);

        // Create rendered markdown view
        const renderedArea = this.previewContentContainer.createEl('div', {
            cls: 'claude-code-preview-rendered claude-code-hidden'
        });

        // Render the markdown
        void MarkdownRenderer.render(
            this.app,
            modifiedContent,
            renderedArea,
            this.currentNotePath,
            this
        );
    }

    /**
     * Restore streaming result from context (used when switching back to a running note)
     */
    private restoreStreamingResult(text: string): void {
        // Show the result section
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.removeClass('claude-code-hidden');
            resultSection.addClass('claude-code-visible');
        }

        // Show result area
        this.resultArea.removeClass('claude-code-hidden');
        this.resultArea.addClass('claude-code-visible');

        // Clear and recreate streaming element
        this.resultArea.empty();
        this.currentResultStreamingElement = this.resultArea.createEl('div', {
            cls: 'claude-code-result-streaming markdown-rendered'
        });
        (this.currentResultStreamingElement as unknown as StreamingElementData).accumulatedText = text;

        // Reset rendering state and render the accumulated text
        this.lastRenderedText = '';
        this.hitFinalContentMarker = false;
        this.renderStreamingMarkdown(text);

        console.debug('[Restore Streaming Result] Restored text length:', text.length);
    }

    /**
     * Append text to result panel UI only (context update handled by appendOutputToNote)
     * Used for streaming assistant messages when the current note is active
     */
    private appendToResultUI(text: string): void {
        console.debug('[appendToResultUI] CALLED - text:', text.substring(0, 30), '- stack:', new Error().stack?.split('\n').slice(1, 4).join(' <- '));

        // If we've already hit the FINAL-CONTENT marker, ignore all subsequent chunks
        if (this.hitFinalContentMarker) {
            console.debug('[Append To Result UI] Already hit FINAL-CONTENT marker flag, ignoring chunk');
            return;
        }

        // Show the result section if not already visible
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            console.debug('[Append To Result UI] Showing result section');
            resultSection.removeClass('claude-code-hidden');
            resultSection.addClass('claude-code-visible');
        }

        // Show result area (but keep status visible - process may still be running!)
        // The status will be hidden when the process completes via hideStatus()
        this.resultArea.removeClass('claude-code-hidden');
        this.resultArea.addClass('claude-code-visible');

        // Create streaming element if needed (with markdown-rendered class)
        if (!this.currentResultStreamingElement) {
            this.currentResultStreamingElement = this.resultArea.createEl('div', {
                cls: 'claude-code-result-streaming markdown-rendered'
            });
            // Store accumulated text separately for markdown rendering
            (this.currentResultStreamingElement as unknown as StreamingElementData).accumulatedText = '';
        }

        // Get accumulated text
        const accumulatedText = (this.currentResultStreamingElement as unknown as StreamingElementData).accumulatedText || '';

        // Check if we've already encountered FINAL-CONTENT marker in the existing text
        if (accumulatedText.includes('---FINAL-CONTENT---')) {
            console.debug('[Append To Result UI] Found FINAL-CONTENT in existing text, cleaning up and setting flag');
            this.cleanupFinalContentFromStream();
            this.hitFinalContentMarker = true;
            return;
        }

        // Check if this chunk would introduce the FINAL-CONTENT marker
        const combinedText = accumulatedText + text;
        if (combinedText.includes('---FINAL-CONTENT---')) {
            // Find how much of this chunk we can add before the marker
            const finalContentIndex = combinedText.indexOf('---FINAL-CONTENT---');
            const textBeforeMarker = combinedText.substring(0, finalContentIndex);

            // Update accumulated text and render
            (this.currentResultStreamingElement as unknown as StreamingElementData).accumulatedText = textBeforeMarker;
            this.renderStreamingMarkdown(textBeforeMarker);

            console.debug('[Append To Result UI] Hit FINAL-CONTENT marker, setting flag');
            this.hitFinalContentMarker = true;
            return;
        }

        // Normal case: add the full chunk and re-render markdown
        (this.currentResultStreamingElement as unknown as StreamingElementData).accumulatedText = combinedText;
        this.renderStreamingMarkdown(combinedText);

        // Smart auto-scroll (respects user scroll position)
        this.autoScrollResult();
    }

    /** Pending markdown render timeout */
    private markdownRenderTimeout: NodeJS.Timeout | null = null;
    /** Current streaming text span for updates */
    private streamingTextSpan: HTMLSpanElement | null = null;

    /**
     * Render accumulated text during streaming with live markdown
     * Uses debounced markdown rendering for performance
     */
    private renderStreamingMarkdown(text: string): void {
        if (!this.currentResultStreamingElement) {
            return;
        }

        // Create or update text span for immediate display (no clearing!)
        if (!this.streamingTextSpan || !this.currentResultStreamingElement.contains(this.streamingTextSpan)) {
            this.currentResultStreamingElement.empty();
            this.streamingTextSpan = this.currentResultStreamingElement.createEl('span', {
                cls: 'claude-code-streaming-text'
            });
        }
        this.streamingTextSpan.textContent = text;

        // Debounce full markdown rendering to avoid flickering
        if (this.markdownRenderTimeout) {
            clearTimeout(this.markdownRenderTimeout);
        }

        // Render proper markdown after a short delay (when streaming pauses)
        this.markdownRenderTimeout = setTimeout(() => {
            if (this.currentResultStreamingElement && this.streamingTextSpan) {
                // Replace text span with rendered markdown
                const tempContainer = document.createElement('div');
                void MarkdownRenderer.render(
                    this.app,
                    text,
                    tempContainer,
                    this.currentNotePath,
                    this
                ).then(() => {
                    if (this.currentResultStreamingElement) {
                        this.currentResultStreamingElement.empty();
                        while (tempContainer.firstChild) {
                            this.currentResultStreamingElement.appendChild(tempContainer.firstChild);
                        }
                        this.streamingTextSpan = null;

                        // Process file paths to make them clickable
                        this.processFileLinksInElement(this.currentResultStreamingElement);
                    }
                });
            }
        }, 300);
    }

    /**
     * Process an element to make file paths clickable
     */
    private processFileLinksInElement(element: HTMLElement): void {
        const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
        if (!vaultPath) return;

        // Walk through all text nodes and replace file paths with links
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );

        const textNodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
            textNodes.push(node);
        }

        // Pattern to match file paths (absolute paths ending in .md)
        const filePathPattern = new RegExp(
            '(' + vaultPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/[\\w\\-\\./ ]+\\.md)',
            'gi'
        );

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            if (!filePathPattern.test(text)) continue;

            // Reset regex lastIndex
            filePathPattern.lastIndex = 0;

            // Create a document fragment to hold the new content
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = filePathPattern.exec(text)) !== null) {
                // Add text before the match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                const fullPath = match[1];
                const relativePath = fullPath.substring(vaultPath.length + 1);

                // Create clickable link
                const link = document.createElement('a');
                link.className = 'claude-code-file-link';
                link.textContent = fullPath;
                link.href = '#';
                link.title = `Open ${relativePath}`;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const file = this.app.vault.getAbstractFileByPath(relativePath);
                    if (file instanceof TFile) {
                        void this.app.workspace.getLeaf(false).openFile(file);
                    }
                });

                fragment.appendChild(link);
                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            // Replace the text node with the fragment
            if (lastIndex > 0) {
                textNode.parentNode?.replaceChild(fragment, textNode);
            }
        }
    }

    /**
     * Extract complete markdown blocks from the new content
     * Returns blocks that are ready to be rendered and remaining incomplete text
     */
    private extractCompleteBlocks(newContent: string): { completeBlocks: string[], remainingText: string } {
        const blocks: string[] = [];

        // Split by paragraph breaks (double newline)
        const paragraphs = newContent.split(/\n\n+/);

        // If we have more than one paragraph, all but the last are complete
        if (paragraphs.length > 1) {
            for (let i = 0; i < paragraphs.length - 1; i++) {
                if (paragraphs[i].trim()) {
                    blocks.push(paragraphs[i]);
                }
            }
            return {
                completeBlocks: blocks,
                remainingText: paragraphs[paragraphs.length - 1]
            };
        }

        // No complete blocks yet, everything is remaining
        return {
            completeBlocks: [],
            remainingText: newContent
        };
    }

    /**
     * Remove incomplete plain text from the last render
     * (will be re-added as part of complete block or new plain text)
     */
    private removeIncompletePlainText(): void {
        if (!this.currentResultStreamingElement) return;

        const lastChild = this.currentResultStreamingElement.lastChild;
        // Only remove if it's a plain text node (not a markdown-block)
        if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
            this.currentResultStreamingElement.removeChild(lastChild);
        }
    }

    /**
     * Convert file paths in text to clickable links
     * Converts absolute paths inside vault to markdown-style links
     */
    private linkifyFilePaths(text: string): string {
        try {
            const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
            if (!vaultPath) return text;

            // Pattern to match file paths (absolute paths ending in .md)
            // Use space ' ' instead of \s to avoid matching newlines
            const escapedVaultPath = vaultPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const filePathPattern = new RegExp(
                escapedVaultPath + '/[\\w\\-\\./ ]+\\.md',
                'g'
            );

            // Replace paths, but skip those inside backticks (code formatting)
            const result = text.replace(filePathPattern, (match: string, offset: number) => {
                // Check if the match is inside backticks (inline code)
                const beforeMatch = text.substring(Math.max(0, offset - 50), offset);
                const afterMatch = text.substring(offset + match.length, Math.min(text.length, offset + match.length + 10));

                const startsWithBacktick = beforeMatch.endsWith('`');
                const endsWithBacktick = afterMatch.startsWith('`');

                // Skip if appears to be inside inline code (between backticks)
                if (startsWithBacktick && endsWithBacktick) {
                    return match; // Keep as-is, don't linkify
                }

                // Also skip if we're in a code block (odd number of triple backticks before)
                const tripleBackticksBefore = (text.substring(0, offset).match(/```/g) || []).length;
                if (tripleBackticksBefore % 2 === 1) {
                    return match; // Inside code block, don't linkify
                }

                // Convert to relative path for the link
                const relativePath = match.substring(vaultPath.length + 1);
                return `[📄 ${match}](obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(relativePath)})`;
            });

            return result;
        } catch (error) {
            console.error('[linkifyFilePaths] Error:', error);
            return text;
        }
    }

    /**
     * Append a complete markdown block as an independent rendered chunk
     */
    private appendMarkdownBlock(blockText: string): void {
        if (!this.currentResultStreamingElement) return;

        // Create a container for this block
        const blockContainer = document.createElement('div');
        blockContainer.addClass('markdown-block');

        // Linkify file paths before rendering markdown
        const processedText = this.linkifyFilePaths(blockText);

        void MarkdownRenderer.render(
            this.app,
            processedText,
            blockContainer,
            this.currentNotePath,
            this
        ).catch((e: unknown) => {
            console.error('[Append Markdown Block] Error:', e);
            blockContainer.textContent = blockText;
        });

        // Append the block
        this.currentResultStreamingElement.appendChild(blockContainer);
    }

    /**
     * Append plain text without any processing
     * Note: This is called repeatedly with the FULL accumulated remainingText,
     * so we need to REPLACE any previous incomplete content, not append to it.
     * Links will be added at the end in finishResultStreaming.
     */
    private appendPlainText(text: string): void {
        if (!this.currentResultStreamingElement) return;

        // Find and remove any previous incomplete content (text node only, not markdown blocks)
        const lastChild = this.currentResultStreamingElement.lastChild;
        if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
            this.currentResultStreamingElement.removeChild(lastChild);
        }

        // Just add plain text - linkification happens at the end in finishResultStreaming
        const textNode = document.createTextNode(text);
        this.currentResultStreamingElement.appendChild(textNode);
    }

    /**
     * Render text with clickable file links (for Result section)
     */
    private renderTextWithFileLinks(container: HTMLElement, text: string, vaultPath: string): void {
        // Pattern to match file paths
        // Use space ' ' instead of \s to avoid matching newlines
        const filePathPattern = new RegExp(
            '(' + vaultPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/[\\w\\-\\./ ]+\\.md)',
            'gi'
        );

        let lastIndex = 0;
        let match;

        while ((match = filePathPattern.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                container.appendText(text.substring(lastIndex, match.index));
            }

            const fullPath = match[1];
            const relativePath = fullPath.substring(vaultPath.length + 1);

            // Create clickable link
            const link = container.createEl('a', {
                cls: 'claude-code-file-link',
                text: fullPath
            });
            link.setAttribute('href', '#');
            link.setAttribute('title', `Open ${relativePath}`);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const file = this.app.vault.getAbstractFileByPath(relativePath);
                if (file instanceof TFile) {
                    void this.app.workspace.getLeaf(false).openFile(file);
                }
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            container.appendText(text.substring(lastIndex));
        }

        // If no matches were found, just set the text
        if (lastIndex === 0) {
            container.textContent = text;
        }
    }


    /**
     * Clean up FINAL-CONTENT marker and everything after it from the streaming element
     */
    private cleanupFinalContentFromStream(): void {
        if (!this.currentResultStreamingElement) return;

        const fullText = this.currentResultStreamingElement.textContent || '';
        const finalContentIndex = fullText.indexOf('---FINAL-CONTENT---');

        if (finalContentIndex === -1) return; // No marker found

        console.debug('[Cleanup FINAL-CONTENT] Removing marker and content after it');

        // Get the text we want to keep (before the marker)
        const textToKeep = fullText.substring(0, finalContentIndex).trim();

        // Clear all current content
        this.currentResultStreamingElement.empty();

        // Re-add only the text before the marker as a single chunk
        this.currentResultStreamingElement.createEl('span', {
            cls: 'streaming-text-chunk',
            text: textToKeep
        });

        console.debug('[Cleanup FINAL-CONTENT] Cleaned up, kept text length:', textToKeep.length);
    }

    /**
     * Show markdown content in result section (for non-streaming assistant messages)
     */
    private showResultMarkdown(text: string): void {
        console.debug('[Show Result Markdown] Called with text length:', text.length);

        // Filter out FINAL-CONTENT and everything after it
        let filteredText = text;
        const finalContentIndex = text.indexOf('---FINAL-CONTENT---');
        if (finalContentIndex !== -1) {
            filteredText = text.substring(0, finalContentIndex).trim();
            console.debug('[Show Result Markdown] Filtered FINAL-CONTENT, new length:', filteredText.length);
        }

        // Show the result section
        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.removeClass('claude-code-hidden');
            resultSection.addClass('claude-code-visible');
        }

        // Show result area (but keep status visible - process may still be running!)
        this.resultArea.removeClass('claude-code-hidden');
        this.resultArea.addClass('claude-code-visible');

        // Create a new div for this markdown content
        const contentDiv = this.resultArea.createEl('div', {
            cls: 'markdown-rendered'
        });

        // Linkify file paths before rendering
        const processedText = this.linkifyFilePaths(filteredText);

        // Render as markdown
        void MarkdownRenderer.render(
            this.app,
            processedText,
            contentDiv,
            this.currentNotePath,
            this
        ).catch((e: unknown) => {
            console.error('[Show Result Markdown] Render error:', e);
            contentDiv.textContent = filteredText;
        });

        // Auto-scroll to bottom
        this.resultArea.scrollTop = this.resultArea.scrollHeight;
    }

    /**
     * Setup smart auto-scroll detection on result area
     */
    private setupSmartAutoScroll(): void {
        // Track when user manually scrolls
        this.resultArea.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.resultArea;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50; // Within 50px of bottom

            // If user scrolled up (away from bottom), mark as manually scrolled
            if (!isNearBottom) {
                this.userHasScrolled = true;
            } else {
                // If user scrolled back to bottom, resume auto-scroll
                this.userHasScrolled = false;
            }
        });
    }

    /**
     * Auto-scroll result area to bottom (only if user hasn't manually scrolled up)
     */
    private autoScrollResult(): void {
        if (!this.userHasScrolled) {
            this.resultArea.scrollTop = this.resultArea.scrollHeight;
        }
    }

    /**
     * Reset scroll state (call when starting new request)
     */
    private resetScrollState(): void {
        this.userHasScrolled = false;
        this.lastRenderedText = ''; // Reset incremental rendering state
    }

    /**
     * Finish the streaming result block
     * Clear all streaming content and re-render as proper markdown with links
     */
    private finishResultStreaming(): void {
        // Clear any pending markdown render timeout
        if (this.markdownRenderTimeout) {
            clearTimeout(this.markdownRenderTimeout);
            this.markdownRenderTimeout = null;
        }

        // Clear streaming text span reference
        this.streamingTextSpan = null;

        if (this.currentResultStreamingElement) {
            // Get the accumulated text
            const accumulatedText = (this.currentResultStreamingElement as unknown as StreamingElementData).accumulatedText || '';
            const elementToFinish = this.currentResultStreamingElement;

            if (accumulatedText.trim()) {
                // Apply linkification to the full text
                const processedText = this.linkifyFilePaths(accumulatedText);

                // Create a temporary container for the new content
                const tempContainer = document.createElement('div');

                // Render markdown into temp container, then swap
                void MarkdownRenderer.render(
                    this.app,
                    processedText,
                    tempContainer,
                    this.currentNotePath,
                    this
                ).then(() => {
                    // Only swap after render is complete
                    elementToFinish.empty();
                    while (tempContainer.firstChild) {
                        elementToFinish.appendChild(tempContainer.firstChild);
                    }
                }).catch((e: unknown) => {
                    console.error('[Finish Result Streaming] Render error:', e);
                    // Keep existing content on error
                });
            }

            // Update CSS classes
            elementToFinish.removeClass('claude-code-result-streaming');
            elementToFinish.addClass('markdown-rendered');
            elementToFinish.addClass('claude-code-result-block');
            elementToFinish.setAttribute('data-block-index', String(this.resultBlockCount));

            // Add a divider after this block
            const divider = document.createElement('hr');
            divider.addClass('claude-code-block-divider');
            this.resultArea.appendChild(divider);

            // Increment block counter
            this.resultBlockCount++;

            // Clear the streaming element reference
            this.currentResultStreamingElement = null;
        }
        // Reset rendering state for next block
        this.lastRenderedText = '';
    }

    /**
     * Make earlier result blocks collapsible (called at end of run)
     */
    private makeEarlierBlocksCollapsible(): void {
        if (this.resultBlockCount <= 1) return; // Only one block, nothing to collapse

        const blocks = this.resultArea.querySelectorAll('.claude-code-result-block');
        blocks.forEach((block, index) => {
            // Make all blocks except the last one collapsible
            if (index < blocks.length - 1) {
                this.wrapInCollapsible(block as HTMLElement, `Reasoning step ${index + 1}`);
            }
        });

        // Remove dividers that are now inside collapsibles or at the end
        const dividers = this.resultArea.querySelectorAll('.claude-code-block-divider');
        dividers.forEach((divider, index) => {
            // Keep only the divider before the last block
            if (index < dividers.length - 1) {
                divider.remove();
            }
        });
    }

    /**
     * Wrap an element in a collapsible details container
     */
    private wrapInCollapsible(element: HTMLElement, summary: string): void {
        const details = document.createElement('details');
        details.addClass('claude-code-collapsible-block');

        const summaryEl = document.createElement('summary');
        summaryEl.addClass('claude-code-collapsible-summary');
        summaryEl.textContent = summary;

        // Move the element into the details
        const parent = element.parentNode;
        if (parent) {
            parent.insertBefore(details, element);
            details.appendChild(summaryEl);
            details.appendChild(element);
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
        }

        // Linkify file paths before rendering
        const processedMessage = this.linkifyFilePaths(filteredMessage);

        // Render as markdown
        void MarkdownRenderer.render(
            this.app,
            processedMessage,
            this.resultArea,
            this.currentNotePath,
            this
        );

        const resultSection = document.getElementById('claude-code-result-section');
        if (resultSection) {
            resultSection.removeClass('claude-code-hidden');
            resultSection.addClass('claude-code-visible');
        }

        // Hide status area, show result area
        this.statusIndicator.addClass('claude-code-hidden');
        this.statusIndicator.removeClass('claude-code-flex-visible');
        this.resultArea.removeClass('claude-code-hidden');
        this.resultArea.addClass('claude-code-visible');
    }

    /**
     * Hide result panel
     */
    private hideResult(): void {
        // Hide the result area but don't hide the entire section if status is showing
        this.resultArea.addClass('claude-code-hidden');
        this.resultArea.removeClass('claude-code-visible');
        this.resultArea.empty();

        // Only hide the entire section if status is also not visible
        if (this.statusIndicator.hasClass('claude-code-hidden')) {
            const resultSection = document.getElementById('claude-code-result-section');
            if (resultSection) {
                resultSection.addClass('claude-code-hidden');
                resultSection.removeClass('claude-code-visible');
            }
        }
    }

    /**
     * Show permission approval section
     */
    private showPermissionApprovalSection(): void {
        if (this.permissionApprovalSection) {
            this.permissionApprovalSection.removeClass('claude-code-hidden');
            this.permissionApprovalSection.addClass('claude-code-visible');
        }
    }

    /**
     * Hide permission approval section
     */
    private hidePermissionApprovalSection(): void {
        if (this.permissionApprovalSection) {
            this.permissionApprovalSection.addClass('claude-code-hidden');
            this.permissionApprovalSection.removeClass('claude-code-visible');
        }
    }

    /**
     * Handle approve permission button click
     */
    private async handleApprovePermission(): Promise<void> {
        const context = this.getCurrentContext();
        if (!context.currentRequest) {
            new Notice(t('misc.noPendingRequest'));
            return;
        }

        // Hide permission approval section
        this.hidePermissionApprovalSection();

        // Get active file
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice(t('notice.noActiveNote'));
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
            new Notice(t('notice.noEditor'));
            return;
        }

        const editor = activeView.editor;

        // Prepare a new prompt telling Claude to proceed with bypass permissions
        const approvalPrompt = "Yes, I approve. You have permissionless mode enabled - please proceed with the action you were asking about. Don't hesitate to execute it.";

        // Create a new request with bypass permissions enabled
        const newRequest: ClaudeCodeRequest = {
            ...context.currentRequest,
            userPrompt: approvalPrompt,
            bypassPermissions: true,
            configDir: this.app.vault.configDir
        };

        // Update UI
        this.runButton.disabled = true;
        this.runButton.textContent = t('input.runningButton');
        this.cancelButton.removeClass('claude-code-hidden');
        this.cancelButton.addClass('claude-code-inline-visible');
        this.outputRenderer.clear();
        this.hidePreview();

        // Clear result area but keep section visible for prompt and status
        this.resultArea.empty();
        this.resultArea.addClass('claude-code-hidden');

        // Show status with elapsed time tracking (keeps prompt visible)
        this.showStatus('🔓 ' + t('status.runningAuthorized') + ' ... 0.0s');
        this.startElapsedTimeTracking('🔓 ' + t('status.runningAuthorized'));

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
        context.executionStartTime = undefined;
        context.baseStatusMessage = undefined;

        // Hide status
        this.hideStatus();

        // Update UI
        this.runButton.disabled = false;
        this.runButton.textContent = t('input.runButton', { backend: this.getBackendName() });

        this.cancelButton.addClass('claude-code-hidden');
        this.cancelButton.removeClass('claude-code-inline-visible');

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

            const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
            this.contextManager.saveContext(file.path, vaultPath);

            if (response.modifiedContent && response.modifiedContent.trim()) {
                if (this.autoAcceptCheckbox.checked) {
                    if (this.currentNotePath === runNotePath) {
                        this.showStatus('✅ ' + t('status.autoApplying'));
                    }
                    this.applyChangesToEditor(response.modifiedContent, editor);
                    if (this.currentNotePath === runNotePath) {
                        this.hideStatus();
                    }
                    new Notice('✓ ' + t('notice.changesApplied'));
                } else {
                    this.showPreview(response.modifiedContent, runNotePath);
                }
            } else {
                // Only update UI if this is still the active note
                if (this.currentNotePath === runNotePath) {
                    // Only call showResult if we haven't been streaming (streaming already rendered the result)
                    const resultSection = document.getElementById('claude-code-result-section');
                    const hasStreamedContent = resultSection && resultSection.hasClass('claude-code-visible') && this.resultArea.children.length > 0;

                    if (!hasStreamedContent && response.assistantMessage && response.assistantMessage.trim()) {
                        this.showResult(response.assistantMessage);
                        new Notice('✓ ' + t('notice.completed', { backend: this.getBackendName() }));
                    } else if (hasStreamedContent) {
                        // Result was already streamed, just show notice
                        new Notice('✓ ' + t('notice.completed', { backend: this.getBackendName() }));
                    } else {
                        new Notice('✓ ' + t('notice.completedNoChanges', { backend: this.getBackendName() }));
                    }
                } else {
                    new Notice('✓ ' + t('notice.completed', { backend: this.getBackendName() }));
                }
            }
        } else {
            if (this.currentNotePath === runNotePath) {
                this.showErrorStatus('❌ ' + t('status.failed'));
            }
            new Notice(`✗ Claude Code failed: ${response.error || 'Unknown error'}`);
        }
    }

    /**
     * Handle deny permission button click
     */
    private handleDenyPermission(): void {
        this.hidePermissionApprovalSection();
        new Notice(t('notice.permissionDenied', { backend: this.getBackendName() }));
    }

    /**
     * Handle apply changes
     */
    private handleApplyChanges(): void {
        const context = this.getCurrentContext();

        // Use pending preview content (per-note state) or fall back to response
        const contentToApply = context.pendingPreviewContent || context.currentResponse?.modifiedContent;

        if (!contentToApply) {
            new Notice('⚠ ' + t('notice.noChangesToApply'));
            console.error('[Apply Changes] No modified content found in context');
            return;
        }

        // Get the active file
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('⚠ ' + t('notice.noActiveFile'));
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
            new Notice('⚠ ' + t('notice.noEditor'));
            console.error('[Apply Changes] No markdown view or editor found');
            return;
        }

        try {
            this.applyChangesToEditor(contentToApply, targetView.editor);
            this.hidePreview();
            new Notice('✓ ' + t('notice.changesAppliedSuccess'));
        } catch (error) {
            new Notice('✗ ' + t('notice.failedApplyChanges'));
            console.error('[Apply Changes] Error:', error);
        }
    }

    /**
     * Apply changes to editor
     */
    private applyChangesToEditor(content: string, editor: Editor): void {
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
        new Notice(t('notice.changesRejected'));
    }

    /**
     * Handle cancel
     */
    private handleCancel(): void {
        const context = this.getCurrentContext();
        context.runner.terminate();
        context.isRunning = false;
        context.executionStartTime = undefined;
        context.baseStatusMessage = undefined;
        this.runButton.disabled = false;
        this.runButton.textContent = t('input.runButton', { backend: this.getBackendName() });
        this.cancelButton.addClass('claude-code-hidden');
        this.cancelButton.removeClass('claude-code-inline-visible');
        this.hideStatus();
        new Notice(t('notice.cancelled'));
    }

    /**
     * Respond to interactive prompt (placeholder for future use)
     */
    private respondToPrompt(response: string): void {
        // Future implementation for interactive Q&A
        console.debug('Interactive response:', response);
    }

    /**
     * Generate diff HTML between original and modified content
     */
    private generateDiffElement(original: string, modified: string): HTMLElement {
        return DiffGenerator.generateDiffElement(original, modified);
    }

    /**
     * Update history display
     */
    private updateHistoryDisplay(history: SessionHistoryItem[]): void {
        this.historyList.empty();

        const historySection = document.getElementById('claude-code-history-section');

        if (history.length === 0) {
            // Hide history section when empty
            if (historySection) {
                historySection.addClass('claude-code-hidden');
                historySection.removeClass('claude-code-visible');
            }
            return;
        }

        // Show history section when there's content
        if (historySection) {
            historySection.removeClass('claude-code-hidden');
            historySection.addClass('claude-code-visible');
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
            li.addClass('claude-code-cursor-pointer');
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

            // BUG FIX: Restore the assistant message in the Result section
            if (item.response.assistantMessage && item.response.assistantMessage.trim()) {
                this.showResult(item.response.assistantMessage);
            }
        }
        if (item.request) {
            context.currentRequest = item.request;
        }

        // Show preview if there's a successful response with content
        if (item.success && item.response?.modifiedContent) {
            this.showPreview(item.response.modifiedContent);
            new Notice(t('notice.historyRestoredWithChanges'));
        } else {
            this.hidePreview();
            new Notice(t('notice.historyRestored'));
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
            historySection.addClass('claude-code-hidden');
            historySection.removeClass('claude-code-visible');
        }
        new Notice(t('notice.historyCleared'));
    }

    /**
     * Refresh the sessions list from disk
     */
    private refreshSessionsList(): void {
        const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
        if (!vaultPath) return;

        const sessions = SessionManager.listAllSessions(vaultPath, this.app.vault.configDir);
        const sessionsList = document.getElementById('claude-code-sessions-list');

        if (!sessionsList) return;

        // Clean up any existing timer intervals before clearing
        const oldBadges = sessionsList.querySelectorAll('.claude-code-session-running-badge');
        oldBadges.forEach((badge) => {
            const badgeEl = badge as HTMLElement & { _intervalId?: ReturnType<typeof setInterval> };
            if (badgeEl._intervalId) {
                clearInterval(badgeEl._intervalId);
            }
        });

        // Clear existing items
        sessionsList.empty();

        if (sessions.length === 0) {
            // Show empty message
            sessionsList.createEl('div', {
                cls: 'claude-code-sessions-empty',
                text: t('sessions.empty')
            });
            return;
        }

        // Get running note paths to show running indicator
        const runningPaths = this.contextManager.getRunningNotePaths();

        // Create session items
        for (const session of sessions) {
            // Check if any linked note is running
            const linkedNotePaths = session.metadata.linkedNotes?.map(n => n.path) || [];
            const isRunning = linkedNotePaths.some(p => runningPaths.includes(p));
            const isStandalone = session.metadata.isStandalone && linkedNotePaths.length === 0;

            const sessionItem = sessionsList.createEl('div', {
                cls: `claude-code-session-item claude-code-cursor-pointer${isRunning ? ' is-running' : ''}${isStandalone ? ' is-standalone' : ''}`
            });
            sessionItem.setAttribute('title', t('sessions.openSession'));

            // Make entire item clickable to open session
            sessionItem.addEventListener('click', () => this.openSession(session.sessionDir));

            // Left side: session info
            const infoDiv = sessionItem.createEl('div', { cls: 'claude-code-session-info' });

            // Session name
            const titleEl = infoDiv.createEl('div', { cls: 'claude-code-session-title' });
            if (isStandalone) {
                titleEl.createEl('span', { cls: 'claude-code-session-standalone-icon', text: '📝 ' });
            }
            titleEl.appendText(session.metadata.sessionName || 'Untitled Session');

            // Linked notes (if any)
            if (linkedNotePaths.length > 0) {
                const notesEl = infoDiv.createEl('div', { cls: 'claude-code-session-notes' });
                for (const note of session.metadata.linkedNotes.slice(0, 3)) {
                    const noteLink = notesEl.createEl('span', {
                        cls: 'claude-code-session-note-link',
                        text: note.title
                    });
                    noteLink.setAttribute('title', note.path);
                    noteLink.addEventListener('click', (e) => {
                        e.stopPropagation();
                        void this.openNoteByPath(note.path);
                    });
                }
                if (linkedNotePaths.length > 3) {
                    notesEl.createEl('span', {
                        cls: 'claude-code-session-note-more',
                        text: `+${linkedNotePaths.length - 3} more`
                    });
                }
            }

            // Metadata line
            const metaEl = infoDiv.createEl('div', { cls: 'claude-code-session-meta' });

            // Running badge with live timer (if running)
            if (isRunning) {
                const runningBadge = metaEl.createEl('span', {
                    cls: 'claude-code-session-running-badge'
                });
                runningBadge.createEl('span', { cls: 'claude-code-spinner' });
                const timerSpan = runningBadge.createEl('span', { cls: 'claude-code-session-timer' });

                // Get start time from first running note's context
                const runningNotePath = linkedNotePaths.find(p => runningPaths.includes(p));
                const context = runningNotePath ? this.contextManager.getContext(runningNotePath) : null;
                const startTime = context?.executionStartTime;

                // Update timer immediately and set interval
                const updateTimer = () => {
                    if (startTime) {
                        const elapsed = Date.now() - startTime;
                        const seconds = Math.floor(elapsed / 1000);
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        timerSpan.textContent = mins > 0
                            ? `${mins}m ${secs}s`
                            : `${secs}s`;
                    } else {
                        timerSpan.textContent = 'Running...';
                    }
                };
                updateTimer();

                // Store interval ID on the element for cleanup
                const intervalId = setInterval(updateTimer, 1000);
                (runningBadge as HTMLElement & { _intervalId?: ReturnType<typeof setInterval> })._intervalId = intervalId;
            }

            // Standalone badge
            if (isStandalone) {
                metaEl.createEl('span', {
                    cls: 'claude-code-session-standalone-badge',
                    text: t('sessions.standalone')
                });
            }

            // Backend badge
            metaEl.createEl('span', {
                cls: `claude-code-session-backend claude-code-backend-${session.metadata.backend}`,
                text: session.metadata.backend === 'claude' ? 'Claude' : 'OpenCode'
            });

            // Last used time
            const lastUsed = new Date(session.metadata.lastUsed);
            const timeAgo = this.formatTimeAgo(lastUsed);
            metaEl.createEl('span', {
                cls: 'claude-code-session-time',
                text: timeAgo
            });

            // Message count
            metaEl.createEl('span', {
                cls: 'claude-code-session-messages',
                text: `${session.metadata.messageCount} ${t('sessions.messages')}`
            });

            // Right side: delete button
            const deleteBtn = sessionItem.createEl('button', {
                cls: 'claude-code-session-delete',
                attr: { 'aria-label': t('sessions.deleteSession') }
            });
            deleteBtn.textContent = '🗑️';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSession(session.sessionDir);
            });
        }
    }

    /**
     * Format a date as relative time ago (e.g., "2 hours ago")
     */
    private formatTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    /**
     * Open a note by its path and switch to Assistant tab
     */
    private async openNoteByPath(notePath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(file);
            // Switch to assistant tab after opening
            this.switchTab('assistant');
        } else {
            new Notice(`File not found: ${notePath}`);
        }
    }

    /**
     * Delete a session and refresh the list
     */
    private deleteSession(sessionDir: string): void {
        // eslint-disable-next-line no-alert
        if (confirm(t('sessions.deleteConfirm'))) {
            const success = SessionManager.deleteSession(sessionDir);
            if (success) {
                new Notice(t('sessions.deleted'));
                this.refreshSessionsList();
            }
        }
    }

    /**
     * Create a new standalone session
     */
    private createNewSession(): void {
        const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
        if (!vaultPath) {
            new Notice('Could not determine vault path');
            return;
        }

        const backend = this.plugin.settings.backend;
        const sessionInfo = SessionManager.createStandaloneSession(
            vaultPath,
            this.app.vault.configDir,
            backend
        );

        // Store the active session for standalone mode
        this.activeStandaloneSession = sessionInfo.sessionDir;

        // Switch to assistant tab
        this.switchTab('assistant');

        // Set the current note path to standalone format (so UI updates work)
        this.currentNotePath = `standalone:${sessionInfo.sessionDir}`;
        this.updateCurrentNoteLabel();

        // Clear the output and result areas
        this.outputRenderer?.clear();
        this.resultArea?.empty();
        this.resultArea?.addClass('claude-code-hidden');
        this.agentTracker.clear();
        this.clearTodoList();

        // Focus the prompt input
        this.promptInput.focus();

        new Notice(t('sessions.created'));
        this.refreshSessionsList();
    }

    /**
     * Open an existing session
     */
    private openSession(sessionDir: string): void {
        const metadata = SessionManager.getSessionMetadata(sessionDir);
        if (!metadata) {
            new Notice('Session not found');
            return;
        }

        // If session has linked notes, open the primary one
        const primaryNote = metadata.linkedNotes?.find(n => n.isPrimary) || metadata.linkedNotes?.[0];
        if (primaryNote) {
            void this.openNoteByPath(primaryNote.path);
        } else {
            // Standalone session with no linked notes - set as active standalone session
            this.activeStandaloneSession = sessionDir;
            this.currentNotePath = `standalone:${sessionDir}`;
            this.updateCurrentNoteLabel();

            // Switch to assistant tab
            this.switchTab('assistant');

            // Clear the output and result areas first
            this.outputRenderer?.clear();
            this.resultArea?.empty();
            this.agentTracker.clear();
            this.clearTodoList();
        }

        // Load and show the last result from this session
        this.loadSessionLastResult(sessionDir);

        // Focus the prompt input
        this.promptInput.focus();
    }

    /**
     * Load and display the last result from a session
     */
    private loadSessionLastResult(sessionDir: string): void {
        // Get the last assistant response
        const lastResponse = SessionManager.getLastAssistantResponse(sessionDir);
        const lastPrompt = SessionManager.getLastUserPrompt(sessionDir);

        if (lastPrompt) {
            this.showLastPrompt(lastPrompt);
        }

        if (lastResponse) {
            // Show the last response in the Result section
            this.showResult(lastResponse);
        } else {
            // No previous result, hide the result area
            this.resultArea?.addClass('claude-code-hidden');
            const resultSection = document.getElementById('claude-code-result-section');
            if (resultSection) {
                resultSection.addClass('claude-code-hidden');
            }
        }
    }

    /**
     * Clear the todo list display
     */
    private clearTodoList(): void {
        const planColumn = document.querySelector('.claude-code-plan-column') as HTMLElement;
        const todoList = document.getElementById('claude-code-todo-list');
        const emptyPlan = document.getElementById('claude-code-empty-plan');

        console.debug('[Clear Todo List] Called');

        if (!todoList || !planColumn) {
            console.debug('[Clear Todo List] Elements not found');
            return;
        }

        // Clear the list
        todoList.empty();

        // Hide empty message and list
        if (emptyPlan) {
            emptyPlan.addClass('claude-code-hidden');
        }
        todoList.addClass('claude-code-hidden');

        // Hide the PLAN COLUMN only
        planColumn.addClass('claude-code-hidden');

        console.debug('[Clear Todo List] Plan column hidden');
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
            planColumn.addClass('claude-code-hidden');
            if (emptyPlan) emptyPlan.addClass('claude-code-hidden');
            todoList.addClass('claude-code-hidden');

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
            planColumn.removeClass('claude-code-hidden');
            planColumn.addClass('claude-code-flex-visible');

            // Hide empty message and show todos
            if (emptyPlan) emptyPlan.addClass('claude-code-hidden');
            todoList.removeClass('claude-code-hidden');
            todoList.addClass('claude-code-flex-visible');

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
     * Open the plugin settings page
     */
    private openPluginSettings(): void {
        // Access Obsidian's settings modal and open the plugin tab
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const setting = (this.app as any).setting as { open: () => void; openTabById: (id: string) => void } | undefined;
        if (setting) {
            setting.open();
            setting.openTabById('claude-code-integration');
        }
    }

    /**
     * Update settings - called when plugin settings are changed
     */
    updateSettings(): void {
        // Update context manager with new settings (propagates to all runners)
        this.contextManager.updateSettings(this.plugin.settings);

        // Check if backend changed - requires full UI rebuild
        if (this.currentBackend !== this.plugin.settings.backend) {
            this.currentBackend = this.plugin.settings.backend;
            this.rebuildUI();
            return;
        }

        // Update UI elements
        this.autoAcceptCheckbox.checked = this.plugin.settings.autoAcceptChanges;
        this.modelSelect.value = this.plugin.settings.modelAlias;

        // Update the leaf tab title (in case backend changed)
        // Use unofficial API to update title element directly
        const titleEl = (this.leaf as unknown as { tabHeaderInnerTitleEl?: HTMLElement }).tabHeaderInnerTitleEl;
        if (titleEl) {
            titleEl.textContent = this.getDisplayText();
        }
    }

    /**
     * Rebuild the entire UI - called when backend changes
     */
    private rebuildUI(): void {
        const container = this.containerEl.children[1] as HTMLElement;

        // Clean up existing event listeners
        if (this.promptInputKeydownHandler) {
            this.promptInput.removeEventListener('keydown', this.promptInputKeydownHandler);
            this.promptInputKeydownHandler = null;
        }
        for (const { element, event, handler } of this.eventListeners) {
            element.removeEventListener(event, handler);
        }
        this.eventListeners = [];

        // Stop intervals
        this.stopSessionsAutoRefresh();
        this.stopElapsedTimeTracking();

        // Clear and rebuild
        container.empty();
        container.addClass('claude-code-view');
        this.buildUI(container);

        // Reinitialize output renderer
        this.outputRenderer = new OutputRenderer(this.outputArea, this, this.app, this.currentNotePath, this.outputSection);

        // Reload context for current note
        if (this.currentNotePath) {
            this.loadNoteContext(this.currentNotePath);
        }

        // Update tab title
        const titleEl = (this.leaf as unknown as { tabHeaderInnerTitleEl?: HTMLElement }).tabHeaderInnerTitleEl;
        if (titleEl) {
            titleEl.textContent = this.getDisplayText();
        }
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

        // Clean up intervals
        this.stopSessionsAutoRefresh();
        this.stopElapsedTimeTracking();

        // Save all contexts
        const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
        if (vaultPath) {
            try {
                this.contextManager.saveAllContexts(vaultPath);
            } catch (error) {
                console.error('Failed to save contexts on close:', error);
            }
        }
    }
}
