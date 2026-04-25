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
  user?: { login: string };
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

async function ghFetch(path: string, token: string, options: { method?: string; body?: string } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: options.method || "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, action } = body;

  if (!token) return NextResponse.json({ error: "No token provided" }, { status: 400 });

  try {
    if (action === "summary") {
      const user: GitHubUser = await ghFetch("/user", token);
      const login = user.login;

      const [prsSearchRaw, issuesRaw, reposRaw] = await Promise.all([
        ghFetch(`/search/issues?q=${encodeURIComponent(`is:pr is:open author:${login}`)}&per_page=20`, token),
        ghFetch(`/search/issues?q=${encodeURIComponent(`is:issue is:open author:${login}`)}&per_page=10`, token),
        ghFetch(`/user/repos?sort=pushed&per_page=8`, token),
      ]);

      // Search API results (covers all repos including forks/orgs)
      const searchPrs = (prsSearchRaw.items as GitHubPR[]).map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        repo: pr.repository_url.split("/").slice(-2).join("/"),
        age: Math.floor((Date.now() - new Date(pr.created_at).getTime()) / 86400000),
        draft: pr.draft,
      }));

      // REST API results (real-time, no indexing delay, but only user's repos)
      const restPrsByRepo = await Promise.all(
        (reposRaw as GitHubRepo[]).map(async (repo) => {
          try {
            const pulls = await ghFetch(
              `/repos/${repo.full_name}/pulls?state=open&per_page=10`,
              token
            );
            return (pulls as GitHubPR[]).map((pr) => ({
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              repo: repo.full_name,
              age: Math.floor((Date.now() - new Date(pr.created_at).getTime()) / 86400000),
              draft: pr.draft,
            }));
          } catch { return []; }
        })
      );

      // Merge and deduplicate by URL
      const seen = new Set<string>();
      const prs = [...restPrsByRepo.flat(), ...searchPrs]
        .filter((pr) => { if (seen.has(pr.url)) return false; seen.add(pr.url); return true; })
        .sort((a, b) => a.age - b.age);


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

    if (action === "commits") {
      const user: GitHubUser = await ghFetch("/user", token);
      const reposRaw: GitHubRepo[] = await ghFetch(`/user/repos?sort=pushed&per_page=5`, token);

      const commitsByRepo = await Promise.all(
        reposRaw.map(async (repo) => {
          try {
            const commits = await ghFetch(
              `/repos/${repo.full_name}/commits?author=${user.login}&per_page=5`,
              token
            );
            return (commits as Array<{ sha: string; commit: { message: string; author: { date: string } }; html_url: string }>).map((c) => ({
              sha: c.sha.slice(0, 7),
              message: c.commit.message.split("\n")[0],
              repo: repo.full_name,
              date: c.commit.author.date,
              url: c.html_url,
              age: Math.floor((Date.now() - new Date(c.commit.author.date).getTime()) / 86400000),
            }));
          } catch { return []; }
        })
      );

      const commits = commitsByRepo.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
      return NextResponse.json({ commits });
    }

    if (action === "create_issue") {
      const { repo, title, body: issueBody } = body as { repo: string; title: string; body?: string };
      const issue = await ghFetch(`/repos/${repo}/issues`, token, {
        method: "POST",
        body: JSON.stringify({ title, body: issueBody || "" }),
      });
      return NextResponse.json({ url: issue.html_url, number: issue.number });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
