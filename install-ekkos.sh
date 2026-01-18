#!/bin/bash
set -e

# ekkOS Complete Installation Script
# Installs hooks, skills, agents, and configuration for the full ekkOS experience

EKKOS_VERSION="2.12.9"
TEMPLATE_DIR="$(dirname "$0")/templates"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
HOOKS_DIR="$CLAUDE_DIR/hooks"
CONFIG_FILE="$HOME/.ekkos/config.json"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 ekkOS Complete Installation"
echo "   Version: $EKKOS_VERSION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check prerequisites
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed"
    echo "   Install: brew install jq"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is required but not installed"
    exit 1
fi

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: ekkOS config not found at $CONFIG_FILE"
    echo "   Please sign up at https://ekkos.dev first"
    exit 1
fi

echo "✓ Prerequisites check passed"
echo ""

# Install ekkos-cli if not present
echo "📦 Checking ekkos-cli..."
if ! command -v ekkos &> /dev/null; then
    echo "   Installing @ekkos/cli globally..."
    if command -v npm &> /dev/null; then
        npm install -g @ekkos/cli 2>/dev/null || {
            echo "   ⚠️  npm install failed, trying npx fallback"
            echo "   You can use: npx ekkos run -b"
        }
    else
        echo "   ⚠️  npm not found - install Node.js or use: npx ekkos run -b"
    fi

    # Verify installation
    if command -v ekkos &> /dev/null; then
        EKKOS_CLI_VERSION=$(ekkos --version 2>/dev/null || echo "unknown")
        echo "   ✓ ekkos-cli installed (v$EKKOS_CLI_VERSION)"
    else
        echo "   ⚠️  ekkos-cli not in PATH - use: npx ekkos run -b"
    fi
else
    EKKOS_CLI_VERSION=$(ekkos --version 2>/dev/null || echo "unknown")
    echo "   ✓ ekkos-cli already installed (v$EKKOS_CLI_VERSION)"
fi
echo ""

# 1. Install Hooks
echo "📂 Installing Hooks..."
mkdir -p "$HOOKS_DIR"
mkdir -p "$HOOKS_DIR/lib"

cp "$TEMPLATE_DIR/hooks/user-prompt-submit.sh" "$HOOKS_DIR/"
cp "$TEMPLATE_DIR/hooks/stop.sh" "$HOOKS_DIR/"
cp "$TEMPLATE_DIR/hooks/session-start.sh" "$HOOKS_DIR/"
cp "$TEMPLATE_DIR/hooks/assistant-response.sh" "$HOOKS_DIR/"
cp -r "$TEMPLATE_DIR/hooks/lib/"* "$HOOKS_DIR/lib/"

