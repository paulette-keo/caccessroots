# Deploying CAccessRoots — browser-only walkthrough

You'll spend about 60–90 minutes the first time. Everything happens in your
web browser. You don't need to install anything on your computer.

You'll create four free accounts along the way:

- **GitHub** — where the project code lives
- **Supabase** — the database and login system
- **Mapbox** — the maps and the address-to-location lookups
- **Vercel** — what actually runs the website on the internet

All four have generous free tiers. You won't be asked for a credit card to do
anything in this guide.

---

## Step 1 — Download the project as a ZIP

The whole project is in the folder this file came from. If you don't already
have it as a ZIP file, ask me and I'll generate one for you.

When you have the ZIP, **unzip it** (double-click on Mac). You'll get a folder
called `probono-platform` with about 60 files inside. Keep it somewhere easy
to find, like your Desktop. You'll need to drag-and-drop these files in
Step 4.

---

## Step 2 — Create a Supabase project (the database)

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up with GitHub or email. (If you sign up with GitHub, you'll create
   your GitHub account in Step 4 — or come back here after Step 4.)
3. Click **New project**.
4. Name it `caccessroots`. Set a strong **database password** and write it
   down somewhere safe (a password manager is best).
5. Pick a region close to where your users will be (e.g. `East US`).
6. Click **Create new project**. It takes ~2 minutes to provision.

While it's provisioning, open **Project Settings → API** (gear icon, bottom
left). You'll see three values you'll need later. Copy each to a temporary
document (a sticky note app works fine):

- **Project URL** — looks like `https://abcd1234.supabase.co`
- **anon public key** — long string starting with `eyJ...`
- **service_role key** — another long string starting with `eyJ...` *(treat
  this one like a password — never paste it into anything public)*

### Run the database setup

1. In your Supabase project's left sidebar, click **SQL Editor**.
2. Click **+ New query**.
3. Open the `supabase/migrations` folder in the project.
4. Starting with `0001_initial_schema.sql`, copy the **entire contents** of
   each numbered SQL file.
5. Paste each file into a fresh Supabase SQL Editor query and click **Run**.
   Wait for the green "Success" message before moving to the next file.
6. Continue in number order through the newest migration. Do not skip files;
   later workflow and security changes depend on the earlier migrations.

That's the entire database set up — tables, security policies, the matching
engine, the audit log, everything.

### Allow your eventual production URL

You'll come back to this after Vercel gives you a URL, but you can do it now
while you're here:

1. Open **Authentication → URL Configuration**.
2. In **Site URL**, put `http://localhost:3000` for now (we'll update it later).
3. In **Redirect URLs** add both:
   - `http://localhost:3000/auth/callback`
   - (You'll add a Vercel one after Step 5.)

---

## Step 3 — Get a Mapbox token (the maps)

1. Go to **https://account.mapbox.com/auth/signup/**.
2. Sign up with email. You don't need to add a credit card.
3. After signing in, you'll see a **Default public token** on your dashboard.
   It starts with `pk.`
4. Copy that token to your sticky note. Label it `MAPBOX_TOKEN`.

That's it for Mapbox. They give you a generous free tier (50,000 map loads
per month).

---

## Step 4 — Put the project on GitHub

GitHub is where code lives. Vercel will pull the code from GitHub to run your
site.

1. Go to **https://github.com/signup** and create an account if you don't
   have one. The free plan is fine.
2. Once you're signed in, look at the top-right and click the **+** icon →
   **New repository**.
3. Repository name: `caccessroots`.
4. Description: "CAccessRoots — pro bono interpreter scheduling."
5. Choose **Private** (recommended) or Public — your call.
6. **Do NOT** check "Add a README" or "Add .gitignore" — the project already
   has those.
7. Click **Create repository**.

You'll land on a mostly empty page. Look for the link that says
**uploading an existing file** (in the middle of the page). Click it.

8. Drag the **entire contents** of the unzipped `probono-platform` folder
   into the upload area. (Select all the files and folders inside the folder —
   don't drag the folder itself, drag what's inside it.)
9. Wait for the upload to finish (the green progress bars).
10. Scroll to the bottom. In the **Commit changes** box, type
    `Initial commit`. Click **Commit changes**.

Your code is now on GitHub.

---

## Step 5 — Deploy to Vercel

1. Go to **https://vercel.com/signup**.
2. Click **Continue with GitHub** and authorize Vercel to access your GitHub.
3. Once you're in, click **Add New… → Project**.
4. Find `caccessroots` in your repository list and click **Import**.
5. Vercel will detect it's a Next.js project automatically. Don't change
   any build settings.
6. Expand **Environment Variables**. You'll add five:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (from Supabase, the Project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from Supabase, the anon public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase, the service_role key) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | (from Mapbox, the pk. token) |
| `NEXT_PUBLIC_APP_URL` | leave empty for now, we'll fill after deploy |

7. Click **Deploy**. It takes ~2 minutes.

When it's done, Vercel gives you a URL like `caccessroots.vercel.app`.

### Tell Supabase about your live site

1. Go back to Supabase → **Authentication → URL Configuration**.
2. **Site URL**: change to `https://caccessroots.vercel.app` (or whatever
   Vercel gave you).
3. **Redirect URLs**: add `https://caccessroots.vercel.app/auth/callback`.
   Keep the localhost one too.
4. Click **Save**.

### Tell Vercel its own URL

1. In Vercel, open your project → **Settings → Environment Variables**.
2. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g.
   `https://caccessroots.vercel.app`).
