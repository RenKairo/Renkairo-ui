import { execFile, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Execute Git CLI command safely using execFile
 */
export function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    if (!cwd || !fs.existsSync(cwd)) {
      return reject(new Error(`Working directory does not exist: ${cwd}`));
    }

    execFile('git', args, { cwd, maxBuffer: 20 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const errorMsg = (stderr || stdout || error.message || 'Git command failed').trim();
        return reject(new Error(errorMsg));
      }
      resolve({ stdout: stdout ? stdout.toString() : '', stderr: stderr ? stderr.toString() : '' });
    });
  });
}

/**
 * Convert Git remote URL to clickable GitHub web URL
 */
function toGitHubWebUrl(remoteUrl) {
  if (!remoteUrl) return null;
  let clean = remoteUrl.trim();
  // git@github.com:owner/repo.git -> https://github.com/owner/repo
  if (clean.startsWith('git@github.com:')) {
    clean = clean.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '');
    return clean;
  }
  // https://github.com/owner/repo.git -> https://github.com/owner/repo
  if (clean.includes('github.com')) {
    clean = clean.replace(/\.git$/, '');
    if (!clean.startsWith('http')) {
      clean = 'https://' + clean;
    }
    return clean;
  }
  return null;
}

/**
 * Get comprehensive Git status for workspace
 */
export async function getGitStatus(cwd) {
  if (!cwd || !fs.existsSync(cwd)) {
    return {
      isRepo: false,
      rootPath: cwd || '',
      branch: '',
      upstream: '',
      ahead: 0,
      behind: 0,
      remoteUrl: '',
      githubUrl: null,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicts: [],
      totalChanges: 0,
    };
  }

  try {
    const { stdout: isInside } = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
    if (isInside.trim() !== 'true') {
      return {
        isRepo: false,
        rootPath: cwd,
        branch: '',
        upstream: '',
        ahead: 0,
        behind: 0,
        remoteUrl: '',
        githubUrl: null,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicts: [],
        totalChanges: 0,
      };
    }
  } catch (err) {
    return {
      isRepo: false,
      rootPath: cwd,
      branch: '',
      upstream: '',
      ahead: 0,
      behind: 0,
      remoteUrl: '',
      githubUrl: null,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicts: [],
      totalChanges: 0,
    };
  }

  let rootPath = cwd;
  try {
    const { stdout: topLevel } = await runGit(['rev-parse', '--show-toplevel'], cwd);
    rootPath = path.normalize(topLevel.trim());
  } catch (e) {}

  // 1. Current Branch
  let branch = '';
  try {
    const { stdout: branchOut } = await runGit(['branch', '--show-current'], rootPath);
    branch = branchOut.trim();
  } catch (e) {}

  if (!branch) {
    try {
      const { stdout: headOut } = await runGit(['rev-parse', '--short', 'HEAD'], rootPath);
      branch = headOut.trim() ? `HEAD (${headOut.trim()})` : 'main';
    } catch (e) {
      branch = 'main';
    }
  }

  // 2. Upstream Tracking & Ahead/Behind
  let upstream = '';
  let ahead = 0;
  let behind = 0;

  try {
    const { stdout: upOut } = await runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], rootPath);
    upstream = upOut.trim();
  } catch (e) {}

  if (upstream) {
    try {
      const { stdout: countOut } = await runGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], rootPath);
      const parts = countOut.trim().split(/\s+/);
      if (parts.length >= 2) {
        ahead = parseInt(parts[0], 10) || 0;
        behind = parseInt(parts[1], 10) || 0;
      }
    } catch (e) {}
  }

  // 3. Remote URL & GitHub
  let remoteUrl = '';
  try {
    const { stdout: remotesOut } = await runGit(['remote', 'get-url', 'origin'], rootPath);
    remoteUrl = remotesOut.trim();
  } catch (e) {
    try {
      const { stdout: remList } = await runGit(['remote', '-v'], rootPath);
      const match = remList.match(/^\S+\s+(\S+)\s+\(push\)/m) || remList.match(/^\S+\s+(\S+)/m);
      if (match) remoteUrl = match[1];
    } catch (e2) {}
  }

  const githubUrl = toGitHubWebUrl(remoteUrl);

  // 4. Porcelain Status
  const staged = [];
  const unstaged = [];
  const untracked = [];
  const conflicts = [];

  try {
    const { stdout: statusOut } = await runGit(['status', '--porcelain=v1', '-uall'], rootPath);
    const lines = statusOut.split(/\r?\n/).filter((l) => l.length >= 3);

    for (const line of lines) {
      const x = line[0];
      const y = line[1];
      let filePath = line.substring(3).trim();
      let oldPath = undefined;

      // Handle renames: "R  orig -> new"
      if (filePath.includes(' -> ')) {
        const parts = filePath.split(' -> ');
        oldPath = parts[0].replace(/^"|"$/g, '');
        filePath = parts[1].replace(/^"|"$/g, '');
      } else {
        filePath = filePath.replace(/^"|"$/g, '');
      }

      // Conflict checks
      const isConflict =
        (x === 'U' || y === 'U') ||
        (x === 'A' && y === 'A') ||
        (x === 'D' && y === 'D') ||
        (x === 'A' && y === 'U') ||
        (x === 'U' && y === 'A') ||
        (x === 'D' && y === 'U') ||
        (x === 'U' && y === 'D');

      if (isConflict) {
        conflicts.push({
          path: filePath,
          status: `${x}${y}`,
          oldPath,
        });
        continue;
      }

      // Untracked files
      if (x === '?' && y === '?') {
        untracked.push({
          path: filePath,
          status: 'U',
        });
        continue;
      }

      // Staged changes (Index)
      if (x !== ' ' && x !== '?') {
        staged.push({
          path: filePath,
          status: x, // 'M', 'A', 'D', 'R', 'C'
          oldPath,
        });
      }

      // Unstaged changes (Working Tree)
      if (y !== ' ' && y !== '?') {
        unstaged.push({
          path: filePath,
          status: y, // 'M', 'D'
          oldPath,
        });
      }
    }
  } catch (err) {
    console.error('[Git Engine] Error reading git status:', err);
  }

  const totalChanges = staged.length + unstaged.length + untracked.length + conflicts.length;

  return {
    isRepo: true,
    rootPath,
    branch,
    upstream,
    ahead,
    behind,
    remoteUrl,
    githubUrl,
    staged,
    unstaged,
    untracked,
    conflicts,
    totalChanges,
  };
}

