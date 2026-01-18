# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: UserPromptSubmit - SEAMLESS CONTEXT CONTINUITY (Windows)
# ═══════════════════════════════════════════════════════════════════════════
# PowerShell version for Windows users
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "SilentlyContinue"

# Read input from stdin
$inputJson = [Console]::In.ReadToEnd()
if (-not $inputJson) { exit 0 }

try {
    $input = $inputJson | ConvertFrom-Json
} catch {
    exit 0
}

$userQuery = $input.query
if (-not $userQuery) { $userQuery = $input.message }
if (-not $userQuery) { $userQuery = $input.prompt }
if (-not $userQuery) { exit 0 }

$rawSessionId = $input.session_id
if (-not $rawSessionId -or $rawSessionId -eq "null") { $rawSessionId = "unknown" }

# Fallback: read session_id from saved state
if ($rawSessionId -eq "unknown") {
    $stateFile = Join-Path $env:USERPROFILE ".claude\state\current-session.json"
    if (Test-Path $stateFile) {
        try {
            $state = Get-Content $stateFile -Raw | ConvertFrom-Json
            $rawSessionId = $state.session_id
        } catch {}
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# INTELLIGENT TOOL ROUTER: Multi-trigger skill detection
# ═══════════════════════════════════════════════════════════════════════════
$skillReminders = @()
$queryLower = $userQuery.ToLower()

# Memory First - Debug/Error/Problem solving
if ($queryLower -match '(how do i|debug|error|bug|fix|not working|broken|fails|issue|problem|wrong|crash)') {
    $skillReminders += "🔧 SKILL REQUIRED: Call Skill(skill: `"ekkOS_Memory_First`") FIRST before debugging"
}

# Recall Triggers - Time-based memory
if ($queryLower -match '(yesterday|last week|last month|remember when|what did we|where did we leave|before|earlier|previous|ago)') {
    $skillReminders += "📅 SKILL REQUIRED: Call Skill(skill: `"ekkOS_Deep_Recall`") for time-based memory"
}

# Directive Triggers - User preferences
if ($queryLower -match '(always |never |i prefer|i like |dont |don.t |avoid |remember that |from now on)') {
    $skillReminders += "⚙️ SKILL REQUIRED: Call Skill(skill: `"ekkOS_Preferences`") to capture directive"
}

# Safety Triggers - Destructive actions
if ($queryLower -match '(delete|drop |rm -rf|deploy|push.*main|push.*master|production|migrate|rollback)') {
    $skillReminders += "⚠️ SAFETY REQUIRED: Call ekkOS_Conflict before this destructive action"
}

# Schema Triggers - Database operations
if ($queryLower -match '(sql|query|supabase|prisma|database|table|column|select |insert |update |where )') {
    $skillReminders += "🗄️ SCHEMA REQUIRED: Call ekkOS_GetSchema for correct field names"
}

# ═══════════════════════════════════════════════════════════════════════════
# TURN TRACKING & STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════
$stateDir = Join-Path $env:USERPROFILE ".claude\state"
if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
}

$stateFile = Join-Path $stateDir "hook-state.json"
$turn = 0
$contextPercent = ""

if (Test-Path $stateFile) {
    try {
        $hookState = Get-Content $stateFile -Raw | ConvertFrom-Json
        $turn = [int]$hookState.turn + 1
    } catch {
        $turn = 0
    }
}

# Save updated state
$newState = @{
    turn = $turn
    session_id = $rawSessionId
    last_query = $userQuery.Substring(0, [Math]::Min(100, $userQuery.Length))
    timestamp = (Get-Date).ToString("o")
} | ConvertTo-Json

Set-Content -Path $stateFile -Value $newState -Force

# ═══════════════════════════════════════════════════════════════════════════
# WORKING MEMORY: Fast capture each turn (async, non-blocking)
# ═══════════════════════════════════════════════════════════════════════════
$configFile = Join-Path $env:USERPROFILE ".ekkos\config.json"
if (Test-Path $configFile) {
    try {
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
        $captureToken = $config.hookApiKey
        if (-not $captureToken) { $captureToken = $config.apiKey }

        if ($captureToken) {
            # Async capture using Start-Job (non-blocking)
            Start-Job -ScriptBlock {
                param($token, $sessionId, $turnNum, $query)
                $body = @{
                    session_id = $sessionId
                    turn = $turnNum
                    query = $query
                } | ConvertTo-Json

                Invoke-RestMethod -Uri "https://mcp.ekkos.dev/api/v1/working/fast-capture" `
                    -Method POST `
                    -Headers @{ Authorization = "Bearer $token" } `
                    -ContentType "application/json" `
                    -Body $body -ErrorAction SilentlyContinue
            } -ArgumentList $captureToken, $rawSessionId, $turn, $userQuery | Out-Null
        }
    } catch {}
}

# ═══════════════════════════════════════════════════════════════════════════
# SESSION NAME (UUID to words)
# ═══════════════════════════════════════════════════════════════════════════
function Convert-UuidToWords {
    param([string]$uuid)

    $adjectives = @("alpha","beta","gamma","delta","echo","foxtrot","golf","hotel","india","juliet","kilo","lima","mike","november","oscar","papa")
    $nouns = @("apple","banana","cherry","dragon","eagle","falcon","grape","hawk","iris","jasper","koala","lemon","mango","nebula","orange","panda")
    $animals = @("ants","bats","cats","dogs","eels","foxes","goats","hares","ibis","jays","kites","lynx","mice","newts","owls","pigs")

    if (-not $uuid -or $uuid -eq "unknown") { return "unknown-session" }

    $clean = $uuid -replace "-", ""
    if ($clean.Length -lt 6) { return "unknown-session" }

    $a = [Convert]::ToInt32($clean.Substring(0,2), 16) % $adjectives.Length
    $n = [Convert]::ToInt32($clean.Substring(2,2), 16) % $nouns.Length
    $an = [Convert]::ToInt32($clean.Substring(4,2), 16) % $animals.Length

    return "$($adjectives[$a])-$($nouns[$n])-$($animals[$an])"
}

$sessionName = Convert-UuidToWords $rawSessionId
$timestamp = (Get-Date).ToString("yyyy-MM-dd hh:mm:ss tt") + " EST"

# ═══════════════════════════════════════════════════════════════════════════
# OUTPUT SYSTEM REMINDER
# ═══════════════════════════════════════════════════════════════════════════
$header = "[0;36m[1m🧠 ekkOS Memory[0m [2m| Turn $turn | $contextPercent | $sessionName | $timestamp[0m"

$output = @"
$header

"@

if ($skillReminders.Count -gt 0) {
    $output += "[0;35m[1m" + ($skillReminders -join "`n") + "[0m`n"
}

$output += @"

<footer-format>End responses with: Claude Code ({Model}) · 🧠 **ekkOS_™** · Turn $turn · $sessionName · 📅 $timestamp</footer-format>
"@

Write-Output $output
