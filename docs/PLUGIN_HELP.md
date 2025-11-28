# Plugin Development Help for AI Agents

This document contains critical information for AI agents working on this Obsidian plugin.

## Obsidian API Basics

### 1. The `app` Object

- The global `app` object is the entry point to the Obsidian API.
- Access it via `this.app` in the plugin class or views.
- Key components:
  - `app.workspace`: Manages leaves, views, and layout.
  - `app.vault`: Manages files and folders (read/write).
  - `app.metadataCache`: Access file metadata (frontmatter, tags).

### 2. File Operations

- **Always use `app.vault`** for file I/O. Do not use `fs` directly for vault files unless absolutely necessary (and you know the absolute path).
- **Paths**: Obsidian uses vault-relative paths (e.g., `Folder/Note.md`).
- **TFile**: The object representing a file. Use `app.vault.getAbstractFileByPath(path)` to get it.
- **Reading**: `await app.vault.read(tFile)`
- **Writing**: `await app.vault.modify(tFile, newContent)`

### 3. Views and Leaves

- **Leaf**: A tab or pane in the workspace.
- **View**: The content within a leaf.
- **Custom Views**: Must extend `ItemView`.
- **Registration**: Register views in `onload()` using `registerView`.

## Plugin-Specific Architecture

### 1. Claude Code Runner

- The plugin spawns `claude` as a child process.
- **Communication**: It uses a JSON-based stream over stdout.
- **Blocking**: The `claude` process is asynchronous. Do not block the main thread while waiting for it.

### 2. UI Updates

- **Streaming**: The UI receives partial updates. Ensure the DOM handles frequent updates efficiently.
- **React/Svelte**: This plugin currently uses direct DOM manipulation in `view.ts` and `ui-builder.ts`. Keep it consistent. If refactoring to a framework, ensure it handles the high-frequency updates of streaming text.

### 3. State Management

- **Context**: State is managed per-note. See `NoteContextManager`.
- **Persistence**: Sessions are saved to disk in `.obsidian/plugins/claude-code-integration/sessions/`.

## Common Pitfalls

- **Path Separators**: Obsidian paths use forward slashes `/` on all platforms.
- **Asynchronous Lifecycle**: `onload` is async. Await your initialization steps.
- **Event Cleanup**: Always register events using `this.registerEvent` so they are cleaned up on plugin unload.
- **DOM Events**: Use `this.registerDomEvent` for window/document events.

## Debugging

- Use `console.log` - it shows up in the Developer Tools (Cmd+Opt+I on Mac).
- The `ClaudeCodeRunner` has extensive debug logging enabled. Check the console for "Claude Code" messages.
