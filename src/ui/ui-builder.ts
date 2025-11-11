/**
 * UI Builder - Handles creation of UI elements for the Claude Code view
 */

export interface UIElements {
    promptInput: HTMLTextAreaElement;
    runButton: HTMLButtonElement;
    cancelButton: HTMLButtonElement;
    outputArea: HTMLDivElement;
    resultArea: HTMLDivElement;
    previewArea: HTMLDivElement;
    previewContentContainer: HTMLDivElement;
    previewTabsContainer: HTMLDivElement;
    applyButton: HTMLButtonElement;
    rejectButton: HTMLButtonElement;
    selectedTextOnlyCheckbox: HTMLInputElement;
    autoAcceptCheckbox: HTMLInputElement;
    conversationalModeCheckbox: HTMLInputElement;
    statusIndicator: HTMLDivElement;
    statusText: HTMLSpanElement;
    interactivePromptSection: HTMLDivElement;
    permissionApprovalSection: HTMLDivElement;
    approvePermissionButton: HTMLButtonElement;
    denyPermissionButton: HTMLButtonElement;
    currentNoteLabel: HTMLDivElement;
    historyList: HTMLUListElement;
}

export class UIBuilder {
    /**
     * Build the header section
     */
    static buildHeader(container: HTMLElement): HTMLDivElement {
        const header = container.createEl('div', { cls: 'claude-code-header' });
        const headerTitle = header.createEl('div', { cls: 'claude-code-header-title' });
        headerTitle.createEl('h4', { text: 'Claude Code Assistant' });

        const currentNoteLabel = header.createEl('div', { cls: 'claude-code-current-note' });
        return currentNoteLabel;
    }

