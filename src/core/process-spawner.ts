import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for spawning Claude Code process
 */
export interface SpawnConfig {
    claudePath: string;
    args: string[];
    workingDir: string;
    onDebugOutput?: (message: string) => void;
}

/**
 * Handles spawning and managing Claude Code process
 */
export class ProcessSpawner {
    /**
     * Get environment variables as if running in a login shell
     * This loads variables from .zshrc, .bash_profile, etc.
     */
    private static getShellEnvironment(onDebugOutput?: (message: string) => void): Record<string, string> {
        try {
            // Determine which shell to use
            const shell = process.env.SHELL || '/bin/zsh';

            if (onDebugOutput) {
                onDebugOutput(`[DEBUG] Loading environment from shell: ${shell}\n`);

                // Show which config files will be sourced
                if (shell.includes('zsh')) {
                    onDebugOutput(`[DEBUG] Will explicitly source: ~/.zprofile and ~/.zshrc\n`);
                } else if (shell.includes('bash')) {
                    onDebugOutput(`[DEBUG] Will explicitly source: ~/.bash_profile and ~/.bashrc\n`);
                }
            }

            // Run the shell and explicitly source all config files
            // We need to explicitly source the files because -l -i might not work in non-interactive contexts
            const startTime = Date.now();

            // Determine which config files to source based on the shell
            let sourceCommand: string;
            if (shell.includes('zsh')) {
                // For zsh: source both profile and rc files
                sourceCommand = `${shell} -c 'source ~/.zprofile 2>/dev/null; source ~/.zshrc 2>/dev/null; env'`;
            } else if (shell.includes('bash')) {
                // For bash: source both profile and rc files
                sourceCommand = `${shell} -c 'source ~/.bash_profile 2>/dev/null; source ~/.bashrc 2>/dev/null; env'`;
            } else {
                // Fallback to login + interactive flags
                sourceCommand = `${shell} -l -i -c 'env'`;
            }

            const envOutput = execSync(sourceCommand, {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large environments
                timeout: 5000 // 5 second timeout
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
        let resolvedClaudePath = config.claudePath;
        if (resolvedClaudePath.startsWith('~')) {
            resolvedClaudePath = resolvedClaudePath.replace('~', shellEnv.HOME || '');
        }

        // If it's not an absolute path, try to find it in PATH
        if (!path.isAbsolute(resolvedClaudePath)) {
            // Check if it's a command name (like "claude")
            // Try to find it in PATH from shell environment
            const pathDirs = (shellEnv.PATH || '').split(':').filter(dir => dir);

            for (const dir of pathDirs) {
                const fullPath = path.join(dir, resolvedClaudePath);
                if (fs.existsSync(fullPath)) {
                    resolvedClaudePath = fullPath;
                    break;
                }
            }
        }

        if (config.onDebugOutput) {
            config.onDebugOutput(`[DEBUG] Resolved claude path: ${resolvedClaudePath}\n`);
            config.onDebugOutput(`[DEBUG] Command: ${resolvedClaudePath} ${config.args.join(' ')}\n`);
        }

        // Use the shell to execute the command, which handles shebangs and PATH resolution
        // This is the same as running it from your terminal
        const options = {
            cwd: config.workingDir,
            env: shellEnv,
            shell: shellEnv.SHELL || '/bin/zsh'
        };

        return spawn(resolvedClaudePath, config.args, options);
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
            process.stdin.write(jsonInput);
            process.stdin.end();
        }
    }
}
