/**
 * Repo ingestion orchestrator.
 * Given a GitHub URL, produces a RepoSnapshot:
 * {
 *   metadata: { owner, repo, fullName, description, defaultBranch, primaryLanguage, stars, openIssues, url },
 *   files: [{ path, content }],
 *   stats: { totalTreeFiles, selectedFiles, sourceCount, testCount, coverageRatio },
 * }
 */

import {
  parseGitHubUrl,
  fetchRepoMetadata,
  fetchFileTree,
  fetchFilesWithContent,
} from './client.js';
import { prioritizeFiles, computeCoverageStats } from './prioritize.js';

export async function ingestRepo(repoUrl) {
  // 1. Parse URL
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // 2. Fetch metadata (gives us the default branch)
  const metadata = await fetchRepoMetadata(owner, repo);
  const { defaultBranch } = metadata;

  // 3. Fetch full file tree
  const tree = await fetchFileTree(owner, repo, defaultBranch);

  // 4. Prioritize files for debt analysis (cap at 100)
  const selectedPaths = prioritizeFiles(tree, 100);

  // 5. Fetch file contents in parallel (concurrency = 8)
  const files = await fetchFilesWithContent(owner, repo, defaultBranch, selectedPaths, 8);

  // 6. Compute coverage stats
  const stats = {
    totalTreeFiles: tree.length,
    selectedFiles: files.length,
    ...computeCoverageStats(selectedPaths),
  };

  return { metadata, files, stats };
}
