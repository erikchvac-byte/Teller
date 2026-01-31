# Development Setup

## Prerequisites

- **Node.js**: v16.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: for version control
- **Anthropic API Key**: for AI analysis

## Installation

### 1. Clone or Navigate to Project

```bash
cd C:\Users\erikc\Dev\Termeller
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Key

Create `.env` file in project root:

**Windows PowerShell**:
```powershell
Set-Content -Path .env -Value "ANTHROPIC_API_KEY=your_key_here" -Encoding utf8NoBOM
```

**Windows Command Prompt**:
```cmd
echo ANTHROPIC_API_KEY=your_key_here > .env
```

**Get API Key**: https://console.anthropic.com/settings/keys

**⚠️ Important**: The file must be UTF-8 encoded. PowerShell's `echo` command may create UTF-16 files. Use the `Set-Content` command above to ensure UTF-8 encoding.

### 4. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Development Commands

### Run Development Mode
```bash
npm run dev
```
- Starts Teller in development mode
- Automatically recompiles on file changes
- Monitors terminal and opencode activity

### Build for Production
```bash
npm run build
```
- Compiles TypeScript to JavaScript
- Creates optimized build in `dist/`

### Run Production Build
```bash
npm start
```
- Runs the compiled application
- Uses the production build in `dist/`

## Project Structure

```
termeller/
├── src/                      # Source code
│   ├── capture/             # Event capture components
│   ├── agent/               # AI analysis and persistence
│   ├── ui/                  # React/Ink UI components
│   ├── types.ts             # TypeScript type definitions
│   └── index.ts             # Application entry point
├── dist/                     # Compiled output (generated)
├── .termeller/              # Runtime data
│   └── memory.db            # SQLite database (generated)
├── node_modules/            # Dependencies (generated)
├── .env                     # Environment variables (create this)
├── .gitignore               # Git ignore patterns
├── package.json             # Project configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

## TypeScript Configuration

`tsconfig.json`:
- Target: ES2022
- Module: ESNext
- Module resolution: Node
- JSX: react-jsx
- Strict mode: enabled

## Key Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.27.0",
  "better-sqlite3": "^11.0.0",
  "chokidar": "^4.0.0",
  "ink": "^4.4.0",
  "react": "^18.3.0",
  "dotenv": "^16.4.0"
}
```

## Development Workflow

### 1. Make Code Changes
Edit files in `src/` directory

### 2. Test Changes
```bash
npm run dev
```
Watch the terminal output for:
- Startup sequence
- Event capture
- Observation generation
- Any errors

### 3. Build
```bash
npm run build
```
Ensure build completes without errors.

### 4. Commit Changes
```bash
git add .
git commit -m "Your commit message"
```

## Troubleshooting

### API Key Not Found
**Error**: `Error: ANTHROPIC_API_KEY is required`

**Solution**:
1. Check `.env` file exists in project root
2. Verify API key is correct format: `ANTHROPIC_API_KEY=sk-ant-...`
3. Ensure file is UTF-8 encoded (not UTF-16)

### Build Errors
**Error**: TypeScript compilation errors

**Solution**:
1. Run `npm run build` to see full error messages
2. Check TypeScript syntax
3. Ensure all imports are correct

### Events Not Showing
**Problem**: No events appear in UI

**Solution**:
1. Verify `.termeller/memory.db` was created
2. Check terminal commands are being captured
3. Verify opencode storage path: `~/.local/share/opencode/storage/`
4. Check file permissions

### Observations Not Generating
**Problem**: Events show but no observations appear

**Solution**:
1. Wait 15 seconds after first events (analysis interval)
2. Verify API key has credits
3. Check network connection to Anthropic API
4. Look for error messages in console

### UTF-16 Encoding Issue (Windows)
**Problem**: `.env` file created with `echo` is invalid

**Solution**:
```powershell
Set-Content -Path .env -Value "ANTHROPIC_API_KEY=your_key_here" -Encoding utf8NoBOM
```

## IDE Setup

### VSCode Recommended Extensions
- **TypeScript** (vscode.typescript)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)

### VSCode Settings (Optional)
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Testing the Setup

After installation, verify everything works:

```bash
# 1. Build project
npm run build

# 2. Run in dev mode
npm run dev

# 3. Open new terminal and run commands
#    For example: npm install, git status, ls

# 4. Check that events appear in left panel
#    Wait 15 seconds

# 5. Check that observations appear in right panel

# 6. Stop with Ctrl+C
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `NODE_ENV` | No | Set to `production` for production builds |

## File Locations

| Type | Location |
|------|----------|
| Source code | `C:\Users\erikc\Dev\Termeller\src\` |
| Compiled output | `C:\Users\erikc\Dev\Termeller\dist\` |
| Database | `C:\Users\erikc\.termeller\memory.db` |
| Opencode storage | `C:\Users\erikc\.local\share\opencode\storage\` |

---

**See Also**: [[Project Overview]], [[Component Overview]], [[Testing Guide]]