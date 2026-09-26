#!/usr/bin/env node
// Seeds the LOCAL Docker Supabase stack (started with `supabase start`) with a
// complete, self-consistent test fixture for exercising AI Session Intake:
//
//   - one teacher admin account
//   - a historical block (2026 1B4, archived) representing the prior NIT3003 unit
//   - an active pilot block (2026 2B2) with:
//       - 3 teams (4 + 4 + 2 students = 10 students)
//       - 5 AI projects across different domains, one assigned per team
//       - 10 activated student accounts + Auth users
//       - 10 Sessions (S1-S10) with S1-S9 open for Intake
//
// This talks ONLY to the local stack printed by `supabase status`. It refuses
// to run against anything that doesn't look like a local URL, so it can never
// touch the remote/production Supabase project.
//
// Usage:
//   node scripts/seed-local-testdata.mjs
//
// Idempotent: safe to re-run after `supabase db reset`, and safe to re-run
// without a reset (existing rows are matched/updated rather than duplicated).

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

function localSupabaseStatus() {
  const raw = execSync("supabase status -o json", { encoding: "utf8" });
  return JSON.parse(raw);
}

const status = localSupabaseStatus();
const API_URL = status.API_URL;
const SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;

if (!API_URL || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API_URL)) {
  console.error(`Refusing to run: API_URL "${API_URL}" does not look like a local Supabase instance.`);
  console.error("This script only ever targets a local `supabase start` stack.");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("No SERVICE_ROLE_KEY found. Is `supabase start` running? (`supabase status`)");
  process.exit(1);
}

const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...args) => console.log("•", ...args);
const ok = (...args) => console.log("✓", ...args);
const warn = (...args) => console.warn("! ", ...args);

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}${error.details ? ` (${error.details})` : ""}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// 1. Teacher admin account
// ---------------------------------------------------------------------------

const TEACHER = {
  email: "teacher@example.edu",
  password: "LocalTeacher123!",
};

async function findAuthUserByEmail(email) {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u) => (u.email || "").trim().toLowerCase() === wanted);
    if (found) return found;
    if (users.length < 1000) break;
  }
  return null;
}

async function ensureTeacher() {
  const existing = await findAuthUserByEmail(TEACHER.email);
  if (existing) {
    if (existing.app_metadata?.role !== "teacher") {
      await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: { ...existing.app_metadata, role: "teacher" },
      });
    }
    ok(`Teacher account ready: ${TEACHER.email} / ${TEACHER.password}`);
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: TEACHER.email,
    password: TEACHER.password,
    email_confirm: true,
    app_metadata: { role: "teacher" },
  });
  if (error) throw new Error(`Create teacher: ${error.message}`);
  ok(`Teacher account created: ${TEACHER.email} / ${TEACHER.password}`);
  return data.user;
}

// ---------------------------------------------------------------------------
// 2. Teaching blocks: one archived "prior unit" block + one active pilot block
// ---------------------------------------------------------------------------

async function ensureBlock({ academic_year, block_code, status: blockStatus, starts_on, ends_on }) {
  const { data: existingRows } = await admin
    .from("teaching_blocks")
    .select("id, status")
    .eq("academic_year", academic_year)
    .eq("block_code", block_code);
  const existing = existingRows?.[0];

  // Only one block may hold status='active' (enforced by a unique partial
  // index). Archive any other active block first so this one can take over.
  if (blockStatus === "active") {
    const { data: actives } = await admin
      .from("teaching_blocks")
      .select("id, academic_year, block_code")
      .eq("status", "active");
    for (const row of actives || []) {
      if (existing && row.id === existing.id) continue;
      await must(
        admin.from("teaching_blocks").update({ status: "archived" }).eq("id", row.id),
        `Archive previously active block ${row.academic_year} ${row.block_code}`,
      );
      warn(`Archived previously active block ${row.academic_year} · ${row.block_code} to make way for the pilot block.`);
    }
  }

  if (existing) {
    if (existing.status !== blockStatus) {
      await must(
        admin.from("teaching_blocks").update({ status: blockStatus }).eq("id", existing.id),
        `Update block ${academic_year} ${block_code}`,
      );
    }
    ok(`Block ${academic_year} · ${block_code} ready (${blockStatus})`);
    return existing.id;
  }

  const row = await must(
    admin
      .from("teaching_blocks")
      .insert({ academic_year, block_code, status: blockStatus, starts_on, ends_on })
      .select("id")
      .single(),
    `Create block ${academic_year} ${block_code}`,
  );
  ok(`Block ${academic_year} · ${block_code} created (${blockStatus})`);
  return row.id;
}

