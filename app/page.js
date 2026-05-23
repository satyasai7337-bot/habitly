import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Site root goes straight to the login page. Returning users with a valid
// session skip ahead to their dashboard. The marketing page lives at /welcome.
export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
