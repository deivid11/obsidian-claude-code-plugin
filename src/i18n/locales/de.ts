/**
 * German translations
 */
export const de = {
    // Header
    'header.title': 'Claude Code Assistent',
    'header.noNoteSelected': 'keine Notiz ausgewählt',

    // Input Section
    'input.label': 'Deine Anweisungen:',
    'input.placeholder': 'z.B. "Füge mehr Beispiele zu diesem Abschnitt hinzu" oder "Reorganisiere mit besseren Überschriften" (Enter zum Senden, Strg+Enter für neue Zeile)',
    'input.conversationalMode': 'Konversationsmodus (keine Dateiänderungen)',
    'input.conversationalModeTooltip': 'Mit Claude chatten, ohne Dateien zu ändern',
    'input.selectedTextOnly': 'Nur markierten Text bearbeiten',
    'input.autoAccept': 'Änderungen automatisch übernehmen',
    'input.modelLabel': 'Modell:',
    'input.modelDefault': 'Standard',
    'input.runButton': 'Claude Code ausführen',
    'input.runningButton': 'Läuft...',
    'input.cancelButton': 'Abbrechen',

    // Result Section
    'result.title': 'Ergebnis',

    // Output Section
    'output.title': 'Ausgabe',

    // Preview Section
    'preview.title': 'Vorschau',
    'preview.tabRaw': 'Roh',
    'preview.tabDiff': 'Diff',
    'preview.tabRendered': 'Gerendert',
    'preview.originalChars': 'Original:',
    'preview.modifiedChars': 'Geändert:',
    'preview.chars': 'Zeichen',
    'preview.applyButton': 'Änderungen übernehmen',
    'preview.rejectButton': 'Ablehnen',

    // History Section
    'history.title': 'Verlauf',
    'history.clearButton': 'Löschen',

    // Agent Section
    'agent.planTitle': 'Plan',
    'agent.activityTitle': 'Aktivität',
    'agent.noPlan': 'Noch kein Plan erstellt',

    // Todo Status
    'todo.pending': 'Ausstehend',
    'todo.inProgress': 'In Bearbeitung',
    'todo.completed': 'Abgeschlossen',

    // Interactive Prompt
    'interactive.header': 'Claude bittet um Bestätigung',
    'interactive.yesButton': 'Ja',
    'interactive.noButton': 'Nein',
    'interactive.customPlaceholder': 'Oder eine eigene Antwort eingeben...',

    // Permission Approval
    'permission.header': 'Berechtigung erforderlich',
    'permission.message': 'Claude bittet um Erlaubnis, Aktionen auszuführen.',
    'permission.approveButton': 'Genehmigen & fortfahren',
    'permission.denyButton': 'Ablehnen',

    // Status Messages
    'status.processing': 'Claude verarbeitet',
    'status.autoApplying': 'Änderungen werden automatisch übernommen...',
    'status.runningAuthorized': 'Führe autorisierte Aufgaben aus',
    'status.runningInBackground': 'Läuft im Hintergrund...',
    'status.failed': 'Fehlgeschlagen - siehe Fehler unten',

    // Notifications
    'notice.alreadyProcessing': 'Eine Anfrage wird bereits verarbeitet. Bitte warten.',
    'notice.enterPrompt': 'Bitte gib eine Anweisung ein',
    'notice.noActiveNote': 'Keine aktive Notiz gefunden, bitte öffne zuerst eine Markdown-Notiz',
    'notice.noEditor': 'Kein Markdown-Editor gefunden, bitte stelle sicher, dass eine Notiz geöffnet ist',
    'notice.noVaultPath': 'Vault-Pfad konnte nicht ermittelt werden',
    'notice.completed': 'Claude Code abgeschlossen',
    'notice.completedNoChanges': 'Claude Code abgeschlossen (keine Dateiänderungen)',
    'notice.changesApplied': 'Änderungen automatisch übernommen',
    'notice.changesAppliedSuccess': 'Änderungen erfolgreich übernommen',
    'notice.failedApplyChanges': 'Änderungen konnten nicht übernommen werden',
    'notice.changesRejected': 'Änderungen abgelehnt',
    'notice.cancelled': 'Abgebrochen',
    'notice.permissionRequest': 'Claude bittet um Berechtigung - bitte genehmigen oder ablehnen',
    'notice.permissionDenied': 'Berechtigung verweigert - Claude wird nicht fortfahren',
    'notice.noChangesToApply': 'Keine Änderungen zum Übernehmen',
    'notice.noActiveFile': 'Keine aktive Datei',
    'notice.historyRestored': 'Verlaufseintrag wiederhergestellt',
    'notice.historyRestoredWithChanges': 'Verlaufseintrag mit vorgeschlagenen Änderungen wiederhergestellt',
    'notice.historyCleared': 'Verlauf gelöscht',

    // Diff View
    'diff.original': 'Original',
    'diff.modified': 'Geändert',

    // Result Renderer
    'result.directAnswer': 'Direkte Antwort',
    'result.additionalContext': 'Zusätzlicher Kontext',
    'result.tokens': 'Tokens',
    'result.tokensIn': 'Eingabe',
    'result.tokensOut': 'Ausgabe',

    // Preview Stats
    'preview.originalLabel': 'Original:',
    'preview.modifiedLabel': 'Geändert:',
    'preview.charsLabel': 'Zeichen',

    // Misc
    'misc.noPendingRequest': 'Keine ausstehende Anfrage gefunden',
    'misc.languageChanged': 'Sprache geändert. Einige UI-Elemente werden nach dem Neuladen aktualisiert.',
    'misc.testFailed': 'Claude Code Test fehlgeschlagen',

    // Settings
    'settings.autoDetectPath': 'Claude Code Pfad automatisch erkennen',
    'settings.autoDetectPathDesc': 'Den Speicherort der Claude Code Anwendung automatisch erkennen',
    'settings.executablePath': 'Claude Code Anwendungspfad',
    'settings.executablePathDesc': 'Vollständiger Pfad zur Claude Code Anwendung (z.B. /usr/local/bin/claude)',
    'settings.testInstallation': 'Claude Code Installation testen',
    'settings.testInstallationDesc': 'Überprüfen, ob Claude Code erreichbar ist und funktioniert',
    'settings.testButton': 'Testen',
    'settings.testWorking': 'Funktioniert!',
    'settings.testFailed': 'Fehlgeschlagen',
    'settings.customPrompt': 'Benutzerdefinierte Systemanweisung',
    'settings.customPromptDesc': 'Optionale benutzerdefinierte Systemanweisung, die allen Anfragen vorangestellt wird',
    'settings.customPromptPlaceholder': 'Du hilfst beim Bearbeiten von Markdown-Notizen...',
    'settings.preserveCursor': 'Cursorposition beibehalten',
    'settings.preserveCursorDesc': 'Versuchen, die Cursorposition nach dem Übernehmen von Änderungen beizubehalten',
    'settings.autoAcceptChanges': 'Änderungen automatisch übernehmen',
    'settings.autoAcceptChangesDesc': 'Änderungen automatisch übernehmen, ohne Vorschau anzuzeigen (mit Vorsicht verwenden!)',
    'settings.model': 'Modell',
    'settings.modelDesc': 'Wähle das Claude-Modell: Sonnet (ausgewogen), Opus (leistungsfähigste), oder Haiku (schnellste). Leer lassen für Standard-Subagent-Modell.',
    'settings.modelDefault': 'Standard (Subagent-Modell)',
    'settings.modelSonnet': 'Sonnet (ausgewogen)',
    'settings.modelOpus': 'Opus (leistungsfähigste)',
    'settings.modelHaiku': 'Haiku (schnellste)',
    'settings.vaultAccess': 'Vault-weiten Zugriff erlauben',
    'settings.vaultAccessDesc': 'Claude erlauben, andere Dateien im Vault zu lesen/durchsuchen (nicht nur die aktuelle Notiz)',
    'settings.permissionlessMode': 'Berechtigungsfreien Modus aktivieren',
    'settings.permissionlessModeDesc': 'Claude erlauben, Aktionen auszuführen, ohne jedes Mal um Erlaubnis zu fragen (mit Vorsicht verwenden! Claude hat volle Kontrolle)',
    'settings.timeout': 'Zeitlimit (Sekunden)',
    'settings.timeoutDesc': 'Maximale Wartezeit auf Claude Code Antwort (0 = kein Zeitlimit)',
    'settings.customApiConfig': 'Benutzerdefinierte API-Konfiguration',
    'settings.customApiConfigDesc': 'Benutzerdefinierte API-Endpunkte für Regionen konfigurieren, in denen Claude nicht direkt verfügbar ist. Leer lassen für Standardeinstellungen.',
    'settings.apiBaseUrl': 'API Basis-URL',
    'settings.apiBaseUrlDesc': 'Benutzerdefinierte API-Endpunkt-URL (z.B. https://api.kimi.com/coding/)',
    'settings.apiAuthToken': 'API Auth-Token',
    'settings.apiAuthTokenDesc': 'Benutzerdefiniertes Authentifizierungstoken für den API-Endpunkt',
    'settings.apiAuthTokenPlaceholder': 'Gib dein API-Token ein',
    'settings.customModel': 'Benutzerdefiniertes Modell',
    'settings.customModelDesc': 'Benutzerdefinierter Modellname (z.B. kimi-for-coding). Überschreibt die Modellauswahl oben.',
    'settings.customSmallModel': 'Benutzerdefiniertes kleines/schnelles Modell',
    'settings.customSmallModelDesc': 'Benutzerdefinierter Modellname für schnelle Operationen (z.B. kimi-for-coding)',
    'settings.language': 'Sprache',
    'settings.languageDesc': 'Oberflächensprache auswählen',
};