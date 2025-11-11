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
}

/**
 * Handles spawning and managing Claude Code process
 */
export class ProcessSpawner {
    /**
     * Build enhanced PATH including node directory (found via which/where)
     * The shebang (#!/usr/bin/env node) needs to find node in PATH
     */
    private static buildEnhancedPath(): string {
        const isWindows = process.platform === 'win32';
        const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
        const envPath = process.env.PATH || '';
        const pathSeparator = isWindows ? ';' : ':';

        const commonPaths: string[] = [];

        // Try to find node using which/where and add its directory to PATH
        try {
            const whichCmd = isWindows ? 'where node' : 'which node';
            const nodePath = execSync(whichCmd, { encoding: 'utf8' }).trim().split('\n')[0];
            if (nodePath) {
                const nodeDir = path.dirname(nodePath);
                console.log(`[ProcessSpawner] Found node via which: ${nodePath}, adding dir: ${nodeDir}`);
                commonPaths.push(nodeDir);
            }
        } catch (e) {
            console.log('[ProcessSpawner] which/where node failed, adding common node paths');
        }

        // Add common node locations explicitly (in case which fails in Flatpak)
        if (!isWindows) {
            // NVM paths - find all installed versions dynamically, sorted by version (newest first)
            try {
                const nvmDir = path.join(homeDir, '.nvm', 'versions', 'node');
                if (fs.existsSync(nvmDir)) {
                    const versions = fs.readdirSync(nvmDir)
                        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true })); // Sort descending (v20 before v14)
                    console.log(`[ProcessSpawner] Found NVM versions:`, versions);
                    for (const version of versions) {
                        commonPaths.push(path.join(nvmDir, version, 'bin'));
                    }
                }
            } catch (e) {
                console.log('[ProcessSpawner] NVM directory not accessible');
            }

            // System paths (might be newer than NVM on some systems)
            commonPaths.push('/bin', '/usr/bin', '/usr/local/bin');
        }

        // Add common locations where claude might be installed
        if (isWindows) {
            commonPaths.push(
                path.join(homeDir, '.bun', 'bin'),
                path.join(homeDir, '.local', 'bin')
            );
        } else {
            commonPaths.push(
                path.join(homeDir, '.bun', 'bin'),
                path.join(homeDir, '.local', 'bin')
            );
        }

        // Combine with existing PATH and deduplicate
        const enhancedPath = [...new Set([...commonPaths, ...envPath.split(pathSeparator)])].join(pathSeparator);
        console.log('[ProcessSpawner] Enhanced PATH:', enhancedPath.split(pathSeparator).slice(0, 10).join(', '), '...');
        return enhancedPath;
    }

    /**
     * Spawn Claude Code process with enhanced environment
     *
     * Claude has a shebang (#!/usr/bin/env node) so the OS will find and run node automatically
     * We use shell: true so the enhanced PATH is available when the shebang is evaluated
     *
     * @param config Spawn configuration
     * @returns Child process
     */
    static spawn(config: SpawnConfig): ChildProcess {
        const enhancedPath = this.buildEnhancedPath();

        const options = {
            cwd: config.workingDir,
            env: {
                ...process.env,
                PATH: enhancedPath
            },
            shell: true  // Required so the shell uses our enhanced PATH for the shebang
        };

        // Run claude directly - the shebang will handle finding node
        return spawn(config.claudePath, config.args, options);
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
