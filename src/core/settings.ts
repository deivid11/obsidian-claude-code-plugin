import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ClaudeCodePlugin from '../main';
import { execSync, exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { t, setLocale, getLocale, getAvailableLocales, Locale } from '../i18n';

export interface ClaudeCodeSettings {
    claudeCodePath: string;
    autoDetectPath: boolean;
    modelAlias: 'sonnet' | 'opus' | 'haiku' | '';
    customSystemPrompt: string;
    preserveCursorPosition: boolean;
    timeoutSeconds: number;
    autoAcceptChanges: boolean;
    allowVaultAccess: boolean;
    enablePermissionlessMode: boolean;
    // Custom API configuration (for alternative endpoints/proxies)
    anthropicBaseUrl: string;
    anthropicAuthToken: string;
    anthropicModel: string;
    anthropicSmallFastModel: string;
    // UI settings
    language: Locale;
}

export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
    claudeCodePath: '',
    autoDetectPath: true,
    modelAlias: '',
    customSystemPrompt: '',
    preserveCursorPosition: true,
    timeoutSeconds: 300,
    autoAcceptChanges: false,
    allowVaultAccess: true,
    enablePermissionlessMode: false,
    // Custom API configuration (empty = use default)
    anthropicBaseUrl: '',
    anthropicAuthToken: '',
    anthropicModel: '',
    anthropicSmallFastModel: '',
    // UI settings
    language: 'en'
};

export class ClaudeCodeSettingTab extends PluginSettingTab {
    plugin: ClaudeCodePlugin;

