# Beginner's Guide: Getting Started with AI in Obsidian

This guide is for non-technical users who want to use AI assistants (Claude Code or OpenCode) inside Obsidian to boost their productivity. No programming experience required!

## What You'll Get

After following this guide, you'll be able to:
- Ask AI to help write, edit, and organize your notes
- Generate summaries, tables, and diagrams automatically
- Get AI-powered suggestions for your writing
- Automate repetitive note-taking tasks

---

## Step 1: Install Node.js (Required for Both Options)

Node.js is a program that lets you run AI tools on your computer. Don't worry - you just need to install it once!

### Windows

1. Go to [nodejs.org](https://nodejs.org/)
2. Click the big green button that says **"LTS"** (Long Term Support)
3. Run the downloaded file and click **Next** through the installer
4. Keep all default options checked
5. Click **Install**, then **Finish**

### Mac

1. Go to [nodejs.org](https://nodejs.org/)
2. Click the big green button that says **"LTS"**
3. Open the downloaded `.pkg` file
4. Follow the installer steps, clicking **Continue** and **Install**
5. Enter your Mac password when asked

### Linux

Open a terminal and run:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm
```

### Verify Installation

To make sure it worked:

1. **Windows**: Press `Win + R`, type `cmd`, press Enter
2. **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
3. **Linux**: Open your terminal application

Then type this and press Enter:
```
node --version
```

You should see a version number like `v20.10.0`. If you see an error, restart your computer and try again.

---

## Step 2: Choose Your AI Backend

You have two options for the AI that powers the plugin:

| Feature | Claude Code | OpenCode |
|---------|-------------|----------|
| **Made by** | Anthropic (official) | Community |
| **AI Models** | Claude only | Multiple (OpenAI, Anthropic, etc.) |
| **Best for** | Reliability, official support | Flexibility, multiple providers |
| **API Key** | Anthropic API key | Depends on provider |

**Recommendation**: Start with Claude Code if you're new to AI tools.

---

## Step 3A: Install Claude Code (Recommended)

### Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Click **Sign Up** (or **Log In** if you have an account)
3. Verify your email and complete sign-up
4. Click on **API Keys** in the left sidebar
5. Click **Create Key**
6. Give it a name like "Obsidian Plugin"
7. **IMPORTANT**: Copy the key immediately! You won't be able to see it again.

   It looks something like: `sk-ant-api03-xxxxxxxxxxxx...`

### Install Claude Code CLI

Open your terminal/command prompt (see "Verify Installation" above) and type:

```
npm install -g @anthropic-ai/claude-code
```

Wait for it to finish (may take 1-2 minutes).

### Set Up Your API Key

#### Windows

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab
3. Click **Environment Variables**
4. Under "User variables", click **New**
5. Variable name: `ANTHROPIC_API_KEY`
6. Variable value: Paste your API key
7. Click **OK** three times
8. **Restart your computer**

#### Mac

1. Open Terminal
2. Type this command (replace `your-key-here` with your actual key):
   ```bash
   echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.zshrc
   ```
3. Press Enter
4. Close and reopen Terminal, or type `source ~/.zshrc`

#### Linux

1. Open Terminal
2. Type this command (replace `your-key-here` with your actual key):
   ```bash
   echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.bashrc
   ```
3. Press Enter
4. Close and reopen Terminal, or type `source ~/.bashrc`

### Verify Claude Code Works

In terminal, type:
```
claude --version
```

You should see a version number. If you see an error, try restarting your computer.

---

## Step 3B: Install OpenCode (Alternative)

OpenCode supports multiple AI providers (OpenAI, Anthropic, Google, etc.).

### Install OpenCode

1. Go to [github.com/opencode-ai/opencode](https://github.com/opencode-ai/opencode)
2. Follow their installation instructions
3. Configure your preferred AI provider

### Configure Your API Key

OpenCode uses a configuration file. After installation, run:
```
opencode config
```

Follow the prompts to set up your preferred AI provider and API key.

---

## Step 4: Install the Obsidian Plugin

### Option A: From Community Plugins (When Available)

1. Open Obsidian
2. Click the **Settings** icon (gear) in the bottom-left
3. Click **Community plugins** in the left sidebar
4. If prompted, click **Turn on community plugins**
5. Click **Browse**
6. Search for **"Claude Code Integration"**
7. Click **Install**
8. Click **Enable**

### Option B: Manual Installation

If the plugin isn't in community plugins yet:

1. Go to [GitHub Releases](https://github.com/deivid11/obsidian-claude-code-plugin/releases)
2. Download these three files from the latest release:
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. Find your vault folder:
   - **Windows**: Usually in `Documents\YourVaultName`
   - **Mac**: Usually in `Documents/YourVaultName`
   - **Linux**: Usually in `~/YourVaultName`

4. Open the vault folder and navigate to `.obsidian/plugins/`
   - If `plugins` folder doesn't exist, create it
   - Note: `.obsidian` is a hidden folder. To see it:
     - **Windows**: In File Explorer, click View → Show → Hidden items
     - **Mac**: Press `Cmd + Shift + .` in Finder
     - **Linux**: Press `Ctrl + H` in file manager

5. Create a new folder called `claude-code-integration`

6. Copy the three downloaded files into this folder

7. Restart Obsidian completely (close and reopen)

8. Go to **Settings** → **Community plugins** and enable "Claude Code Integration"

---

## Step 5: Configure the Plugin

1. Open Obsidian Settings
2. Scroll down and click **Claude Code Integration** in the left sidebar
3. Configure these settings:

### Choose Your Backend

- Select **Claude Code** or **OpenCode** depending on what you installed

### Model Selection (Claude Code)

- **Sonnet**: Best balance of speed and quality (recommended for daily use)
- **Opus**: Most capable, but slower and costs more
- **Haiku**: Fastest and cheapest, good for simple tasks

### Security Settings

- **Permissionless Mode**: OFF (recommended)
  - When OFF, AI asks before making changes
  - When ON, AI makes changes automatically

- **Vault Access**: OFF (start here)
  - When OFF, AI only sees your current note
  - When ON, AI can see all notes in your vault

---

## Step 6: Your First AI-Powered Edit

Let's test everything!

1. Open any note in Obsidian (or create a new one)
2. Click the **Claude Code icon** in the left sidebar (looks like a chat bubble)
3. In the text box, type: `Say hello and tell me what you can help me with`
4. Click **Run Claude Code**
5. Watch the AI respond!

### If It Works

Congratulations! You're ready to use AI in Obsidian. Try these prompts:
- "Add a table of contents to this note"
- "Summarize this note in 3 bullet points"
- "Fix any grammar or spelling mistakes"
- "Create an outline for this topic"

### If It Doesn't Work

See the Troubleshooting section below.

---

## Common Use Cases

Here are some things you can ask the AI to do:

### Writing & Editing
- "Proofread this note and fix any errors"
- "Make this paragraph more concise"
- "Expand this outline into full paragraphs"
- "Rewrite this in a more professional tone"

### Organization
- "Add headings to organize this content"
- "Create a table of contents"
- "Convert this list into a table"
- "Sort these items alphabetically"

### Research & Analysis
- "Summarize the key points in this note"
- "What questions does this document leave unanswered?"
- "Compare and contrast these two sections"
- "Identify the main themes"

### Diagrams & Visuals
- "Create a Mermaid diagram showing this process"
- "Generate a flowchart for this workflow"
- "Make a timeline of these events"

---

## Troubleshooting

### "Claude Code path not configured"

The plugin can't find Claude Code on your computer.

**Solution**:
1. Open terminal and type `claude --version`
2. If you see an error, reinstall Claude Code (Step 3A)
3. If it works, restart Obsidian

### "API key not found"

Your API key isn't set up correctly.

**Solution**:
1. Make sure you set the environment variable (Step 3A - "Set Up Your API Key")
2. Restart your computer
3. Restart Obsidian

### "node: command not found"

Node.js isn't installed correctly.

**Solution**:
1. Reinstall Node.js (Step 1)
2. Restart your computer

### Nothing happens when I click "Run Claude Code"

**Solutions**:
1. Check the "Output" section in the plugin panel for error messages
2. Make sure you have a note open
3. Try restarting Obsidian

### AI takes too long or times out

**Solutions**:
1. Go to plugin settings
2. Increase the **Timeout** value (or set to 0 for no timeout)
3. Try using a smaller AI model (Haiku instead of Opus)

---

## Understanding Costs

### Claude Code / Anthropic API

Anthropic charges based on how much text you send and receive:

- **Haiku**: ~$0.25 per 1 million input tokens, ~$1.25 per 1 million output tokens
- **Sonnet**: ~$3 per 1 million input tokens, ~$15 per 1 million output tokens
- **Opus**: ~$15 per 1 million input tokens, ~$75 per 1 million output tokens

**What does this mean in practice?**
- A typical conversation costs fractions of a cent
- Heavy daily use might cost $1-5 per month
- Opus is significantly more expensive but more capable

**Tip**: Start with Sonnet for most tasks, use Haiku for simple edits, and save Opus for complex problems.

### Monitor Your Usage

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Click on **Usage** in the sidebar
3. See your daily and monthly spending

---

## Tips for Better Results

1. **Be specific**: Instead of "fix this", say "fix the grammar and spelling errors"

2. **Provide context**: "This is a meeting notes document. Summarize the action items."

3. **One task at a time**: Ask for one thing at a time for better results

4. **Review changes**: Keep "Permissionless Mode" off until you're comfortable with how the AI works

5. **Use the diff view**: The plugin shows you exactly what changed before you accept it

---

## Getting Help

If you're stuck:

1. Check the [GitHub Issues](https://github.com/deivid11/obsidian-claude-code-plugin/issues) for similar problems
2. Ask in the [Obsidian Discord](https://discord.gg/obsidian)
3. Open a new GitHub issue with details about your problem

---

## Glossary

- **API Key**: A secret password that lets you use AI services
- **CLI**: Command Line Interface - a text-based way to run programs
- **Node.js**: A program that runs JavaScript code (needed to run Claude Code)
- **npm**: Node Package Manager - a tool to install Node.js programs
- **Terminal**: A text-based interface for running commands (Command Prompt on Windows)
- **Token**: A unit of text (roughly 4 characters or 3/4 of a word)
- **Vault**: Your collection of notes in Obsidian

---

Happy note-taking with AI!