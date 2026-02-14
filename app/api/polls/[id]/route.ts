import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "data", "polls.json");

async function ensureStore() {
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    try {
      await fs.access(STORE_PATH);
    } catch {
      await fs.writeFile(
        STORE_PATH,
        JSON.stringify({ polls: {}, votes: {} }, null, 2),
      );
    }
  } catch (err) {
    console.error("ensureStore error", err);
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf-8");
  return JSON.parse(raw || '{"polls":{},"votes":{}}');
}

async function writeStore(store: any) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const store = await readStore();
    const poll = store.polls[params.id];
    if (!poll)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      poll,
      votes: store.votes[params.id] || {
        sessionVotes: {},
        deviceVotes: {},
        recentActivity: [],
      },
    });
  } catch (err) {
    console.error("GET /api/polls/[id] error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { optionId, sessionId, deviceSig, time } = body;
    if (typeof optionId !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const store = await readStore();
    const poll = store.polls[params.id];
    if (!poll)
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });

    store.votes = store.votes || {};
    store.votes[params.id] = store.votes[params.id] || {
      sessionVotes: {},
      deviceVotes: {},
      recentActivity: [],
    };
    const voteRecord = store.votes[params.id];

    if (sessionId && voteRecord.sessionVotes[sessionId]) {
      return NextResponse.json(
        { success: false, message: "Session already participated" },
        { status: 409 },
      );
    }
    if (deviceSig && voteRecord.deviceVotes[deviceSig]) {
      return NextResponse.json(
        { success: false, message: "Device already participated" },
        { status: 409 },
      );
    }

    const option = poll.options.find((o: any) => o.id === optionId);
    if (!option)
      return NextResponse.json(
        { success: false, message: "Invalid option" },
        { status: 400 },
      );

    // apply vote
    option.count = (option.count || 0) + 1;
    poll.totalVotes = (poll.totalVotes || 0) + 1;

    if (sessionId)
      voteRecord.sessionVotes[sessionId] = {
        optionId,
        time: time || Date.now(),
      };
    if (deviceSig)
      voteRecord.deviceVotes[deviceSig] = {
        optionId,
        time: time || Date.now(),
      };
    voteRecord.recentActivity = voteRecord.recentActivity || [];
    voteRecord.recentActivity.push(time || Date.now());
    if (voteRecord.recentActivity.length > 50)
      voteRecord.recentActivity = voteRecord.recentActivity.slice(-30);

    await writeStore(store);

    return NextResponse.json({ success: true, poll, votes: voteRecord });
  } catch (err) {
    console.error("POST /api/polls/[id] error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
