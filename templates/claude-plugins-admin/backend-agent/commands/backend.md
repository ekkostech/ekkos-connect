# Backend Agent

**ADMIN ONLY** - AI Backend Developer specialized in API development, database schema design, Supabase, PostgreSQL, Row Level Security, and server-side logic.

## Overview

The Backend Agent is your API and database expert. It:
- Designs database schemas with proper indexes and RLS policies
- Builds REST and GraphQL APIs
- Implements authentication and authorization
- Optimizes database queries
- Handles data migrations
- Ensures data integrity and security

## Commands

### `/backend schema`

Design and implement database schema.

```bash
/backend schema "Entity or feature description"

# Examples
/backend schema "Teams with members and roles"
/backend schema "Notification system with preferences"
/backend schema "Usage tracking and billing"
```

**What happens:**

```
🔧 Backend Agent: Designing "Teams Schema"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Schema Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Searching existing schemas...
✓ Found users table (auth.users reference)
✓ Found organizations table (similar pattern)
✓ Checked RLS patterns

Requirements:
  • Teams table (uuid, name, owner, created_at)
  • Team members (many-to-many via junction)
  • Role-based access (owner, admin, member)
  • Invitation system
  • Soft deletes

Security:
  • RLS policies for data isolation
  • Owner/admin permissions
  • Audit logging

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Creating Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating supabase/migrations/20250107000000_create_teams.sql...

```sql
-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create team_members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),

  -- Ensure one membership per user per team
  UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate pending invitations
  UNIQUE(team_id, email) WHERE accepted_at IS NULL
);

-- Indexes for performance
CREATE INDEX idx_teams_owner_id ON public.teams(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_slug ON public.teams(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_created_at ON public.teams(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email) WHERE accepted_at IS NULL;
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token) WHERE accepted_at IS NULL;
CREATE INDEX idx_team_invitations_expires_at ON public.team_invitations(expires_at) WHERE accepted_at IS NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they belong to"
  ON public.teams
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
  ON public.teams
  FOR UPDATE
  USING (owner_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can soft delete their teams"
  ON public.teams
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (deleted_at IS NOT NULL);

-- Team members policies
CREATE POLICY "Users can view team members of teams they belong to"
  ON public.team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE
        deleted_at IS NULL AND (
          owner_id = auth.uid() OR
          id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        )
    )
  );

CREATE POLICY "Team admins can add members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT teams.id FROM public.teams
      LEFT JOIN public.team_members ON teams.id = team_members.team_id
      WHERE teams.deleted_at IS NULL AND (
        teams.owner_id = auth.uid() OR
        (team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin'))
      )
    )
  );

