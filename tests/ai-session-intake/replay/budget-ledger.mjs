// Shared budget ledger (B3 final wiring). Coordinates component caps (per Intake
// provider, grader) and an OVERALL guard across PARALLEL processes safely.
//
// Node processes do not share memory, so coordination uses a JSON ledger file
// guarded by an ATOMIC lock (mkdir is atomic on POSIX; retried with backoff). Every
// reserve/charge is a read-modify-write under the lock, so two parallel runners
// cannot both commit a reservation that would breach a cap.
//
// Model: a call RESERVES its conservative per-call maximum before issuing (gate),
// and after completion the reservation is replaced by the actual known cost plus a
// conservative unknown reserve for a possibly-unreported retry attempt. Known and
// unknown are tracked separately; reserved-but-unused budget is released.
//
// Pure Node; no network. Used by run-live-t1 (Intake) and the grader runners.

import { mkdirSync, rmdirSync, readFileSync, writeFileSync, existsSync, mkdirSync as mkdirp } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Default experiment ledger path. An ISOLATED ledger (e.g. for a single authorized
// calibration) can be selected with INTAKE_LEDGER_FILE=<name> so it never resets,
// overwrites, or collides with the default experiment ledger.
const LEDGER_DIR = resolve(here, 'out', 'ledger');
const LEDGER_FILE = resolve(LEDGER_DIR, process.env.INTAKE_LEDGER_FILE || 'budget-ledger.json');
const LOCK_DIR = resolve(LEDGER_DIR, (process.env.INTAKE_LEDGER_FILE ? `.lock-${process.env.INTAKE_LEDGER_FILE}` : '.lock'));

function ensureDir() { mkdirp(LEDGER_DIR, { recursive: true }); }

async function withLock(fn) {
  ensureDir();
  const deadline = Date.now() + 10000;
  for (;;) {
    try { mkdirSync(LOCK_DIR); break; }          // atomic acquire
    catch { if (Date.now() > deadline) throw new Error('ledger lock timeout'); await new Promise(r => setTimeout(r, 15 + Math.random() * 35)); }
  }
  try { return fn(); }
  finally { try { rmdirSync(LOCK_DIR); } catch {} }
}

function readLedger() {
  if (!existsSync(LEDGER_FILE)) return null;
  try { return JSON.parse(readFileSync(LEDGER_FILE, 'utf8')); } catch { return null; }
}
function writeLedger(l) { writeFileSync(LEDGER_FILE, JSON.stringify(l, null, 2) + '\n'); }

// Initialize (or reset) the experiment ledger with component caps + overall guard.
export async function initLedger({ overallCapUsd, components, reset = false }) {
  return withLock(() => {
    let l = reset ? null : readLedger();
    if (!l) {
      l = { schema: 'intake-budget-ledger.v1', createdAt: new Date().toISOString(), overallCapUsd, components: {}, overall: { knownUsd: 0, unknownUsd: 0, reservedUsd: 0 } };
    }
    for (const [name, capUsd] of Object.entries(components || {})) {
      if (!l.components[name]) l.components[name] = { capUsd, knownUsd: 0, unknownUsd: 0, reservedUsd: 0, calls: 0 };
      else l.components[name].capUsd = capUsd;
    }
    if (typeof overallCapUsd === 'number') l.overallCapUsd = overallCapUsd;
    writeLedger(l);
    return l;
  });
}

const committed = c => c.knownUsd + c.unknownUsd + c.reservedUsd;

// Try to reserve a conservative per-call maximum for `component`. Returns
// {ok, reason}. Fails if either the component cap OR the overall guard would be
// exceeded by committing the reserve. Atomic across processes.
export async function reserve(component, perCallMaxUsd) {
  return withLock(() => {
    const l = readLedger();
    if (!l) throw new Error('ledger not initialized');
    const c = l.components[component];
    if (!c) throw new Error(`unknown ledger component: ${component}`);
    const compAfter = committed(c) + perCallMaxUsd;
    const overallAfter = committed(l.overall) + perCallMaxUsd;
    if (compAfter > c.capUsd) return { ok: false, reason: `component_cap_reached:${component}`, componentCommitted: committed(c), capUsd: c.capUsd };
    if (overallAfter > l.overallCapUsd) return { ok: false, reason: 'overall_guard_reached', overallCommitted: committed(l.overall), overallCapUsd: l.overallCapUsd };
    c.reservedUsd += perCallMaxUsd; l.overall.reservedUsd += perCallMaxUsd;
    writeLedger(l);
    return { ok: true };
  });
}

// After a call completes, release the reservation and record actual known cost +
// a conservative unknown reserve for a possibly-unreported retry attempt.
export async function settle(component, { perCallMaxUsd, knownUsd, unknownUsd }) {
  return withLock(() => {
    const l = readLedger();
    const c = l.components[component];
    c.reservedUsd = Math.max(0, c.reservedUsd - perCallMaxUsd);
    l.overall.reservedUsd = Math.max(0, l.overall.reservedUsd - perCallMaxUsd);
    c.knownUsd += knownUsd; c.unknownUsd += unknownUsd; c.calls += 1;
    l.overall.knownUsd += knownUsd; l.overall.unknownUsd += unknownUsd;
    writeLedger(l);
    return l;
  });
}

export async function snapshot() { return withLock(() => readLedger()); }
