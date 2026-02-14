import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "polls.json");

async function ensureStore() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(STORE_PATH);
    } catch {
      await fs.writeFile(
        STORE_PATH,
        JSON.stringify({ polls: {}, votes: {} }, null, 2),
      );
    }
  } catch (err) {
    console.error("Storage init error", err);
  }
}

export async function POST(request: Request) {
  await ensureStore();
  try {
    const body = await request.json();
    const { id, question, choices } = body;
    if (!id || !question || !Array.isArray(choices)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const store = JSON.parse(raw || '{"polls":{},"votes":{}}');

    if (!store.polls[id]) {
      store.polls[id] = {
        id,
        question,
        options: choices.map((text: string, idx: number) => ({
          id: idx,
          text,
          count: 0,
        })),
        timestamp: Date.now(),
        totalVotes: 0,
      };

      store.votes[id] = {
        sessionVotes: {},
        deviceVotes: {},
        recentActivity: [],
      };

      await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("POST /api/polls error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  await ensureStore();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const store = JSON.parse(raw || '{"polls":{},"votes":{}}');
    // Return list of polls (lightweight)
    return NextResponse.json({ polls: store.polls });
  } catch (err) {
    console.error("GET /api/polls error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}