/**
 * Get Diff data for Monaco DiffEditor (original vs modified contents)
 */
export async function getGitDiff(cwd, { filePath, staged }) {
  const rootPath = cwd;
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);
  const relPath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

  let original = '';
  let modified = '';
  let diffText = '';

  if (staged) {
    // Staged: Original is HEAD, Modified is Index
    try {
      const { stdout: origOut } = await runGit(['show', `HEAD:${relPath}`], rootPath);
      original = origOut;
    } catch (e) {
      original = ''; // Newly added file
    }

    try {
      const { stdout: modOut } = await runGit(['show', `:${relPath}`], rootPath);
      modified = modOut;
    } catch (e) {
      modified = '';
    }

    try {
      const { stdout: diffOut } = await runGit(['diff', '--cached', '--', relPath], rootPath);
      diffText = diffOut;
    } catch (e) {}
  } else {
    // Unstaged: Original is Index (or HEAD), Modified is Working Tree file on disk
    try {
      const { stdout: origOut } = await runGit(['show', `:${relPath}`], rootPath);
      original = origOut;
    } catch (e) {
      try {
        const { stdout: origHead } = await runGit(['show', `HEAD:${relPath}`], rootPath);
        original = origHead;
      } catch (e2) {
        original = ''; // Untracked file
      }
    }

    if (fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) {
      try {
        modified = fs.readFileSync(fullPath, 'utf-8');
      } catch (e) {
        modified = '';
      }
    } else {
      modified = ''; // Deleted file
    }

    try {
      const { stdout: diffOut } = await runGit(['diff', '--', relPath], rootPath);
      diffText = diffOut;
    } catch (e) {}
  }

  return {
    filePath: relPath,
    staged: !!staged,
    original,
    modified,
    diffText,
  };
}

/**
 * Stage file(s) or all files
 */
export async function stageGit(cwd, paths) {
  if (!paths || paths.length === 0 || paths.includes('*') || paths.includes('.')) {
    return await runGit(['add', '-A'], cwd);
  }
  return await runGit(['add', '-A', '--', ...paths], cwd);
}

/**
 * Unstage file(s) or all files
 */
export async function unstageGit(cwd, paths) {
  if (!paths || paths.length === 0 || paths.includes('*') || paths.includes('.')) {
    try {
      return await runGit(['restore', '--staged', '.'], cwd);
    } catch (e) {
      return await runGit(['reset', 'HEAD'], cwd);
    }
  }

  try {
    return await runGit(['restore', '--staged', '--', ...paths], cwd);
  } catch (e) {
    return await runGit(['reset', 'HEAD', '--', ...paths], cwd);
  }
}

/**
 * Discard working tree changes (VS Code revert)
 */
