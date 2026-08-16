import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Generate a simple timed auth token
    const token = Buffer.from(`admin_auth_${Date.now()}_${Math.random()}`).toString("base64");

    return NextResponse.json({ success: true, token });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
