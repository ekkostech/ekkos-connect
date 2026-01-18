# Validate Schema

Validate database schemas and type definitions in YOUR project. Catch field name mismatches, type errors, and schema drift before they cause runtime errors.

## Overview

This plugin helps you validate schemas in YOUR codebase:
- TypeScript type definitions
- Prisma schema files
- GraphQL schemas
- Supabase database types
- JSON Schema definitions
- API response types

**This is NOT for validating ekkOS's internal database** - it's for YOUR projects!

## What it does

1. **Indexes your project schemas** - Finds all schema files (*.d.ts, schema.prisma, *.graphql)
2. **Validates field names** - Checks for mismatches across your code
3. **Detects schema drift** - Compares database schema to TypeScript types
4. **Catches type errors** - Finds common type mistakes before runtime
5. **Suggests fixes** - Provides actionable corrections
6. **Remembers schema** - Stores in ekkOS for future reference

## Usage

```bash
# Index all schemas in current project
/validate-schema

# Index specific schema file
/validate-schema --file prisma/schema.prisma

# Check a specific table/type
/validate-schema users

# Compare database to TypeScript types
/validate-schema --compare

# Show indexed schemas
/validate-schema --show
```

## Example - First Time Setup

```
User: /validate-schema

🔍 Project Schema Validator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning project for schema files...

✅ Found Schema Files:

1. TypeScript Types
   • packages/database-types/index.ts (2,450 lines)
   • src/types/api.d.ts (320 lines)
   • src/models/user.ts (150 lines)

2. Prisma Schema
   • prisma/schema.prisma (18 models, 150 fields)

3. GraphQL Schema
   • schema.graphql (12 types, 85 fields)

4. Supabase Generated Types
   • supabase/types.ts (auto-generated from database)

───────────────────────────────────────────────────────────────────
📊 Indexing Schemas...

Processing TypeScript types...
✅ Indexed 47 interfaces, 23 types, 12 enums

Processing Prisma schema...
✅ Indexed 18 models with 150 fields

Processing GraphQL schema...
✅ Indexed 12 types with 85 fields

───────────────────────────────────────────────────────────────────
🎯 Schema Index Complete!

Total schemas indexed: 4 files
Total types/models: 77
Total fields: 335

Stored in ekkOS Layer 8 (Codebase) for future queries.

───────────────────────────────────────────────────────────────────
✅ Validation Results: HEALTHY

No critical issues found!

⚠️  Minor Warnings (2):

1. Field name inconsistency
   Location: src/api/users.ts:42
   Issue: Using `user.username` but schema has `user.userName` (camelCase)
   Fix: Change to `user.userName`

2. Optional field not checked
   Location: src/components/UserCard.tsx:18
   Issue: Accessing `user.bio` without null check
   Schema: `bio` is optional (can be null)
   Fix: Add null check: `user.bio ? ... : 'No bio'`

───────────────────────────────────────────────────────────────────
💡 Next Steps

Your schemas are now indexed in ekkOS!

• Check specific type: /validate-schema User
• Compare schemas: /validate-schema --compare
• Fix warnings above to prevent runtime errors

Whenever you change your schema, run /validate-schema again to update ekkOS.
```

## Example - Checking Specific Table

```
User: /validate-schema users

🔍 Schema: users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Database Schema (Prisma):

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  userName      String
  firstName     String?
  lastName      String?
  bio           String?
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

───────────────────────────────────────────────────────────────────
📝 TypeScript Type:

interface User {
  id: string;
  email: string;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

───────────────────────────────────────────────────────────────────
✅ Schema Match: PERFECT

TypeScript types match Prisma schema exactly!

All field names, types, and nullability are correct.

───────────────────────────────────────────────────────────────────
🔍 Usage Analysis (found in codebase):

✅ src/api/users.ts:15
   Correct: user.userName

✅ src/components/UserProfile.tsx:42
   Correct: user.bio ? ... : 'No bio' (null check present)

❌ src/pages/Profile.tsx:88
   ERROR: Using user.username (should be userName)
   Fix needed!

───────────────────────────────────────────────────────────────────
🔧 Suggested Fixes:

1. File: src/pages/Profile.tsx
   Line: 88

   Current:
   ```typescript
   const name = user.username;
   ```

   Should be:
   ```typescript
   const name = user.userName;
   ```

───────────────────────────────────────────────────────────────────
💡 Action Required

Run this fix to prevent runtime errors:

1. Open src/pages/Profile.tsx:88
2. Change `user.username` → `user.userName`
3. Test the page

This mismatch would cause: "Cannot read property 'username' of undefined"
```

