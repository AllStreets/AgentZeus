import { NextRequest, NextResponse } from "next/server";

interface GitHubUser {
  login: string;
}

interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  draft: boolean;
}

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  pull_request?: unknown;
}

interface GitHubRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  html_url: string;
}

async function ghFetch(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const { token, action } = await req.json();

  if (!token) return NextResponse.json({ error: "No token provided" }, { status: 400 });

  try {
    if (action === "summary") {
      const user: GitHubUser = await ghFetch("/user", token);
      const login = user.login;

      const [prsRaw, issuesRaw, reposRaw] = await Promise.all([
        ghFetch(`/search/issues?q=is:pr+is:open+assignee:${login}&per_page=10`, token),
        ghFetch(`/search/issues?q=is:issue+is:open+author:${login}&per_page=10`, token),
        ghFetch(`/user/repos?sort=pushed&per_page=8`, token),
      ]);

      const prs = (prsRaw.items as GitHubPR[]).map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        repo: pr.repository_url.split("/").slice(-2).join("/"),
        age: Math.floor((Date.now() - new Date(pr.created_at).getTime()) / 86400000),
        draft: pr.draft,
      }));

      const issues = (issuesRaw.items as GitHubIssue[])
        .filter((i) => !i.pull_request)
        .map((i) => ({
          number: i.number,
          title: i.title,
          url: i.html_url,
          repo: i.repository_url.split("/").slice(-2).join("/"),
          age: Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000),
        }));

      const repos = (reposRaw as GitHubRepo[]).map((r) => ({
        name: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        pushedAgo: Math.floor((Date.now() - new Date(r.pushed_at).getTime()) / 86400000),
        url: r.html_url,
      }));

      return NextResponse.json({ login, prs, issues, repos });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
