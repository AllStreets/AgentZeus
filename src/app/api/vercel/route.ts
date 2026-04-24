import { NextRequest, NextResponse } from "next/server";

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
  meta?: { githubCommitMessage?: string };
}

async function vercelFetch(path: string, token: string) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Vercel ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  try {
    const data = await vercelFetch("/v6/deployments?limit=10", token);
    const deployments = (data.deployments as VercelDeployment[]).map((d) => ({
      id: d.uid,
      name: d.name,
      url: `https://${d.url}`,
      state: d.state,
      age: Math.floor((Date.now() - d.created) / 60000), // minutes ago
      message: d.meta?.githubCommitMessage || null,
    }));

    const latest = deployments[0];
    return NextResponse.json({ deployments, latest });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