## Example - Schema Drift Detected

```
User: /validate-schema --compare

🔍 Comparing Schemas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Comparing:
  • Database (Prisma schema)
  • TypeScript types
  • GraphQL schema

───────────────────────────────────────────────────────────────────
⚠️  SCHEMA DRIFT DETECTED!

Your TypeScript types are out of sync with your database.

───────────────────────────────────────────────────────────────────
❌ Critical Issues (3):

1. Missing Field in TypeScript

   Database has: User.phoneNumber (String?)
   TypeScript: Missing!

   Impact: TypeScript won't know about this field
   Fix: Add to interface:
   ```typescript
   interface User {
     // ... existing fields
     phoneNumber: string | null;  // ADD THIS
   }
   ```

2. Wrong Type

   Database: Post.viewCount (Int)
   TypeScript: Post.viewCount (string)

   Impact: Type mismatch will cause runtime errors
   Fix: Change to number:
   ```typescript
   interface Post {
     viewCount: number;  // Was: string
   }
   ```

3. Field Renamed in Database

   Database: User.profileImageUrl
   TypeScript: User.avatarUrl

   Impact: Queries will fail (field doesn't exist)
   Fix: Either:
     - Update TypeScript to profileImageUrl, OR
     - Rename database field back to avatarUrl

───────────────────────────────────────────────────────────────────
🔧 Quick Fix Command

To regenerate TypeScript types from database:

```bash
# If using Prisma:
npx prisma generate

# If using Supabase:
npx supabase gen types typescript > src/types/database.ts
```

───────────────────────────────────────────────────────────────────
💡 Prevention

To avoid schema drift:

1. Use generated types (don't hand-write them)
2. Run /validate-schema after schema changes
3. Add to pre-commit hook:
   ```bash
   npx prisma generate && git add src/types/
   ```

After fixing, run /validate-schema again to verify!
```

## Example - Fresh Project Setup

```
User: /validate-schema

🔍 Project Schema Validator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning project for schema files...

───────────────────────────────────────────────────────────────────
ℹ️  Fresh Project Detected

No schema files found yet. That's OK for a new project!

Here's how to get started:

───────────────────────────────────────────────────────────────────
🚀 Recommended Setup

For a TypeScript + Database project, we recommend:

1. **Choose a database approach:**

   Option A: Prisma (recommended)
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

   Option B: Supabase
   ```bash
   npm install @supabase/supabase-js
   npx supabase init
   ```

2. **Define your schema:**

   Prisma: Edit prisma/schema.prisma
   Supabase: Use Supabase dashboard or migrations

3. **Generate TypeScript types:**

   Prisma: `npx prisma generate`
   Supabase: `npx supabase gen types typescript`

4. **Index with ekkOS:**

   Run /validate-schema again after setup!

───────────────────────────────────────────────────────────────────
💡 Why This Matters

Schema validation prevents:
  • Field name typos (user.username vs user.userName)
  • Type mismatches (expecting string, got number)
  • Null pointer errors (missing null checks)
  • Schema drift (types out of sync with database)

Once you have schemas, ekkOS will remember them and help catch errors!
```

## Advanced Usage

### Index Specific Files

```bash
# Index TypeScript types
/validate-schema --file src/types/database.d.ts

# Index Prisma schema
/validate-schema --file prisma/schema.prisma

# Index multiple files
/validate-schema --files "src/types/*.d.ts"
```

### Show Indexed Schemas

```bash
/validate-schema --show

# Shows:
# - All indexed schemas
# - When they were indexed
# - Field count per schema
# - Last validation results
```

### Compare Across Schema Sources

```bash
# Compare database vs TypeScript
/validate-schema --compare database typescript

# Compare GraphQL vs database
/validate-schema --compare graphql database

# Compare all sources
/validate-schema --compare all
```

### Watch for Changes

```bash
# Re-index when schema files change
/validate-schema --watch

# (Sets up file watcher - re-runs validation on save)
```

## Common Issues Detected

### 1. Field Name Mismatches

```
Database: user.firstName
Code: user.first_name

Error: Cannot read property 'first_name' of undefined
Fix: Use consistent naming (camelCase everywhere)
```

### 2. Missing Null Checks

```
Database: bio String? (optional)
Code: <p>{user.bio.substring(0, 100)}</p>

Error: Cannot read property 'substring' of null
Fix: Add null check: user.bio ? user.bio.substring(0, 100) : ''
```

