import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ClaudeCodePlugin from '../main';
import { execSync, exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { t, setLocale, getLocale, getAvailableLocales, Locale } from '../i18n';
import type { BackendType } from './backends/types';

export interface ClaudeCodeSettings {
    // Backend selection
    backend: BackendType;
    // Claude Code settings
    claudeCodePath: string;
    autoDetectPath: boolean;
    modelAlias: 'sonnet' | 'opus' | 'haiku' | '';
    // OpenCode settings
    opencodePath: string;
    opencodeAutoDetect: boolean;
    opencodeModel: string;
    // Common settings
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
    // Backend selection
    backend: 'claude',
    // Claude Code settings
    claudeCodePath: '',
    autoDetectPath: true,
    modelAlias: '',
    // OpenCode settings
    opencodePath: '',
    opencodeAutoDetect: true,
    opencodeModel: '',
    // Common settings
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
                        new Notice(t('misc.languageChanged'));
                    });
            });

        // Backend selection
        new Setting(containerEl)
            .setName(t('settings.backend'))
            .setDesc(t('settings.backendDesc'))
            .addDropdown(dropdown => dropdown
                .addOption('claude', 'Claude Code')
                .addOption('opencode', 'OpenCode')
                .setValue(this.plugin.settings.backend)
                .onChange(async (value) => {
                    this.plugin.settings.backend = value as BackendType;
                    await this.plugin.saveSettings();
                    // Refresh settings display to show backend-specific options
                    this.display();
                }));

        // Backend-specific settings
        if (this.plugin.settings.backend === 'claude') {
            this.displayClaudeSettings(containerEl);
        } else if (this.plugin.settings.backend === 'opencode') {
            this.displayOpenCodeSettings(containerEl);
        }

        this.displayCommonSettings(containerEl);
    }

    /**
     * Display Claude Code specific settings
     */
    private displayClaudeSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(t('settings.claudeSection'))
            .setHeading();

        // Auto-detect Claude Code path
        new Setting(containerEl)
            .setName(t('settings.autoDetectPath'))
            .setDesc(t('settings.autoDetectPathDesc'))
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
            .setName(t('settings.executablePath'))
            .setDesc(t('settings.executablePathDesc'))
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
            .setName(t('settings.testInstallation'))
            .setDesc(t('settings.testInstallationDesc'))
            .addButton(button => button
                .setButtonText(t('settings.testButton'))
                .onClick(() => {
                    void this.testClaudeCode().then(result => {
                        if (result.success) {
                            button.setButtonText('✓ ' + t('settings.testWorking'));
                            setTimeout(() => { button.setButtonText(t('settings.testButton')); }, 2000);
                        } else {
                            button.setButtonText('✗ ' + t('settings.testFailed'));
                            setTimeout(() => { button.setButtonText(t('settings.testButton')); }, 2000);
                            new Notice(`${t('misc.testFailed', { backend: 'Claude Code' })}: ${result.error}`);
                        }
                    });
                }));

        // Model Alias (Claude-specific)
        new Setting(containerEl)
            .setName(t('settings.model'))
            .setDesc(t('settings.modelDesc'))
            .addDropdown(dropdown => dropdown
                .addOption('', t('settings.modelDefault'))
                .addOption('sonnet', t('settings.modelSonnet'))
                .addOption('opus', t('settings.modelOpus'))
                .addOption('haiku', t('settings.modelHaiku'))
                .setValue(this.plugin.settings.modelAlias)
                .onChange(async (value) => {
                    this.plugin.settings.modelAlias = value as 'sonnet' | 'opus' | 'haiku' | '';
                    await this.plugin.saveSettings();
                }));

        // Allow Vault Access (Claude-specific)
        new Setting(containerEl)
            .setName(t('settings.vaultAccess'))
            .setDesc(t('settings.vaultAccessDesc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.allowVaultAccess)
                .onChange(async (value) => {
                    this.plugin.settings.allowVaultAccess = value;
                    await this.plugin.saveSettings();
                }));

        // Enable Permissionless Mode (Claude-specific)
        new Setting(containerEl)
            .setName(t('settings.permissionlessMode'))
            .setDesc(t('settings.permissionlessModeDesc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePermissionlessMode)
                .onChange(async (value) => {
                    this.plugin.settings.enablePermissionlessMode = value;
                    await this.plugin.saveSettings();
                }));

        // Custom API Configuration Section (Claude-specific)
        new Setting(containerEl)
            .setName(t('settings.customApiConfig'))
            .setDesc(t('settings.customApiConfigDesc'))
            .setHeading();

        // Anthropic Base URL
        new Setting(containerEl)
            .setName(t('settings.apiBaseUrl'))
            .setDesc(t('settings.apiBaseUrlDesc'))
            .addText(text => text
                .setPlaceholder('https://api.anthropic.com')
                .setValue(this.plugin.settings.anthropicBaseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.anthropicBaseUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Anthropic Auth Token
        new Setting(containerEl)
            .setName(t('settings.apiAuthToken'))
            .setDesc(t('settings.apiAuthTokenDesc'))
            .addText(text => {
                text.setPlaceholder(t('settings.apiAuthTokenPlaceholder'))
                    .setValue(this.plugin.settings.anthropicAuthToken)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicAuthToken = value.trim();
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        // Anthropic Model
        new Setting(containerEl)
            .setName(t('settings.customModel'))
            .setDesc(t('settings.customModelDesc'))
            .addText(text => text
                .setPlaceholder('claude-sonnet-4-20250514')
                .setValue(this.plugin.settings.anthropicModel)
                .onChange(async (value) => {
                    this.plugin.settings.anthropicModel = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Anthropic Small/Fast Model
        new Setting(containerEl)
            .setName(t('settings.customSmallModel'))
            .setDesc(t('settings.customSmallModelDesc'))
            .addText(text => text
                .setPlaceholder('claude-haiku-3-5-20241022')
                .setValue(this.plugin.settings.anthropicSmallFastModel)
                .onChange(async (value) => {
                    this.plugin.settings.anthropicSmallFastModel = value.trim();
                    await this.plugin.saveSettings();
                }));
    }

    /**
     * Display OpenCode specific settings
     */
    private displayOpenCodeSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(t('settings.opencodeSection'))
            .setHeading();

        // Auto-detect OpenCode path
        new Setting(containerEl)
            .setName(t('settings.opencodeAutoDetect'))
            .setDesc(t('settings.opencodeAutoDetectDesc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.opencodeAutoDetect)
                .onChange(async (value) => {
                    this.plugin.settings.opencodeAutoDetect = value;
                    if (value) {
                        const detectedPath = this.detectOpenCodePath();
                        if (detectedPath) {
                            this.plugin.settings.opencodePath = detectedPath;
                        }
                    }
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // OpenCode executable path
        new Setting(containerEl)
            .setName(t('settings.opencodePath'))
            .setDesc(t('settings.opencodePathDesc'))
            .addText(text => text
                .setPlaceholder('/usr/local/bin/opencode')
                .setValue(this.plugin.settings.opencodePath)
                .setDisabled(this.plugin.settings.opencodeAutoDetect)
                .onChange(async (value) => {
                    this.plugin.settings.opencodePath = value;
                    await this.plugin.saveSettings();
                }));

        // Test OpenCode button
        new Setting(containerEl)
            .setName(t('settings.testOpencode'))
            .setDesc(t('settings.testOpencodeDesc'))
            .addButton(button => button
                .setButtonText(t('settings.testButton'))
                .onClick(() => {
                    void this.testOpenCode().then(result => {
                        if (result.success) {
                            button.setButtonText('✓ ' + t('settings.testWorking'));
                            setTimeout(() => { button.setButtonText(t('settings.testButton')); }, 2000);
                        } else {
                            button.setButtonText('✗ ' + t('settings.testFailed'));
                            setTimeout(() => { button.setButtonText(t('settings.testButton')); }, 2000);
                            new Notice(`${t('misc.testFailed', { backend: 'OpenCode' })}: ${result.error}`);
                        }
                    });
                }));

        // OpenCode model (provider/model format)
        new Setting(containerEl)
            .setName(t('settings.opencodeModel'))
            .setDesc(t('settings.opencodeModelDesc'))
            .addText(text => text
                // eslint-disable-next-line obsidianmd/ui/sentence-case
                .setPlaceholder('openai/gpt-4o, anthropic/claude-sonnet')
                .setValue(this.plugin.settings.opencodeModel)
                .onChange(async (value) => {
                    this.plugin.settings.opencodeModel = value.trim();
                    await this.plugin.saveSettings();
                }));
    }

    /**
     * Display common settings shared by all backends
     */
    private displayCommonSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(t('settings.commonSection'))
            .setHeading();

        // Custom system prompt
        new Setting(containerEl)
            .setName(t('settings.customPrompt'))
            .setDesc(t('settings.customPromptDesc'))
            .addTextArea(text => {
                text.setPlaceholder(t('settings.customPromptPlaceholder'))
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
            .setName(t('settings.preserveCursor'))
            .setDesc(t('settings.preserveCursorDesc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.preserveCursorPosition)
                .onChange(async (value) => {
                    this.plugin.settings.preserveCursorPosition = value;
                    await this.plugin.saveSettings();
                }));

        // Auto-accept changes
        new Setting(containerEl)
            .setName(t('settings.autoAcceptChanges'))
            .setDesc(t('settings.autoAcceptChangesDesc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoAcceptChanges)
                .onChange(async (value) => {
                    this.plugin.settings.autoAcceptChanges = value;
                    await this.plugin.saveSettings();
                }));

        // Timeout
        new Setting(containerEl)
            .setName(t('settings.timeout'))
            .setDesc(t('settings.timeoutDesc'))
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

    /**
     * Attempt to detect OpenCode installation path (cross-platform)
     */
    private detectOpenCodePath(): string | null {
        const isWindows = process.platform === 'win32';
        const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();

        let possiblePaths: string[] = [];

        if (isWindows) {
            possiblePaths = [
                'opencode', // If in PATH
                path.join(homeDir, 'AppData', 'Roaming', 'npm', 'opencode.cmd'),
                path.join(homeDir, '.bun', 'bin', 'opencode.exe'),
                path.join(homeDir, '.opencode', 'bin', 'opencode.exe'),
            ];
        } else {
            possiblePaths = [
                'opencode', // If in PATH
                path.join(homeDir, '.local', 'bin', 'opencode'),
                path.join(homeDir, '.bun', 'bin', 'opencode'),
                path.join(homeDir, '.opencode', 'bin', 'opencode'),
                '/usr/local/bin/opencode',
                '/usr/bin/opencode',
            ];
        }

        for (const cmdPath of possiblePaths) {
            try {
                if (!cmdPath.includes('/') && !cmdPath.includes('\\')) {
                    const whichCmd = isWindows ? 'where' : 'which';
                    const result = execSync(`${whichCmd} ${cmdPath}`, { encoding: 'utf8' }).trim();
                    if (result) {
                        return result.split('\n')[0].trim();
                    }
                } else {
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
     * Test if OpenCode is accessible and working (cross-platform)
     */
    private async testOpenCode(): Promise<{ success: boolean; error?: string }> {
        try {
            const cmdPath = this.plugin.settings.opencodePath || 'opencode';

            const isWindows = process.platform === 'win32';
            const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
            const pathSeparator = isWindows ? ';' : ':';

            const envPath = process.env.PATH || '';
            let pathsToAdd: string[] = [];

            if (isWindows) {
                pathsToAdd = [
                    path.join(homeDir, 'AppData', 'Local', 'Programs', 'nodejs'),
                    path.join(homeDir, '.bun', 'bin'),
                    path.join(homeDir, '.opencode', 'bin'),
                    'C:\\Program Files\\nodejs',
                ];
            } else {
                pathsToAdd = [
                    path.join(homeDir, '.bun', 'bin'),
                    path.join(homeDir, '.opencode', 'bin'),
                    path.join(homeDir, '.local', 'bin'),
                    '/usr/local/bin',
                    '/usr/bin',
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
