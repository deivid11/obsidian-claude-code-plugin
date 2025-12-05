import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration for spawning Claude Code process
 */
export interface SpawnConfig {
    claudePath: string;
    args: string[];
    workingDir: string;
    onDebugOutput?: (message: string) => void;
    customEnvVars?: Record<string, string>;
}

/**
 * Handles spawning and managing Claude Code process
 */
export class ProcessSpawner {
    /**
     * Check if running on Windows
     */
    private static isWindows(): boolean {
        return process.platform === 'win32';
    }

    /**
     * Get the default shell for the current platform
     */
    private static getDefaultShell(): string {
        if (this.isWindows()) {
            // On Windows, prefer PowerShell if available, otherwise cmd.exe
            // Check for pwsh (PowerShell Core) first, then powershell, then cmd
            if (process.env.COMSPEC) {
                return process.env.COMSPEC; // Usually C:\Windows\System32\cmd.exe
            }
            return 'cmd.exe';
        }
        // On Unix-like systems, use SHELL env var or default to /bin/sh
        return process.env.SHELL || '/bin/sh';
    }

    /**
     * Get the PATH separator for the current platform
     */
    private static getPathSeparator(): string {
        return this.isWindows() ? ';' : ':';
    }

    /**
     * Get the shell name from a shell path (e.g., "/bin/zsh" -> "zsh")
     */
    private static getShellName(shellPath: string): string {
        return path.basename(shellPath);
    }

