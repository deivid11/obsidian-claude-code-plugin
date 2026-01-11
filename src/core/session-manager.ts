import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import type { BackendType } from './backends/types';

/**
 * Session information for a note or standalone session
 */
export interface SessionInfo {
    sessionDir: string;
    sessionId: string | null;
    isNewSession: boolean;
    /** Unique hash identifying this session */
    sessionHash: string;
}

/**
 * Linked note information
 */
export interface LinkedNote {
    /** Path to the note file */
    path: string;
    /** Display name for the note */
    title: string;
    /** When this note was linked to the session */
    linkedAt: string;
    /** Whether this is the primary note (the one that started the session) */
    isPrimary: boolean;
}

/**
 * Session metadata stored with each session
 */
export interface SessionMetadata {
    /** Session display name (for standalone sessions or primary note title) */
    sessionName: string;
    /** Whether this is a standalone session (not started from a note) */
    isStandalone: boolean;
    /** Notes linked to this session */
    linkedNotes: LinkedNote[];
    /** Backend used for this session (claude or opencode) */
    backend: BackendType;
    /** Last time this session was used */
    lastUsed: string;
    /** First time this session was created */
    createdAt: string;
    /** Number of conversation exchanges */
    messageCount: number;

    // Legacy fields for backwards compatibility
    /** @deprecated Use linkedNotes instead */
    notePath?: string;
    /** @deprecated Use sessionName instead */
    noteTitle?: string;
}

/**
 * Session entry for listing
 */
export interface SessionEntry {
    /** Session directory hash */
    hash: string;
    /** Session directory path */
    sessionDir: string;
    /** Session metadata */
    metadata: SessionMetadata;
}

/**
 * Manages persistent session directories and IDs for Claude Code
 */
export class SessionManager {
    /**
     * Get or create session directory for a note
     *
     * @param notePath Path to the note file (or null for standalone session)
     * @param vaultPath Path to the vault root
     * @param configDir Config directory name from Vault.configDir
     * @param backend Backend type (claude or opencode) - session IDs are stored per backend
     * @returns Session information
     */
    static getSessionInfo(notePath: string | null, vaultPath: string, configDir: string, backend: BackendType = 'claude'): SessionInfo {
        // Create a hash for the session directory name
        let sessionHash: string;
        if (notePath) {
            // For note-based sessions, use note path hash
            sessionHash = crypto.createHash('md5').update(notePath).digest('hex');
        } else {
            // For standalone sessions, generate a unique hash
            sessionHash = crypto.createHash('md5').update(`standalone-${Date.now()}-${Math.random()}`).digest('hex');
        }

        const sessionDir = path.join(vaultPath, configDir, 'claude-code-sessions', sessionHash);

        // Ensure the session directory exists
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Check for existing session ID (stored per backend to avoid cross-backend issues)
        const sessionIdFile = path.join(sessionDir, `session_id_${backend}.txt`);
        let sessionId: string | null = null;
        let isNewSession = true;

        if (fs.existsSync(sessionIdFile)) {
            try {
                sessionId = fs.readFileSync(sessionIdFile, 'utf8').trim();
                if (sessionId) {
                    isNewSession = false;
                }
            } catch (error) {
                console.warn('Error loading session ID:', error);
            }
        }

        return {
            sessionDir,
            sessionId,
            isNewSession,
            sessionHash
        };
    }

    /**
     * Create a new standalone session
     *
     * @param vaultPath Path to the vault root
     * @param configDir Config directory name
     * @param backend Backend type
     * @param sessionName Optional name for the session
     * @returns Session information
     */
    static createStandaloneSession(
        vaultPath: string,
        configDir: string,
        backend: BackendType,
        sessionName?: string
    ): SessionInfo {
        const sessionHash = crypto.createHash('md5').update(`standalone-${Date.now()}-${Math.random()}`).digest('hex');
        const sessionDir = path.join(vaultPath, configDir, 'claude-code-sessions', sessionHash);

        // Create the session directory
        fs.mkdirSync(sessionDir, { recursive: true });

        // Create initial metadata
        const now = new Date().toISOString();
        const metadata: SessionMetadata = {
            sessionName: sessionName || `Session ${new Date().toLocaleString()}`,
            isStandalone: true,
            linkedNotes: [],
            backend,
            lastUsed: now,
            createdAt: now,
            messageCount: 0
        };

        const metadataFile = path.join(sessionDir, 'session_meta.json');
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

        return {
            sessionDir,
            sessionId: null,
            isNewSession: true,
            sessionHash
        };
    }

