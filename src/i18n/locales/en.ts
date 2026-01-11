/**
 * English translations (default)
 */
export const en = {
    // Header
    'header.title': '{backend} assistant',
    'header.noNoteSelected': 'No note selected',
    'header.settings': 'Open settings',

    // Input Section
    'input.label': 'Your instructions:',
    'input.placeholder': 'e.g., "Add more examples to this section" or "Reorganize with better headers" (Enter to send, Ctrl+Enter for new line)',
    'input.conversationalMode': 'Conversational mode (no file edits)',
    'input.conversationalModeTooltip': 'Chat with Claude without modifying any files',
    'input.selectedTextOnly': 'Edit selected text only',
    'input.autoAccept': 'Auto-accept changes',
    'input.modelLabel': 'Model:',
    'input.modelDefault': 'Default',
    'input.runButton': 'Run {backend}',
    'input.runningButton': 'Running...',
    'input.cancelButton': 'Cancel',

    // Result Section
    'result.title': 'Result',

    // Output Section
    'output.title': 'Output',

    // Preview Section
    'preview.title': 'Preview',
    'preview.tabRaw': 'Raw',
    'preview.tabDiff': 'Diff',
    'preview.tabRendered': 'Rendered',
    'preview.originalChars': 'Original:',
    'preview.modifiedChars': 'Modified:',
    'preview.chars': 'chars',
    'preview.applyButton': 'Apply changes',
    'preview.rejectButton': 'Reject',

    // History Section
    'history.title': 'History',
    'history.clearButton': 'Clear',

    // Agent Section
    'agent.planTitle': 'Plan',
    'agent.activityTitle': 'Activity',
    'agent.noPlan': 'No plan created yet',

    // Todo Status
    'todo.pending': 'Pending',
    'todo.inProgress': 'In progress',
    'todo.completed': 'Completed',

    // Interactive Prompt
    'interactive.header': '{backend} is asking for confirmation',
    'interactive.yesButton': 'Yes',
    'interactive.noButton': 'No',
    'interactive.customPlaceholder': 'Or type a custom response...',

    // Permission Approval
    'permission.header': 'Permission required',
    'permission.message': '{backend} is requesting permission to execute actions.',
    'permission.approveButton': 'Approve & continue',
    'permission.denyButton': 'Deny',

    // Status Messages
    'status.processing': '{backend} is processing',
    'status.autoApplying': 'Auto-applying changes...',
    'status.runningAuthorized': 'Running authorized tasks',
    'status.runningInBackground': 'Running in background...',
    'status.failed': 'Failed - see error below',

    // Notifications
    'notice.alreadyProcessing': 'Already processing a request. Please wait.',
    'notice.enterPrompt': 'Please enter a prompt',
    'notice.noActiveNote': 'No active note found, please open a Markdown note first',
    'notice.noEditor': 'No Markdown editor found, please make sure you have a note open',
    'notice.noVaultPath': 'Could not determine vault path',
    'notice.completed': '{backend} completed',
    'notice.completedNoChanges': '{backend} completed (no file changes)',
    'notice.changesApplied': 'Changes applied automatically',
    'notice.changesAppliedSuccess': 'Changes applied successfully',
    'notice.failedApplyChanges': 'Failed to apply changes',
    'notice.changesRejected': 'Changes rejected',
    'notice.cancelled': 'Cancelled',
    'notice.permissionRequest': '{backend} is requesting permission - please approve or deny',
    'notice.permissionDenied': 'Permission denied - {backend} will not proceed',
    'notice.noChangesToApply': 'No changes to apply',
    'notice.noActiveFile': 'No active file',
    'notice.historyRestored': 'History item restored',
    'notice.historyRestoredWithChanges': 'History item restored with proposed changes',
    'notice.historyCleared': 'History cleared',

    // Sessions
    'sessions.title': 'Sessions',
    'sessions.empty': 'No sessions yet. Create a new session to get started!',
    'sessions.newSession': 'New Session',
    'sessions.standalone': 'Standalone',
    'sessions.linkedNotes': 'Linked notes',
    'sessions.noLinkedNotes': 'No linked notes yet',
    'sessions.backend': 'Backend',
    'sessions.lastUsed': 'Last used',
    'sessions.messages': 'messages',
    'sessions.openNote': 'Open note',
    'sessions.openSession': 'Open session',
    'sessions.deleteSession': 'Delete session',
    'sessions.deleteConfirm': 'Are you sure you want to delete this session?',
    'sessions.deleted': 'Session deleted',
    'sessions.created': 'New session created',

    // Tabs
    'tabs.assistant': 'Assistant',
    'tabs.sessions': 'Sessions',

    // Diff View
    'diff.original': 'Original',
    'diff.modified': 'Modified',

    // Result Renderer
    'result.directAnswer': 'Direct answer',
    'result.additionalContext': 'Additional context',
    'result.tokens': 'tokens',
    'result.tokensIn': 'in',
    'result.tokensOut': 'out',

    // Preview Stats
    'preview.originalLabel': 'Original:',
    'preview.modifiedLabel': 'Modified:',
    'preview.charsLabel': 'chars',

    // Misc
    'misc.noPendingRequest': 'No pending request found',
    'misc.languageChanged': 'Language changed. Some UI elements will update on reload.',
    'misc.testFailed': '{backend} test failed',

    // Settings
    'settings.autoDetectPath': 'Auto-detect Claude Code path',
    'settings.autoDetectPathDesc': 'Automatically detect the Claude Code executable location',
    'settings.executablePath': 'Claude Code executable path',
    'settings.executablePathDesc': 'Full path to the Claude Code executable (e.g., /usr/local/bin/claude)',
    'settings.testInstallation': 'Test Claude Code installation',
    'settings.testInstallationDesc': 'Verify that Claude Code is accessible and working',
    'settings.testButton': 'Test',
    'settings.testWorking': 'Working!',
    'settings.testFailed': 'Failed',
    'settings.customPrompt': 'Custom system prompt',
    'settings.customPromptDesc': 'Optional custom system prompt to prepend to all requests',
    'settings.customPromptPlaceholder': 'You are helping edit markdown notes...',
    'settings.preserveCursor': 'Preserve cursor position',
    'settings.preserveCursorDesc': 'Try to maintain cursor position after applying changes',
    'settings.autoAcceptChanges': 'Auto-accept changes',
    'settings.autoAcceptChangesDesc': 'Automatically apply changes without showing preview (use with caution!)',
    'settings.model': 'Model',
    'settings.modelDesc': 'Select the Claude model to use: Sonnet (balanced), Opus (most capable), or Haiku (fastest). Leave empty to use the default subagent model.',
    'settings.modelDefault': 'Default (subagent model)',
    'settings.modelSonnet': 'Sonnet (balanced)',
    'settings.modelOpus': 'Opus (most capable)',
    'settings.modelHaiku': 'Haiku (fastest)',
    'settings.vaultAccess': 'Allow vault-wide access',
    'settings.vaultAccessDesc': 'Allow Claude to read/search other files in your vault (not just the current note)',
    'settings.permissionlessMode': 'Enable permissionless mode',
    'settings.permissionlessModeDesc': 'Allow Claude to execute actions without asking for permission each time (use with caution! Claude will have full control)',
    'settings.timeout': 'Timeout (seconds)',
    'settings.timeoutDesc': 'Maximum time to wait for Claude Code response (0 = no timeout)',
    'settings.customApiConfig': 'Custom API configuration',
    'settings.customApiConfigDesc': 'Configure custom API endpoints for regions where Claude is not directly available. Leave empty to use default settings.',
    'settings.apiBaseUrl': 'API base URL',
    'settings.apiBaseUrlDesc': 'Custom API endpoint URL (e.g., https://api.kimi.com/coding/)',
    'settings.apiAuthToken': 'API auth token',
    'settings.apiAuthTokenDesc': 'Custom authentication token for the API endpoint',
    'settings.apiAuthTokenPlaceholder': 'Enter your API token',
    'settings.customModel': 'Custom model',
    'settings.customModelDesc': 'Custom model name to use (e.g., kimi-for-coding). Overrides the model dropdown above.',
    'settings.customSmallModel': 'Custom small/fast model',
    'settings.customSmallModelDesc': 'Custom model name for fast operations (e.g., kimi-for-coding)',
    'settings.language': 'Language',
    'settings.languageDesc': 'Select interface language',

    // Backend settings
    'settings.backend': 'Backend',
    'settings.backendDesc': 'Choose which CLI backend to use for AI assistance',
    'settings.claudeSection': 'Claude Code Settings',
    'settings.opencodeSection': 'OpenCode Settings',
    'settings.commonSection': 'Common Settings',

    // OpenCode specific settings
    'settings.opencodeAutoDetect': 'Auto-detect OpenCode path',
    'settings.opencodeAutoDetectDesc': 'Automatically detect the OpenCode executable location',
    'settings.opencodePath': 'OpenCode executable path',
    'settings.opencodePathDesc': 'Full path to the OpenCode executable (e.g., /usr/local/bin/opencode)',
    'settings.testOpencode': 'Test OpenCode installation',
    'settings.testOpencodeDesc': 'Verify that OpenCode is accessible and working',
    'settings.opencodeModel': 'OpenCode model',
    'settings.opencodeModelDesc': 'Model to use in provider/model format (e.g., openai/gpt-4o, anthropic/claude-sonnet)',
};

export type TranslationKey = keyof typeof en;
