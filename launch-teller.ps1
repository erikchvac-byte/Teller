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

# Verify wt.exe exists - check PATH first, then common locations
$wtPath = where.exe wt 2>$null
if (-not $wtPath) {
    # Try common installation paths
    $commonPaths = @(
        "C:\Users\erikc\AppData\Local\Microsoft\WindowsApps\wt.exe",
        "C:\Program Files\WindowsTerminal\wt.exe"
    )
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $wtPath = $path
            break
        }
    }
}

if (-not $wtPath) {
    Write-Host "Error: Windows Terminal (wt.exe) not found in PATH or common locations" -ForegroundColor Red
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

# Ensure bun is in PATH for the new terminal
$bunPath = "$env:USERPROFILE\.bun\bin"
if (Test-Path $bunPath) {
    $env:PATH = "$bunPath;$env:PATH"
}

# Launch new Windows Terminal with split panes
& $wtPath -d "C:\Users\erikc" --title "Teller Workspace" `; opencode `; split-pane -H --size 0.25 -d "C:\Users\erikc\Dev\Termeller" bun run start
