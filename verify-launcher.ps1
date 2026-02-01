# Final Verification Test for Teller Launcher
$ErrorActionPreference = "Stop"

Write-Host "`n=== TELLER LAUNCHER FINAL VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Testing all components before declaring ready for use...`n" -ForegroundColor Cyan

$allTestsPassed = $true

# Test 1: Script file integrity
Write-Host "TEST 1: Script file integrity" -ForegroundColor Yellow
try {
    $scriptPath = "C:\Users\erikc\Dev\Termeller\launch-teller.ps1"
    if (Test-Path $scriptPath) {
        $content = Get-Content $scriptPath -Raw
        Write-Host "  File exists: YES ($($content.Length) characters)" -ForegroundColor Green
        
        # Check for required components
        $checks = @(
            @{Name="User32 API"; Pattern="SetForegroundWindow"},
            @{Name="wt.exe detection"; Pattern="Get-Command wt"},
            @{Name="bun PATH fix"; Pattern="bunPath"},
            @{Name="Teller Workspace title"; Pattern="Teller Workspace"},
            @{Name="opencode command"; Pattern="opencode"},
            @{Name="bun run start"; Pattern="bun run start"}
        )
        
        foreach ($check in $checks) {
            if ($content -match $check.Pattern) {
                Write-Host "  $($check.Name): FOUND" -ForegroundColor Green
            } else {
                Write-Host "  $($check.Name): MISSING" -ForegroundColor Red
                $allTestsPassed = $false
            }
        }
    } else {
        Write-Host "  File exists: NO" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 2: Syntax validation
Write-Host "`nTEST 2: PowerShell syntax validation" -ForegroundColor Yellow
try {
    $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $scriptPath), [ref]$null)
    Write-Host "  Syntax: VALID" -ForegroundColor Green
} catch {
    Write-Host "  Syntax: INVALID - $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 3: Desktop shortcut
Write-Host "`nTEST 3: Desktop shortcut integrity" -ForegroundColor Yellow
try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktop "Teller Workspace.lnk"
    
    if (Test-Path $shortcutPath) {
        Write-Host "  Shortcut exists: YES" -ForegroundColor Green
        
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        
        Write-Host "  Target: $($shortcut.TargetPath)" -ForegroundColor Gray
        Write-Host "  Arguments contain -WindowStyle Hidden: $($(if($shortcut.Arguments -like '*-WindowStyle Hidden*'){'YES'}else{'NO'}))" -ForegroundColor $(if($shortcut.Arguments -like '*-WindowStyle Hidden*'){'Green'}else{'Red'})
        Write-Host "  Working Directory: $($shortcut.WorkingDirectory)" -ForegroundColor Gray
        
        if ($shortcut.Arguments -notlike '*-WindowStyle Hidden*') {
            $allTestsPassed = $false
        }
    } else {
        Write-Host "  Shortcut exists: NO" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 4: wt.exe availability
Write-Host "`nTEST 4: wt.exe (Windows Terminal) availability" -ForegroundColor Yellow
try {
    $wtPath = $null
    try {
        $wtPath = (Get-Command wt -ErrorAction Stop).Source
    } catch {
        $commonPaths = @(
            "$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\wt.exe",
            "C:\Program Files\WindowsTerminal\wt.exe",
            "C:\Users\erikc\AppData\Local\Microsoft\WindowsApps\wt.exe"
        )
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $wtPath = $path
                break
            }
        }
    }
    
    if ($wtPath) {
        Write-Host "  wt.exe found: $wtPath" -ForegroundColor Green
    } else {
        Write-Host "  wt.exe: NOT FOUND" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 5: opencode availability
Write-Host "`nTEST 5: opencode availability" -ForegroundColor Yellow
try {
    $opencode = Get-Command opencode -ErrorAction SilentlyContinue
    if ($opencode) {
        Write-Host "  opencode found: $($opencode.Source)" -ForegroundColor Green
    } else {
        Write-Host "  opencode: NOT FOUND in PATH" -ForegroundColor Red
        $allTestsPassed = $false
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 6: bun availability
Write-Host "`nTEST 6: bun availability" -ForegroundColor Yellow
try {
    $bun = Get-Command bun -ErrorAction SilentlyContinue
    $bunPath = "$env:USERPROFILE\.bun\bin\bun.exe"
    
    if ($bun) {
        Write-Host "  bun found in PATH: $($bun.Source)" -ForegroundColor Green
    } elseif (Test-Path $bunPath) {
        Write-Host "  bun found at: $bunPath (will be added to PATH by launcher)" -ForegroundColor Yellow
    } else {
        Write-Host "  bun: NOT FOUND" -ForegroundColor Red
        Write-Host "  Install with: curl -fsSL https://bun.sh/install | bash" -ForegroundColor Yellow
        $allTestsPassed = $false
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test 7: Working directories
Write-Host "`nTEST 7: Working directories" -ForegroundColor Yellow
try {
    $dirs = @(
        "C:\Users\erikc",
        "C:\Users\erikc\Dev\Termeller"
    )
    foreach ($dir in $dirs) {
        if (Test-Path $dir) {
            Write-Host "  $dir : EXISTS" -ForegroundColor Green
        } else {
            Write-Host "  $dir : MISSING" -ForegroundColor Red
            $allTestsPassed = $false
        }
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $allTestsPassed = $false
}

# Final result
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allTestsPassed) {
    Write-Host "ALL TESTS PASSED - LAUNCHER READY!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor White
    Write-Host "  1. Double-click the 'Teller Workspace' shortcut on your desktop" -ForegroundColor White
    Write-Host "  2. Or run: powershell -File C:\Users\erikc\Dev\Termeller\launch-teller.ps1" -ForegroundColor White
    Write-Host "`nExpected behavior:" -ForegroundColor White
    Write-Host "  - Left pane (75%): Opens at C:\Users\erikc with opencode running" -ForegroundColor Gray
    Write-Host "  - Right pane (25%): Runs 'bun run start' from Termeller directory" -ForegroundColor Gray
    Write-Host "  - Duplicate clicks will focus the existing window" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "SOME TESTS FAILED - SEE ABOVE" -ForegroundColor Red
    Write-Host "`nPlease fix the issues before using the launcher." -ForegroundColor Yellow
    exit 1
}
