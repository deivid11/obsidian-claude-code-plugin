# Product Requirements Document (PRD)

## Product Overview

The **Obsidian Claude Code Plugin** integrates the power of Anthropic's Claude Code CLI directly into Obsidian. It allows users to have a conversational AI agent that can manage their documents, perform research, and execute coding or writing tasks within their vault.

## Goals

- **Seamless Integration**: Bring Claude Code's capabilities into the Obsidian interface without requiring context switching to a terminal.
- **Context Awareness**: Enable Claude to understand the current note and the entire vault structure.
- **Safe Execution**: Provide a secure environment with permission controls for file modifications and command execution.
- **Visual Feedback**: Offer a rich UI for streaming responses, tool usage tracking, and diff previews.

## User Stories

- As a user, I want to chat with Claude about my current note to get suggestions or improvements.
- As a user, I want Claude to be able to read other files in my vault to provide comprehensive answers.
- As a user, I want to see a preview of changes Claude proposes before they are applied to my notes.
- As a user, I want to see what tools (grep, ls, etc.) Claude is using in the background.
- As a user, I want to resume my conversation with Claude when I return to a note later.

## Functional Requirements

### 1. Chat Interface

- **Input**: Multi-line text area for user prompts.
- **History**: Display past conversation turns (User/Assistant).
- **Streaming**: Real-time display of Claude's response as it generates.
- **Model Selection**: Ability to choose different Claude models (e.g., Sonnet, Opus).

### 2. Claude Code Integration

- **Execution**: Spawn and manage the `claude` CLI process.
- **IO Handling**: Capture stdout/stderr and send user input to stdin.
- **Tool Support**: Visualize tool execution (e.g., `bash`, `glob`, `grep`, `edit`).
- **Session Management**: Persist sessions per note so context is lost.

### 3. Context & Permissions

- **Current Note**: Automatically include the active note's content in the context.
- **Vault Access**: Optional setting to allow Claude to access the entire vault.
- **Permissions**:
  - **Interactive Mode**: Claude asks for permission before running tools or editing files.
  - **Permissionless Mode**: Claude runs autonomously (use with caution).

### 4. File Management

- **Reading**: Claude can read files in the vault.
- **Editing**: Claude can propose edits to files.
- **Diff View**: UI to show diffs of proposed changes.
- **Apply/Reject**: User controls to accept or discard changes.

## Non-Functional Requirements

- **Performance**: Minimal latency in UI updates during streaming.
- **Security**: API keys managed by the CLI, not stored in the plugin.
- **Compatibility**: Works with recent Obsidian versions on Desktop (macOS/Linux/Windows).

## Future Scope

- **Slash Commands**: Quick actions for common tasks.
- **Multi-Note Context**: Explicitly select multiple notes for context.
- **Voice Input**: Talk to Claude.