    /**
     * Save session ID to disk
     *
     * @param sessionDir Directory where session data is stored
     * @param sessionId Session ID to save
     * @param backend Backend type (claude or opencode)
     */
    static saveSessionId(sessionDir: string, sessionId: string, backend: BackendType = 'claude'): void {
        try {
            const sessionIdFile = path.join(sessionDir, `session_id_${backend}.txt`);
            fs.writeFileSync(sessionIdFile, sessionId);
        } catch (error) {
            console.error('Error saving session ID:', error);
            throw error;
        }
    }

    /**
     * Load conversation history
     *
     * @param sessionDir Directory where session data is stored
     * @returns Array of conversation messages or empty array if not found
     */
    static loadConversationHistory(sessionDir: string): Array<{role: string, content: string, timestamp: string}> {
        const historyFile = path.join(sessionDir, 'conversation_history.json');

        try {
            if (fs.existsSync(historyFile)) {
                return JSON.parse(fs.readFileSync(historyFile, 'utf8')) as Array<{role: string, content: string, timestamp: string}>;
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
        }

        return [];
    }

    /**
     * Get the last assistant response from session history
     *
     * @param sessionDir Directory where session data is stored
     * @returns Last assistant response or null if not found
     */
    static getLastAssistantResponse(sessionDir: string): string | null {
        const history = this.loadConversationHistory(sessionDir);

        // Find the last assistant message
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'assistant' && history[i].content) {
                return history[i].content;
            }
        }

