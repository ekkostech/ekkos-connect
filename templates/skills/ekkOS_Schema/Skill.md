---
name: ekkOS_Schema
description: Know the correct database field names. Activate when writing SQL queries, working with Supabase, using Prisma, accessing database tables, or when you need to reference column names. This skill prevents "column does not exist" errors by checking the indexed schema first.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_GetSchema
  - mcp__ekkos-memory__ekkOS_IndexSchema
  - mcp__ekkos-memory__ekkOS_Search
  - Read
  - Glob
---

# ekkOS_Schema

You are augmented with **ekkOS_ memory** - and you know the EXACT field names in this project's database.

## Why This Skill Exists

Database schema mismatches are a common source of errors:
- `column "userId" does not exist` (it's `user_id`)
- `relation "Users" does not exist` (it's `users`)
- Wrong type assumptions

This skill ensures you use the CORRECT field names.

## When To Activate

This skill should trigger when:

| Trigger | Example |
|---------|---------|
| Writing SQL | `SELECT * FROM users WHERE...` |
| Supabase queries | `.from('users').select('...')` |
| Prisma operations | `prisma.user.findMany({...})` |
| TypeScript DB types | `Database['public']['Tables']` |
| Migration creation | `CREATE TABLE...` |
| Any column reference | Mentioning a database field |

## Instructions

### Step 1: Identify the Table/Type

Extract the table name from the context:
- SQL: `SELECT ... FROM users` → `users`
- Supabase: `.from('profiles')` → `profiles`
- Prisma: `prisma.post.findMany` → `post`

### Step 2: Get the Schema

```
ekkOS_GetSchema({
  table_name: "users"
})
```

Response:
```json
{
  "table_name": "users",
  "columns": [
    {"name": "id", "type": "uuid", "nullable": false},
    {"name": "email", "type": "text", "nullable": false},
    {"name": "created_at", "type": "timestamptz", "nullable": false},
    {"name": "display_name", "type": "text", "nullable": true}
  ],
  "primary_key": "id",
  "foreign_keys": [...]
}
```

### Step 3: Use Correct Names

Now you know:
- It's `display_name`, not `displayName`
- It's `created_at`, not `createdAt`
- `id` is UUID, not integer

### Step 4: Write Correct Query

```sql
-- WRONG (would fail)
SELECT displayName FROM Users WHERE createdAt > '2024-01-01'

-- CORRECT (using schema)
SELECT display_name FROM users WHERE created_at > '2024-01-01'
```

## First-Time Setup: Index the Schema

If schema isn't indexed yet, index it first:

```
ekkOS_IndexSchema({
  project_path: "/path/to/project",
  files: [
    {
      name: "packages/database-types/index.ts",
      content: "... file contents ..."
    }
  ]
})
```

This indexes Supabase types, Prisma schemas, and TypeScript interfaces.

## Example Scenarios

### Scenario 1: Supabase Query
```
User: "Query all users who signed up this month"

You: *Before writing query*

     ekkOS_GetSchema({ table_name: "users" })

     Response: columns include `created_at` (not `createdAt`)

     "Here's the query:
      ```typescript
      const { data } = await supabase
        .from('users')
        .select('id, email, display_name, created_at')
        .gte('created_at', startOfMonth)
      ```"
```

### Scenario 2: Prisma Operation
```
User: "Find all posts with their authors"

You: *Before writing*

     ekkOS_GetSchema({ table_name: "posts" })
     ekkOS_GetSchema({ table_name: "users" })

     Response: posts has `author_id` FK to users

     "Here's the Prisma query:
      ```typescript
      const posts = await prisma.post.findMany({
        include: {
          author: {
            select: {
              id: true,
              display_name: true
            }
          }
        }
      })
      ```"
```

### Scenario 3: Migration
```
User: "Add a bio field to the profiles table"

You: *Check existing schema*

     ekkOS_GetSchema({ table_name: "profiles" })

     Response: profiles has id, user_id, avatar_url, updated_at

     "Here's the migration:
      ```sql
      ALTER TABLE profiles
      ADD COLUMN bio TEXT;
      ```

      I confirmed the table is `profiles` (not `profile`)
      and existing columns use snake_case."
```

### Scenario 4: Schema Not Indexed
```
User: "Query the orders table"

You: ekkOS_GetSchema({ table_name: "orders" })

     Response: Schema not found

     "I don't have the orders schema indexed yet.
      Let me check the codebase for type definitions..."

     *Reads database types file*

     ekkOS_IndexSchema({
       project_path: "...",
       files: [{ name: "types/database.ts", content: "..." }]
     })

     "Schema indexed! The orders table has:
      - id (uuid)
      - user_id (uuid, FK to users)
      - total_amount (numeric)
      - status (text: pending/completed/cancelled)
      - created_at (timestamptz)"
```

## Common Schema Sources

The skill can index from:

| Source | Location |
|--------|----------|
| Supabase Types | `packages/database-types/index.ts` |
| Prisma Schema | `prisma/schema.prisma` |
| TypeScript Types | `types/database.ts` |
| SQL Files | `supabase/migrations/*.sql` |

## Fallback: Read Files Directly

If schema isn't indexed:

1. **Find type files:**
   ```
   Glob({ pattern: "**/*database*.ts" })
   Glob({ pattern: "**/schema.prisma" })
   ```

2. **Read and parse:**
   ```
   Read({ file_path: "packages/database-types/index.ts" })
   ```

3. **Index for future:**
   ```
   ekkOS_IndexSchema({ ... })
   ```

## Integration with Patterns

If you've solved a schema issue before, it's a pattern:

```
ekkOS_Search({
  query: "users table schema columns",
  sources: ["codebase", "patterns"]
})
```

## Success Metrics

You're using this skill correctly when:
- ZERO "column does not exist" errors
- You check schema BEFORE writing queries
- You use snake_case vs camelCase correctly
- Migrations reference existing columns correctly
- Users trust your database code

---

**Mantra**: About to write SQL? Check the schema first. Every time.
