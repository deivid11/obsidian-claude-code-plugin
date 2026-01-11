# Changelog

All notable changes to the Obsidian Claude Code Plugin will be documented in this file.

## [2.0.0] - 2026-01-10

### Major Features

#### Multi-Backend Support
- **New Backend System**: Added support for multiple AI CLI backends (Claude Code and OpenCode)
- **Backend Selection**: Users can now choose between `Claude Code` or `OpenCode` in settings
- **New backend adapter architecture** with unified event handling

#### Sessions Management
- **Global Sessions View**: New "Sessions" tab showing all sessions across the vault
- **Standalone Sessions**: Create sessions not tied to any specific note
- **Session Metadata**: Track linked notes, backend type, timestamps, message counts
- **Smart Linking**: Sessions automatically update when notes are renamed/moved
- **Session List UI**: View, open, and delete sessions from the new Sessions tab

#### Tabbed Interface
- **New Tabbed UI**: Switch between "Assistant" (note-focused) and "Sessions" (global) views
- **Live Running Indicators**: See which sessions are currently active with elapsed time

### Improvements

#### UI/UX Enhancements
- **Settings Cog Button**: Quick access to plugin settings from the header
- **Clickable File Paths**: File paths in output are now clickable links that open the file
- **Tool Icons**: Each tool now has a specific icon (Bash, Read, Edit, etc.)
- **Backend-Specific Labels**: UI text now shows the active backend name

#### Session Management
- **Per-Backend Session IDs**: Session IDs stored separately for each backend
- **File Rename Tracking**: Sessions update when linked notes are renamed
- **Conversation History**: Load last assistant response and user prompt from history

#### Settings
- **Backend Dropdown**: Choose between Claude Code and OpenCode
- **OpenCode Settings Section**: Auto-detect path, manual configuration, model selection
- **Reorganized Settings**: Backend-specific and common settings sections

#### Internationalization
- **Dynamic Backend Names**: i18n strings now support backend placeholder
- **New Translation Keys**: Sessions UI, tabs, backend settings

### Technical Changes

- **Normalized Event Handling**: Unified event processing for all backends
- **Backend Factory Pattern**: Clean abstraction for backend implementations
- **Settings Hot-Reload**: Settings update without restart
- **OpenCode Response Parsing**: Support for OpenCode's event format

### Bug Fixes
- Fixed double-output bug in event processing
- Fixed Linux compatibility for sed command in Makefile
- Added explicit types to fix ESLint errors

---

## [1.0.x] - Previous Releases

See git history for previous release notes.
