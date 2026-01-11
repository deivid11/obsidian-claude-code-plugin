/**
 * Output Renderer - Handles rendering of output and markdown content
 */

import { MarkdownRenderer, Component, App, FileSystemAdapter, TFile } from 'obsidian';
import { AgentStep } from '../core/types';
import { AgentActivityParser } from './parsers/agent-activity-parser';

export class OutputRenderer {
    private outputArea: HTMLDivElement;
    private outputSection: HTMLDivElement | null = null;
    private component: Component;
    private app: App;
    private notePath: string;
    private currentStreamingElement: HTMLDivElement | null = null;
    private vaultPath: string;

    constructor(outputArea: HTMLDivElement, component: Component, app: App, notePath: string, outputSection?: HTMLDivElement) {
        this.outputArea = outputArea;
        this.component = component;
        this.app = app;
        this.notePath = notePath;
        this.currentStreamingElement = null;
        this.outputSection = outputSection || null;
        this.vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath() || '';
    }

    /**
     * Update the note path for markdown rendering
     */
    setNotePath(notePath: string): void {
        this.notePath = notePath;
    }

    /**
     * Append a line of output
     */
    appendLine(text: string, isMarkdown: boolean = false): void {
        // Show the output section when there's content
        this.showOutputSection();

        const line = this.outputArea.createEl('div', { cls: 'claude-code-output-line' });

        if (isMarkdown) {
            line.classList.add('markdown-rendered');
            try {
                void MarkdownRenderer.render(this.app, text, line, this.notePath, this.component);
            } catch (error) {
                console.error('[MARKDOWN RENDER ERROR]', error);
                line.textContent = text;
            }
        } else {
            // Check for file paths and make them clickable
            this.renderTextWithLinks(line, text);
        }

        // Auto-scroll to bottom
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }

    /**
     * Render text with clickable file links
     */
    private renderTextWithLinks(container: HTMLElement, text: string): void {
        // Pattern to match file paths (absolute paths ending in .md)
        // Matches paths like /home/user/vault/note.md or C:\Users\vault\note.md
        // Use space ' ' to allow spaces in filenames but not newlines
        const filePathPattern = /([\\/][\w\-./ \\]+\.md)/gi;

        let lastIndex = 0;
        let match;

        while ((match = filePathPattern.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                container.appendText(text.substring(lastIndex, match.index));
            }

            const fullPath = match[1];

            // Check if this path is inside the vault
            if (this.vaultPath && fullPath.startsWith(this.vaultPath)) {
                // Convert to relative path
                const relativePath = fullPath.substring(this.vaultPath.length + 1); // +1 for the separator

                // Create clickable link
                const link = container.createEl('a', {
                    cls: 'claude-code-file-link',
                    text: fullPath
                });
                link.setAttribute('href', '#');
                link.setAttribute('title', `Open ${relativePath}`);
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    void this.openFile(relativePath);
                });
            } else {
                // Path not in vault, just show as text
                container.appendText(fullPath);
            }

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
     * Open a file in Obsidian
     */
    private async openFile(relativePath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(relativePath);
        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(file);
        }
    }

    /**
     * Append streaming text (accumulates in the same element)
     */
    appendStreamingText(text: string): void {
        // Show the output section when there's content
        this.showOutputSection();

        // Create new streaming element if needed
        if (!this.currentStreamingElement) {
            this.currentStreamingElement = this.outputArea.createEl('div', {
                cls: 'claude-code-output-line claude-code-streaming'
            });
        }

        // Wrap each chunk in a span with fade-in animation
        this.currentStreamingElement.createEl('span', {
            cls: 'streaming-text-chunk',
            text: text
        });

        // Auto-scroll to bottom
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }

    /**
     * Finish the current streaming block
     */
    finishStreamingBlock(): void {
        this.currentStreamingElement = null;
    }

    /**
     * Clear all output
     */
    clear(): void {
        this.outputArea.empty();
        // Hide the output section when cleared
        this.hideOutputSection();
    }

    /**
     * Show the output section
     */
    private showOutputSection(): void {
        if (this.outputSection) {
            this.outputSection.removeClass('claude-code-hidden');
        }
    }

    /**
     * Hide the output section
     */
    private hideOutputSection(): void {
        if (this.outputSection) {
            this.outputSection.addClass('claude-code-hidden');
        }
    }

    /**
     * Parse and extract agent activity from output text
     */
    static parseAgentActivity(text: string): AgentStep | null {
        return AgentActivityParser.parseAgentActivity(text);
    }
}
