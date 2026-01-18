# Frontend Agent

**ADMIN ONLY** - AI Frontend Developer specialized in React, Next.js 14+, TypeScript, Tailwind CSS, and modern UI patterns. Builds components, pages, and handles client-side logic.

## Overview

The Frontend Agent is your React expert. It:
- Builds UI components following design system
- Creates Next.js pages with proper routing
- Implements state management (React Query, Zustand)
- Ensures accessibility (WCAG 2.1 AA)
- Optimizes performance (code splitting, lazy loading)
- Follows ekkOS component patterns

## Commands

### `/frontend build`

Build a new component, page, or feature.

```bash
/frontend build "Component/page description"

# Examples
/frontend build "Teams dashboard page"
/frontend build "Pattern card component"
/frontend build "User settings form with validation"
```

**What happens:**

```
🎨 Frontend Agent: Building "Teams Dashboard Page"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Planning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Searching existing patterns...
✓ Found 3 similar dashboard components
✓ Found Teams API schema
✓ Checked design system (components/ui/*)

Component Breakdown:
  • Layout wrapper (app layout)
  • Teams list with search/filter
  • Team card component
  • Create team modal
  • Empty state

Stack:
  • Next.js 14 App Router
  • TypeScript (strict mode)
  • Tailwind CSS + Shadcn/ui
  • React Query for data fetching
  • Zod for validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating app/teams/page.tsx...

```typescript
import { Suspense } from 'react';
import { Metadata } from 'next';
import { TeamsHeader } from '@/components/teams/TeamsHeader';
import { TeamsList } from '@/components/teams/TeamsList';
import { CreateTeamButton } from '@/components/teams/CreateTeamButton';
import { PageContainer } from '@/components/layout/PageContainer';

export const metadata: Metadata = {
  title: 'Teams | ekkOS',
  description: 'Manage your teams and collaborate with others',
};

export default async function TeamsPage() {
  return (
    <PageContainer>
      <TeamsHeader>
        <CreateTeamButton />
      </TeamsHeader>

      <Suspense fallback={<TeamsListSkeleton />}>
        <TeamsList />
      </Suspense>
    </PageContainer>
  );
}
```

Creating components/teams/TeamsList.tsx...

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TeamCard } from './TeamCard';
import { TeamsEmptyState } from './TeamsEmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';

interface Team {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  role: 'owner' | 'admin' | 'member';
}

export function TeamsList() {
  const [search, setSearch] = useState('');

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams', search],
    queryFn: async () => {
      const response = await fetch(
        `/api/teams?search=${encodeURIComponent(search)}`
      );
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json() as Promise<Team[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-3 text-sm text-gray-500">Loading teams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-sm font-medium text-red-800">
          Failed to load teams
        </h3>
        <p className="mt-1 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return <TeamsEmptyState onCreateTeam={() => {/* handled by modal */}} />;
  }

  return (
    <div className="space-y-6">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search teams..."
        className="max-w-md"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
```

Creating components/teams/TeamCard.tsx...

```typescript
'use client';

import Link from 'next/link';
import { Users, Crown, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    memberCount: number;
    createdAt: string;
    role: 'owner' | 'admin' | 'member';
  };
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: Users,
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export function TeamCard({ team }: TeamCardProps) {
  const RoleIcon = roleIcons[team.role];

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="group hover:border-blue-300 hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="group-hover:text-blue-600 transition-colors">
              {team.name}
            </CardTitle>
            <Badge variant={team.role === 'owner' ? 'default' : 'secondary'}>
              <RoleIcon className="mr-1 h-3 w-3" />
              {roleLabels[team.role]}
            </Badge>
          </div>

          <CardDescription>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
              </span>
              <span>
                Created {formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
```

Creating components/teams/CreateTeamButton.tsx...

```typescript
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreateTeamModal } from './CreateTeamModal';

export function CreateTeamButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Team
      </Button>

      <CreateTeamModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

Creating components/teams/CreateTeamModal.tsx...

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';

const createTeamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Team name can only contain letters, numbers, spaces, and hyphens'),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create team');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created successfully');
      reset();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create team');
    },
  });

  const onSubmit = (data: CreateTeamForm) => {
    createTeamMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a team to collaborate with others on patterns and projects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Engineering Team"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTeamMutation.isPending}>
              {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Build Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Created: 6
  ✓ app/teams/page.tsx (main page)
  ✓ components/teams/TeamsList.tsx (list component)
  ✓ components/teams/TeamCard.tsx (card component)
  ✓ components/teams/CreateTeamButton.tsx (button)
  ✓ components/teams/CreateTeamModal.tsx (modal)
  ✓ components/teams/TeamsEmptyState.tsx (empty state)

Features Implemented:
  ✅ Server-side rendering (Next.js 14)
  ✅ Client-side data fetching (React Query)
  ✅ Search functionality
  ✅ Form validation (Zod)
  ✅ Error handling
  ✅ Loading states
  ✅ Empty states
  ✅ Responsive design (mobile-first)
  ✅ Accessibility (ARIA labels, keyboard nav)
  ✅ TypeScript strict mode

Performance:
  ✅ Code splitting (client components)
  ✅ Optimistic updates on mutations
  ✅ Automatic query invalidation
  ✅ Suspense boundaries

Next Steps:
  • Add tests: /qa write "Teams UI"
  • Review code: /lead review frontend
  • Deploy to staging: /deploy execute apps/web --env staging
```