export async function discardGit(cwd, { paths, isUntracked }) {
  if (isUntracked && paths && paths.length > 0) {
    for (const p of paths) {
      const target = path.isAbsolute(p) ? p : path.join(cwd, p);
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
    return { success: true };
  }

  if (!paths || paths.length === 0 || paths.includes('*') || paths.includes('.')) {
    await runGit(['restore', '.'], cwd);
    try {
      await runGit(['clean', '-fd'], cwd);
    } catch (e) {}
    return { success: true };
  }

  try {
    await runGit(['restore', '--', ...paths], cwd);
  } catch (e) {
    await runGit(['checkout', '--', ...paths], cwd);
  }

  return { success: true };
}

/**
 * Commit staged changes
 */
export async function commitGit(cwd, { message, amend, stageAll }) {
  if (!message || !message.trim()) {
    throw new Error('Commit message cannot be empty');
  }

  if (stageAll) {
    await runGit(['add', '-A'], cwd);
  }

  const args = ['commit'];
  if (amend) {
    args.push('--amend');
  }
  args.push('-m', message.trim());

  return await runGit(args, cwd);
}

/**
 * Push to remote
 */
export async function pushGit(cwd, { remote = 'origin', branch, setUpstream = false, force = false }) {
  const args = ['push'];
  if (force) args.push('--force');

  if (setUpstream || branch) {
    let currentBranch = branch;
    if (!currentBranch) {
      const status = await getGitStatus(cwd);
      currentBranch = status.branch || 'main';
    }
    args.push('-u', remote, currentBranch);
  }

  return await runGit(args, cwd);
}

/**
 * Pull from remote
 */
export async function pullGit(cwd, { remote, branch, rebase = false } = {}) {
  const args = ['pull'];
  if (rebase) args.push('--rebase');
  if (remote && branch) {
    args.push(remote, branch);
  }
  return await runGit(args, cwd);
}

/**
 * Fetch from remote
 */
export async function fetchGit(cwd) {
  return await runGit(['fetch', '--all', '--prune'], cwd);
}

/**
 * Initialize repository
 */
export async function initGit(cwd, { initialBranch = 'main' } = {}) {
  try {
    await runGit(['init', '-b', initialBranch], cwd);
  } catch (e) {
    await runGit(['init'], cwd);
    try {
      await runGit(['checkout', '-b', initialBranch], cwd);
    } catch (e2) {}
  }
  return { success: true };
}

/**
 * Get branches list (local & remote)
 */
export async function getBranchesGit(cwd) {
  const { stdout } = await runGit(['branch', '-a', '--format=%(refname:short)|%(HEAD)|%(upstream:short)'], cwd);
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);

  let currentBranch = '';
  const branches = [];
  const seen = new Set();

  for (const line of lines) {
    const [name, headStar, upstream] = line.split('|');
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const isCurrent = headStar.trim() === '*';
    if (isCurrent) currentBranch = name;

    const isRemote = name.startsWith('origin/') || name.includes('/');
    branches.push({
      name,
      isCurrent,
      isRemote,
      upstream: upstream || undefined,
    });
  }

  if (!currentBranch && branches.length > 0) {
    currentBranch = branches[0].name;
    branches[0].isCurrent = true;
  }

  return {
    current: currentBranch,
    branches,
  };
}

/**
 * Switch or create branch
 */
export async function checkoutBranchGit(cwd, { branch, createNew = false, startPoint }) {
  if (!branch) throw new Error('Branch name is required');

  if (createNew) {
    const args = ['checkout', '-b', branch];
    if (startPoint) args.push(startPoint);
    return await runGit(args, cwd);
  }

  return await runGit(['checkout', branch], cwd);
}

/**
 * Get Remotes list
 */
export async function getRemotesGit(cwd) {
  try {
    const { stdout } = await runGit(['remote', '-v'], cwd);
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    const remotesMap = new Map();

    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (match) {
        const [, name, url, type] = match;
        if (!remotesMap.has(name)) {
          remotesMap.set(name, { name, fetchUrl: '', pushUrl: '', githubUrl: toGitHubWebUrl(url) });
        }
        const r = remotesMap.get(name);
        if (type === 'fetch') r.fetchUrl = url;
        if (type === 'push') r.pushUrl = url;
      }
    }

    return Array.from(remotesMap.values());
  } catch (e) {
    return [];
  }
}

/**
 * Add remote
 */
export async function addRemoteGit(cwd, { name = 'origin', url }) {
  if (!url || !url.trim()) throw new Error('Remote URL is required');
  return await runGit(['remote', 'add', name, url.trim()], cwd);
}

/**
 * Get Commit Log (History)
 */
export async function getCommitLogGit(cwd, maxCount = 30) {
  try {
    const { stdout } = await runGit(['log', `-n${maxCount}`, '--pretty=format:%H|%h|%an|%ae|%ad|%s', '--date=short'], cwd);
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    const commits = lines.map((line) => {
      const [hash, shortHash, authorName, authorEmail, date, ...msgParts] = line.split('|');
      return {
        hash,
        shortHash,
        authorName,
        authorEmail,
        date,
        message: msgParts.join('|'),
      };
    });
    return commits;
  } catch (e) {
    return [];
  }
}

/**
 * Clone repository into target folder
 */
export async function cloneRepoGit({ url, targetPath, directoryName }) {
  if (!url) throw new Error('Git repository URL is required');
  const dest = directoryName ? path.join(targetPath, directoryName) : targetPath;
  return await runGit(['clone', url, dest], path.dirname(dest) || targetPath);
}
