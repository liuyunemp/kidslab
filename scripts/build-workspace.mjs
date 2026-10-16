import { lstat, mkdir, mkdtemp, realpath, rename, rm } from 'node:fs/promises';
import path from 'node:path';

export async function retryFileOperation(operation) {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= 5 || !['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error.code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
}

export async function createBuildWorkspace(root) {
  return mkdtemp(path.join(await realpath(root), '.kidslab-build-'));
}

async function assertWorkspace(root, workspace) {
  const parent = await realpath(root);
  const absolute = path.resolve(workspace);
  if (path.dirname(absolute) !== parent || !path.basename(absolute).startsWith('.kidslab-build-')
      || (await lstat(absolute)).isSymbolicLink() || await realpath(absolute) !== absolute) {
    throw new Error(`拒绝操作非构建临时目录: ${workspace}`);
  }
}

export async function removeBuildWorkspace(root, workspace) {
  await assertWorkspace(root, workspace);
  await retryFileOperation(() => rm(workspace, { recursive: true, force: true }));
}

async function exists(file) {
  try { await lstat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

/** Multi-file replacement with rollback, not a crash-atomic filesystem transaction. */
export async function publishArtifacts(root, workspace, { renameFile = rename } = {}) {
  await assertWorkspace(root, workspace);
  const backup = path.join(workspace, 'backup');
  await mkdir(backup);
  const changes = [];
  const move = (from, to) => retryFileOperation(() => renameFile(from, to));
  try {
    for (const name of ['courseware', 'index.html', 'sw.js']) {
      const change = { target: path.join(root, name), staged: path.join(workspace, 'staged', name),
        backup: path.join(backup, name), saved: false, installed: false };
      changes.push(change);
      if (await exists(change.target)) {
        await move(change.target, change.backup);
        change.saved = true;
      }
      await move(change.staged, change.target);
      change.installed = true;
    }
  } catch (cause) {
    const errors = [];
    for (const change of changes.reverse()) {
      try {
        if (change.installed) await move(change.target, change.staged);
        if (change.saved) await move(change.backup, change.target);
      } catch (error) { errors.push(error); }
    }
    if (errors.length) {
      const failure = new AggregateError([cause, ...errors], `构建替换及恢复失败；备份保留于 ${workspace}`);
      failure.preserveWorkspace = true;
      throw failure;
    }
    throw cause;
  }
}
