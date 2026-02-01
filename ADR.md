# Architecture Decision Record - Termeller

## Project Overview

**Termeller** is a developer activity monitor (Teller) designed to track development activity. This document records architectural decisions, technical constraints, and design rationale for the project.

---

## Architecture Decisions

### ADR-001: Windows Terminal Native Launcher
**Status**: Accepted  
**Date**: 2026-02-01

**Context**: 
The development workflow requires running two concurrent processes:
1. OpenCode terminal session for general development (at `C:\Users\erikc`)
2. Teller app monitoring (`bun run start` from `C:\Users\erikc\Dev\Termeller`)

Previously used PowerToys window arrangement, but native Windows Terminal integration provides:
- Better process isolation
- Consistent window management
- No external dependency on PowerToys
- Native split-pane support with configurable ratios

**Decision**: 
Implement a PowerShell launcher script (`launch-teller.ps1`) that uses Windows Terminal's native `wt.exe` CLI to create a split workspace:
- Left pane (75% width): OpenCode terminal at `PS C:\Users\erikc>` with opencode auto-launched
- Right pane (25% width): Teller app running via `bun run start`
- Desktop shortcut for one-click launch
- Duplicate instance prevention via window title detection and focus

**Rationale**:
1. **Native over third-party**: Windows Terminal is pre-installed on Windows 11, PowerToys is not
2. **Reproducibility**: Script-based launcher can be version-controlled and shared
3. **Simplicity**: No custom Terminal profiles needed - uses default PowerShell profile
4. **User experience**: Single click launch, no manual window arrangement
5. **Duplicate prevention**: Avoids multiple Teller instances consuming resources

**Alternatives Considered**:
- **Custom Windows Terminal profiles**: Rejected - requires manual settings.json modification, not portable
- **PowerToys FancyZones**: Rejected - external dependency, less reliable than native solution
- **Batch file launcher**: Rejected - PowerShell provides better process control and COM access for shortcuts

**Consequences**:
- ✅ One-click workspace launch via desktop shortcut
- ✅ Consistent 75/25 split ratio for all launches
- ✅ No settings.json modifications required
- ✅ Duplicate detection prevents multiple Teller instances
- ⚠️ Requires `wt.exe` on PATH (standard for Windows Terminal installations)
- ⚠️ Requires `bun` runtime installed and on PATH
- ⚠️ Desktop shortcut is user-specific, not version-controlled

**Testing**:
- Manual verification required for window focus behavior
- Automated syntax validation via `powershell -NoProfile -SyntaxOnly`
- Process detection verification via `Get-Process`

**Implementation Details**:
- Script location: `C:\Users\erikc\Dev\Termeller\launch-teller.ps1`
- Shortcut location: `[Desktop]\Teller Workspace.lnk`
- Window title: "Teller Workspace" (used for duplicate detection)
- Duplicate detection: Find existing window by title, bring to foreground
- Absolute paths throughout (no relative path dependencies)
- Dynamic desktop path detection via `[Environment]::GetFolderPath('Desktop')`

---

## Technical Constraints

### Runtime Dependencies
- **Windows Terminal**: Required for `wt.exe` CLI
- **Bun**: JavaScript runtime for executing Teller app
- **PowerShell**: 5.1+ or PowerShell 7+ for launcher script
- **OpenCode**: CLI tool for development terminal

### Environment Requirements
- **OS**: Windows 10/11 with Windows Terminal installed
- **PATH Requirements**: `wt.exe`, `bun`, `opencode` must be accessible
- **Working Directory**: Teller app must run from `C:\Users\erikc\Dev\Termeller`

---

## Known Issues

None at this time.

---

## Open Questions

1. Should the launcher verify that `opencode` successfully starts before proceeding?
2. Should the script include health checks for Teller app startup?
3. Should duplicate detection also check for crashed/hung Teller processes?

---

## Future Considerations

- **Cross-user portability**: Make paths configurable for other developers
- **Error recovery**: Add automatic restart on Teller crash detection
- **Logging**: Optional debug logging for troubleshooting launch issues
- **Profile variants**: Support different split ratios for different screen sizes
- **Start Menu integration**: Add Start Menu shortcut alongside desktop shortcut

---

## References

### Key Files
- `launch-teller.ps1`: Main launcher script (planned)
- Work Plan: `.sisyphus/plans/teller-launcher.md`

### External Documentation
- [Windows Terminal CLI Arguments](https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments)
- [PowerShell Environment.GetFolderPath](https://learn.microsoft.com/en-us/dotnet/api/system.environment.getfolderpath)

---

## Change Log

| Date | Decision | Impact |
|------|----------|--------|
| 2026-02-01 | ADR-001: Windows Terminal native launcher | New workspace launcher implementation |
