# Claude Code Plugin for Obsidian - AI Writing & Editing Assistant

An Obsidian plugin that brings AI coding assistants directly into your vault. Edit notes intelligently, analyze content, generate text, create diagrams, and automate repetitive tasks - all from within Obsidian. Supports **Claude Code** and **OpenCode** backends with full tool capabilities including file operations, web search, and bash commands.

**Zero external dependencies** - Just install the CLI of your choice and you're ready to go. No Node.js, Python, or additional packages required.

![Demo](docs/demo-obsidian-claude-code.png)

![Demo Video](docs/demo-video.gif)

## Installation

**New to AI tools?** Check out our [Beginner's Guide](docs/BEGINNERS_GUIDE.md) for step-by-step instructions with no technical experience required!

### Install via BRAT (Recommended)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins browser.
2. In Obsidian settings, go to **Community Plugins → BRAT → Add Beta Plugin**.
3. Paste this repo URL:
   ```
   https://github.com/deivid11/obsidian-claude-code-plugin
   ```
4. BRAT will download the latest release and keep it auto-updated.
5. Enable **Claude Code Integration** from the plugin list.

### From Obsidian Community Plugins (Coming Soon)
The plugin is currently under Obsidian validation and not yet available in the Community Plugins browser. You can track the approval progress here: [PR #8730](https://github.com/obsidianmd/obsidian-releases/pull/8730).

Once approved, you will be able to:
1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Click "Browse" and search for "Claude Code Integration"
4. Click "Install"
5. Enable the plugin

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/deivid11/obsidian-claude-code-plugin/releases)
2. Create a folder: `.obsidian/plugins/claude-code-integration/` in your vault
3. Extract `main.js`, `manifest.json`, and `styles.css` to that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

## Prerequisites

Before using this plugin, you must have at least one AI CLI backend installed:

### Option 1: Claude Code CLI (Recommended)

```bash
# Install via npm
npm install -g @anthropic-ai/claude-code

# Or download from Anthropic's website
# Visit: https://www.anthropic.com/claude-code
```

**API Key Setup for Claude Code:**

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Set up the API key:

```bash
# Environment Variable (Recommended)
export ANTHROPIC_API_KEY='your-api-key-here'

# Or via Claude Code Configuration
claude config set api_key your-api-key-here
```

### Option 2: OpenCode CLI

OpenCode is an alternative AI coding assistant that supports multiple providers.

```bash
# Install OpenCode
# Visit: https://github.com/opencode-ai/opencode
```

**Configuration for OpenCode:**

OpenCode supports multiple AI providers. Configure your preferred provider in OpenCode's settings. The model format is `provider/model` (e.g., `openai/gpt-4o`, `anthropic/claude-sonnet`).

## Features

### 🤖 AI-Powered Note Editing
- **Zero Dependencies**: No Node.js, Python, or extra packages needed - just install the CLI and go
- **Direct Integration**: Run AI assistant commands directly from within Obsidian
- **Multiple Backends**: Choose between **Claude Code** or **OpenCode** as your AI backend
- **Context-Aware**: The AI understands your note content and vault structure
- **Streaming Responses**: See responses in real-time as they're generated
- **File Modifications**: AI can read, edit, and create files with your permission

### 📊 Rich UI Experience
- **Tabbed Interface**: Switch between Assistant (note-focused) and Sessions (global) views
- **Real-Time Streaming**: Watch responses appear as they're generated
- **Task Tracking**: Visual todo list shows the AI's plan and progress
- **Preview Changes**: Review modifications before applying them to your notes
- **Activity Monitoring**: See exactly what tools are being used with timing

### 📁 Session Management
- **Global Sessions View**: See all sessions across your vault in one place
- **Per-Note Sessions**: Each note maintains its own conversation history
- **Live Running Indicators**: See which sessions are currently running with real-time elapsed time
- **Smart Linking**: Sessions stay linked to notes even when renamed or moved
- **Session History**: Browse and restore previous interactions
- **One-Click Navigation**: Click any session to open the linked note

### 🎛️ Flexible Control
- **Backend Selection**: Choose between Claude Code or OpenCode globally
- **Permission Modes**:
  - **Interactive Mode**: AI asks for permission before making changes
  - **Permissionless Mode**: AI operates autonomously for trusted operations
- **Model Selection**: Choose between different models (Sonnet, Opus, Haiku for Claude; custom models for OpenCode)
- **Vault Access**: Optionally allow AI to read/write files across your entire vault
- **Custom System Prompts**: Configure AI behavior with your own instructions

### 🔧 Advanced Capabilities
- **Tool Usage**: AI can use Bash, file operations, web search, and more
- **Session Resumption**: Continue previous conversations across plugin restarts
- **Selected Text Editing**: Work on specific sections of your notes
- **Auto-Apply Changes**: Optionally apply edits automatically
- **Markdown Rendering**: Beautiful rendering of AI responses
- **Conversational Mode**: Chat without modifying files

## Configuration

### Plugin Settings

Open Settings → Claude Code Integration to configure:

#### Backend Selection
- **Backend**: Choose between Claude Code or OpenCode
  - **Claude Code**: Anthropic's official CLI (requires Anthropic API key)
  - **OpenCode**: Multi-provider AI assistant (supports OpenAI, Anthropic, and more)

#### Claude Code Settings
- **Auto-detect Path**: Automatically find the Claude CLI executable
- **Claude Code Path**: Manual path to the executable (e.g., `/usr/local/bin/claude`)
- **Model**: Choose between Sonnet (balanced), Opus (most capable), or Haiku (fastest)

#### OpenCode Settings
- **Auto-detect Path**: Automatically find the OpenCode executable
- **OpenCode Path**: Manual path to the executable
- **Model**: Specify model in `provider/model` format (e.g., `openai/gpt-4o`, `anthropic/claude-sonnet`)

#### Permission Settings
- **Enable Permissionless Mode**: Allow AI to operate autonomously
  - ⚠️ When enabled, AI can read/write files without asking
  - Useful for trusted operations and automation
- **Allow Vault Access**: Let AI access files across your entire vault
  - When disabled, AI only works with the current note

#### Advanced Settings
- **Auto Accept Changes**: Automatically apply edits without preview
- **Timeout (seconds)**: Maximum execution time (0 = no limit)
- **Custom System Prompt**: Add custom instructions for AI behavior

## Usage

### Opening the Plugin

1. Click the Claude Code icon in the left sidebar
2. Or use the command palette: `Ctrl/Cmd + P` → "Open Claude Code Assistant"

### Basic Workflow

1. **Open a note** you want to work with
2. **Write your prompt** in the Claude Code panel
   - Examples:
     - "Add a table of contents to this note"
     - "Summarize the main points"
     - "Create a diagram showing the workflow"
     - "Fix grammar and spelling"

3. **Configure options** (optional):
   - ✅ **Use selected text only**: Work on highlighted text
   - ✅ **Auto-accept changes**: Skip preview step
   - 🎛️ **Model selection**: Choose Claude model for this request

4. **Click "Run Claude Code"** or press `Enter`

5. **Watch the process**:
   - **Result**: See Claude's response in real-time
   - **Activity**: Monitor what tools Claude is using
   - **Output**: View detailed execution logs

6. **Review and apply** (if changes were made):
   - View the diff in the Preview section
   - Switch between Raw, Rendered, and Diff views
   - Click "Accept" to apply or "Reject" to discard

### Example Use Cases

#### 1. Add Structure to a Note
```
Prompt: "Add a table of contents and organize this content with proper headings"
```

#### 2. Generate Diagrams
```
Prompt: "Create a PlantUML diagram showing the authentication flow"
```

#### 3. Analyze Content
```
Prompt: "What are the key themes in this note? Are there any gaps I should address?"
```

#### 4. Refactor and Improve
```
Prompt: "Improve the clarity of this explanation and add code examples"
```

## Features in Detail

### Tabbed Interface
The plugin features a tabbed interface with two main views:
- **Assistant Tab**: Note-focused view with prompt input, results, preview, and history
- **Sessions Tab**: Global view of all sessions across your vault

### Session Management
- **Per-Note Sessions**: Each note maintains its own conversation history with the AI
- **Global Sessions View**: The Sessions tab shows all sessions across your vault
- **Backend-Specific**: Sessions are tied to the backend used (Claude or OpenCode)
- **Live Status**: See which sessions are currently running with real-time elapsed time
- **Smart Linking**: Sessions automatically update when you rename or move notes
- **One-Click Access**: Click any session to open the linked note and switch to Assistant view
- **Session Deletion**: Remove old sessions you no longer need

### Preview System
- **Raw View**: See the exact markdown that will be applied
- **Rendered View**: Preview how the note will look
- **Diff View**: Compare original vs modified content line-by-line

### Todo List Display
- When the AI uses the TodoWrite tool, see its plan
- Track progress as tasks are completed
- Visual indicators for pending, in-progress, and completed items

### Permission Requests
- In interactive mode, the AI asks before making changes
- Review what the AI wants to do
- Approve or deny with one click
- Re-run with permissionless mode if you trust the operation

### Output Monitoring
- All CLI output is captured and displayed
- Tool usage is displayed with formatted details and timing
- Errors and warnings are highlighted
- Expandable logs for debugging

## Keyboard Shortcuts

- `Enter`: Run AI assistant (when focused in prompt input)
- `Ctrl/Cmd + Enter`: Insert newline in prompt
- `Esc`: Cancel running operation

## Troubleshooting

### "Claude Code path not configured"
- **Solution**: Install Claude Code CLI and configure the path in plugin settings
- Verify installation: Run `claude --version` in terminal

### "Failed to execute Claude Code"
- **Check**: Is Claude Code CLI installed and accessible?
- **Check**: Is your API key configured correctly?
- **Try**: Set absolute path in plugin settings (e.g., `/usr/local/bin/claude`)

### "Permission denied" errors
- **Solution**: Ensure Claude Code CLI has proper permissions
- On Linux/Mac: `chmod +x /path/to/claude`

### Flatpak/Snap Installation Issues

If you installed Obsidian via Flatpak or Snap, you may encounter errors like:
- `env: 'node': No such file or directory`
- `Claude Code failed with code 127`

This happens because Flatpak/Snap sandboxing blocks access to system binaries.

**Solution: Grant Filesystem Permissions**

#### For Flatpak:

```bash
# Allow access to the entire filesystem (recommended)
flatpak override --user md.obsidian.Obsidian --filesystem=host

# Or grant specific access to node and claude locations
flatpak override --user md.obsidian.Obsidian --filesystem=/usr/bin
flatpak override --user md.obsidian.Obsidian --filesystem=/bin
flatpak override --user md.obsidian.Obsidian --filesystem=~/.nvm
flatpak override --user md.obsidian.Obsidian --filesystem=~/.bun
```

#### Using Flatseal (GUI):

1. Install Flatseal: `flatpak install flathub com.github.tchx84.Flatseal`
2. Open Flatseal and find "Obsidian"
3. Under "Filesystem" section, enable:
   - **All system files** (easiest), or
   - Add custom paths: `/usr/bin`, `/bin`, `~/.nvm`, `~/.bun`
4. Restart Obsidian

#### For Snap:

```bash
# Grant access to home directory
snap connect obsidian:home

# May need to install Obsidian from a different source
# as Snap has stricter sandboxing
```

**Alternative**: Install Obsidian via other methods (AppImage, .deb, .rpm) to avoid sandboxing issues entirely.

### Results not appearing
- **Check**: Is the Result section collapsed? Click the header to expand
- **Check**: Console for errors (Ctrl/Cmd + Shift + I)

### API rate limits
- Claude Code uses your Anthropic API account
- Monitor usage at [Anthropic Console](https://console.anthropic.com/)
- Consider using Haiku model for lower costs

## Privacy & Security

- **Processing**: All processing happens through the Claude Code CLI on your machine and sent to Claude Servers
- **Your API Key**: The plugin never sees or stores your API key
- **Vault Access**: You control whether Claude can access your vault
- **Permission Control**: Interactive mode lets you review all changes
- **No Telemetry**: This plugin doesn't collect or send usage data

## Platform Support

The plugin automatically detects your operating system and configures the appropriate shell environment:

| Platform | Shell | Profile Files Loaded |
|----------|-------|---------------------|
| **Windows** | `cmd.exe` (via `COMSPEC`) | Uses system environment directly |
| **macOS** | User's shell (`$SHELL`) | zsh: `~/.zshenv`, `~/.zprofile`, `~/.zshrc` |
| **Linux** | User's shell (`$SHELL`) | bash: `~/.profile`, `~/.bash_profile`, `~/.bashrc` |
| **Fish shell** | `fish` | Loaded via `fish -l` |

### Shell Environment Loading

The plugin loads your shell environment to ensure Claude Code has access to:
- Your `PATH` (to find the `claude` CLI)
- Environment variables like `ANTHROPIC_API_KEY`
- Any custom configurations from your shell profiles

### Windows-Specific Notes

- The plugin uses `cmd.exe` by default (via the `COMSPEC` environment variable)
- PATH is correctly parsed using `;` as separator
- Executable extensions (`.exe`, `.cmd`, `.bat`) are automatically checked
- Home directory uses `USERPROFILE` when `HOME` is not set

### macOS/Linux Notes

- The default shell is detected from the `$SHELL` environment variable
- Profile files are sourced to load environment variables
- If your shell is not zsh or bash, the plugin falls back to login shell mode (`-l` flag)

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-claude-code-plugin.git
cd obsidian-claude-code-plugin

# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes during development
npm run dev
```

### Project Structure

```
src/
├── core/               # Core logic
│   ├── backends/                # Backend adapters
│   │   ├── types.ts             # Common interfaces
│   │   ├── claude-backend.ts    # Claude Code adapter
│   │   └── opencode-backend.ts  # OpenCode adapter
│   ├── claude-code-runner.ts    # Main execution engine
│   ├── streaming/               # Stream processing
│   ├── session-manager.ts       # Session handling
│   └── prompt-builder.ts        # Prompt construction
├── ui/                 # User interface
│   ├── view.ts                  # Main view component
│   ├── ui-builder.ts            # UI construction
│   └── renderers/               # Output rendering
├── i18n/               # Internationalization
│   └── locales/                 # Language files
└── main.ts            # Plugin entry point
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Areas for Contribution
- Additional UI features and improvements
- Documentation improvements
- Test coverage

## Support
- **Issues**: [GitHub Issues](https://github.com/deivid11/obsidian-claude-code-plugin/issues)

## Acknowledgments

- Built with the [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Powered by [Anthropic's Claude](https://www.anthropic.com/claude)
- Supports [Claude Code CLI](https://github.com/anthropics/claude-code)
- Supports [OpenCode CLI](https://github.com/opencode-ai/opencode)

## License

MIT License - see [LICENSE](LICENSE) file for details

---

**Note**: This plugin requires either Claude Code CLI (with Anthropic API key) or OpenCode CLI installed. Costs depend on your chosen backend and API provider usage.