    /**
     * Build the input section with prompt textarea and options
     */
    static buildInputSection(
        container: HTMLElement,
        autoAcceptDefault: boolean,
        onRun: () => void,
        onCancel: () => void
    ): {
        promptInput: HTMLTextAreaElement;
        selectedTextOnlyCheckbox: HTMLInputElement;
        autoAcceptCheckbox: HTMLInputElement;
        conversationalModeCheckbox: HTMLInputElement;
        modelSelect: HTMLSelectElement;
        runButton: HTMLButtonElement;
        cancelButton: HTMLButtonElement;
    } {
        const inputSection = container.createEl('div', { cls: 'claude-code-input-section' });

        // Prompt textarea
        inputSection.createEl('label', { text: 'Your Instructions:' });
        const promptInput = inputSection.createEl('textarea', {
            cls: 'claude-code-prompt-input',
            attr: {
                placeholder: 'e.g., "Add more examples to this section" or "Reorganize with better headers" (Enter to send, Ctrl+Enter for new line)'
            }
        });
        promptInput.rows = 4;

        // Options
        const optionsDiv = inputSection.createEl('div', { cls: 'claude-code-options' });

        // Conversational mode checkbox
        const conversationalLabel = optionsDiv.createEl('label', { cls: 'claude-code-checkbox-label' });
        const conversationalModeCheckbox = conversationalLabel.createEl('input', { type: 'checkbox' });
        conversationalLabel.appendText(' 💬 Conversational mode (no file edits)');
        conversationalLabel.title = 'Chat with Claude without modifying any files';

        // Selected text only checkbox
        const selectedTextLabel = optionsDiv.createEl('label', { cls: 'claude-code-checkbox-label' });
        const selectedTextOnlyCheckbox = selectedTextLabel.createEl('input', { type: 'checkbox' });
        selectedTextLabel.appendText(' Edit selected text only');

        // Auto-accept changes checkbox
        const autoAcceptLabel = optionsDiv.createEl('label', { cls: 'claude-code-checkbox-label' });
        const autoAcceptCheckbox = autoAcceptLabel.createEl('input', { type: 'checkbox' });
        autoAcceptCheckbox.checked = autoAcceptDefault;
        autoAcceptLabel.appendText(' Auto-accept changes');

        // Model selector
        const modelSelectContainer = optionsDiv.createEl('div', { cls: 'claude-code-model-select' });
        modelSelectContainer.createEl('label', { text: 'Model: ', cls: 'claude-code-model-label' });
        const modelSelect = modelSelectContainer.createEl('select', { cls: 'claude-code-model-dropdown' });
        modelSelect.createEl('option', { value: '', text: 'Default' });
        modelSelect.createEl('option', { value: 'sonnet', text: 'Sonnet' });
        modelSelect.createEl('option', { value: 'opus', text: 'Opus' });
        modelSelect.createEl('option', { value: 'haiku', text: 'Haiku' });

        // Button container
        const buttonContainer = inputSection.createEl('div', { cls: 'claude-code-button-container' });

        const runButton = buttonContainer.createEl('button', {
            cls: 'mod-cta',
            text: 'Run Claude Code'
        });
        runButton.addEventListener('click', onRun);

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'claude-code-cancel-button'
        });
        cancelButton.style.display = 'none';
        cancelButton.addEventListener('click', onCancel);

        // Note: Status indicator has been moved into Result section (buildResultSection)
        // No longer creating a separate status indicator here

        return {
            promptInput,
            selectedTextOnlyCheckbox,
            autoAcceptCheckbox,
            conversationalModeCheckbox,
            modelSelect,
            runButton,
            cancelButton
        };
    }

    /**
     * Build the combined agent section (plan + activity in two columns)
     */
    static buildAgentSection(container: HTMLElement): void {
        // Main container for the entire agent section
        const agentContainer = container.createEl('div', {
            cls: 'claude-code-agent-container'
        });
        agentContainer.style.display = 'none';
        agentContainer.id = 'claude-code-agent-container';

        // Left column: Claude's Plan (todos)
        const planColumn = agentContainer.createEl('div', { cls: 'claude-code-agent-column claude-code-plan-column' });
        planColumn.style.display = 'none'; // Hidden by default - only shown when there's a plan

        const planHeader = planColumn.createEl('div', { cls: 'claude-code-agent-column-header' });
        planHeader.createEl('span', { text: '📋 Plan' });

        const todoList = planColumn.createEl('div', {
            cls: 'claude-code-todo-list',
            attr: { id: 'claude-code-todo-list' }
        });
        todoList.style.display = 'none'; // Hidden by default

        const emptyPlanMessage = planColumn.createEl('div', {
            cls: 'claude-code-empty-message',
            text: 'No plan created yet'
        });
        emptyPlanMessage.id = 'claude-code-empty-plan';
        emptyPlanMessage.style.display = 'none'; // Hidden by default

        // Right column: Agent Activity (tool executions)
        const activityColumn = agentContainer.createEl('div', { cls: 'claude-code-agent-column claude-code-activity-column' });

        const activityHeader = activityColumn.createEl('div', { cls: 'claude-code-agent-column-header collapsible-header' });
        const activityTitle = activityHeader.createEl('span', { cls: 'collapsible-title' });
        activityTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        activityTitle.appendText('Activity');

        const activitySteps = activityColumn.createEl('div', {
            cls: 'claude-code-agent-steps collapsible-content',
            attr: { id: 'claude-code-agent-steps' }
        });

        // Add click handler to toggle collapse
        activityHeader.addEventListener('click', () => {
            const isCollapsed = activitySteps.style.display === 'none';
            activitySteps.style.display = isCollapsed ? 'block' : 'none';
            const indicator = activityHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on container
            if (isCollapsed) {
                agentContainer.removeClass('collapsed');
            } else {
                agentContainer.addClass('collapsed');
            }
        });
    }

    /**
     * Build the interactive prompt section (for future use)
     */
    static buildInteractivePromptSection(
        container: HTMLElement,
        onRespond: (response: string) => void
    ): HTMLDivElement {
        const interactivePromptSection = container.createEl('div', {
            cls: 'claude-code-interactive-prompt'
        });
        interactivePromptSection.style.display = 'none';
        interactivePromptSection.id = 'claude-code-interactive-prompt';

        interactivePromptSection.createEl('div', {
            cls: 'interactive-prompt-header',
            text: '❓ Claude is asking for confirmation'
        });

        interactivePromptSection.createEl('div', {
            cls: 'interactive-prompt-question',
            attr: { id: 'interactive-prompt-question' }
        });

        const promptButtons = interactivePromptSection.createEl('div', {
            cls: 'interactive-prompt-buttons'
        });

        const yesButton = promptButtons.createEl('button', {
            cls: 'mod-cta',
            text: '✓ Yes / Sí'
        });
        yesButton.addEventListener('click', () => onRespond('yes'));

        const noButton = promptButtons.createEl('button', {
            text: '✗ No'
        });
        noButton.addEventListener('click', () => onRespond('no'));

        const customResponseInput = interactivePromptSection.createEl('input', {
            cls: 'interactive-prompt-input',
            attr: {
                placeholder: 'Or type a custom response...',
                id: 'interactive-prompt-input'
            }
        });
        customResponseInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                onRespond(customResponseInput.value);
            }
        });

        return interactivePromptSection;
    }

    /**
     * Build the permission approval section
     */
    static buildPermissionApprovalSection(
        container: HTMLElement,
        onApprove: () => void,
        onDeny: () => void
    ): {
        permissionApprovalSection: HTMLDivElement;
        approvePermissionButton: HTMLButtonElement;
        denyPermissionButton: HTMLButtonElement;
    } {
        const permissionApprovalSection = container.createEl('div', {
            cls: 'claude-code-permission-approval'
        });
        permissionApprovalSection.style.display = 'none';
        permissionApprovalSection.id = 'claude-code-permission-approval';

        permissionApprovalSection.createEl('div', {
            cls: 'permission-approval-header',
            text: '🔐 Permission Required'
        });

        permissionApprovalSection.createEl('div', {
            cls: 'permission-approval-message',
            text: 'Claude is requesting permission to execute actions.'
        });

        const approvalButtons = permissionApprovalSection.createEl('div', {
            cls: 'permission-approval-buttons'
        });

        const approvePermissionButton = approvalButtons.createEl('button', {
            cls: 'mod-cta'
        });
        approvePermissionButton.innerHTML = '✓ Approve & Continue';
        approvePermissionButton.addEventListener('click', onApprove);

        const denyPermissionButton = approvalButtons.createEl('button', {
            cls: 'mod-warning'
        });
        denyPermissionButton.innerHTML = '✗ Deny';
        denyPermissionButton.addEventListener('click', onDeny);

        return { permissionApprovalSection, approvePermissionButton, denyPermissionButton };
    }

    /**
     * Build the result section (for non-edit responses)
     */
    static buildResultSection(container: HTMLElement): { resultArea: HTMLDivElement; statusArea: HTMLDivElement; statusText: HTMLSpanElement } {
        const resultSection = container.createEl('div', { cls: 'claude-code-result-section' });
        resultSection.style.display = 'none';
        resultSection.id = 'claude-code-result-section';

        const resultHeader = resultSection.createEl('div', { cls: 'claude-code-result-header collapsible-header' });
        const headerTitle = resultHeader.createEl('span', { cls: 'collapsible-title' });
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        headerTitle.appendText('Result');

        const contentWrapper = resultSection.createEl('div', { cls: 'collapsible-content' });

        // Status area (shown during processing)
        const statusArea = contentWrapper.createEl('div', { cls: 'claude-code-status-area' });
        statusArea.style.display = 'none';

        const statusTextContainer = statusArea.createEl('div', { cls: 'claude-code-status-text' });
        const statusSpinner = statusTextContainer.createEl('div', { cls: 'claude-code-status-spinner' });
        const statusText = statusTextContainer.createEl('span');

        const progressBarContainer = statusArea.createEl('div', { cls: 'claude-code-progress-bar-container' });
        progressBarContainer.createEl('div', { cls: 'claude-code-progress-bar' });

        // Result area (shown when there's a result)
        const resultArea = contentWrapper.createEl('div', {
            cls: 'claude-code-result-area markdown-rendered'
        });
        resultArea.style.display = 'none';

        // Add click handler to toggle collapse
        resultHeader.addEventListener('click', () => {
            const isCollapsed = contentWrapper.style.display === 'none';
            contentWrapper.style.display = isCollapsed ? 'block' : 'none';
            const indicator = resultHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            if (isCollapsed) {
                resultSection.removeClass('collapsed');
            } else {
                resultSection.addClass('collapsed');
            }
        });

        return { resultArea, statusArea, statusText };
    }

    /**
     * Build the output section
     */
    static buildOutputSection(container: HTMLElement): { outputArea: HTMLDivElement; outputSection: HTMLDivElement } {
        const outputSection = container.createEl('div', { cls: 'claude-code-output-section' });
        const outputHeader = outputSection.createEl('div', { cls: 'claude-code-output-header collapsible-header' });

        const headerTitle = outputHeader.createEl('span', { cls: 'collapsible-title' });
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        headerTitle.appendText('Output');

        const outputArea = outputSection.createEl('div', {
            cls: 'claude-code-output-area collapsible-content'
        });

        // Toggle output visibility when clicking header
        outputHeader.addEventListener('click', () => {
            const isCollapsed = outputArea.style.display === 'none';
            outputArea.style.display = isCollapsed ? 'block' : 'none';
            const indicator = outputHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            if (isCollapsed) {
                outputSection.removeClass('collapsed');
            } else {
                outputSection.addClass('collapsed');
            }
        });

        // Initially hide the output section
        outputSection.style.display = 'none';

        return { outputArea, outputSection };
    }

    /**
     * Build the preview section
     */
    static buildPreviewSection(
        container: HTMLElement,
        onApply: () => void,
        onReject: () => void
    ): {
        previewArea: HTMLDivElement;
        previewContentContainer: HTMLDivElement;
        previewTabsContainer: HTMLDivElement;
        applyButton: HTMLButtonElement;
        rejectButton: HTMLButtonElement;
    } {
        const previewSection = container.createEl('div', { cls: 'claude-code-preview-section' });
        previewSection.style.display = 'none';
        previewSection.id = 'claude-code-preview-section';

        const previewHeader = previewSection.createEl('div', { cls: 'claude-code-preview-header collapsible-header' });
        const headerTitle = previewHeader.createEl('span', { cls: 'collapsible-title' });
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        headerTitle.appendText('Preview');

        const previewContent = previewSection.createEl('div', { cls: 'claude-code-preview-content-wrapper collapsible-content' });

        // Tabs container
        const previewTabsContainer = previewContent.createEl('div', { cls: 'claude-code-preview-tabs' });

        const rawTab = previewTabsContainer.createEl('div', { cls: 'preview-tab active', text: 'Raw' });
        const diffTab = previewTabsContainer.createEl('div', { cls: 'preview-tab', text: 'Diff' });
        const renderedTab = previewTabsContainer.createEl('div', { cls: 'preview-tab', text: 'Rendered' });

        // Content container that holds all views
        const previewContentContainer = previewContent.createEl('div', { cls: 'claude-code-preview-content-container' });

        // Raw preview area (shown by default)
        const previewArea = previewContentContainer.createEl('div', { cls: 'claude-code-preview-area' });

        const previewButtons = previewContent.createEl('div', { cls: 'claude-code-preview-buttons' });

        const applyButton = previewButtons.createEl('button', {
            cls: 'mod-cta'
        });
        applyButton.innerHTML = '✓ Apply Changes';
        applyButton.addEventListener('click', onApply);

        const rejectButton = previewButtons.createEl('button', {
            cls: 'mod-warning'
        });
        rejectButton.innerHTML = '✗ Reject';
        rejectButton.addEventListener('click', onReject);

        // Tab switching logic
        rawTab.addEventListener('click', () => {
            rawTab.addClass('active');
            diffTab.removeClass('active');
            renderedTab.removeClass('active');
            previewArea.style.display = 'block';
            const diffArea = previewContentContainer.querySelector('.claude-code-preview-diff') as HTMLElement;
            const renderedArea = previewContentContainer.querySelector('.claude-code-preview-rendered') as HTMLElement;
            if (diffArea) diffArea.style.display = 'none';
            if (renderedArea) renderedArea.style.display = 'none';
        });

        diffTab.addEventListener('click', () => {
            diffTab.addClass('active');
            rawTab.removeClass('active');
            renderedTab.removeClass('active');
            previewArea.style.display = 'none';
            const diffArea = previewContentContainer.querySelector('.claude-code-preview-diff') as HTMLElement;
            const renderedArea = previewContentContainer.querySelector('.claude-code-preview-rendered') as HTMLElement;
            if (diffArea) diffArea.style.display = 'block';
            if (renderedArea) renderedArea.style.display = 'none';
        });

        renderedTab.addEventListener('click', () => {
            renderedTab.addClass('active');
            rawTab.removeClass('active');
            diffTab.removeClass('active');
            previewArea.style.display = 'none';
            const diffArea = previewContentContainer.querySelector('.claude-code-preview-diff') as HTMLElement;
            const renderedArea = previewContentContainer.querySelector('.claude-code-preview-rendered') as HTMLElement;
            if (diffArea) diffArea.style.display = 'none';
            if (renderedArea) renderedArea.style.display = 'block';
        });

        // Add click handler to toggle collapse
        headerTitle.addEventListener('click', () => {
            const isCollapsed = previewContent.style.display === 'none';
            previewContent.style.display = isCollapsed ? 'block' : 'none';
            const indicator = previewHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            if (isCollapsed) {
                previewSection.removeClass('collapsed');
            } else {
                previewSection.addClass('collapsed');
            }
        });

        return { previewArea, previewContentContainer, previewTabsContainer, applyButton, rejectButton };
    }

    /**
     * Build the history section
     */
    static buildHistorySection(
        container: HTMLElement,
        onClearHistory: () => void
    ): HTMLUListElement {
        const historySection = container.createEl('div', { cls: 'claude-code-history-section' });
        historySection.style.display = 'none';
        historySection.id = 'claude-code-history-section';

        const historyHeader = historySection.createEl('div', { cls: 'claude-code-history-header collapsible-header' });
        const headerTitle = historyHeader.createEl('span', { cls: 'collapsible-title' });
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        headerTitle.appendText('History');

        const clearHistoryBtn = historyHeader.createEl('button', {
            text: 'Clear',
            cls: 'claude-code-clear-history'
        });
        clearHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent header click
            onClearHistory();
        });

        const historyList = historySection.createEl('ul', { cls: 'claude-code-history-list collapsible-content' });

        // Add click handler to toggle collapse
        headerTitle.addEventListener('click', () => {
            const isCollapsed = historyList.style.display === 'none';
            historyList.style.display = isCollapsed ? 'block' : 'none';
            const indicator = historyHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            if (isCollapsed) {
                historySection.removeClass('collapsed');
            } else {
                historySection.addClass('collapsed');
            }
        });

        return historyList;
    }
}