// ---------------------------------------------------------------------------
// 3. Roster: 10 students across 3 teams (4 + 4 + 2)
// ---------------------------------------------------------------------------

const STUDENTS = [
  // Team 1 (4 students)
  { student_id: "s1001", full_name: "Ava Chen", team_number: 1 },
  { student_id: "s1002", full_name: "Liam Nguyen", team_number: 1 },
  { student_id: "s1003", full_name: "Maya Patel", team_number: 1 },
  { student_id: "s1004", full_name: "Noah Kim", team_number: 1 },
  // Team 2 (4 students)
  { student_id: "s1005", full_name: "Zoe Martin", team_number: 2 },
  { student_id: "s1006", full_name: "Ethan Wright", team_number: 2 },
  { student_id: "s1007", full_name: "Ivy Zhao", team_number: 2 },
  { student_id: "s1008", full_name: "Lucas Silva", team_number: 2 },
  // Team 3 (2 students)
  { student_id: "s1009", full_name: "Ruby Adams", team_number: 3 },
  { student_id: "s1010", full_name: "Omar Farouk", team_number: 3 },
].map((row) => ({ ...row, vu_email: `${row.student_id}@student.vu.edu.au` }));

async function ensureRoster(blockId) {
  const rows = STUDENTS.map((s) => ({
    block_id: blockId,
    student_id: s.student_id,
    full_name: s.full_name,
    vu_email: s.vu_email,
    team_number: s.team_number,
  }));
  await must(
    admin.from("student_roster").upsert(rows, { onConflict: "block_id,student_id" }),
    "Upsert student roster",
  );
  ok(`Roster ready: ${STUDENTS.length} students across 3 teams (4 / 4 / 2)`);
}

async function ensureTeams(blockId) {
  const teamNumbers = [1, 2, 3];
  const rows = teamNumbers.map((team_number) => ({ block_id: blockId, team_number }));
  await must(
    admin.from("teams").upsert(rows, { onConflict: "block_id,team_number" }),
    "Upsert teams",
  );
  const teams = await must(
    admin.from("teams").select("id, team_number").eq("block_id", blockId),
    "Read teams",
  );
  ok(`Teams ready: ${teams.length} teams`);
  return new Map(teams.map((t) => [t.team_number, t.id]));
}

// ---------------------------------------------------------------------------
// 4. Projects: 5 AI projects across different domains
// ---------------------------------------------------------------------------

const PROJECTS = [
  {
    title: "EduPath AI Tutor",
    problem: "Students in large first-year units cannot get timely, individual feedback on practice problems.",
    target_users: "First-year university students studying introductory STEM subjects.",
    description: "An AI-assisted tutor that reviews a student's working, identifies the specific misconception behind an incorrect answer, and generates a targeted follow-up question.",
    expected_outcomes: "Reduced time-to-feedback and measurable improvement in practice-quiz accuracy over a teaching block.",
    category: "AI",
  },
  {
    title: "TriageAssist Health Companion",
    problem: "Rural clinics have long wait times because low-acuity and high-acuity presentations are not distinguished before intake.",
    target_users: "Front-desk clinic staff and patients at low-resource rural clinics.",
    description: "A symptom-intake assistant that structures a patient's free-text description into a triage-relevant summary for clinic staff, without making a diagnosis.",
    expected_outcomes: "Faster, more consistent triage ordering and clearer intake notes for clinicians.",
    category: "AI",
  },
  {
    title: "FarmSense Crop Advisor",
    problem: "Smallholder farmers lack affordable access to timely, localised advice on irrigation and pest risk.",
    target_users: "Smallholder farmers managing small plots without agronomist access.",
    description: "An AI advisor that combines basic sensor/weather inputs with farmer-reported observations to suggest irrigation timing and flag likely pest or disease risk.",
    expected_outcomes: "Reduced water waste and earlier pest detection compared to a no-advisor baseline.",
    category: "AI",
  },
  {
    title: "SignBridge Accessibility Assistant",
    problem: "Deaf and hard-of-hearing students miss spoken classroom content that isn't captioned in real time.",
    target_users: "Deaf and hard-of-hearing students in mixed in-person/online classrooms.",
    description: "A real-time captioning and glossary-aware summarisation tool that highlights domain-specific terms as they are spoken in class.",
    expected_outcomes: "Session summaries usable for post-class review, with domain terms consistently flagged.",
    category: "AI",
  },
  {
    title: "EcoRoute Sustainability Planner",
    problem: "Small logistics operators have no easy way to estimate the emissions impact of alternative delivery routes.",
    target_users: "Small delivery/logistics operators optimising for cost and emissions together.",
    description: "A route-comparison assistant that estimates relative emissions and cost for candidate delivery routes and explains the trade-off in plain language.",
    expected_outcomes: "Operators can compare at least two route options with a clear cost/emissions trade-off summary.",
    category: "AI",
  },
];