3. Go to **Deployments** → click the **⋯** menu on the latest deploy →
   **Redeploy**.

---

## Step 6 — Make yourself the first admin

Out of the box, anyone who signs up as a coordinator or admin lands in a
"pending review" state that requires an admin to approve. The first admin
has to be created by hand. This is a five-minute one-time setup.

1. Open your live site (`https://caccessroots.vercel.app`).
2. Click **Get started** → sign up. Pick any role (it doesn't matter).
3. Use **your real email** — Supabase will send you a confirmation link.
4. Confirm the email.
5. Now in **Supabase → SQL Editor**, run this query (replacing the email
   with your own):

```sql
update profiles
   set role = 'admin', status = 'active'
 where email = 'you@example.com';
```

6. Sign out of CAccessRoots and sign back in. You'll land on the admin
   dashboard.

From this point forward, every new admin or coordinator has to go through
the approvals queue with a second-key requirement. That's the whole reason
this manual step exists — to prevent anyone from quietly granting themselves
admin access through the normal sign-up flow.

---

## Things to know after you ship

**Capacity and upgrade triggers (checked September 2026).** The app no longer
accepts introduction-video uploads; profile photos are capped at 5 MB and
professional/practicum pages are stored as links. Supabase Free currently
includes 500 MB of database data, 1 GB of file storage, 50,000 monthly active
users, and 5 GB each of cached and uncached egress. Supabase Pro starts at
$25/month and is the sensible upgrade before the database, storage, or egress
allowance is consistently close to full, or when the pilot needs automatic
backups and a project that will not pause after inactivity. Vercel Hobby is
intended for personal, non-commercial use; use the Vercel plan shown in the
KEO workspace. Its current included usage includes 100 GB of Fast Data
Transfer, 4 active CPU hours, and 1,000,000 function invocations. Move to Pro
for organizational production use, team collaboration, or higher usage.
Vercel Pro currently has a $20/month platform fee with one deploying team seat
included. Check the [Supabase pricing page](https://supabase.com/pricing),
[Vercel plan page](https://vercel.com/docs/plans), and both usage dashboards
monthly because limits and prices can change.

**Updating the code.** If you want to make a change (text, color, anything),
tell me what you want changed. I'll update the code. Then in GitHub's web
interface, find the file, click the pencil-edit icon, paste in the new
contents, commit. Vercel auto-deploys within a minute.

**Backups.** Supabase Free does not include automatic database backups. Before
the pilot, either move the production project to a plan with backups or create
and test a documented manual export routine. Do not assume a backup exists
until a restore has been tested.

**Custom domain.** If you want `caccessroots.org` instead of
`caccessroots.vercel.app`, buy the domain (Namecheap, Cloudflare, etc.) and
point it at Vercel: Vercel → your project → **Settings → Domains → Add**.
Vercel walks you through the DNS settings.

---

## Stuck?

Tell me where in the walkthrough you are, what you see on your screen, and
any error message. I'll get you unstuck.