### `/frontend fix`

Fix bugs or issues in existing components.

```bash
/frontend fix "Issue description"

# Examples
/frontend fix "Teams list not paginating properly"
/frontend fix "Modal not closing on mobile"
/frontend fix "Add optimistic updates to team creation"
```

**What happens:**

```
🎨 Frontend Agent: Fixing "Teams list not paginating"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Analyzing Issue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reading components/teams/TeamsList.tsx...

Issue Found:
  • Using client-side filtering only
  • No pagination implementation
  • Will break at scale (100+ teams)

Root Cause:
  • API returns all teams at once
  • No cursor/offset pagination
  • Frontend doesn't request pages

Fix Strategy:
  1. Update API to support pagination
  2. Add infinite scroll to UI
  3. Use React Query's useInfiniteQuery

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Implementing Fix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Updating components/teams/TeamsList.tsx...

```typescript
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { TeamCard } from './TeamCard';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SIZE = 12;

export function TeamsList() {
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['teams'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `/api/teams?offset=${pageParam}&limit=${PAGE_SIZE}`
      );
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return pages.length * PAGE_SIZE;
    },
  });

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const teams = data?.pages.flatMap((page) => page) ?? [];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>

      {/* Intersection observer target */}
      <div ref={observerTarget} className="flex justify-center py-4">
        {isFetchingNextPage && <Spinner />}
      </div>

      {!hasNextPage && teams.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          All teams loaded
        </p>
      )}
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fix Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes:
  ✓ Replaced useQuery with useInfiniteQuery
  ✓ Added Intersection Observer for infinite scroll
  ✓ Proper cleanup in useEffect
  ✓ Loading states for next pages
  ✓ "All loaded" message

Performance:
  ✓ Only loads 12 teams initially
  ✓ Loads next page when scrolling near bottom
  ✓ No unnecessary re-fetches

Note: Requires backend API update:
  Backend Agent should add pagination support to /api/teams
  Command: /backend fix "Add pagination to Teams API"

Testing:
  ✓ Manual test: Works with 100+ teams
  ✓ Network throttling: Smooth loading
  ✓ Mobile: Smooth scroll on touch devices
```

### `/frontend optimize`

Optimize performance of existing components.

```bash
/frontend optimize "Component name or path"

# Examples
/frontend optimize "Dashboard page"
/frontend optimize "Pattern search component"
/frontend optimize "app/teams/page.tsx"
```

**What happens:**

```
🎨 Frontend Agent: Optimizing "Dashboard Page"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Performance Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing app/dashboard/page.tsx...

Current Metrics:
  • Initial Load: 2.1s (🔴 Slow)
  • First Contentful Paint: 1.8s
  • Time to Interactive: 2.3s
  • Bundle Size: 245 KB (🟡 Large)

Issues Found:
  1. 🔴 All components loaded eagerly (no code splitting)
  2. 🟡 Large chart library (recharts) in main bundle
  3. 🟡 No memoization on expensive calculations
  4. 🟢 Images already optimized (next/image)

Optimization Plan:
  1. Lazy load chart components
  2. Memoize pattern stats calculation
  3. Defer non-critical data fetching
  4. Add loading skeletons

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Implementing Optimizations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Updating app/dashboard/page.tsx...

```typescript
import { Suspense, lazy } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

// Lazy load heavy components
const PatternChart = lazy(() => import('@/components/dashboard/PatternChart'));
const RecentActivity = lazy(() => import('@/components/dashboard/RecentActivity'));

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* Load immediately (small, critical) */}
      <QuickStats />

      {/* Lazy load with suspense (large, non-critical) */}
      <Suspense fallback={<DashboardSkeleton variant="chart" />}>
        <PatternChart />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton variant="list" />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
```

Updating components/dashboard/QuickStats.tsx...

