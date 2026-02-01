# Teller Windows Terminal Workspace Launcher
# Launches or brings to foreground a split-pane Windows Terminal workspace

# Add Windows API for SetForegroundWindow
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class User32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# Verify wt.exe exists
$wtPath = where.exe wt 2>$null
if (-not $wtPath) {
    Write-Host "Error: Windows Terminal (wt.exe) not found in PATH" -ForegroundColor Red
    exit 1
}

# Check for existing Teller Workspace window
$existingProcess = Get-Process WindowsTerminal -ErrorAction SilentlyContinue | 
    Where-Object { $_.MainWindowTitle -like "*Teller Workspace*" }

if ($existingProcess) {
    # Bring existing window to foreground
    [User32]::SetForegroundWindow($existingProcess.MainWindowHandle) | Out-Null
    exit 0
}

# Launch new Windows Terminal with split panes
& wt.exe -d "C:\Users\erikc" --title "Teller Workspace" `; opencode `; split-pane -H --size 0.25 -d "C:\Users\erikc\Dev\Termeller" bun run start
