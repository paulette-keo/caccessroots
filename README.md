# CAccessRoots

**Communication. Access. Roots.**

An independent, community-led pro bono scheduling platform connecting Deaf community members
with volunteer interpreters for the moments that matter. Built with Next.js 14
(App Router) and Supabase (Postgres + PostGIS + Auth + RLS), with Mapbox for
geo intelligence.

We're not here for money. We're here to provide access in the spaces that laws
and contracts don't reach.

## What it does

Five roles, each with their own dashboard.

**Requestor (Deaf community member).** Submit a request with event details and
an address. Mark it as Sensitive if the context is intimate (family, medical
with a minor, funeral, legal). Maintain a private conflict-of-interest
blocklist; interpreters on the list never see your request.

**Interpreter (volunteer).** Set your home address, service radius, languages,
modalities, and sign your pro bono commitment. See open requests within your
radius (filtered by the COI blocklist at the database level). Accept or
decline assignments coordinators release to you.

**Coordinator.** See the queue of open requests, click into one, see ranked
recommended interpreters with COI excluded, language match, radius check,
distance, workload, and a composite fit score. Propose an assignment. For
standard-sensitivity requests, the proposal goes straight to the interpreter
for accept/decline. For sensitive requests, the proposal goes to an admin for
release first.

**Admin.** Top-level oversight. Approve new interpreters and partner
communities. Release sensitive assignments. Suspend or reinstate users.
Propose and second-key role escalations. View the full audit log. Manage
partner communities.

**Partner Community Admin.** Scoped to their community. Vouch for community
members. See community activity at a high level.

## Why these design choices

**PostGIS at the database layer.** Geo is stored as `geography(point, 4326)`
which lets us compute distance in meters precisely (`ST_Distance`). The
matching engine is a single SQL function, `match_interpreters_for_request`,
that runs server-side with the COI hard filter, language overlap, modality
match, and a fit score. There's no client-side trust boundary to compromise.

**Row-level security on every table.** Authorization lives in the database.
Even if someone hits the API directly with an anon key, they cannot see a
requestor's blocklist, a sensitive request, or another user's profile.

**Sensitive-request guard at the database.** When a coordinator proposes an
assignment for a sensitive request, a trigger downgrades the status to
`pending_admin_release` regardless of how it was submitted. Admin must
explicitly release it before any interpreter is contacted.

**Two-key for role escalation.** Promoting someone to coordinator or admin
requires two different admin approvals — no one promotes themselves or a buddy
unilaterally.

**Audit log on everything.** Triggers fire on every change to profiles,
requests, assignments, blocklists, approvals, and communities. The log is
admin-readable only; no one (including admins) can write to or modify it
directly via the API.

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (public)                  # /, /sign-in, /sign-up
│   ├── auth/callback/route.ts    # Supabase magic-link / OAuth callback
│   ├── dashboard/                # role-aware redirect
│   ├── pending-approval/         # waiting-room for pending users
│   ├── requestor/                # Deaf requestor pages
│   ├── interpreter/              # Interpreter pages
│   ├── coordinator/              # Coordinator pages, including matching + map
│   ├── admin/                    # Admin: approvals, users, communities, audit
│   └── partner/                  # Partner community admin pages
├── components/                   # AppShell, CoordinatorMap, sign-out, etc.
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── auth.ts                   # session + role guards
│   ├── geocode.ts                # Mapbox geocoding + driving time
│   ├── types.ts                  # TS types mirroring the schema
│   └── utils.ts
└── middleware.ts                 # forwards session to server components

supabase/
└── migrations/
    ├── 0001_initial_schema.sql   # all tables, enums, RLS, audit, matching
    └── 0002_map_helpers.sql      # map RPCs + onboarding approval trigger
```

## Setup

### 1. Install

```bash
cd probono-platform
npm install
```

### 2. Create a Supabase project

Sign in at https://supabase.com, create a new project. From **Project Settings → API** you'll need:

- Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
- `anon` public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`, server-only — never expose)

In **Authentication → URL Configuration** add `http://localhost:3000/auth/callback` and your production URL.

### 3. Run the migrations

The easiest path: copy each file in `supabase/migrations/` into the Supabase
**SQL Editor** and run them in order. The migrations create PostGIS extensions,
all tables, enums, RLS policies, triggers, and the matching function.

If you use the Supabase CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

### 4. Get a Mapbox token

Sign up at https://account.mapbox.com and grab a default public token. Add it
to `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`.

### 5. Configure env

```bash
cp .env.local.example .env.local
# fill in the values
```

### 6. Run it

```bash
npm run dev
```

Visit http://localhost:3000.

## Seeding the first admin

The first admin has to be created manually because admin creation otherwise
requires admin approval (the chicken-and-egg).

1. Sign up at `/sign-up` and pick "I'm a volunteer interpreter" (any role works).
2. In the Supabase SQL editor, run:

```sql
update profiles
   set role = 'admin', status = 'active'
 where email = 'you@example.com';
```

3. Sign out and back in. You'll land at `/admin`.

From there, all subsequent admins come through the role-escalation workflow
with a second-key required.

## Deploy

**Vercel (recommended).** Push to GitHub, import into Vercel, paste the env
vars from `.env.local`, click Deploy. Set `NEXT_PUBLIC_APP_URL` to your
production URL and add it to Supabase Auth's redirect allow-list.

**Other hosts.** This is a standard Next.js 14 app. Anywhere that runs Node
works. The Supabase data layer is unchanged regardless of where the frontend
runs.

## What's intentionally not here yet

A handful of features were scoped out of the MVP. Each is easy to add on top:

- Email/SMS notifications when a request status changes (Resend, Twilio, or
  Supabase's outgoing email hooks).
- Travel-time isochrones overlaid on the coordinator map (Mapbox Isochrone API
  — `src/lib/geocode.ts` already includes `travelMinutes` you can extend).
- File attachments on requests (Supabase Storage with RLS).
- Mobile-responsive nav drawer.
- Calendar export of accepted assignments (.ics).

## Safety notes

This platform handles intimate moments in people's lives. Two things to keep
in mind when extending:

1. **Never let a coordinator or anyone but the requestor read a COI blocklist
   without an audited reason.** The RLS policies enforce this at the database
   level. Don't add a service-role bypass without thinking very carefully.

2. **Never widen visibility on sensitive requests.** The current model is that
   sensitive requests are invisible to interpreters until admin explicitly
   releases an assignment. The RLS policy `requests interpreter visible` is the
   guard. Don't relax it.

## License

Private project. All rights reserved.
