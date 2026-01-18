# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: SessionStart - Initialize session (Windows)
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "SilentlyContinue"

# Read input
$inputJson = [Console]::In.ReadToEnd()

try {
    $input = $inputJson | ConvertFrom-Json
    $sessionId = $input.session_id
} catch {
    $sessionId = "unknown"
}

# Initialize state directory
$stateDir = Join-Path $env:USERPROFILE ".claude\state"
if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
}

# Reset turn counter for new session
$stateFile = Join-Path $stateDir "hook-state.json"
$state = @{
    turn = 0
    session_id = $sessionId
    started_at = (Get-Date).ToString("o")
} | ConvertTo-Json

Set-Content -Path $stateFile -Value $state -Force

# Save session ID for other hooks
$sessionFile = Join-Path $stateDir "current-session.json"
$sessionData = @{
    session_id = $sessionId
} | ConvertTo-Json

Set-Content -Path $sessionFile -Value $sessionData -Force

Write-Output "ekkOS session initialized"