async function ensureProjects(blockId) {
  const rows = PROJECTS.map((p) => ({
    block_id: blockId,
    title: p.title,
    problem: p.problem,
    target_users: p.target_users,
    description: p.description,
    expected_outcomes: p.expected_outcomes,
    category: p.category,
    difficulty: "Standard",
    status: "published",
    source: "teacher",
  }));
  await must(
    admin.from("projects").upsert(rows, { onConflict: "block_id,title" }),
    "Upsert projects",
  );
  const projects = await must(
    admin.from("projects").select("id, title").eq("block_id", blockId),
    "Read projects",
  );
  ok(`Projects ready: ${projects.length} AI projects (education, healthcare, agriculture, accessibility, sustainability)`);
  return projects;
}

async function ensureTeamProjectAssignments(teamIdByNumber, projects) {
  // 3 teams, 5 projects available: assign one distinct project per team so
  // each team's Intake evidence has a distinct project context.
  const byTitle = new Map(projects.map((p) => [p.title, p.id]));
  const assignments = [
    { team_number: 1, project_title: "EduPath AI Tutor" },
    { team_number: 2, project_title: "TriageAssist Health Companion" },
    { team_number: 3, project_title: "FarmSense Crop Advisor" },
  ];
  for (const a of assignments) {
    const teamId = teamIdByNumber.get(a.team_number);
    const projectId = byTitle.get(a.project_title);
    const { data: existingRows } = await admin
      .from("team_project_assignments")
      .select("id")
      .eq("team_id", teamId);
    const existing = existingRows?.[0];
    const payload = {
      team_id: teamId,
      project_id: projectId,
      selection_status: "teacher_confirmed",
      confirmed_at: new Date().toISOString(),
      origin_unit: "NIT3004",
      continued_from_previous_unit: true,
    };
    if (existing) {
      await must(
        admin.from("team_project_assignments").update(payload).eq("id", existing.id),
        `Update assignment for Team ${a.team_number}`,
      );
    } else {
      await must(
        admin.from("team_project_assignments").insert(payload),
        `Create assignment for Team ${a.team_number}`,
      );
    }
  }
  ok("Team ↔ project assignments ready (Team 1 → EduPath, Team 2 → TriageAssist, Team 3 → FarmSense)");
}

// ---------------------------------------------------------------------------
// 5. Student Auth accounts, student_accounts links, and activation
// ---------------------------------------------------------------------------

async function ensureStudentAuthAndAccount(student) {
  let user = await findAuthUserByEmail(student.vu_email);
  const password = "Student123!";
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: student.vu_email,
      password,
      email_confirm: true,
      app_metadata: { role: "student" },
      user_metadata: { student_id: student.student_id },
    });
    if (error) throw new Error(`Create auth user for ${student.student_id}: ${error.message}`);
    user = data.user;
  }

  const { data: existingAccountRows } = await admin
    .from("student_accounts")
    .select("student_id, auth_user_id, status")
    .eq("student_id", student.student_id);
  const existingAccount = existingAccountRows?.[0];

  if (!existingAccount) {
    await must(
      admin.from("student_accounts").insert({
        student_id: student.student_id,
        auth_user_id: user.id,
        status: "activated",
        activated_at: new Date().toISOString(),
      }),
      `Link student_accounts for ${student.student_id}`,
    );
  } else if (existingAccount.status !== "activated") {
    await must(
      admin
        .from("student_accounts")
        .update({ status: "activated", activated_at: new Date().toISOString() })
        .eq("student_id", student.student_id),
      `Activate student_accounts for ${student.student_id}`,
    );
  }

  // complete_student_activation() also creates a student_checkins row so the
  // student's Week-1 context resolves cleanly; seed the equivalent directly.
  const { data: checkinRows } = await admin
    .from("student_checkins")
    .select("id")
    .eq("student_id", student.student_id);
  if (!checkinRows?.length) {
    await must(
      admin.from("student_checkins").insert({
        student_id: student.student_id,
        student_name: student.full_name,
        team_name: `Team ${student.team_number}`,
        goal: "Ship a working prototype of our AI project and validate it with real users.",
        block_id: student.block_id,
        auth_user_id: user.id,
      }),
      `Seed student_checkins for ${student.student_id}`,
    );
  }

  return { ...student, auth_user_id: user.id, password };
}

