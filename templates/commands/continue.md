# /continue

Restore your last 5 turns after running `/clear`.

## Usage

```
/clear         # First: free up context
/continue      # Then: restore last 5 turns
```

## What Happens

1. Hook detects `/continue`
2. Fetches last 5 turns from ekkOS API
3. Injects them as context
4. Claude continues seamlessly

## Why This Exists

When context gets full (90%+), you need to `/clear` but don't want to lose your work. This command restores just enough context (5 turns) to continue working without re-explaining everything.

## The Flow

```
Work normally until context ~90%
         ↓
Run: /clear (frees context)
         ↓
Run: /continue (restores 5 turns)
         ↓
Keep working
```

## Example

```
[Context at 92%]

You: /clear
Claude: Context cleared.

You: /continue
Hook: ✓ Session continued (5 turns restored)

Claude: ✓ **Continuing** - We were working on the /continue command...
```