    /**
     * Get environment variables as if running in a login shell
     * This loads variables from .zshrc, .bash_profile, etc. on Unix
     * On Windows, it uses process.env directly as Windows doesn't have shell profiles
     */
    private static getShellEnvironment(onDebugOutput?: (message: string) => void): Record<string, string> {
        // On Windows, just return process.env - Windows doesn't have shell profile files like Unix
        if (this.isWindows()) {
            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] Windows detected, using process.env directly\n`);
            }
            return { ...process.env } as Record<string, string>;
        }

        try {
            // Determine which shell to use (Unix only)
            const shell = process.env.SHELL || '/bin/sh';
            const shellName = this.getShellName(shell);
            const homeDir = os.homedir();

            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] Loading environment from shell: ${shell} (${shellName})\n`);
                onDebugOutput(`[DEBUG] Home directory: ${homeDir}\n`);
            }

            // Run the shell and explicitly source all config files
            // We need to explicitly source the files because -l -i might not work in non-interactive contexts
            const startTime = Date.now();

            // Determine which config files to source based on the shell
            let sourceCommand: string;

            if (shellName === 'zsh') {
                // For zsh: source zshenv (always loaded), zprofile (login), and zshrc (interactive)
                if (onDebugOutput) {
                    onDebugOutput(`[DEBUG] Will source: ~/.zshenv, ~/.zprofile, ~/.zshrc\n`);
                }
                sourceCommand = `${shell} -c 'source ~/.zshenv 2>/dev/null; source ~/.zprofile 2>/dev/null; source ~/.zshrc 2>/dev/null; env'`;
            } else if (shellName === 'bash') {
                // For bash: source profile (Debian/Ubuntu), bash_profile (macOS/Fedora), and bashrc
                if (onDebugOutput) {
                    onDebugOutput(`[DEBUG] Will source: ~/.profile, ~/.bash_profile, ~/.bashrc\n`);
                }
                sourceCommand = `${shell} -c 'source ~/.profile 2>/dev/null; source ~/.bash_profile 2>/dev/null; source ~/.bashrc 2>/dev/null; env'`;
            } else if (shellName === 'fish') {
                // For fish: use fish-specific config loading
                if (onDebugOutput) {
                    onDebugOutput(`[DEBUG] Will source: fish config via login shell\n`);
                }
                sourceCommand = `${shell} -l -c 'env'`;
            } else {
                // Fallback: use login shell flag (no -i to avoid TTY issues)
                if (onDebugOutput) {
                    onDebugOutput(`[DEBUG] Using login shell fallback for: ${shellName}\n`);
                }
                sourceCommand = `${shell} -l -c 'env'`;
            }

            const envOutput = execSync(sourceCommand, {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large environments
                timeout: 5000, // 5 second timeout
                env: { ...process.env, HOME: homeDir } // Ensure HOME is set
            });
            const duration = Date.now() - startTime;

            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] Shell environment loaded in ${duration}ms\n`);
                onDebugOutput(`[DEBUG] Raw output length: ${envOutput.length} bytes\n`);
            }

            // Parse the environment output into a key-value object
            const env: Record<string, string> = {};
            const lines = envOutput.split('\n');

            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] Parsing ${lines.length} lines of environment output\n`);
            }

            lines.forEach((line: string) => {
                const idx = line.indexOf('=');
                if (idx > 0) {
                    const key = line.substring(0, idx);
                    const value = line.substring(idx + 1);
                    env[key] = value;
                }
            });

            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] Parsed ${Object.keys(env).length} environment variables\n`);

                // Show comparison with process.env
                const processEnvKeys = Object.keys(process.env);
                const shellEnvKeys = Object.keys(env);
                const onlyInShell = shellEnvKeys.filter(k => !processEnvKeys.includes(k));
                const onlyInProcess = processEnvKeys.filter(k => !shellEnvKeys.includes(k));

                if (onlyInShell.length > 0) {
                    onDebugOutput(`[DEBUG] Variables only in shell (${onlyInShell.length}): ${onlyInShell.slice(0, 10).join(', ')}${onlyInShell.length > 10 ? '...' : ''}\n`);
                }
                if (onlyInProcess.length > 0) {
                    onDebugOutput(`[DEBUG] Variables only in process.env (${onlyInProcess.length}): ${onlyInProcess.slice(0, 10).join(', ')}${onlyInProcess.length > 10 ? '...' : ''}\n`);
                }
            }

            return env;
        } catch (error) {
            // Fallback to process.env if shell environment loading fails
            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] ⚠️ Failed to load shell environment: ${error}\n`);
                onDebugOutput(`[DEBUG] Falling back to process.env\n`);
            }
            return { ...process.env } as Record<string, string>;
        }
    }

    /**
     * Spawn Claude Code process with enhanced environment
     *
     * @param config Spawn configuration
     * @returns Child process
     */
    static spawn(config: SpawnConfig): ChildProcess {
        // Get full shell environment (includes all your terminal env vars)
        const shellEnv = this.getShellEnvironment(config.onDebugOutput);

        // Merge custom environment variables (these override shell env vars)
        if (config.customEnvVars) {
            const customVarCount = Object.keys(config.customEnvVars).filter(k => config.customEnvVars![k]).length;
            if (customVarCount > 0 && config.onDebugOutput) {
                config.onDebugOutput(`[DEBUG] Applying ${customVarCount} custom environment variables:\n`);
            }
            for (const [key, value] of Object.entries(config.customEnvVars)) {
                if (value) {  // Only set non-empty values
                    shellEnv[key] = value;
                    if (config.onDebugOutput) {
                        // Mask sensitive values
                        const displayValue = (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET'))
                            ? `${value.substring(0, 8)}...`
                            : value;
                        config.onDebugOutput(`[DEBUG]   ${key}=${displayValue}\n`);
                    }
                }
            }
        }

        // Debug output: show loaded environment variables
        if (config.onDebugOutput) {
            config.onDebugOutput('[DEBUG] Shell environment variables loaded:\n');

            // Sort env vars for easier reading
            const sortedKeys = Object.keys(shellEnv).sort();

            // Show important env vars first
            const importantVars = ['PATH', 'HOME', 'SHELL', 'USER', 'ANTHROPIC_API_KEY', 'NODE_ENV'];
            config.onDebugOutput('[DEBUG] Important variables:\n');
            for (const key of importantVars) {
                if (shellEnv[key]) {
                    // Mask sensitive values like API keys
                    let value = shellEnv[key];
                    if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
                        value = value ? `${value.substring(0, 8)}...` : '';
                    }
                    config.onDebugOutput(`[DEBUG]   ${key}=${value}\n`);
                }
            }

            // Show all other variables
            config.onDebugOutput('[DEBUG] All environment variables:\n');
            for (const key of sortedKeys) {
                if (!importantVars.includes(key)) {
                    let value = shellEnv[key];
                    // Mask sensitive values
                    if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') || key.includes('PASSWORD')) {
                        value = value ? `${value.substring(0, 8)}...` : '';
                    }
                    config.onDebugOutput(`[DEBUG]   ${key}=${value}\n`);
                }
            }
            config.onDebugOutput('\n');
        }

        // Resolve claudePath to absolute path
        // If it starts with ~, expand to home directory
        // Priority: env vars -> os.homedir() (most reliable cross-platform)
        let resolvedClaudePath = config.claudePath;
        if (resolvedClaudePath.startsWith('~')) {
            const homeDir = shellEnv.HOME || shellEnv.USERPROFILE || os.homedir();
            resolvedClaudePath = resolvedClaudePath.replace('~', homeDir);
        }

        // If it's not an absolute path, try to find it in PATH
        if (!path.isAbsolute(resolvedClaudePath)) {
            // Check if it's a command name (like "claude")
            // Try to find it in PATH from shell environment
            const pathSeparator = this.getPathSeparator();
            const pathDirs = (shellEnv.PATH || '').split(pathSeparator).filter(dir => dir);

            // On Windows, also check for .exe, .cmd, .bat extensions
            const extensions = this.isWindows() ? ['', '.exe', '.cmd', '.bat'] : [''];

            for (const dir of pathDirs) {
                for (const ext of extensions) {
                    const fullPath = path.join(dir, resolvedClaudePath + ext);
                    if (fs.existsSync(fullPath)) {
                        resolvedClaudePath = fullPath;
                        break;
                    }
                }
                if (path.isAbsolute(resolvedClaudePath)) break;
            }
        }

        if (config.onDebugOutput) {
            config.onDebugOutput(`[DEBUG] Resolved claude path: ${resolvedClaudePath}\n`);
            config.onDebugOutput(`[DEBUG] Command: ${resolvedClaudePath} ${config.args.join(' ')}\n`);
        }

        // Use the shell to execute the command, which handles shebangs and PATH resolution
        // This is the same as running it from your terminal
        const shell = this.getDefaultShell();

        if (config.onDebugOutput) {
            config.onDebugOutput(`[DEBUG] Using shell: ${shell}\n`);
            config.onDebugOutput(`[DEBUG] Platform: ${process.platform}\n`);
        }

        // Ensure UTF-8 locale is set for proper handling of special characters (ñ, á, ½, etc.)
        // This is critical for non-ASCII characters to work correctly
        const envWithUtf8 = {
            ...shellEnv,
            LANG: shellEnv.LANG || 'en_US.UTF-8',
            LC_ALL: shellEnv.LC_ALL || 'en_US.UTF-8',
            LC_CTYPE: shellEnv.LC_CTYPE || 'en_US.UTF-8',
            PYTHONIOENCODING: 'utf-8',  // In case Claude CLI uses Python
            NODE_OPTIONS: shellEnv.NODE_OPTIONS ? `${shellEnv.NODE_OPTIONS} --input-type=module` : ''
        };

        const options = {
            cwd: config.workingDir,
            env: envWithUtf8,
            shell: shell
        };

        const childProcess = spawn(resolvedClaudePath, config.args, options);

        // Set encoding for stdin to UTF-8 for proper handling of special characters
        if (childProcess.stdin) {
            childProcess.stdin.setDefaultEncoding('utf8');
        }

        return childProcess;
    }

    /**
     * Send stdin input to process
     *
     * @param process Child process
     * @param prompt Prompt to send
     */
    static sendInput(process: ChildProcess, prompt: string): void {
        if (process.stdin) {
            const inputMessage = {
                type: 'user',
                message: {
                    role: 'user',
                    content: prompt
                }
            };

            const jsonInput = JSON.stringify(inputMessage) + '\n';
            // Explicitly use UTF-8 encoding to handle special characters (½, ¼, ñ, etc.)
            process.stdin.write(jsonInput, 'utf8');
            process.stdin.end();
        }
    }
}