async function ensureAllStudents(blockId) {
  const results = [];
  for (const student of STUDENTS) {
    const withBlock = { ...student, block_id: blockId };
    results.push(await ensureStudentAuthAndAccount(withBlock));
  }
  ok(`Student accounts ready: ${results.length} activated students (password for all: Student123!)`);
  return results;
}

// ---------------------------------------------------------------------------
// 6. Sessions S1-S10, with S1-S9 open for Intake
// ---------------------------------------------------------------------------

const SESSION_FOCUS = {
  1: "Project Reconnect & Check-in",
  2: "Team Alignment & Four-Week Commitment",
  3: "Project Progress & Work Focus",
  4: "Progress Pre-check",
  5: "Progress Review",
  6: "Review → Action",
  7: "Application Progress + Technical Implementation Report",
  8: "Completion Check + Product Verification",
  9: "Final Readiness",
  10: "Platform Feedback + Final Presentation",
};

async function ensureSessions(blockId, teacherAuthUserId) {
  const today = new Date();
  const rows = [];
  for (let n = 1; n <= 10; n += 1) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() - (10 - n) * 7); // weekly cadence, most in the past
    rows.push({
      block_id: blockId,
      session_number: n,
      week_number: Math.min(4, Math.ceil(n / 3) === 0 ? 1 : Math.ceil(n / 2.5)),
      title: `Session ${n}: ${SESSION_FOCUS[n]}`,
      curriculum_focus: SESSION_FOCUS[n],
      session_date: sessionDate.toISOString().slice(0, 10),
      // studio_sessions allows at most one status='open' row per block, but
      // Intake's own RPCs treat intake_access='open' as unconditionally open
      // regardless of session status — so every past/future Session here can
      // stay 'closed' (attendance-wise) while still being open for Intake.
      status: "closed",
      // S1-S9 are the only session_numbers Intake RPCs accept.
      intake_access: n <= 9 ? "open" : "closed",
      created_by: teacherAuthUserId,
    });
  }

  const { data: existingRows } = await admin
    .from("studio_sessions")
    .select("id, session_number")
    .eq("block_id", blockId);
  const existingByNumber = new Map((existingRows || []).map((r) => [r.session_number, r.id]));

  for (const row of rows) {
    const existingId = existingByNumber.get(row.session_number);
    if (existingId) {
      await must(
        admin.from("studio_sessions").update(row).eq("id", existingId),
        `Update Session ${row.session_number}`,
      );
    } else {
      await must(
        admin.from("studio_sessions").insert(row),
        `Create Session ${row.session_number}`,
      );
    }
  }
  ok("Sessions ready: S1-S10 created, S1-S9 open with Intake access = open");
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding local Supabase at ${API_URL}\n`);

  await ensureTeacher();

  // Historical "prior unit" block: represents where NIT3003 continuity comes
  // from. No roster is seeded here; the schema tracks continuity through
  // team_project_assignments.origin_unit/continued_from_previous_unit, not
  // through duplicate roster rows in a second block.
  await ensureBlock({
    academic_year: 2026,
    block_code: "1B4",
    status: "archived",
    starts_on: "2026-02-02",
    ends_on: "2026-05-01",
  });

  // Active pilot block: this is the one and only block students can log
  // into right now (teaching_blocks allows exactly one 'active' row).
  const pilotBlockId = await ensureBlock({
    academic_year: 2026,
    block_code: "2B2",
    status: "active",
    starts_on: "2026-07-27",
    ends_on: "2026-09-25",
  });

  await ensureRoster(pilotBlockId);
  const teamIdByNumber = await ensureTeams(pilotBlockId);
  const projects = await ensureProjects(pilotBlockId);
  await ensureTeamProjectAssignments(teamIdByNumber, projects);

  const teacher = await findAuthUserByEmail(TEACHER.email);
  await ensureSessions(pilotBlockId, teacher.id);

  const students = await ensureAllStudents(pilotBlockId);

  console.log("\n──────────────────────────────────────────────────────────");
  console.log("Local test fixture ready for AI Session Intake testing.");
  console.log("──────────────────────────────────────────────────────────\n");
  console.log(`Teacher login  → ${TEACHER.email} / ${TEACHER.password}`);
  console.log(`Student login  → any of the following, password: Student123!\n`);
  for (const s of students) {
    console.log(`  ${s.student_id.padEnd(7)} Team ${s.team_number}  ${s.vu_email}`);
  }
  console.log(
    "\nActive block: 2026 · 2B2 (Sessions S1-S9 are Intake-open; S10 is closed)." +
    "\nHistorical block: 2026 · 1B4 (archived, no roster — represents the prior NIT3003 unit).",
  );
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message);
  process.exit(1);
});