CREATE POLICY "Team admins can remove members"
  ON public.team_members
  FOR DELETE
  USING (
    team_id IN (
      SELECT teams.id FROM public.teams
      LEFT JOIN public.team_members ON teams.id = team_members.team_id
      WHERE teams.deleted_at IS NULL AND (
        teams.owner_id = auth.uid() OR
        (team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin'))
      )
    )
  );

-- Team invitations policies
CREATE POLICY "Users can view invitations to teams they admin"
  ON public.team_invitations
  FOR SELECT
  USING (
    team_id IN (
      SELECT teams.id FROM public.teams
      LEFT JOIN public.team_members ON teams.id = team_members.team_id
      WHERE teams.deleted_at IS NULL AND (
        teams.owner_id = auth.uid() OR
        (team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin'))
      )
    )
  );

CREATE POLICY "Team admins can create invitations"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT teams.id FROM public.teams
      LEFT JOIN public.team_members ON teams.id = team_members.team_id
      WHERE teams.deleted_at IS NULL AND (
        teams.owner_id = auth.uid() OR
        (team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin'))
      )
    )
  );

COMMENT ON TABLE public.teams IS 'Teams for collaboration';
COMMENT ON TABLE public.team_members IS 'Team membership and roles';
COMMENT ON TABLE public.team_invitations IS 'Pending team invitations';
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Schema Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tables Created: 3
  ✓ teams (9 columns, 3 indexes)
  ✓ team_members (7 columns, 2 indexes)
  ✓ team_invitations (10 columns, 4 indexes)

Security:
  ✓ RLS enabled on all tables
  ✓ 10 policies for data isolation
  ✓ Owner/admin permission checks
  ✓ Soft delete support

Performance:
  ✓ Indexes on foreign keys
  ✓ Indexes on query columns (email, token, expires_at)
  ✓ Partial indexes for soft deletes
  ✓ Composite unique constraints

Data Integrity:
  ✓ CHECK constraints on text length
  ✓ UNIQUE constraints prevent duplicates
  ✓ Foreign keys with CASCADE
  ✓ Non-null constraints where needed

Next Steps:
  • Test migration: supabase db reset
  • Generate types: supabase gen types typescript
  • Build API: /backend api "Teams CRUD"
```

### `/backend api`

Build REST API endpoints.

```bash
/backend api "API description"

# Examples
/backend api "Teams CRUD operations"
/backend api "Pattern search with filters"
/backend api "User profile update"
```

**What happens:**

```
🔧 Backend Agent: Building "Teams CRUD API"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 API Planning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking database schema...
✓ Found teams table schema
✓ Found RLS policies
✓ Generated TypeScript types

Endpoints to create:
  • POST /api/teams - Create team
  • GET /api/teams - List user's teams
  • GET /api/teams/:id - Get team details
  • PATCH /api/teams/:id - Update team
  • DELETE /api/teams/:id - Soft delete team
  • POST /api/teams/:id/invite - Invite member
  • POST /api/teams/:id/accept - Accept invitation

Stack:
  • Next.js 14 Route Handlers
  • Supabase Client (server-side)
  • Zod validation
  • TypeScript strict mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating apps/web/app/api/teams/route.ts...

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Database } from '@/types/supabase';

// Validation schemas
const createTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Team name can only contain letters, numbers, spaces, and hyphens'),
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});

