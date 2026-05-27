import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public VAPID key the browser needs to subscribe. Safe to expose.
export async function GET() {
  return NextResponse.json({
    configured: pushConfigured(),
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
  });
}