    constructor(app: App, plugin: ClaudeCodePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Language setting at the top
        new Setting(containerEl)
            .setName(t('settings.language'))
            .setDesc(t('settings.languageDesc'))
            .addDropdown(dropdown => {
                const locales = getAvailableLocales();
                for (const locale of locales) {
                    dropdown.addOption(locale.code, locale.name);
                }
                dropdown.setValue(getLocale())
                    .onChange(async (value) => {
                        this.plugin.settings.language = value as Locale;
                        setLocale(value as Locale);
                        await this.plugin.saveSettings();
                        // Refresh settings display with new language
                        this.display();
                        // Notify user to reload for full effect
                        new Notice('Language changed. Some UI elements will update on reload.');
                    });
            });

        // Auto-detect Claude Code path
        new Setting(containerEl)
            .setName('Auto-detect Claude Code path')
            .setDesc('Automatically detect the Claude Code executable location')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoDetectPath)
                .onChange(async (value) => {
                    this.plugin.settings.autoDetectPath = value;
                    if (value) {
                        const detectedPath = this.detectClaudeCodePath();
                        if (detectedPath) {
                            this.plugin.settings.claudeCodePath = detectedPath;
                        }
                    }
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show detected path
                }));

        // Claude Code executable path
        new Setting(containerEl)
            .setName('Claude Code executable path')
            .setDesc('Full path to the Claude Code executable (e.g., /usr/local/bin/claude)')
            .addText(text => text
                .setPlaceholder('/usr/local/bin/claude')
                .setValue(this.plugin.settings.claudeCodePath)
                .setDisabled(this.plugin.settings.autoDetectPath)
                .onChange(async (value) => {
                    this.plugin.settings.claudeCodePath = value;
                    await this.plugin.saveSettings();
                }));

        // Test Claude Code button
        new Setting(containerEl)
            .setName('Test Claude Code installation')
            .setDesc('Verify that Claude Code is accessible and working')
            .addButton(button => button
                .setButtonText('Test')
                .onClick(() => {
                    void this.testClaudeCode().then(result => {
                        if (result.success) {
                            button.setButtonText('✓ working!');
                            setTimeout(() => { button.setButtonText('Test'); }, 2000);
                        } else {
                            button.setButtonText('✗ failed');
                            setTimeout(() => { button.setButtonText('Test'); }, 2000);
                            new Notice(`Claude Code test failed: ${result.error}`);
                        }
                    });
                }));

        // Custom system prompt
        new Setting(containerEl)
            .setName('Custom system prompt')
            .setDesc('Optional custom system prompt to prepend to all requests')
            .addTextArea(text => {
                text.setPlaceholder('You are helping edit markdown notes...')
                    .setValue(this.plugin.settings.customSystemPrompt)
                    .onChange(async (value) => {
                        this.plugin.settings.customSystemPrompt = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.rows = 4;
                text.inputEl.cols = 50;
            });

        // Preserve cursor position
        new Setting(containerEl)
            .setName('Preserve cursor position')
            .setDesc('Try to maintain cursor position after applying changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.preserveCursorPosition)
                .onChange(async (value) => {
                    this.plugin.settings.preserveCursorPosition = value;
                    await this.plugin.saveSettings();
                }));

        // Auto-accept changes
        new Setting(containerEl)
            .setName('Auto-accept changes')
            .setDesc('Automatically apply changes without showing preview (⚠️ use with caution!)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoAcceptChanges)
                .onChange(async (value) => {
                    this.plugin.settings.autoAcceptChanges = value;
                    await this.plugin.saveSettings();
                }));

        // Model Alias
        new Setting(containerEl)
            .setName('Model')
            .setDesc('Select the Claude model to use: Sonnet (balanced), Opus (most capable), or Haiku (fastest). Leave empty to use the default subagent model.')
            .addDropdown(dropdown => dropdown
                .addOption('', 'Default (subagent model)')
                .addOption('sonnet', 'Sonnet (balanced)')
                .addOption('opus', 'Opus (most capable)')
                .addOption('haiku', 'Haiku (fastest)')
                .setValue(this.plugin.settings.modelAlias)
                .onChange(async (value) => {
                    this.plugin.settings.modelAlias = value as 'sonnet' | 'opus' | 'haiku' | '';
                    await this.plugin.saveSettings();
                }));

        // Allow Vault Access
        new Setting(containerEl)
            .setName('Allow vault-wide access')
            .setDesc('Allow Claude to read/search other files in your vault (not just the current note)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.allowVaultAccess)
                .onChange(async (value) => {
                    this.plugin.settings.allowVaultAccess = value;
                    await this.plugin.saveSettings();
                }));

        // Enable Permissionless Mode
        new Setting(containerEl)
            .setName('Enable permissionless mode')
            .setDesc('Allow Claude to execute actions without asking for permission each time (⚠️ use with caution! Claude will have full control)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePermissionlessMode)
                .onChange(async (value) => {
                    this.plugin.settings.enablePermissionlessMode = value;
                    await this.plugin.saveSettings();
                }));

        // Timeout
        new Setting(containerEl)
            .setName('Timeout (seconds)')
            .setDesc('Maximum time to wait for Claude Code response (0 = no timeout)')
            .addText(text => text
                .setPlaceholder('300')
                .setValue(String(this.plugin.settings.timeoutSeconds))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                        this.plugin.settings.timeoutSeconds = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Custom API Configuration Section
        new Setting(containerEl)
            .setName('Custom API configuration')
            .setDesc('Configure custom API endpoints for regions where Claude is not directly available. Leave empty to use default settings.')
            .setHeading();

        // Anthropic Base URL
        new Setting(containerEl)
            .setName('API base URL')
            .setDesc('Custom API endpoint URL (e.g., https://api.kimi.com/coding/)')
            .addText(text => text
                .setPlaceholder('https://api.anthropic.com')
                .setValue(this.plugin.settings.anthropicBaseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.anthropicBaseUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Anthropic Auth Token
        new Setting(containerEl)
            .setName('API auth token')
            .setDesc('Custom authentication token for the API endpoint')
            .addText(text => {
                text.setPlaceholder('Enter your API token')
                    .setValue(this.plugin.settings.anthropicAuthToken)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicAuthToken = value.trim();
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        // Anthropic Model
        new Setting(containerEl)
            .setName('Custom model')
            .setDesc('Custom model name to use (e.g., kimi-for-coding). Overrides the model dropdown above.')
            .addText(text => text
                .setPlaceholder('claude-sonnet-4-20250514')
                .setValue(this.plugin.settings.anthropicModel)
                .onChange(async (value) => {
                    this.plugin.settings.anthropicModel = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Anthropic Small/Fast Model
        new Setting(containerEl)
            .setName('Custom small/fast model')
            .setDesc('Custom model name for fast operations (e.g., kimi-for-coding)')
            .addText(text => text
                .setPlaceholder('claude-haiku-3-5-20241022')
                .setValue(this.plugin.settings.anthropicSmallFastModel)
                .onChange(async (value) => {
                    this.plugin.settings.anthropicSmallFastModel = value.trim();
                    await this.plugin.saveSettings();
                }));
    }

    /**
     * Attempt to detect Claude Code installation path (cross-platform)
     */
    private detectClaudeCodePath(): string | null {
        const isWindows = process.platform === 'win32';
        const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();

        let possiblePaths: string[] = [];

        if (isWindows) {
            // Windows-specific paths
            possiblePaths = [
                'claude', // If in PATH
                path.join(homeDir, 'AppData', 'Local', 'Programs', 'claude', 'claude.exe'),
                path.join(homeDir, '.bun', 'bin', 'claude.exe'),
                'C:\\Program Files\\claude\\claude.exe',
            ];
        } else {
            // Unix-like systems
            possiblePaths = [
                'claude', // If in PATH
                '/usr/local/bin/claude',
                '/usr/bin/claude',
                path.join(homeDir, '.local', 'bin', 'claude'),
                path.join(homeDir, 'bin', 'claude'),
                path.join(homeDir, '.bun', 'bin', 'claude'),
            ];
        }

        for (const cmdPath of possiblePaths) {
            try {
                // Try to execute 'which' or 'where' command for simple path names
                if (!cmdPath.includes('/') && !cmdPath.includes('\\')) {
                    const whichCmd = isWindows ? 'where' : 'which';
                    const result = execSync(`${whichCmd} ${cmdPath}`, { encoding: 'utf8' }).trim();
                    if (result) {
                        // On Windows, 'where' can return multiple paths, take the first
                        return result.split('\n')[0].trim();
                    }
                } else {
                    // Check if file exists for absolute paths
                    if (fs.existsSync(cmdPath)) {
                        return cmdPath;
                    }
                }
            } catch {
                // Continue to next path
            }
        }

        return null;
    }

    /**
     * Test if Claude Code is accessible and working (cross-platform)
     */
    private async testClaudeCode(): Promise<{ success: boolean; error?: string }> {
        try {
            const cmdPath = this.plugin.settings.claudeCodePath || 'claude';

            const isWindows = process.platform === 'win32';
            const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
            const pathSeparator = isWindows ? ';' : ':';

            // Build enhanced PATH - include common tool locations (cross-platform)
            const envPath = process.env.PATH || '';
            let pathsToAdd: string[] = [];

            if (isWindows) {
                pathsToAdd = [
                    path.join(homeDir, 'AppData', 'Local', 'Programs', 'nodejs'),
                    path.join(homeDir, '.bun', 'bin'),
                    'C:\\Program Files\\nodejs',
                    'C:\\Program Files (x86)\\nodejs',
                ];
            } else {
                pathsToAdd = [
                    path.join(homeDir, '.nvm', 'versions', 'node', 'v20.18.2', 'bin'),
                    path.join(homeDir, '.bun', 'bin'),
                    '/usr/local/bin',
                    '/usr/bin',
                    '/bin',
                ];
            }

            const existingPaths = pathsToAdd.filter(p => {
                try {
                    return fs.existsSync(p);
                } catch {
                    return false;
                }
            });

            const enhancedPath = [...new Set([...existingPaths, ...envPath.split(pathSeparator)])].join(pathSeparator);

            return new Promise((resolve) => {
                exec(`${cmdPath} --version`, {
                    timeout: 5000,
                    env: {
                        ...process.env,
                        PATH: enhancedPath
                    }
                }, (error: Error | null, stdout: string, stderr: string) => {
                    if (error) {
                        resolve({ success: false, error: error.message });
                    } else {
                        resolve({ success: true });
                    }
                });
            });
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }
}
