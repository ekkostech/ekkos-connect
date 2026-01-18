---
name: ekkOS_Vault
description: Securely store and retrieve credentials. Activate when the user shares an API key, password, token, secret, or any sensitive credential. Also activate when you need to use a stored credential or when the user asks about their stored secrets. All secrets are encrypted with AES-256-GCM.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_StoreSecret
  - mcp__ekkos-memory__ekkOS_GetSecret
  - mcp__ekkos-memory__ekkOS_ListSecrets
  - mcp__ekkos-memory__ekkOS_DeleteSecret
  - mcp__ekkos-memory__ekkOS_RotateSecret
---

# ekkOS_Vault

You are augmented with **ekkOS_ memory** - and you can securely store and retrieve encrypted credentials.

## Why This Skill Exists

Users share credentials during development:
- API keys for services
- Database passwords
- OAuth tokens
- Environment secrets

This skill stores them securely (AES-256-GCM encrypted) and retrieves them when needed.

## CRITICAL Security Rules

1. **NEVER output secrets in plain text** unless user explicitly requests
2. **NEVER include secrets in patterns** or regular memory
3. **ALWAYS use masked display** when showing secrets exist
4. **ALWAYS confirm before storing** sensitive data

## When To Activate

This skill should trigger when:

| Trigger | Example |
|---------|---------|
| User shares API key | "Here's my OpenAI key: sk-..." |
| User shares password | "The database password is ..." |
| User shares token | "My GitHub token is ghp_..." |
| Need to use stored cred | Making API call that needs key |
| User asks about secrets | "What credentials do I have stored?" |
| Key rotation | "I need to update my API key" |

## Instructions

### Storing Secrets

When user shares a credential:

```
ekkOS_StoreSecret({
  service: "openai",           // Service name
  value: "sk-abc123...",       // The actual secret
  type: "api_key",             // auto-detected if omitted
  description: "Production API key",
  expiresInDays: 90            // Optional expiration
})
```

Then confirm (with masked value):
```
🔐 Secret stored securely:
   Service: openai
   Type: API Key
   Preview: sk-a...123
   Encrypted: AES-256-GCM

   Use `ekkOS_GetSecret({service: "openai"})` to retrieve.
```

### Retrieving Secrets

When you need a stored credential:

```
ekkOS_GetSecret({
  service: "openai",
  masked: false  // true for safe display
})
```

Response:
```json
{
  "service": "openai",
  "value": "sk-abc123...",  // Only if masked: false
  "type": "api_key",
  "created_at": "2024-01-15T10:30:00Z",
  "last_accessed": "2024-01-20T14:22:00Z"
}
```

**For display to user (masked):**
```
ekkOS_GetSecret({
  service: "openai",
  masked: true
})

Response: { value: "sk-a...123" }
```

### Listing Secrets

Show what's stored (no values):

```
ekkOS_ListSecrets({})
```

Response:
```
🔐 Stored Credentials:

1. openai (API Key)
   Created: Jan 15, 2024
   Last used: Jan 20, 2024

2. supabase (API Key)
   Created: Jan 10, 2024
   Last used: Jan 19, 2024

3. github (Token)
   Created: Dec 1, 2023
   Last used: Jan 18, 2024

Total: 3 secrets stored
```

### Rotating Secrets

When user has a new key:

```
ekkOS_RotateSecret({
  service: "openai",
  newValue: "sk-new-key-xyz..."
})
```

Response:
```
🔐 Secret rotated:
   Service: openai
   Old key revoked
   New key stored: sk-n...xyz

   Remember to revoke the old key in OpenAI dashboard.
```

### Deleting Secrets

```
ekkOS_DeleteSecret({
  secretId: "secret-uuid"
})
```

Response:
```
🔐 Secret deleted permanently:
   Service: openai
   This cannot be recovered.
```

## Example Scenarios

### Scenario 1: User Shares API Key
```
User: "Here's my Stripe key: sk_live_abc123xyz"

You: "I'll store this securely.

      ekkOS_StoreSecret({
        service: 'stripe',
        value: 'sk_live_abc123xyz',
        type: 'api_key',
        description: 'Live Stripe API key'
      })

      🔐 Stripe API key stored securely (AES-256-GCM encrypted).
      Preview: sk_l...xyz

      I can use this for Stripe API calls. You won't need to
      share it again."
```

### Scenario 2: Using Stored Credential
```
User: "Make a Stripe API call to list customers"

You: *Need Stripe key*

     ekkOS_GetSecret({ service: 'stripe' })

     → Retrieved: sk_live_abc123xyz

     "Using your stored Stripe key..."

     *Makes API call with the key*

     "Here are your customers: ..."

     *Key never shown to user*
```

### Scenario 3: What Credentials Exist
```
User: "What API keys do I have stored?"

You: ekkOS_ListSecrets({})

     "🔐 Your stored credentials:

      1. **stripe** (API Key)
         Created: 2 weeks ago
         Last accessed: Yesterday

      2. **openai** (API Key)
         Created: 1 month ago
         Last accessed: 3 days ago

      3. **github** (Personal Access Token)
         Created: 2 months ago
         Last accessed: Last week

      Would you like to see masked previews of any of these?"
```

### Scenario 4: Credential Rotation
```
User: "I regenerated my OpenAI key, here's the new one: sk-new123"

You: ekkOS_RotateSecret({
       service: 'openai',
       newValue: 'sk-new123'
     })

     "🔐 OpenAI key rotated:
      - Old key removed from vault
      - New key stored: sk-n...123

      ⚠️ Remember to delete the old key in OpenAI's dashboard
      to prevent unauthorized use."
```

## Auto-Detection

The skill can auto-detect secret types:

| Pattern | Detected Type |
|---------|---------------|
| `sk-...` | OpenAI API Key |
| `ghp_...` | GitHub Personal Token |
| `sk_live_...` | Stripe Live Key |
| `sk_test_...` | Stripe Test Key |
| `xoxb-...` | Slack Bot Token |
| `AKIA...` | AWS Access Key |

## Security Reminders

When storing:
```
⚠️ Security note: This key is encrypted and stored securely.
   Only you can access it through ekkOS.
   Never share this key in plain text or commit it to git.
```

When retrieving for API calls:
```
*Using stored credential - never displayed*
```

## Success Metrics

You're using this skill correctly when:
- Credentials are stored, not repeated in chat
- Users don't have to re-share keys
- Masked previews are used for display
- Rotations are handled smoothly
- No secrets appear in patterns or logs

---

**Mantra**: User shares a key? Store it. Need a key? Retrieve it. Never expose it.
