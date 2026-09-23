import { requireRole } from "@/lib/auth";
import AppShell from "@/components/app-shell";

export default async function InterpreterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole([
    "student_interpreter",
    "mentor_interpreter",
    "interpreter",
  ]);
  return <AppShell profile={profile}>{children}</AppShell>;
}
