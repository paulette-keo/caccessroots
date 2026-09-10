import Link from "next/link";
import type { Profile, UserRole } from "@/lib/types";
import SignOutButton from "./sign-out-button";
import { Wordmark } from "./wordmark";

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  requestor: [
    { href: "/requestor", label: "Home" },
    { href: "/requestor/new-request", label: "New request" },
    { href: "/requestor/requests", label: "My requests" },
    { href: "/requestor/blocklist", label: "My blocklist" },
  ],

  interpreter: [
    { href: "/interpreter", label: "Home" },
    { href: "/interpreter/profile", label: "My profile" },
    { href: "/interpreter/assignments", label: "My assignments" },
  ],

  coordinator: [
    { href: "/coordinator", label: "Queue" },
    { href: "/coordinator/map", label: "Map" },
    { href: "/coordinator/interpreters", label: "Interpreters" },
  ],

  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/communities", label: "Communities" },
    { href: "/admin/audit-log", label: "Audit log" },
  ],
};

const HEADER_TONE: Record<UserRole, string> = {
  requestor: "bg-white border-b border-[#E5E7EB]",
  interpreter: "bg-white border-b border-[#E5E7EB]",
  coordinator: "bg-white border-b border-[#E5E7EB]",
  admin: "bg-white border-b border-[#E5E7EB]",
};

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const nav = NAV[profile.role];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className={HEADER_TONE[profile.role]}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* BRAND + ROLE */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 shrink-0"
          >
            <Wordmark size="md" href={null} />

            <span className="badge ml-1 capitalize bg-brand-50 text-brand-700">
              {profile.role.replace("_", " ")}
            </span>
          </Link>

          {/* NAVIGATION */}
          <nav
            aria-label="Dashboard navigation"
            className="hidden md:flex items-center gap-1"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#374151] transition hover:text-brand-700 hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* USER + SIGN OUT */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm hidden sm:inline text-[#6B7280]">
              {profile.full_name}
            </span>

            <SignOutButton variant="default" />
          </div>
        </div>

        {/* MOBILE NAV */}
        <nav
          aria-label="Mobile dashboard navigation"
          className="md:hidden border-t border-[#E5E7EB] px-4 py-2 overflow-x-auto"
        >
          <div className="flex items-center gap-1 min-w-max">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#374151] transition hover:text-brand-700 hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
