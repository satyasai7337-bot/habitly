import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setUserAvatar } from "@/lib/store";

export const runtime = "nodejs";

const MAX_LEN = 400_000; // ~300 KB image as a data URL

// Set the user's profile picture (an image data URL, resized client-side).
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { avatar } = await req.json();
    if (typeof avatar !== "string" || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(avatar)) {
      return NextResponse.json({ error: "Invalid image." }, { status: 400 });
    }
    if (avatar.length > MAX_LEN) {
      return NextResponse.json({ error: "Image too large." }, { status: 413 });
    }
    await setUserAvatar(user.id, avatar);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("avatar POST error:", err);
    return NextResponse.json({ error: "Could not save photo." }, { status: 500 });
  }
}

// Remove the profile picture.
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    await setUserAvatar(user.id, null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("avatar DELETE error:", err);
    return NextResponse.json({ error: "Could not remove photo." }, { status: 500 });
  }
}
