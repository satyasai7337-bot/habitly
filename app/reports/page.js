import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import Reports from "@/components/Reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell name={user.name} avatar={user.avatar}>
      <Reports />
    </AppShell>
  );
}
