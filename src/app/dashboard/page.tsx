import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardRouter() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/sign-in");
  }

  if (profile.status === "pending" && profile.role !== "requestor") {
    redirect("/pending-approval");
  }

  switch (profile.role) {
    case "admin":
      redirect("/admin");

    case "coordinator":
      redirect("/coordinator");

    case "student_interpreter":
    case "mentor_interpreter":
    case "interpreter":
      redirect("/interpreter");

    case "requestor":
    default:
      redirect("/requestor");
  }
}
