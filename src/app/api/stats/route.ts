import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ source: "local", events: [] });
    }

    const collection = db.collection("telemetry");
    const events = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      source: "mongodb",
      events: events.map(({ _id, ...rest }) => rest),
    });
  } catch (error) {
    return NextResponse.json({ source: "local", events: [], error: String(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ status: "stored_locally" });
    }

    const collection = db.collection("telemetry");
    await collection.insertOne({
      ...event,
      createdAt: new Date(),
    });

    return NextResponse.json({ status: "stored_in_mongodb" });
  } catch (error) {
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = await getDatabase();
    if (db) {
      const collection = db.collection("telemetry");
      await collection.deleteMany({});
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
