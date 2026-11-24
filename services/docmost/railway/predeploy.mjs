// Docmost pre-deploy step for Railway (runs before every deploy).
//
// Docmost serves an open "create workspace" page until the first workspace
// exists, and whoever submits it becomes the owner. This step closes that gap
// (STANDARD 8.37): it waits for Postgres and Redis, and on a fresh database
// starts Docmost on a private port inside the pre-deploy container (no public
// traffic reaches it), creates the workspace and the owner from variables
// through Docmost's own setup API, and stops it again.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import net from 'node:net';

const SERVER = '/app/apps/server';
const require = createRequire(`${SERVER}/package.json`);
const env = process.env;
const log = msg => console.log(`[railway] ${msg}`);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const BOOT_PORT = '3999';
const MIN_PASSWORD = 12;

function tcpReady(host, port) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: 3000 });
    const done = ok => { socket.destroy(); resolve(ok); };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function waitFor(name, url, defaultPort, limitMs) {
  let target;
  try {
    target = new URL(url);
  } catch {
    log(`ERROR: ${name} URL is not valid`);
    return false;
  }
  const host = target.hostname.replace(/^\[|\]$/g, '');
  const port = Number(target.port || defaultPort);
  const end = Date.now() + limitMs;
  for (let i = 0; Date.now() < end; i++) {
    if (await tcpReady(host, port)) {
      log(`${name} reachable`);
      return true;
    }
    if (i % 6 === 0) log(`waiting for ${name} (${host}:${port})...`);
    await sleep(5000);
  }
  log(`ERROR: ${name} not reachable after ${limitMs / 1000} s`);
  return false;
}

async function workspaceCount() {
  // Docmost ships postgres.js (not pg).
  const postgres = require('postgres');
  const sql = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    const [table] = await sql`SELECT to_regclass('public.workspaces') IS NOT NULL AS present`;
    if (!table.present) return 0;
    const [row] = await sql`SELECT count(*)::int AS n FROM workspaces`;
    return row.n;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function ownerValues() {
  let email = (env.DOCMOST_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    log(`WARNING: DOCMOST_ADMIN_EMAIL '${email}' is not an e-mail address; using admin@example.com`);
    email = 'admin@example.com';
  }
  let password = env.DOCMOST_ADMIN_PASSWORD || '';
  if (password.length < MIN_PASSWORD || password.length > 70) {
    log(`WARNING: DOCMOST_ADMIN_PASSWORD must be ${MIN_PASSWORD}-70 characters. The owner login is locked with a`);
    log('         random password; use "Forgot password" (needs e-mail) or the reset steps in the README.');
    password = randomBytes(24).toString('base64url');
  }
  const clean = (value, fallback) => {
    const text = (value || '').replace(/[\u0000-\u001f]/g, '').replace(/https?:\/\/\S*/gi, '').trim().slice(0, 50);
    return text || fallback;
  };
  return {
    name: clean(env.DOCMOST_ADMIN_NAME, 'Admin'),
    email,
    password,
    workspaceName: clean(env.DOCMOST_WORKSPACE_NAME, 'Docmost'),
  };
}

async function createWorkspace() {
  const values = ownerValues();
  log(`fresh database: starting Docmost on private port ${BOOT_PORT} to create the workspace (runs migrations)`);
  const child = spawn('node', ['dist/main'], {
    cwd: SERVER,
    env: { ...env, PORT: BOOT_PORT, HOST: '127.0.0.1' },
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  });
  let exited = false;
  child.once('exit', code => {
    exited = true;
    log(`temporary Docmost exited (${code})`);
  });
  const stop = async () => {
    if (exited) return;
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* gone */ }
    for (let i = 0; i < 30 && !exited; i++) await sleep(1000);
    if (!exited) try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  };
  try {
    const base = `http://127.0.0.1:${BOOT_PORT}`;
    const end = Date.now() + 15 * 60 * 1000;
    let healthy = false;
    while (!exited && Date.now() < end) {
      try {
        const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) { healthy = true; break; }
      } catch { /* not up yet */ }
      await sleep(3000);
    }
    if (!healthy) {
      log('ERROR: the temporary Docmost did not become healthy');
      return false;
    }
    const res = await fetch(`${base}/api/auth/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    if (res.ok) {
      log(`workspace '${values.workspaceName}' created; owner ${values.email}`);
      return true;
    }
    if (/already completed/i.test(text)) {
      log('workspace already exists; nothing to create');
      return true;
    }
    log(`ERROR: setup answered ${res.status}: ${text.slice(0, 300)}`);
    return false;
  } finally {
    await stop();
  }
}

async function main() {
  const dbOk = await waitFor('Postgres', env.DATABASE_URL, 5432, 15 * 60 * 1000);
  const redisOk = await waitFor('Redis', env.REDIS_URL, 6379, 15 * 60 * 1000);
  if (!dbOk || !redisOk) return false;
  const existing = await workspaceCount();
  if (existing > 0) {
    log(`workspace already exists (${existing}); nothing to create`);
    return true;
  }
  return createWorkspace();
}

main().then(ok => process.exit(ok ? 0 : 1), err => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