### 3. Wrong Types

```
Database: age Int
TypeScript: age: string

Error: Type 'number' is not assignable to type 'string'
Fix: Change to age: number
```

### 4. Missing Fields

```
Database: phoneNumber String?
TypeScript: (missing)

Error: TypeScript doesn't know this field exists
Fix: Add phoneNumber: string | null to interface
```

### 5. Schema Drift

```
Database was updated but TypeScript types weren't regenerated

Fix: Run prisma generate or supabase gen types
```

## Requirements

- Project with schema files (TypeScript, Prisma, GraphQL, etc.)
- ekkOS MCP server configured
- Project directory accessible to Claude Code

## Implementation Details

When this command runs, Claude will:

1. **Scan Project Directory**:
   - Find all schema-related files (*.d.ts, schema.prisma, *.graphql, etc.)
   - Parse schema definitions
   - Extract types, models, fields

2. **Call ekkOS_IndexSchema**:
   ```typescript
   ekkOS_IndexSchema({
     project_path: "/path/to/project",
     files: [
       { name: "prisma/schema.prisma", content: "..." },
       { name: "src/types/database.d.ts", content: "..." }
     ]
   })
   ```

3. **Analyze for Issues**:
   - Field name inconsistencies (camelCase vs snake_case)
   - Type mismatches (string vs number)
   - Missing null checks
   - Optional fields accessed without guards

4. **Compare Schemas**:
   - Database schema (source of truth)
   - TypeScript types (what code expects)
   - GraphQL schema (API contract)
   - Identify drift and mismatches

5. **Generate Fixes**:
   - Show exact line numbers
   - Provide corrected code
   - Suggest commands to regenerate types

6. **Store in ekkOS**:
   - Call `ekkOS_GetSchema` later for quick lookups
   - Stored in Layer 8 (Codebase memory)
   - Available across sessions

7. **Format Output**:
   - Clear status indicators (✅⚠️❌)
   - Actionable fix suggestions
   - Command snippets to run
   - Prevention tips

## Multi-Tool Workflow

This plugin combines:
- `ekkOS_IndexSchema` - Index user's schemas
- `ekkOS_GetSchema` - Retrieve specific table/type
- `ekkOS_Codebase` - Search for field usage in code
- `ekkOS_Search` - Check for past schema issues
- `ekkOS_Forge` - Remember schema issues as patterns

**Example workflow:**
1. User runs `/validate-schema`
2. Indexes schemas with `ekkOS_IndexSchema`
3. Searches codebase with `ekkOS_Codebase` for field usage
4. Checks past schema issues with `ekkOS_Search`
5. If issues found, forges pattern with `ekkOS_Forge`
6. Next time similar issue occurs, pattern is auto-retrieved!

## Fresh Project Support

For brand new projects:
- Detects no schemas exist yet
- Provides setup guide (Prisma vs Supabase)
- Shows recommended workflow
- Explains why schema validation matters
- Offers to help after setup

## Benefits

### Prevents Runtime Errors
```
Before: user.username → undefined (field doesn't exist)
After: Caught by /validate-schema before running code
```

### Keeps Types in Sync
```
Before: Database updated, TypeScript stale
After: /validate-schema detects drift, reminds you to regenerate
```

### Saves Debugging Time
```
Before: 30 minutes debugging "Cannot read property X"
After: 30 seconds to see issue and fix
```

### Builds Institutional Knowledge
```
All schema issues forged as patterns in ekkOS
Future projects benefit from past mistakes
```

## Tips

1. **Run after schema changes**: Always run `/validate-schema` after updating Prisma schema or database
2. **Add to CI/CD**: Run validation in pre-commit hooks
3. **Use generated types**: Don't hand-write types - generate from schema
4. **Check before deploy**: Run validation before pushing to production
5. **Forge issues as patterns**: When you find a schema bug, forge it so ekkOS remembers

## Comparison: This vs Admin Schema Sentinel

| Feature | Project Schema Validator (This) | Schema Sentinel (Admin) |
|---------|--------------------------------|-------------------------|
| Target | YOUR projects | ekkOS database |
| Portable | ✅ Works anywhere | ❌ ekkOS-specific |
| Schemas | TypeScript, Prisma, GraphQL | Supabase only |
| Purpose | Help users validate their code | Help ekkOS team validate migrations |
| Deployed to | All users | Admin only |

**This plugin is FOR YOU to use on YOUR codebases!**

---

**Your schemas, validated. Your errors, prevented. Your time, saved.** ⚡🛡️
