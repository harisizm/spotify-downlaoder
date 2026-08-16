import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getDatabase(): Promise<Db | null> {
  // If no URI or contains placeholder <db_password>, skip database gracefully
  if (!uri || uri.includes("<db_password>")) {
    return null;
  }

  try {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      clientPromise = client.connect();
    }
    const connectedClient = await clientPromise;
    return connectedClient.db("pasooriizm");
  } catch (error) {
    console.warn("MongoDB connection failed (falling back to local telemetry):", error);
    return null;
  }
}
