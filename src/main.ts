import { Plugin, WorkspaceLeaf, TFile, TAbstractFile, FileSystemAdapter } from 'obsidian';
import { ClaudeCodeView } from './ui/view';
import { VIEW_TYPE_CLAUDE_CODE } from './core/types';
import { ClaudeCodeSettings, DEFAULT_SETTINGS, ClaudeCodeSettingTab } from './core/settings';
import { SessionManager } from './core/session-manager';
import { initI18n } from './i18n';

export default class ClaudeCodePlugin extends Plugin {
    settings: ClaudeCodeSettings;

    async onload() {
        await this.loadSettings();

        // Initialize i18n with saved language preference
        initI18n(this.settings.language);

        // Register the Claude Code view
        this.registerView(
            VIEW_TYPE_CLAUDE_CODE,
            (leaf) => new ClaudeCodeView(leaf, this)
        );

        // Add ribbon icon
        this.addRibbonIcon('bot', 'Open Claude Code', () => {
            void this.activateView();
        });

        // Add command to open Claude Code view
        this.addCommand({
            id: 'open-claude-code-view',
            name: 'Open Claude Code panel',
            callback: () => {
                void this.activateView();
            }
        });

        // Add command to run Claude Code on current note
        this.addCommand({
            id: 'run-claude-code-quick',
            name: 'Quick run Claude Code (with default prompt)',
            callback: async () => {
                await this.activateView();
                // The view will be ready for user input
            }
        });

        // Add command to run Claude Code on selected text
        this.addCommand({
            id: 'run-claude-code-selection',
            name: 'Run Claude Code on selected text',
            callback: async () => {
                await this.activateView();
                const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
                if (leaves.length > 0) {
                    const view = leaves[0].view as ClaudeCodeView;
                    // Enable "selected text only" option
                    const checkbox = view.containerEl.querySelector('.claude-code-options input[type="checkbox"]') as HTMLInputElement;
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                }
            }
        });

        // Add settings tab
        this.addSettingTab(new ClaudeCodeSettingTab(this.app, this));

        // Listen for file renames to update session paths
        this.registerEvent(
            this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
                if (file instanceof TFile && file.extension === 'md') {
                    const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
                    if (vaultPath) {
                        const updated = SessionManager.updateSessionPaths(
                            vaultPath,
                            this.app.vault.configDir,
                            oldPath,
                            file.path
                        );
                        if (updated > 0) {
                            console.debug(`Updated ${updated} session(s) for renamed file: ${oldPath} -> ${file.path}`);
                        }
                    }
                }
            })
        );
    }

    onunload() {
        // Views are cleaned up automatically when the plugin is unloaded
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as ClaudeCodeSettings | undefined);
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update settings in all active Claude Code views
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
        leaves.forEach(leaf => {
            const view = leaf.view as ClaudeCodeView;
            view.updateSettings();
        });
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Create a new leaf in the right sidebar
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({ type: VIEW_TYPE_CLAUDE_CODE, active: true });
        }

        // Reveal the leaf in case it's in a collapsed sidebar
        if (leaf) {
            void workspace.revealLeaf(leaf);
        }
    }
}
