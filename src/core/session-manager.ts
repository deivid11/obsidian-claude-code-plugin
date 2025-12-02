import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Session information for a note
 */
export interface SessionInfo {
    sessionDir: string;
    sessionId: string | null;
    isNewSession: boolean;
}

/**
 * Manages persistent session directories and IDs for Claude Code
 */
export class SessionManager {
    /**
     * Get or create session directory for a note
     *
     * @param notePath Path to the note file
     * @param vaultPath Path to the vault root
     * @param configDir Optional config directory name (defaults to '.obsidian')
     * @returns Session information
     */
    static getSessionInfo(notePath: string, vaultPath: string, configDir: string = '.obsidian'): SessionInfo {
        // Create a hash of the note path for the session directory name
        const noteHash = crypto.createHash('md5').update(notePath).digest('hex');
        const sessionDir = path.join(vaultPath, configDir, 'claude-code-sessions', noteHash);

        // Ensure the session directory exists
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Check for existing session ID
        const sessionIdFile = path.join(sessionDir, 'session_id.txt');
        let sessionId: string | null = null;
        let isNewSession = true;

        if (fs.existsSync(sessionIdFile)) {
            try {
                sessionId = fs.readFileSync(sessionIdFile, 'utf8').trim();
                isNewSession = false;
            } catch (e) {
                console.warn('Error loading session ID:', e);
            }
        }

        return {
            sessionDir,
            sessionId,
            isNewSession
        };
    }

    /**
     * Save session ID to disk
     *
     * @param sessionDir Directory where session data is stored
     * @param sessionId Session ID to save
     */
    static saveSessionId(sessionDir: string, sessionId: string): void {
        try {
            const sessionIdFile = path.join(sessionDir, 'session_id.txt');
            fs.writeFileSync(sessionIdFile, sessionId);
        } catch (e) {
            console.error('Error saving session ID:', e);
            throw e;
        }
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
            let history: any[] = [];
            if (fs.existsSync(historyFile)) {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
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
        } catch (e) {
            console.error('Error saving conversation history:', e);
            throw e;
        }
    }
}
