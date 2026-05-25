import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { recommendTargets } from "@/lib/ml/targetModel";

export const runtime = "nodejs";

// Returns ML-recommended daily targets for the logged-in user, derived from
// their profile (age, sex, weight, height) via the trained regression models.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = {
    age: user.age,
    sex: user.sex,
    bodyWeight: user.bodyWeight,
    height: user.height,
  };

  const hasProfile =
    user.age != null && user.bodyWeight != null && user.height != null && user.sex != null;

  const recommendations = recommendTargets(profile, user.habits || []);

  return NextResponse.json({
    profileComplete: hasProfile,
    profile,
    recommendations,
  });
}
