import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInterpreterPhotoUrl } from "@/lib/interpreter-photos";
import { userRoleLabel } from "@/lib/types";
import {
  setUserStatusAction,
  requestRoleEscalationAction,
} from "./actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    role?: string;
  };
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("profiles")
    .select(
      "id,full_name,email,role,status,created_at,interp:interpreter_profiles(profile_photo_path)"
    );

  if (searchParams?.status) {
    query = query.eq(
      "status",
      searchParams.status
    );
  }

  if (searchParams?.role) {
    query = query.eq("role", searchParams.role);
  }

  query = query.order("created_at", {
    ascending: false,
  });

  const { data: users } = await query;

  const usersWithPhotos = await Promise.all(
    (users ?? []).map(async (user: any) => ({
      ...user,
      profilePhotoUrl:
        await createInterpreterPhotoUrl(
          supabase,
          user.interp?.profile_photo_path
        ),
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Users
          </h1>

          <p className="text-ink-muted mt-1">
            Vet, suspend, reactivate, or propose
            promotions.
          </p>
        </div>

        <div className="flex gap-2 text-sm">
          <FilterLink
            label="All"
            href="/admin/users"
          />

          <FilterLink
            label="Pending"
            href="/admin/users?status=pending"
          />

          <FilterLink
            label="Active"
            href="/admin/users?status=active"
          />

          <FilterLink
            label="Suspended"
            href="/admin/users?status=suspended"
          />
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">
                Status
              </th>
              <th className="px-4 py-2">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {usersWithPhotos.map((u: any) => (
              <tr
                key={u.id}
                className="border-t border-slate-100"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.profilePhotoUrl ? (
                      <img
                        src={u.profilePhotoUrl}
                        alt={`${u.full_name} profile`}
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-ink-muted">
                        {u.full_name
                          ?.charAt(0)
                          ?.toUpperCase() ?? "U"}
                      </div>
                    )}

                    <div>
                      <p className="font-medium">
                        {u.full_name}
                      </p>

                      <p className="text-xs text-ink-muted">
                        {u.email}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 capitalize">
                  {userRoleLabel(u.role)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`badge capitalize ${
                      u.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : u.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {u.status !== "active" && (
                      <form
                        action={setUserStatusAction}
                        className="flex gap-1"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={u.id}
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="active"
                        />

                        <input
                          name="reason"
                          className="input text-xs py-1 max-w-[160px]"
                          placeholder="Reason"
                          required
                        />

                        <button className="btn-primary text-xs py-1 px-2">
                          Activate
                        </button>
                      </form>
                    )}

                    {u.status === "active" && (
                      <form
                        action={setUserStatusAction}
                        className="flex gap-1"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={u.id}
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="suspended"
                        />

                        <input
                          name="reason"
                          className="input text-xs py-1 max-w-[160px]"
                          placeholder="Reason"
                          required
                        />

                        <button className="btn-danger text-xs py-1 px-2">
                          Suspend
                        </button>
                      </form>
                    )}

                    <form
                      action={
                        requestRoleEscalationAction
                      }
                      className="flex gap-1"
                    >
                      <input
                        type="hidden"
                        name="profile_id"
                        value={u.id}
                      />

                      <select
                        name="new_role"
                        className="input text-xs py-1"
                      >
                        <option value="coordinator">
                          → Coordinator
                        </option>

                        <option value="admin">
                          → Admin
                        </option>
                      </select>

                      <button className="btn-secondary text-xs py-1 px-2">
                        Propose
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1 rounded-lg border border-slate-200 text-ink-muted hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}
