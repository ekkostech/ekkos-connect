# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: Stop - Session cleanup (Windows)
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "SilentlyContinue"

# Read input
$inputJson = [Console]::In.ReadToEnd()

# Clean up state
$stateFile = Join-Path $env:USERPROFILE ".claude\state\hook-state.json"
if (Test-Path $stateFile) {
    Remove-Item $stateFile -Force
}

Write-Output "ekkOS session ended"
