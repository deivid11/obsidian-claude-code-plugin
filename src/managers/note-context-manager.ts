/**
 * Note Context Manager - Manages per-note conversation contexts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { NoteContext } from '../core/types';
import { ClaudeCodeRunner } from '../core/claude-code-runner';
import { ClaudeCodeSettings } from '../core/settings';

interface SessionData {
    history?: unknown[];
    sessionId?: string;
    outputLines?: string[];
    agentSteps?: unknown[];
    notePath?: string;
    pendingPreviewContent?: string;
    originalPreviewContent?: string;
}

export class NoteContextManager {
    private contexts: Map<string, NoteContext> = new Map();
    private settings: ClaudeCodeSettings;
    private dataDir: string;

    constructor(settings: ClaudeCodeSettings, dataDir: string) {
        this.settings = settings;
        this.dataDir = dataDir;
    }

    /**
     * Update settings for all contexts and their runners
     */
    updateSettings(settings: ClaudeCodeSettings): void {
        this.settings = settings;
        // Update all existing runners with new settings
        for (const context of this.contexts.values()) {
            context.runner.updateSettings(settings);
        }
    }

    /**
     * Get or create context for a note
     */
    getContext(notePath: string): NoteContext {
        if (!this.contexts.has(notePath)) {
            this.contexts.set(notePath, this.createNewContext());
        }
        return this.contexts.get(notePath)!;
    }

    /**
     * Create a new empty context
     */
    private createNewContext(): NoteContext {
        return {
            history: [],
            sessionId: null,
            currentResponse: null,
            currentRequest: null,
            outputLines: [],
            agentSteps: [],
            runner: new ClaudeCodeRunner(this.settings),
            isRunning: false
        };
    }

    /**
     * Load all note contexts from disk
     */
    loadContexts(vaultPath: string): void {
        const contextsDir = path.join(vaultPath, this.dataDir);

        if (!fs.existsSync(contextsDir)) {
            return;
        }

        // Read all note context directories
        const noteDirs = fs.readdirSync(contextsDir);

        for (const noteHash of noteDirs) {
            const contextFile = path.join(contextsDir, noteHash, 'context.json');

            if (fs.existsSync(contextFile)) {
                try {
                    const data = JSON.parse(fs.readFileSync(contextFile, 'utf8')) as SessionData;

                    // Reconstruct the context
                    const context: NoteContext = {
                        history: (data.history ?? []) as NoteContext['history'],
                        sessionId: data.sessionId ?? null,
                        currentResponse: null,
                        currentRequest: null,
                        outputLines: data.outputLines ?? [],
                        agentSteps: (data.agentSteps ?? []) as NoteContext['agentSteps'],
                        runner: new ClaudeCodeRunner(this.settings),
                        isRunning: false,
                        pendingPreviewContent: data.pendingPreviewContent,
                        originalPreviewContent: data.originalPreviewContent
                    };

                    // Store using the note path from the data
                    if (data.notePath) {
                        this.contexts.set(data.notePath, context);
                    }
                } catch {
                    // Skip contexts that fail to load
                }
            }
        }
    }

    /**
     * Save a note's context to disk
     */
    saveContext(notePath: string, vaultPath: string): void {
        const context = this.contexts.get(notePath);
        if (!context) return;

        const noteHash = crypto.createHash('md5').update(notePath).digest('hex');
        const contextDir = path.join(vaultPath, this.dataDir, noteHash);

        if (!fs.existsSync(contextDir)) {
            fs.mkdirSync(contextDir, { recursive: true });
        }

        const contextFile = path.join(contextDir, 'context.json');

        const dataToSave = {
            notePath: notePath,
            sessionId: context.sessionId,
            history: context.history,
            outputLines: context.outputLines,
            agentSteps: context.agentSteps,
            pendingPreviewContent: context.pendingPreviewContent,
            originalPreviewContent: context.originalPreviewContent,
            savedAt: new Date().toISOString()
        };

        fs.writeFileSync(contextFile, JSON.stringify(dataToSave, null, 2));
    }

    /**
     * Save all contexts
     */
    saveAllContexts(vaultPath: string): void {
        for (const notePath of this.contexts.keys()) {
            this.saveContext(notePath, vaultPath);
        }
    }

    /**
     * Clear history for a note
     */
    clearHistory(notePath: string): void {
        const context = this.contexts.get(notePath);
        if (context) {
            context.history = [];
            context.outputLines = [];
            context.agentSteps = [];
        }
    }

    /**
     * Get all contexts
     */
    getAllContexts(): Map<string, NoteContext> {
        return this.contexts;
    }

    /**
     * Check if a note has a context
     */
    hasContext(notePath: string): boolean {
        return this.contexts.has(notePath);
    }

    /**
     * Get count of running processes
     */
    getRunningCount(): number {
        let count = 0;
        for (const context of this.contexts.values()) {
            if (context.isRunning) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get list of note paths that are currently running
     */
    getRunningNotePaths(): string[] {
        const running: string[] = [];
        for (const [notePath, context] of this.contexts.entries()) {
            if (context.isRunning) {
                running.push(notePath);
            }
        }
        return running;
    }
}
