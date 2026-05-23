import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import TopNav from "@/components/TopNav";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-cream">
      <TopNav name={user.name} />
      <Dashboard user={user} />
    </div>
  );
}