type CreateTeamInput = z.infer<typeof createTeamSchema>;

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data: CreateTeamInput = validationResult.data;

    // Generate URL-safe slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create team
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert({
        name: data.name,
        slug,
        owner_id: user.id,
        description: data.description,
        avatar_url: data.avatar_url,
      })
      .select()
      .single();

    if (createError) {
      // Handle duplicate slug
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A team with this name already exists' },
          { status: 409 }
        );
      }

      console.error('Failed to create team:', createError);
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      );
    }

    // Add owner as member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Failed to add owner as member:', memberError);
      // Team created but owner not added - should rarely happen
      // RLS will still allow owner access via owner_id
    }

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/teams - List user's teams
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 100);

    // Build query with RLS automatically filtering by user
    let query = supabase
      .from('teams')
      .select(`
        id,
        name,
        slug,
        avatar_url,
        description,
        created_at,
        owner_id,
        team_members!inner(user_id, role)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: teams, error: queryError } = await query;

    if (queryError) {
      console.error('Failed to fetch teams:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    // Format response with member count and user's role
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      avatar_url: team.avatar_url,
      description: team.description,
      created_at: team.created_at,
      member_count: team.team_members.length,
      role: team.team_members.find(m => m.user_id === user.id)?.role || 'member',
      is_owner: team.owner_id === user.id,
    }));

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error('Unexpected error in GET /api/teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

Creating apps/web/app/api/teams/[id]/route.ts...

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Database } from '@/types/supabase';

const updateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});

// GET /api/teams/:id - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members!inner(
          id,
          user_id,
          role,
          joined_at,
          profiles:user_id(username, avatar_url)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error in GET /api/teams/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teams/:id - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate
    const body = await request.json();
    const validationResult = updateTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Update team (RLS ensures only owner can update)
    const { data: team, error } = await supabase
      .from('teams')
      .update(validationResult.data)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
      }
      console.error('Failed to update team:', error);
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error in PATCH /api/teams/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/:id - Soft delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete (RLS ensures only owner can delete)
    const { error } = await supabase
      .from('teams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to delete team:', error);
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/teams/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ API Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Endpoints Created: 5
  ✓ POST /api/teams (create team)
  ✓ GET /api/teams (list teams with pagination)
  ✓ GET /api/teams/:id (get team details)
  ✓ PATCH /api/teams/:id (update team)
  ✓ DELETE /api/teams/:id (soft delete)

Security:
  ✓ Authentication required on all endpoints
  ✓ RLS policies enforce data isolation
  ✓ Input validation with Zod
  ✓ SQL injection protected (Supabase client)

Features:
  ✓ Pagination support (offset/limit)
  ✓ Search functionality
  ✓ Error handling (400, 401, 404, 409, 500)
  ✓ TypeScript types from database
  ✓ Proper status codes

Performance:
  ✓ Single database queries (no N+1)
  ✓ Index-optimized queries
  ✓ Efficient joins with select()

Next Steps:
  • Add rate limiting: /backend fix "Add rate limiting"
  • Add audit logging: /backend fix "Add audit logs"
  • Write tests: /qa write "Teams API"
```

### `/backend fix`

Fix backend issues or optimize existing code.

```bash
/backend fix "Issue description"

# Examples
/backend fix "Add rate limiting to Teams API"
/backend fix "Optimize pattern search query"
/backend fix "Fix N+1 query in dashboard"
```

### `/backend optimize`

Optimize database queries and performance.

```bash
/backend optimize "Query or endpoint"

# Examples
/backend optimize "Pattern search"
/backend optimize "/api/dashboard/stats"
/backend optimize "Slow RLS policies"
```

## MCP Tools Used

The Backend Agent uses:

- `ekkOS_Search` - Find similar API patterns and schemas
- `ekkOS_IndexSchema` - Index database schemas
- `ekkOS_GetSchema` - Get table schemas for queries
- `ekkOS_Codebase` - Search existing API implementations
- `ekkOS_Forge` - Save new API patterns
- `supabase_list_tables` - List database tables
- `supabase_execute_sql` - Execute SQL queries
- `supabase_apply_migration` - Apply database migrations
- `supabase_generate_typescript_types` - Generate types
- `Read` - Read existing code
- `Edit` - Update code
- `Write` - Create new files
- `Bash` - Run Supabase CLI commands

## Best Practices

### Always Use RLS

```sql
-- ✅ Good: RLS enabled with proper policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their teams"
  ON public.teams
  FOR SELECT
  USING (owner_id = auth.uid());

-- ❌ Bad: No RLS (security risk!)
CREATE TABLE public.teams (...);
-- Missing: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
```

### Validate All Inputs

```typescript
// ✅ Good: Zod validation
const schema = z.object({
  name: z.string().min(3).max(50),
});

const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}

// ❌ Bad: No validation
const { name } = await request.json();
// Direct use without validation - security risk!
```

### Use Proper Indexes

```sql
-- ✅ Good: Indexes on query columns
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);

-- ❌ Bad: No indexes on queried columns
-- Will cause slow queries at scale
```

## Troubleshooting

### RLS Policy Blocking Queries

**Problem:** Query returns empty results unexpectedly
**Check:** RLS policies with `EXPLAIN` in Supabase
**Fix:** Agent reviews and adjusts policies

### Slow Queries

**Problem:** API endpoint timing out
**Check:** `EXPLAIN ANALYZE` on query
**Fix:** Agent adds indexes or optimizes query

---

## Summary

The Backend Agent is your API and database expert that:

✅ **Schemas** - Database design with RLS and indexes
✅ **APIs** - REST endpoints with validation
✅ **Security** - RLS policies and auth checks
✅ **Optimization** - Query performance tuning

**Ship secure, scalable APIs.**

```bash
/backend schema "Your feature here"
```

---

**Build secure. Scale smart. Ship fast.** 🔧
