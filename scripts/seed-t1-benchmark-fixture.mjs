#!/usr/bin/env node
// Dedicated, IDEMPOTENT benchmark fixture for the synthetic T1 "Booking portal"
// trajectory. Local-only: talks solely to the `supabase start` stack and refuses
// any non-local URL. It ADDS an isolated mock student on a NEW team_number with
// project_name='Booking portal', without repurposing or overwriting the existing
// seed's students/teams/projects. No migrations, no production changes.
//
// It reuses the SAME schema and setup mechanisms as scripts/seed-local-testdata.mjs
// (student_accounts activation, student_roster, studio_sessions with intake_access
// = 'open'). The T1 project context is carried via student_roster.project_name,
// which is exactly the authoritative field the endpoint's resolvePreviousRecord
// reads for sessionContext.scope.projectName.
//
// Usage: node scripts/seed-t1-benchmark-fixture.mjs
// Prints the isolated student_id, vu_email, block/session numbers. No secrets.

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const status = JSON.parse(execSync("supabase status -o json", { encoding: "utf8" }));
const API_URL = status.API_URL;
const SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
if (!API_URL || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API_URL)) {
  console.error(`Refusing to run: API_URL "${API_URL}" is not a local Supabase instance.`);
  process.exit(1);
}
const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ok = (...a) => console.log("✓", ...a);

// Isolated T1 identity — deliberately distinct from the seed's s1001..s1010.
// Parameterizable so a SECOND isolated student (separate history) can be seeded
// for a parallel per-provider run. Defaults to t1bench01 / team 4.
const T1_ID = process.env.T1_STUDENT_ID || "t1bench01";
const T1_TEAM = Number(process.env.T1_TEAM_NUMBER || "4");
const T1 = {
  student_id: T1_ID,
  full_name: `T1 Benchmark Student (${T1_ID})`,
  vu_email: `${T1_ID}@student.vu.edu.au`,
  team_number: T1_TEAM, // NEW team, not the seed's 1/2/3 — no collision
  project_name: "Booking portal",
  password: "Student123!",
};
const T1_SESSIONS = [
  { n: 1, focus: "Booking portal — planning/research/design" },
  { n: 2, focus: "Booking portal — mock implementation" },
  { n: 3, focus: "Booking portal — integration" },
  { n: 4, focus: "Booking portal — correction & retest" },
];

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}${error.details ? ` (${error.details})` : ""}`);
  return data;
}
async function findAuthUserByEmail(email) {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = (data?.users || []).find(u => (u.email || "").toLowerCase() === wanted);
    if (found) return found;
    if ((data?.users || []).length < 1000) break;
  }
  return null;
}

async function activeBlockId() {
  const { data } = await admin.from("teaching_blocks").select("id,block_code,status").eq("status", "active");
  const active = (data || []).find(b => b.block_code === "2B2");
  if (!active) throw new Error("No active 2B2 block. Run `npm run seed:local` first.");
  return active.id;
}

async function main() {
  console.log(`Seeding isolated T1 Booking portal fixture at ${API_URL}\n`);
  const blockId = await activeBlockId();

  // 1. Isolated auth user (idempotent).
  let user = await findAuthUserByEmail(T1.vu_email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: T1.vu_email, password: T1.password, email_confirm: true,
      app_metadata: { role: "student" }, user_metadata: { student_id: T1.student_id },
    });
    if (error) throw new Error(`Create auth user: ${error.message}`);
    user = data.user;
  }
  ok(`Isolated student auth ready: ${T1.vu_email}`);

  // 2. Roster row with the authoritative project_name = 'Booking portal'.
  await must(admin.from("student_roster").upsert({
    block_id: blockId, student_id: T1.student_id, full_name: T1.full_name,
    vu_email: T1.vu_email, team_number: T1.team_number, project_name: T1.project_name,
  }, { onConflict: "block_id,student_id" }), "Upsert T1 roster");
  ok(`Roster ready: ${T1.student_id} Team ${T1.team_number} project="${T1.project_name}"`);

  // 3. Team row (idempotent) for the new team_number.
  await must(admin.from("teams").upsert({ block_id: blockId, team_number: T1.team_number },
    { onConflict: "block_id,team_number" }), "Upsert T1 team");

  // 4. student_accounts activation link (idempotent).
  const { data: acctRows } = await admin.from("student_accounts").select("student_id,status").eq("student_id", T1.student_id);
  if (!acctRows?.length) {
    await must(admin.from("student_accounts").insert({
      student_id: T1.student_id, auth_user_id: user.id, status: "activated", activated_at: new Date().toISOString(),
    }), "Link student_accounts");
  } else if (acctRows[0].status !== "activated") {
    await must(admin.from("student_accounts").update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("student_id", T1.student_id), "Activate student_accounts");
  }
  ok("student_accounts activated");

  // 5. Reuse the block's existing S1..S4 studio_sessions (already Intake-open from
  //    the main seed). We do NOT create duplicate sessions; we resolve their IDs.
  //    project_name lives on the roster, so the same Sessions carry T1 context for
  //    this isolated student. Confirm S1..S4 exist and are intake-open.
  const { data: sessions } = await admin.from("studio_sessions")
    .select("id,session_number,intake_access,curriculum_focus").eq("block_id", blockId)
    .in("session_number", [1, 2, 3, 4]).order("session_number");
  const bySession = new Map((sessions || []).map(s => [s.session_number, s]));
  const sessionIds = [];
  for (const s of T1_SESSIONS) {
    const row = bySession.get(s.n);
    if (!row) throw new Error(`Session S${s.n} not found. Run \`npm run seed:local\` first.`);
    if (row.intake_access !== "open") throw new Error(`Session S${s.n} is not Intake-open (intake_access=${row.intake_access}).`);
    sessionIds.push(row.id);
  }
  ok(`Sessions S1..S4 resolved and Intake-open: ${sessionIds.join(", ")}`);

  console.log("\n──────────────────────────────────────────────");
  console.log("Isolated T1 fixture ready.");
  console.log(JSON.stringify({
    block_code: "2B2", student_id: T1.student_id, vu_email: T1.vu_email,
    team_number: T1.team_number, project_name: T1.project_name,
    sessionNumbers: [1, 2, 3, 4], sessionIds,
  }, null, 2));
}
main().catch(e => { console.error("\nT1 fixture failed:", e.message); process.exit(1); });
