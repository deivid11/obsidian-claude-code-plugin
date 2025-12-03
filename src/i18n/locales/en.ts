/**
 * English translations (default)
 */
export const en = {
    // Header
    'header.title': 'Claude Code assistant',
    'header.noNoteSelected': 'no note selected',

    // Input Section
    'input.label': 'Your instructions:',
    'input.placeholder': 'e.g., "Add more examples to this section" or "Reorganize with better headers" (Enter to send, Ctrl+Enter for new line)',
    'input.conversationalMode': 'conversational mode (no file edits)',
    'input.conversationalModeTooltip': 'Chat with Claude without modifying any files',
    'input.selectedTextOnly': 'Edit selected text only',
    'input.autoAccept': 'Auto-accept changes',
    'input.modelLabel': 'Model:',
    'input.modelDefault': 'Default',
    'input.runButton': 'Run Claude Code',
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
    'preview.applyButton': 'apply changes',
    'preview.rejectButton': 'reject',

    // History Section
    'history.title': 'History',
    'history.clearButton': 'Clear',

    // Agent Section
    'agent.planTitle': 'plan',
    'agent.activityTitle': 'Activity',
    'agent.noPlan': 'No plan created yet',

    // Todo Status
    'todo.pending': 'pending',
    'todo.inProgress': 'in progress',
    'todo.completed': 'completed',

    // Interactive Prompt
    'interactive.header': 'Claude is asking for confirmation',
    'interactive.yesButton': 'yes',
    'interactive.noButton': 'no',
    'interactive.customPlaceholder': 'Or type a custom response...',

    // Permission Approval
    'permission.header': 'permission required',
    'permission.message': 'Claude is requesting permission to execute actions.',
    'permission.approveButton': 'approve & continue',
    'permission.denyButton': 'deny',

    // Status Messages
    'status.processing': 'Claude is processing',
    'status.autoApplying': 'Auto-applying changes...',
    'status.runningAuthorized': 'Running authorized tasks',
    'status.failed': 'Failed - see error below',

    // Notifications
    'notice.alreadyProcessing': 'Already processing a request. Please wait.',
    'notice.enterPrompt': 'Please enter a prompt',
    'notice.noActiveNote': 'No active note found, please open a Markdown note first',
    'notice.noEditor': 'No Markdown editor found, please make sure you have a note open',
    'notice.noVaultPath': 'Could not determine vault path',
    'notice.completed': 'Claude Code completed',
    'notice.completedNoChanges': 'Claude Code completed (no file changes)',
    'notice.changesApplied': 'changes applied automatically',
    'notice.changesAppliedSuccess': 'changes applied successfully',
    'notice.failedApplyChanges': 'failed to apply changes',
    'notice.changesRejected': 'Changes rejected',
    'notice.cancelled': 'Cancelled',
    'notice.permissionRequest': 'Claude is requesting permission - please approve or deny',
    'notice.permissionDenied': 'Permission denied - Claude will not proceed',
    'notice.noChangesToApply': 'no changes to apply',
    'notice.noActiveFile': 'no active file',
    'notice.historyRestored': 'History item restored',
    'notice.historyRestoredWithChanges': 'History item restored with proposed changes',
    'notice.historyCleared': 'History cleared',

    // Diff View
    'diff.original': 'Original',
    'diff.modified': 'Modified',

    // Settings
    'settings.autoDetectPath': 'Auto-detect Claude Code path',
    'settings.autoDetectPathDesc': 'Automatically detect the Claude Code executable location',
    'settings.executablePath': 'Claude Code executable path',
    'settings.executablePathDesc': 'Full path to the Claude Code executable (e.g., /usr/local/bin/claude)',
    'settings.testInstallation': 'Test Claude Code installation',
    'settings.testInstallationDesc': 'Verify that Claude Code is accessible and working',
    'settings.testButton': 'Test',
    'settings.testWorking': 'working!',
    'settings.testFailed': 'failed',
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
};

export type TranslationKey = keyof typeof en;
