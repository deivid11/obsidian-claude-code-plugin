# Optimization & Roadmap

This document outlines planned optimizations and improvements for the Obsidian Claude Code Plugin to enhance maintainability, extensibility, and developer experience.

## 1. Frontend Architecture: React Migration

**Goal**: Move from imperative DOM manipulation to a declarative React-based UI.

- **Why**: The current `ui-builder.ts` and `view.ts` manually manage DOM elements, which is error-prone and hard to scale. React will make state management (streaming responses, history, settings) much cleaner.
- **Implementation**:
  - Install `react` and `react-dom`.
  - Create a root `ClaudeCodeView` component.
  - Pass the plugin instance and `App` object via React Context (`AppContext`).
  - Refactor `view.ts` to mount the React root.
  - Reference: [Use React in your plugin](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)

## 2. Styling: Tailwind CSS Integration

**Goal**: Replace `styles.css` with utility-first CSS using Tailwind.

- **Why**: `styles.css` is becoming large (1200+ lines) and difficult to maintain. Tailwind ensures consistency and speeds up UI development.
- **Implementation**:
  - Set up `postcss` and `tailwindcss`.
  - Configure `esbuild` to process CSS.
  - Prefix Tailwind classes (e.g., `tw-`) to avoid conflicts with Obsidian themes or other plugins.
  - Refactor existing CSS to Tailwind utilities.

## 3. CI/CD: GitHub Actions

**Goal**: Automate testing, building, and releasing.

- **Why**: Manual releases are prone to errors. Automated checks ensure code quality.
- **Implementation**:
  - Create `.github/workflows/test.yml` for linting and type checking.
  - Create `.github/workflows/release.yml` to build `main.js`, `manifest.json`, and `styles.css` and attach them to GitHub Releases.
  - Reference: [Release your plugin with GitHub Actions](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions)

## 4. Settings & Configuration Overhaul

**Goal**: Improve the settings UI and environment variable management.

- **Why**: Currently, path detection is basic, and environment variables (like API keys) are implicitly handled by the shell.
- **Implementation**:
  - **Env Var Management**: Add a UI to explicitly set environment variables (e.g., `ANTHROPIC_API_KEY`) that are passed to the child process, rather than relying on the system shell.
  - **Profiles**: Allow saving different configuration profiles (e.g., "Work", "Personal").
  - **Validation**: Add more robust path validation and version checking for the CLI tools.

## 5. CLI Abstraction Layer (Multi-Agent Support)

**Goal**: Decouple the runner from `claude` CLI to support other agents.

- **Why**: `ClaudeCodeRunner` is tightly coupled to Claude's specific output format and behavior. We may want to support other local agents or CLIs in the future.
- **Implementation**:
  - Create an interface `IAgentRunner`:
    ```typescript
    interface IAgentRunner {
      run(request: AgentRequest): Promise<AgentResponse>;
      stream(request: AgentRequest, onEvent: (event: AgentEvent) => void): void;
      abort(): void;
    }
    ```
  - Implement `ClaudeCodeRunner` implementing this interface.
  - Create a factory to instantiate the correct runner based on settings.
  - Standardize the event format (System, Assistant, Tool, Error) across different runners.

## 6. Tooling & Extensibility

**Goal**: Allow the plugin to easily integrate with other AI tools and workflows.

- **Why**: Users might want to chain Claude Code with other tools (e.g., a linter, a test runner) or use different "skills".
- **Implementation**:
  - **Tool Registry**: A system to register custom tools that Claude can "see" and execute (if the CLI supports it).
  - **Workflow Hooks**: Pre/post-run hooks (e.g., "Run linter after Claude edits a file").
  - **Slash Commands**: Implement slash commands in the chat interface to trigger specific workflows (e.g., `/fix`, `/test`).

## 7. Code Quality & Testing

**Goal**: Improve codebase reliability.

- **Why**: As the codebase grows, regression testing becomes critical.
- **Implementation**:
  - **Unit Tests**: Add `jest` or `vitest` for core logic (parsers, formatters).
  - **E2E Tests**: Use a library to test the full flow (spawning a mock CLI and checking UI updates).
  - **Strict Types**: Ensure `noImplicitAny` is true and improve type coverage for CLI events.