chmod +x "$HOOKS_DIR"/*.sh

echo "   ✓ user-prompt-submit.sh (CAPTURE phase)"
echo "   ✓ stop.sh (RETRIEVE, INJECT, MEASURE phases)"
echo "   ✓ session-start.sh (Initialize tracking)"
echo "   ✓ assistant-response.sh"
echo "   ✓ lib/ (shared utilities)"
echo ""

# 2. Install Skills
echo "📚 Installing Skills..."
mkdir -p "$SKILLS_DIR"

SKILL_COUNT=0
for skill_dir in "$TEMPLATE_DIR/skills"/*; do
    if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")
        mkdir -p "$SKILLS_DIR/$skill_name"

        # Copy SKILL.md or Skill.md
        if [ -f "$skill_dir/SKILL.md" ]; then
            cp "$skill_dir/SKILL.md" "$SKILLS_DIR/$skill_name/"
            echo "   ✓ $skill_name"
            SKILL_COUNT=$((SKILL_COUNT + 1))
        elif [ -f "$skill_dir/Skill.md" ]; then
            cp "$skill_dir/Skill.md" "$SKILLS_DIR/$skill_name/"
            echo "   ✓ $skill_name"
            SKILL_COUNT=$((SKILL_COUNT + 1))
        fi
    fi
done

echo "   Installed $SKILL_COUNT skills"
echo ""

# 3. Install Agents (Markdown format with YAML frontmatter)
echo "🤖 Installing Agents..."
AGENT_DIR="$CLAUDE_DIR/agents"
mkdir -p "$AGENT_DIR"

AGENT_COUNT=0
if [ -d "$TEMPLATE_DIR/agents" ]; then
    for agent_file in "$TEMPLATE_DIR/agents"/*.md; do
        if [ -f "$agent_file" ]; then
            agent_name=$(basename "$agent_file" .md)
            cp "$agent_file" "$AGENT_DIR/"
            echo "   ✓ $agent_name"
            AGENT_COUNT=$((AGENT_COUNT + 1))
        fi
    done
fi

echo "   Installed $AGENT_COUNT agents to ~/.claude/agents/"
echo ""

# 4. Create/Update hooks.json
echo "⚙️  Configuring hooks.json..."
cat > "$HOOKS_DIR/hooks.json" << 'EOF'
{
  "hooks": {
    "session-start": {
      "command": "~/.claude/hooks/session-start.sh",
      "enabled": true
    },
    "user-prompt-submit": {
      "command": "~/.claude/hooks/user-prompt-submit.sh",
      "enabled": true
    },
    "stop": {
      "command": "~/.claude/hooks/stop.sh",
      "enabled": true
    },
    "assistant-response": {
      "command": "~/.claude/hooks/assistant-response.sh",
      "enabled": true
    }
  },
  "version": "2.10.24",
  "golden_loop": {
    "enabled": true,
    "real_time_tracking": true,
    "phases": ["capture", "learn", "retrieve", "inject", "measure"]
  }
}
EOF

echo "   ✓ hooks.json configured with Golden Loop tracking"
echo ""

# 5. Verify API connectivity
echo "🔗 Verifying API connectivity..."
API_KEY=$(jq -r '.hookApiKey // .apiKey' "$CONFIG_FILE" 2>/dev/null)

if [ -z "$API_KEY" ] || [ "$API_KEY" == "null" ]; then
    echo "   ⚠️  Warning: No API key found in config"
else
    # Test connectivity
    HEALTH_CHECK=$(curl -s "https://api.ekkos.dev/health" || echo "failed")

    if echo "$HEALTH_CHECK" | grep -q "ok"; then
        echo "   ✓ API connectivity verified"
    else
        echo "   ⚠️  Warning: Could not reach ekkOS API"
    fi
fi
echo ""

# 6. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ekkOS Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 What was installed:"
echo ""
echo "   🖥️  CLI:"
echo "      • ekkos run -b (auto context management for swarm)"
echo ""
echo "   🪝 Hooks (4):"
echo "      • session-start.sh"
echo "      • user-prompt-submit.sh (CAPTURE)"
echo "      • stop.sh (RETRIEVE, INJECT, MEASURE)"
echo "      • assistant-response.sh"
echo ""
echo "   📚 Skills ($SKILL_COUNT):"
echo "      • /continue - Full context restoration from Redis"
echo "      • /permissions - Manage proactive tool execution"
echo "      • ekkOS_Memory_First - Search before solving"
echo "      • ekkOS_Learn - Capture solutions as patterns"
echo "      • ekkOS_Deep_Recall - Time-based memory recall"
echo "      • ekkOS_Preferences - Capture user directives"
echo "      • ekkOS_Safety - Pre-flight safety checks"
echo "      • ekkOS_Schema - Database field awareness"
echo "      • ekkOS_Vault - Encrypted secrets management"
echo "      • ekkOS_Summary - Session activity reports"
echo "      • ekkOS_Reflect - Response quality analysis"
echo "      • ekkOS_Plan_Assist - Structured task planning"
echo ""
echo "   🤖 Agents ($AGENT_COUNT):"
echo "      • Debug Detective - Systematic bug fixing"
echo "      • Code Reviewer - PR review with patterns"
echo "      • Git Companion - Git workflow assistance"
echo ""
echo "   🔄 Golden Loop (5-Phase Flow):"
echo "      1. CAPTURE  - Log context at turn start"
echo "      2. LEARN    - Agent processes and responds"
echo "      3. RETRIEVE - Search memory automatically"
echo "      4. INJECT   - Apply patterns to response"
echo "      5. MEASURE  - Track outcomes and forge new patterns"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "   1. Start a new Claude Code session"
echo "   2. Try: /continue (restore past session)"
echo "   3. Try: /permissions (manage tool access)"
echo "   4. Check sidebar for real-time Golden Loop tracking"
echo ""
echo "   🤖 For ekkOS_SWARM (24/7 autonomous agents):"
echo "      • Start agents with: ekkos run -b"
echo "      • Auto /clear + /continue when context fills"
echo "      • See: https://github.com/ekkostech/ekkos-swarm-v1"
echo ""
echo "📖 Documentation:"
echo "   https://docs.ekkos.dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
