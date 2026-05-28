import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getHealthPlanHistory } from "@/lib/store";

export const runtime = "nodejs";

// History of uploaded reports with extracted lab values, oldest first.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const history = await getHealthPlanHistory(user.id, 30);
    // Strip the full plan to keep the payload small for charting.
    const points = history.map((h) => ({
      id: h.id,
      date: h.reportDate || h.createdAt?.slice(0, 10),
      labs: h.labs || {},
      conditions: h.plan?.conditions || [],
    }));
    return NextResponse.json({ points });
  } catch (err) {
    // Table not migrated yet — return empty so the UI just hides.
    return NextResponse.json({ points: [] });
  }
}
