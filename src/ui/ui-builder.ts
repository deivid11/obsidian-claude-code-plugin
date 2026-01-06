/**
 * UI Builder - Handles creation of UI elements for the Claude Code view
 */

import { t } from '../i18n';

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
        headerTitle.createEl('h4', { text: t('header.title') });

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
        inputSection.createEl('label', { text: t('input.label') });
        const promptInput = inputSection.createEl('textarea', {
            cls: 'claude-code-prompt-input',
            attr: {
                placeholder: t('input.placeholder')
            }
        });
        promptInput.rows = 4;

        // Options
        const optionsDiv = inputSection.createEl('div', { cls: 'claude-code-options' });

        // Conversational mode checkbox
        const conversationalLabel = optionsDiv.createEl('label', { cls: 'claude-code-checkbox-label' });
        const conversationalModeCheckbox = conversationalLabel.createEl('input', { type: 'checkbox' });
        conversationalLabel.appendText(' ' + t('input.conversationalMode'));
        conversationalLabel.title = t('input.conversationalModeTooltip');

        // Selected text only checkbox
        const selectedTextLabel = optionsDiv.createEl('label', { cls: 'claude-code-checkbox-label' });
        const selectedTextOnlyCheckbox = selectedTextLabel.createEl('input', { type: 'checkbox' });
        selectedTextLabel.appendText(' ' + t('input.selectedTextOnly'));

        // Auto-accept changes checkbox
        const autoAcceptLabel = optionsDiv.createEl('label', { cls: 'claude-code-checkbox-label' });
        const autoAcceptCheckbox = autoAcceptLabel.createEl('input', { type: 'checkbox' });
        autoAcceptCheckbox.checked = autoAcceptDefault;
        autoAcceptLabel.appendText(' ' + t('input.autoAccept'));

        // Model selector
        const modelSelectContainer = optionsDiv.createEl('div', { cls: 'claude-code-model-select' });
        modelSelectContainer.createEl('label', { text: t('input.modelLabel') + ' ', cls: 'claude-code-model-label' });
        const modelSelect = modelSelectContainer.createEl('select', { cls: 'claude-code-model-dropdown' });
        modelSelect.createEl('option', { value: '', text: t('input.modelDefault') });
        modelSelect.createEl('option', { value: 'sonnet', text: 'Sonnet' });
        modelSelect.createEl('option', { value: 'opus', text: 'Opus' });
        modelSelect.createEl('option', { value: 'haiku', text: 'Haiku' });

        // Button container
        const buttonContainer = inputSection.createEl('div', { cls: 'claude-code-button-container' });

        const runButton = buttonContainer.createEl('button', {
            cls: 'mod-cta',
            text: t('input.runButton')
        });
        runButton.addEventListener('click', onRun);

        const cancelButton = buttonContainer.createEl('button', {
            text: t('input.cancelButton'),
            cls: 'claude-code-cancel-button claude-code-hidden'
        });
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
            cls: 'claude-code-agent-container claude-code-hidden'
        });
        agentContainer.id = 'claude-code-agent-container';

        // Left column: Claude's Plan (todos)
        const planColumn = agentContainer.createEl('div', { cls: 'claude-code-agent-column claude-code-plan-column claude-code-hidden' });
        // Hidden by default - only shown when there's a plan

        const planHeader = planColumn.createEl('div', { cls: 'claude-code-agent-column-header' });
        planHeader.createEl('span', { text: '📋 ' + t('agent.planTitle') });

        planColumn.createEl('div', {
            cls: 'claude-code-todo-list claude-code-hidden',
            attr: { id: 'claude-code-todo-list' }
        });
        // Hidden by default

        const emptyPlanMessage = planColumn.createEl('div', {
            cls: 'claude-code-empty-message claude-code-hidden',
            text: t('agent.noPlan')
        });
        emptyPlanMessage.id = 'claude-code-empty-plan';
        // Hidden by default

        // Right column: Agent Activity (tool executions)
        const activityColumn = agentContainer.createEl('div', { cls: 'claude-code-agent-column claude-code-activity-column claude-code-hidden' });
        // Hidden by default until steps are added

        const activityHeader = activityColumn.createEl('div', { cls: 'claude-code-agent-column-header collapsible-header' });
        const activityTitle = activityHeader.createEl('span', { cls: 'collapsible-title' });
        activityTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        activityTitle.appendText(t('agent.activityTitle'));

        const activitySteps = activityColumn.createEl('div', {
            cls: 'claude-code-agent-steps collapsible-content',
            attr: { id: 'claude-code-agent-steps' }
        });

        // Add click handler to toggle collapse
        activityHeader.addEventListener('click', () => {
            const isCollapsed = activitySteps.hasClass('claude-code-hidden');
            activitySteps.toggleClass('claude-code-hidden', !isCollapsed);
            const indicator = activityHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on container
            agentContainer.toggleClass('collapsed', !isCollapsed);
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
            cls: 'claude-code-interactive-prompt claude-code-hidden'
        });
        interactivePromptSection.id = 'claude-code-interactive-prompt';

        interactivePromptSection.createEl('div', {
            cls: 'interactive-prompt-header',
            text: '❓ ' + t('interactive.header')
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
            text: '✓ ' + t('interactive.yesButton')
        });
        yesButton.addEventListener('click', () => onRespond('yes'));

        const noButton = promptButtons.createEl('button', {
            text: '✗ ' + t('interactive.noButton')
        });
        noButton.addEventListener('click', () => onRespond('no'));

        const customResponseInput = interactivePromptSection.createEl('input', {
            cls: 'interactive-prompt-input',
            attr: {
                placeholder: t('interactive.customPlaceholder'),
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
            cls: 'claude-code-permission-approval claude-code-hidden'
        });
        permissionApprovalSection.id = 'claude-code-permission-approval';

        permissionApprovalSection.createEl('div', {
            cls: 'permission-approval-header',
            text: '🔐 ' + t('permission.header')
        });

        permissionApprovalSection.createEl('div', {
            cls: 'permission-approval-message',
            text: t('permission.message')
        });

        const approvalButtons = permissionApprovalSection.createEl('div', {
            cls: 'permission-approval-buttons'
        });

        const approvePermissionButton = approvalButtons.createEl('button', {
            cls: 'mod-cta',
            text: '✓ ' + t('permission.approveButton')
        });
        approvePermissionButton.addEventListener('click', onApprove);

        const denyPermissionButton = approvalButtons.createEl('button', {
            cls: 'mod-warning',
            text: '✗ ' + t('permission.denyButton')
        });
        denyPermissionButton.addEventListener('click', onDeny);

        return { permissionApprovalSection, approvePermissionButton, denyPermissionButton };
    }

    /**
     * Build the result section (for non-edit responses)
     */
    static buildResultSection(container: HTMLElement): { resultArea: HTMLDivElement; statusArea: HTMLDivElement; statusText: HTMLSpanElement; lastPromptArea: HTMLDivElement; toolHistoryArea: HTMLDivElement } {
        const resultSection = container.createEl('div', { cls: 'claude-code-result-section claude-code-hidden' });
        resultSection.id = 'claude-code-result-section';

        const resultHeader = resultSection.createEl('div', { cls: 'claude-code-result-header collapsible-header' });
        const headerTitle = resultHeader.createEl('span', { cls: 'collapsible-title' });
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        headerTitle.appendText(t('result.title'));

        const contentWrapper = resultSection.createEl('div', { cls: 'collapsible-content' });

        // Last prompt area (shows what the user asked)
        const lastPromptArea = contentWrapper.createEl('div', { cls: 'claude-code-last-prompt claude-code-hidden' });
        lastPromptArea.id = 'claude-code-last-prompt';

        // Tool history area (shows icons of tools used during the run)
        const toolHistoryArea = contentWrapper.createEl('div', { cls: 'claude-code-tool-history claude-code-hidden' });
        toolHistoryArea.id = 'claude-code-tool-history';

        // Status area (shown during processing)
        const statusArea = contentWrapper.createEl('div', { cls: 'claude-code-status-area claude-code-hidden' });

        const statusTextContainer = statusArea.createEl('div', { cls: 'claude-code-status-text' });
        statusTextContainer.createEl('div', { cls: 'claude-code-status-spinner' });
        const statusText = statusTextContainer.createEl('span');

        const progressBarContainer = statusArea.createEl('div', { cls: 'claude-code-progress-bar-container' });
        progressBarContainer.createEl('div', { cls: 'claude-code-progress-bar' });

        // Result area (shown when there's a result)
        const resultArea = contentWrapper.createEl('div', {
            cls: 'claude-code-result-area markdown-rendered claude-code-hidden'
        });

        // Add click handler to toggle collapse
        resultHeader.addEventListener('click', () => {
            const isCollapsed = contentWrapper.hasClass('claude-code-hidden');
            contentWrapper.toggleClass('claude-code-hidden', !isCollapsed);
            const indicator = resultHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            resultSection.toggleClass('collapsed', !isCollapsed);
        });

        return { resultArea, statusArea, statusText, lastPromptArea, toolHistoryArea };
    }

    /**
     * Build the output section
     */
    static buildOutputSection(container: HTMLElement): { outputArea: HTMLDivElement; outputSection: HTMLDivElement } {
        const outputSection = container.createEl('div', { cls: 'claude-code-output-section claude-code-hidden' });
        const outputHeader = outputSection.createEl('div', { cls: 'claude-code-output-header collapsible-header' });

        const headerTitle = outputHeader.createEl('span', { cls: 'collapsible-title' });
        // Start collapsed by default
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▶ ' });
        headerTitle.appendText(t('output.title'));

        // Start collapsed by default
        const outputArea = outputSection.createEl('div', {
            cls: 'claude-code-output-area collapsible-content claude-code-hidden'
        });
        outputSection.addClass('collapsed');

        // Toggle output visibility when clicking header
        outputHeader.addEventListener('click', () => {
            const isCollapsed = outputArea.hasClass('claude-code-hidden');
            outputArea.toggleClass('claude-code-hidden', !isCollapsed);
            const indicator = outputHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            outputSection.toggleClass('collapsed', !isCollapsed);
        });

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
        const previewSection = container.createEl('div', { cls: 'claude-code-preview-section claude-code-hidden' });
        previewSection.id = 'claude-code-preview-section';

        const previewHeader = previewSection.createEl('div', { cls: 'claude-code-preview-header collapsible-header' });
        const headerTitle = previewHeader.createEl('span', { cls: 'collapsible-title' });
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▼ ' });
        headerTitle.appendText(t('preview.title'));

        const previewContent = previewSection.createEl('div', { cls: 'claude-code-preview-content-wrapper collapsible-content' });

        // Tabs container
        const previewTabsContainer = previewContent.createEl('div', { cls: 'claude-code-preview-tabs' });

        const rawTab = previewTabsContainer.createEl('div', { cls: 'preview-tab', text: t('preview.tabRaw') });
        const diffTab = previewTabsContainer.createEl('div', { cls: 'preview-tab active', text: t('preview.tabDiff') });
        const renderedTab = previewTabsContainer.createEl('div', { cls: 'preview-tab', text: t('preview.tabRendered') });

        // Content container that holds all views
        const previewContentContainer = previewContent.createEl('div', { cls: 'claude-code-preview-content-container' });

        // Raw preview area (shown by default)
        const previewArea = previewContentContainer.createEl('div', { cls: 'claude-code-preview-area' });

        const previewButtons = previewContent.createEl('div', { cls: 'claude-code-preview-buttons' });

        const applyButton = previewButtons.createEl('button', {
            cls: 'mod-cta',
            text: '✓ ' + t('preview.applyButton')
        });
        applyButton.addEventListener('click', onApply);

        const rejectButton = previewButtons.createEl('button', {
            cls: 'mod-warning',
            text: '✗ ' + t('preview.rejectButton')
        });
        rejectButton.addEventListener('click', onReject);

        // Tab switching logic
        rawTab.addEventListener('click', () => {
            rawTab.addClass('active');
            diffTab.removeClass('active');
            renderedTab.removeClass('active');
            previewArea.removeClass('claude-code-hidden');
            const diffArea = previewContentContainer.querySelector('.claude-code-preview-diff');
            const renderedArea = previewContentContainer.querySelector('.claude-code-preview-rendered');
            if (diffArea) diffArea.addClass('claude-code-hidden');
            if (renderedArea) renderedArea.addClass('claude-code-hidden');
        });

        diffTab.addEventListener('click', () => {
            diffTab.addClass('active');
            rawTab.removeClass('active');
            renderedTab.removeClass('active');
            previewArea.addClass('claude-code-hidden');
            const diffArea = previewContentContainer.querySelector('.claude-code-preview-diff');
            const renderedArea = previewContentContainer.querySelector('.claude-code-preview-rendered');
            if (diffArea) diffArea.removeClass('claude-code-hidden');
            if (renderedArea) renderedArea.addClass('claude-code-hidden');
        });

        renderedTab.addEventListener('click', () => {
            renderedTab.addClass('active');
            rawTab.removeClass('active');
            diffTab.removeClass('active');
            previewArea.addClass('claude-code-hidden');
            const diffArea = previewContentContainer.querySelector('.claude-code-preview-diff');
            const renderedArea = previewContentContainer.querySelector('.claude-code-preview-rendered');
            if (diffArea) diffArea.addClass('claude-code-hidden');
            if (renderedArea) renderedArea.removeClass('claude-code-hidden');
        });

        // Add click handler to toggle collapse
        headerTitle.addEventListener('click', () => {
            const isCollapsed = previewContent.hasClass('claude-code-hidden');
            previewContent.toggleClass('claude-code-hidden', !isCollapsed);
            const indicator = previewHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            previewSection.toggleClass('collapsed', !isCollapsed);
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
        const historySection = container.createEl('div', { cls: 'claude-code-history-section claude-code-hidden' });
        historySection.id = 'claude-code-history-section';

        const historyHeader = historySection.createEl('div', { cls: 'claude-code-history-header collapsible-header' });
        const headerTitle = historyHeader.createEl('span', { cls: 'collapsible-title' });
        // Start collapsed by default
        headerTitle.createEl('span', { cls: 'collapse-indicator', text: '▶ ' });
        headerTitle.appendText(t('history.title'));

        const clearHistoryBtn = historyHeader.createEl('button', {
            text: t('history.clearButton'),
            cls: 'claude-code-clear-history'
        });
        clearHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent header click
            onClearHistory();
        });

        // Start collapsed by default
        const historyList = historySection.createEl('ul', { cls: 'claude-code-history-list collapsible-content claude-code-hidden' });
        historySection.addClass('collapsed');

        // Add click handler to toggle collapse
        headerTitle.addEventListener('click', () => {
            const isCollapsed = historyList.hasClass('claude-code-hidden');
            historyList.toggleClass('claude-code-hidden', !isCollapsed);
            const indicator = historyHeader.querySelector('.collapse-indicator');
            if (indicator) {
                indicator.textContent = isCollapsed ? '▼ ' : '▶ ';
            }
            // Toggle collapsed class on section
            historySection.toggleClass('collapsed', !isCollapsed);
        });

        return historyList;
    }
}
