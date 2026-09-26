/**
 * GitHub REST API client
 * Fetches repo metadata, file tree, and raw file content
 * without cloning — uses GitHub API only.
 */

const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

/**
 * Build headers for GitHub API requests.
 * Uses GITHUB_TOKEN from env for higher rate limits (5000/hr vs 60/hr).
 */
function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ordo-ai-maintenance-engineer',
  };
  const token = process.env.GITHUB_TOKEN;
  // Only send token if it looks like a real GitHub PAT (not a placeholder)
  if (token && token !== 'your-github-pat-here' && token.length > 10) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Parse a GitHub URL into { owner, repo }.
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   github.com/owner/repo
 */
export function parseGitHubUrl(url) {
  const match = url
    .replace(/\.git$/, '')
    .match(/github\.com[/:]([^/]+)\/([^/\s]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
}

/**
 * Fetch repository metadata (default branch, description, language, stars).
 */
export async function fetchRepoMetadata(owner, repo) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status} for ${owner}/${repo}: ${body}`);
  }
  const data = await res.json();
  return {
    owner,
    repo,
    fullName: data.full_name,
    description: data.description || '',
    defaultBranch: data.default_branch || 'main',
    primaryLanguage: data.language || 'unknown',
    stars: data.stargazers_count || 0,
    openIssues: data.open_issues_count || 0,
    url: data.html_url,
  };
}

/**
 * Fetch the full recursive file tree for the given branch.
 * Returns a flat array of { path, type, size } objects.
 */
export async function fetchFileTree(owner, repo, branch) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: githubHeaders() }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub tree API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (data.truncated) {
    console.warn(`[github] File tree truncated for ${owner}/${repo} — large repo`);
  }
  return (data.tree || [])
    .filter((item) => item.type === 'blob')
    .map((item) => ({ path: item.path, size: item.size || 0 }));
}

/**
 * Fetch raw file content from GitHub.
 * Returns null if the file is too large or fetch fails.
 */
export async function fetchFileContent(owner, repo, branch, path) {
  const url = `${GITHUB_RAW}/${owner}/${repo}/${branch}/${path}`;
  try {
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) return null;
    const text = await res.text();
    // Skip binary-looking content
    if (text.includes('\u0000')) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple files in parallel with concurrency cap to avoid rate limiting.
 */
export async function fetchFilesWithContent(owner, repo, branch, paths, concurrency = 8) {
  const results = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const fetched = await Promise.all(
      batch.map(async (path) => {
        const content = await fetchFileContent(owner, repo, branch, path);
        return content !== null ? { path, content } : null;
      })
    );
    results.push(...fetched.filter(Boolean));
  }
  return results;
}
