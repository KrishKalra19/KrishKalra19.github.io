// Writes data/projects.json from the public GitHub repos behind each project on the site.
// Run daily by .github/workflows/update-projects.yml; also runs locally with `node scripts/update-projects.mjs`.
// Only facts that come from git: last update, commits in the last 30 days, latest commit subject.
import { writeFileSync, mkdirSync } from 'node:fs';

const OWNER = 'KrishKalra19';
const REPOS = ['vivarium', 'isfl-football-sim', 'fret-driller', 'rhythm-reader'];
// Subjects that read badly on a portfolio are skipped in favour of the next commit.
const SKIP_SUBJECT = /\bwip\b|^merge\b|typo|^fixup|^revert/i;

const headers = { 'User-Agent': 'site-updater', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const since = new Date(Date.now() - 30 * 864e5).toISOString();
const out = { generated: new Date().toISOString(), repos: {} };

for (const repo of REPOS) {
  try {
    const commits = await gh(`/repos/${OWNER}/${repo}/commits?per_page=100`);
    if (!commits.length) continue;
    const shown = commits.find(c => !SKIP_SUBJECT.test(c.commit.message.split('\n')[0])) || commits[0];
    out.repos[repo] = {
      updated: commits[0].commit.committer.date,
      commits30d: commits.filter(c => c.commit.committer.date >= since).length,
      latest: shown.commit.message.split('\n')[0].slice(0, 90),
    };
  } catch (e) {
    console.error(`skipping ${repo}: ${e.message}`);
  }
}

mkdirSync('data', { recursive: true });
writeFileSync('data/projects.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