        return null;
    }

    /**
     * Get the last user prompt from session history
     *
     * @param sessionDir Directory where session data is stored
     * @returns Last user prompt or null if not found
     */
    static getLastUserPrompt(sessionDir: string): string | null {
        const history = this.loadConversationHistory(sessionDir);

        // Find the last user message
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'user' && history[i].content) {
                return history[i].content;
            }
        }

        return null;
    }

    /**
     * Save conversation history
     *
     * @param sessionDir Directory where session data is stored
     * @param userPrompt User's prompt
     * @param assistantResponse Assistant's response
     */
    static saveConversationHistory(
        sessionDir: string,
        userPrompt: string,
        assistantResponse: string
    ): void {
        const historyFile = path.join(sessionDir, 'conversation_history.json');

        try {
            // Load existing history
            let history: Array<{role: string, content: string, timestamp: string}> = [];
            if (fs.existsSync(historyFile)) {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8')) as Array<{role: string, content: string, timestamp: string}>;
            }

            // Add this exchange
            history.push({
                role: 'user',
                content: userPrompt,
                timestamp: new Date().toISOString()
            });

            history.push({
                role: 'assistant',
                content: assistantResponse,
                timestamp: new Date().toISOString()
            });

            // Keep only last 10 exchanges (20 messages) to avoid huge prompts
            if (history.length > 20) {
                history = history.slice(-20);
            }

            // Save history
            fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving conversation history:', error);
            throw error;
        }
    }

    /**
     * Save session metadata
     *
     * @param sessionDir Directory where session data is stored
     * @param notePath Original note path (null for standalone)
     * @param backend Backend type used for this session
     */
    static saveSessionMetadata(
        sessionDir: string,
        notePath: string | null,
        backend: BackendType
    ): void {
        const metadataFile = path.join(sessionDir, 'session_meta.json');
        const now = new Date().toISOString();

        try {
            // Load existing metadata or create new
            let metadata: SessionMetadata;
            if (fs.existsSync(metadataFile)) {
                metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8')) as SessionMetadata;
                metadata.lastUsed = now;
                metadata.messageCount = (metadata.messageCount || 0) + 1;

                // Migrate legacy format if needed
                if (!metadata.linkedNotes) {
                    metadata.linkedNotes = [];
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    if (metadata.notePath) {
                        metadata.linkedNotes.push({
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            path: metadata.notePath,
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            title: metadata.noteTitle || path.basename(metadata.notePath, '.md'),
                            linkedAt: metadata.createdAt,
                            isPrimary: true
                        });
                    }
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    metadata.sessionName = metadata.noteTitle || metadata.sessionName || 'Untitled Session';
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    metadata.isStandalone = !metadata.notePath;
                }
            } else {
                const noteTitle = notePath ? path.basename(notePath, '.md') : null;
                metadata = {
                    sessionName: noteTitle || `Session ${new Date().toLocaleString()}`,
                    isStandalone: !notePath,
                    linkedNotes: notePath ? [{
                        path: notePath,
                        title: noteTitle!,
                        linkedAt: now,
                        isPrimary: true
                    }] : [],
                    backend,
                    lastUsed: now,
                    createdAt: now,
                    messageCount: 1,
                    // Legacy fields for backwards compatibility
                    notePath: notePath || undefined,
                    noteTitle: noteTitle || undefined
                };
            }

            fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Error saving session metadata:', error);
        }
    }

    /**
     * Add a linked note to a session
     *
     * @param sessionDir Directory where session data is stored
     * @param notePath Path to the note to link
     * @param isPrimary Whether this is the primary note
     */
    static addLinkedNote(
        sessionDir: string,
        notePath: string,
        isPrimary: boolean = false
    ): void {
        const metadataFile = path.join(sessionDir, 'session_meta.json');
        const now = new Date().toISOString();

        try {
            if (!fs.existsSync(metadataFile)) {
                console.warn('Session metadata not found:', sessionDir);
                return;
            }

            const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8')) as SessionMetadata;

            // Initialize linkedNotes if not present
            if (!metadata.linkedNotes) {
                metadata.linkedNotes = [];
            }

            // Check if note is already linked
            const existingIndex = metadata.linkedNotes.findIndex(n => n.path === notePath);
            if (existingIndex >= 0) {
                // Update existing entry
                metadata.linkedNotes[existingIndex].linkedAt = now;
                if (isPrimary) {
                    // Reset other primary flags
                    metadata.linkedNotes.forEach(n => n.isPrimary = false);
                    metadata.linkedNotes[existingIndex].isPrimary = true;
                }
            } else {
                // Add new linked note
                if (isPrimary) {
                    // Reset other primary flags
                    metadata.linkedNotes.forEach(n => n.isPrimary = false);
                }
                metadata.linkedNotes.push({
                    path: notePath,
                    title: path.basename(notePath, '.md'),
                    linkedAt: now,
                    isPrimary
                });
            }

            // Update session name if this is the first/primary note
            if (isPrimary || metadata.linkedNotes.length === 1) {
                metadata.sessionName = path.basename(notePath, '.md');
                metadata.isStandalone = false;
            }

            // Update legacy fields
            const primaryNote = metadata.linkedNotes.find(n => n.isPrimary) || metadata.linkedNotes[0];
            if (primaryNote) {
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                metadata.notePath = primaryNote.path;
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                metadata.noteTitle = primaryNote.title;
            }

            fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Error adding linked note:', error);
        }
    }

    /**
     * Get session metadata
     *
     * @param sessionDir Directory where session data is stored
     * @returns Session metadata or null if not found
     */
    static getSessionMetadata(sessionDir: string): SessionMetadata | null {
        const metadataFile = path.join(sessionDir, 'session_meta.json');

        try {
            if (fs.existsSync(metadataFile)) {
                const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8')) as SessionMetadata;

                // Migrate legacy format if needed
                if (!metadata.linkedNotes) {
                    metadata.linkedNotes = [];
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    if (metadata.notePath) {
                        metadata.linkedNotes.push({
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            path: metadata.notePath,
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            title: metadata.noteTitle || path.basename(metadata.notePath, '.md'),
                            linkedAt: metadata.createdAt,
                            isPrimary: true
                        });
                    }
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    metadata.sessionName = metadata.noteTitle || 'Untitled Session';
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    metadata.isStandalone = !metadata.notePath;
                }

                return metadata;
            }
        } catch (error) {
            console.error('Error reading session metadata:', error);
        }

        return null;
    }

    /**
     * List all sessions in the vault
     *
     * @param vaultPath Path to the vault root
     * @param configDir Config directory name from Vault.configDir
     * @returns Array of session entries sorted by last used (most recent first)
     */
    static listAllSessions(vaultPath: string, configDir: string): SessionEntry[] {
        const sessionsDir = path.join(vaultPath, configDir, 'claude-code-sessions');
        const sessions: SessionEntry[] = [];

        try {
            if (!fs.existsSync(sessionsDir)) {
                return sessions;
            }

            const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const sessionDir = path.join(sessionsDir, entry.name);
                    const metadata = this.getSessionMetadata(sessionDir);

                    if (metadata) {
                        sessions.push({
                            hash: entry.name,
                            sessionDir,
                            metadata
                        });
                    }
                }
            }

            // Sort by last used (most recent first)
            sessions.sort((a, b) => {
                const dateA = new Date(a.metadata.lastUsed).getTime();
                const dateB = new Date(b.metadata.lastUsed).getTime();
                return dateB - dateA;
            });

        } catch (error) {
            console.error('Error listing sessions:', error);
        }

        return sessions;
    }

    /**
     * Delete a session
     *
     * @param sessionDir Directory to delete
     */
    static deleteSession(sessionDir: string): boolean {
        try {
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                return true;
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
        return false;
    }

    /**
     * Update session paths when a file is renamed
     *
     * @param vaultPath Path to the vault root
     * @param configDir Config directory name
     * @param oldPath Old file path
     * @param newPath New file path
     * @returns Number of sessions updated
     */
    static updateSessionPaths(
        vaultPath: string,
        configDir: string,
        oldPath: string,
        newPath: string
    ): number {
        const sessionsDir = path.join(vaultPath, configDir, 'claude-code-sessions');
        let updatedCount = 0;

        try {
            if (!fs.existsSync(sessionsDir)) {
                return 0;
            }

            const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const sessionDir = path.join(sessionsDir, entry.name);
                    const metadataFile = path.join(sessionDir, 'session_meta.json');

                    if (fs.existsSync(metadataFile)) {
                        try {
                            const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8')) as SessionMetadata;
                            let updated = false;

                            // Update legacy field
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            if (metadata.notePath === oldPath) {
                                // eslint-disable-next-line @typescript-eslint/no-deprecated
                                metadata.notePath = newPath;
                                // eslint-disable-next-line @typescript-eslint/no-deprecated
                                metadata.noteTitle = path.basename(newPath, '.md');
                                updated = true;
                            }

                            // Update linkedNotes
                            if (metadata.linkedNotes) {
                                for (const note of metadata.linkedNotes) {
                                    if (note.path === oldPath) {
                                        note.path = newPath;
                                        note.title = path.basename(newPath, '.md');
                                        updated = true;
                                    }
                                }
                            }

                            // Update session name if primary note was renamed
                            const primaryNote = metadata.linkedNotes?.find(n => n.isPrimary);
                            if (primaryNote && primaryNote.path === newPath) {
                                metadata.sessionName = primaryNote.title;
                            }

                            if (updated) {
                                fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
                                updatedCount++;
                                console.debug(`Updated session path: ${oldPath} -> ${newPath}`);
                            }
                        } catch (error) {
                            console.error('Error updating session metadata:', error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating session paths:', error);
        }

        return updatedCount;
    }

    /**
     * Find session by note path
     *
     * @param vaultPath Path to the vault root
     * @param configDir Config directory name
     * @param notePath Note path to find
     * @returns Session entry or null if not found
     */
    static findSessionByNotePath(
        vaultPath: string,
        configDir: string,
        notePath: string
    ): SessionEntry | null {
        const sessions = this.listAllSessions(vaultPath, configDir);

        for (const session of sessions) {
            // Check legacy field
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            if (session.metadata.notePath === notePath) {
                return session;
            }
            // Check linkedNotes
            if (session.metadata.linkedNotes?.some(n => n.path === notePath)) {
                return session;
            }
        }

        return null;
    }
}
