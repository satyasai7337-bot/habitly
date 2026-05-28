import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import VitalsTracker from "@/components/VitalsTracker";

export const dynamic = "force-dynamic";

export default async function VitalsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell name={user.name} avatar={user.avatar}>
      <VitalsTracker />
    </AppShell>
  );
}
