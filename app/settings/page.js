import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import Settings from "@/components/Settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell name={user.name} avatar={user.avatar}>
      <Settings initialUser={user} />
    </AppShell>
  );
}