```typescript
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/StatCard';

export function QuickStats() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Memoize expensive calculations
  const metrics = useMemo(() => {
    if (!stats) return null;

    return {
      totalPatterns: stats.patterns.length,
      successRate: calculateSuccessRate(stats.patterns),
      avgResponseTime: calculateAvgResponseTime(stats.patterns),
      topTags: findTopTags(stats.patterns, 5),
    };
  }, [stats]);

  if (!metrics) return <QuickStatsSkeleton />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Patterns"
        value={metrics.totalPatterns}
        trend="+12%"
      />
      <StatCard
        title="Success Rate"
        value={`${metrics.successRate}%`}
        trend="+5%"
      />
      {/* ... more stats */}
    </div>
  );
}

// Memoize calculation functions
const calculateSuccessRate = (patterns: Pattern[]) => {
  const successful = patterns.filter(p => p.outcome === 'success').length;
  return Math.round((successful / patterns.length) * 100);
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Optimization Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes:
  ✓ Lazy loaded PatternChart (-180 KB from initial bundle)
  ✓ Lazy loaded RecentActivity (-45 KB from initial bundle)
  ✓ Memoized expensive calculations
  ✓ Added query staleTime caching
  ✓ Added loading skeletons

Performance Improvements:
  Initial Load: 2.1s → 0.9s (57% faster) ✅
  FCP: 1.8s → 0.7s ✅
  TTI: 2.3s → 1.1s ✅
  Bundle Size: 245 KB → 20 KB initial (225 KB lazy loaded) ✅

Lighthouse Score:
  Performance: 72 → 96 (+24 points) 🎉
  Best Practices: 100 → 100
  Accessibility: 95 → 95
  SEO: 100 → 100

Next Steps:
  • Test on slow 3G: Verify loading experience
  • Monitor Core Web Vitals in production
  • Consider adding service worker for offline support
```

### `/frontend review`

Review component code quality and suggest improvements.

```bash
/frontend review "Component path"

# Examples
/frontend review "components/teams/TeamsList.tsx"
/frontend review "app/teams/**"
```

## MCP Tools Used

The Frontend Agent uses:

- `ekkOS_Search` - Find similar UI patterns and components
- `ekkOS_Codebase` - Search existing component implementations
- `ekkOS_IndexSchema` - Get TypeScript types for props
- `ekkOS_GetSchema` - Verify API response shapes
- `ekkOS_Forge` - Save new component patterns
- `Read` - Read existing component files
- `Edit` - Update components
- `Write` - Create new components
- `Glob` - Find related component files
- `Grep` - Search for component usage

## Best Practices

### Follow ekkOS Component Patterns

The agent follows established patterns:

```typescript
// ✅ Good: Follows ekkOS patterns
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';

export function TeamsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });

  // Proper error handling
  if (error) return <ErrorState error={error} />;

  // Proper loading state
  if (isLoading) return <Skeleton />;

  return <div>{/* ... */}</div>;
}
```

```typescript
// ❌ Bad: Missing error handling
export function TeamsList() {
  const { data } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  return <div>{data.map(/* ... */)}</div>; // Will crash if data is undefined
}
```

### Use Design System Components

```typescript
// ✅ Good: Uses Shadcn/ui components
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ❌ Bad: Custom styling inline
<button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">
  Click me
</button>
```

### Ensure Accessibility

```typescript
// ✅ Good: Accessible
<button
  onClick={handleClick}
  aria-label="Close modal"
  aria-pressed={isPressed}
>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</button>

// ❌ Bad: Not accessible
<div onClick={handleClick}>
  <X />
</div>
```

## Integration with Other Agents

Frontend Agent works closely with:

- **Backend Agent** - Consumes APIs, validates response shapes
- **QA Agent** - Receives component tests
- **Tech Lead** - Gets assignments and reviews

## Troubleshooting

### Component Not Rendering

**Problem:** Component shows blank or errors
**Check:** Browser console for React errors
**Fix:** Agent reviews component and fixes issues

### Styling Not Applied

**Problem:** Tailwind classes not working
**Check:** Verify classes in tailwind.config.ts
**Fix:** Agent updates config or uses correct classes

### State Not Updating

**Problem:** React Query data stale
**Check:** Query invalidation logic
**Fix:** Agent adds proper invalidation

---

## Summary

The Frontend Agent is your React expert that:

✅ **Builds** - Components, pages, and features
✅ **Fixes** - Bugs and UI issues
✅ **Optimizes** - Performance and bundle size
✅ **Reviews** - Code quality and patterns

**Ship beautiful UIs faster.**

```bash
/frontend build "Your component here"
```

---

**Build fast. Look good. Work everywhere.** 🎨
