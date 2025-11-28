# Claude Code Integration for Obsidian

## Overview

This plugin integrates Claude Code into Obsidian, allowing you to chat with Claude about your current note and the entire vault.

Documentation is in the `docs` directory.

## ⚠️ CRITICAL: ALWAYS FOLLOW DOCUMENTATION AND PRD

You must always follow the documentation and PRD. If you have questions, please ask the user before beginning work.

## Commands

- `npm run dev`: Build the plugin in development mode (watch mode).
- `npm run build`: Build the plugin for production.
- `make build-install DEST=<path>`: Build and install to a specific Obsidian vault.
- `make setup-plugin DEST=<path>`: Symlink the build directory to an Obsidian vault.

## Code Structure

- `src/main.ts`: Entry point. Registers view, commands, and settings.
- `src/core/`: Core logic (Runner, Settings, Session Manager).
  - `claude-code-runner.ts`: Manages the `claude` CLI process.
  - `session-manager.ts`: Handles session persistence per note.
- `src/ui/`: User Interface (View, Renderers).
  - `view.ts`: Main view logic.
  - `ui-builder.ts`: DOM construction.
- `src/managers/`: State managers (Note Context).

## Architecture

- **Process Model**: Spawns `claude` CLI as a child process.
- **Communication**: Stdin/Stdout (JSON stream).
- **State**: Per-note context (history, active process).
- **Storage**: `.obsidian/plugins/claude-code-integration/sessions/`.

## Key Features

- Chat interface for Claude Code.
- Context-aware (current note, vault).
- Streaming responses.
- Diff view for file modifications.
- Tool usage tracking.
