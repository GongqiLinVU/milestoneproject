import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const password = () => `Vu!${randomBytes(12).toString("base64url")}9a`;
const identityKey = (value: unknown) => String(value || "").trim().toLowerCase();

async function findAuthUserByEmail(admin: any, email: string) {
  const wanted = identityKey(email);
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { user: null, error };
    const users = data?.users || [];
    const user = users.find((item: any) => identityKey(item.email) === wanted);
    if (user) return { user, error: null };
    if (users.length < 1000) break;
  }
  return { user: null, error: null };
}

async function teacher(token: string) {
  if (!url || !publishableKey) return false;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const user = await response.json();
  return user?.app_metadata?.role === "teacher";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token || !(await teacher(token))) {
    return res.status(403).json({ error: "Teacher access required." });
  }
  if (!url || !serviceKey) {
    return res.status(503).json({ error: "Student account provisioning is not configured." });
  }

  const blockId = String(req.body?.blockId || "");
  const action = String(req.body?.action || "prepare");
  const requestedStudentId = String(req.body?.studentId || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(blockId)) {
    return res.status(400).json({ error: "Select a valid teaching block." });
  }
  if (!["prepare", "reset"].includes(action)) {
    return res.status(400).json({ error: "Unsupported account action." });
  }
  if (action === "reset" && !requestedStudentId) {
    return res.status(400).json({ error: "Select one student account to reset." });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: roster, error: rosterError } = await admin
    .from("student_roster")
    .select("student_id, full_name, vu_email")
    .eq("block_id", blockId)
    .order("student_id");
  if (rosterError) return res.status(500).json({ error: "Roster could not be loaded." });

  const selectedRoster = requestedStudentId
    ? (roster || []).filter((row) => identityKey(row.student_id) === requestedStudentId)
    : (roster || []);
  if (requestedStudentId && selectedRoster.length !== 1) {
    return res.status(404).json({ error: "The selected student is not in this teaching block." });
  }

  const { data: existing, error: accountError } = await admin
    .from("student_accounts")
    .select("student_id, auth_user_id, status");
  if (accountError) return res.status(500).json({ error: "Student account links could not be loaded." });
  const accounts = new Map((existing || []).map((row) => [identityKey(row.student_id), row]));
  const accountsByAuthUser = new Map((existing || []).map((row) => [row.auth_user_id, row]));

  if (action === "reset") {
    const row = selectedRoster[0];
    const account = accounts.get(identityKey(row.student_id));
    if (!account) {
      return res.status(409).json({ error: "Prepare this student account before resetting its password." });
    }
    const initialPassword = password();
    const { error: authError } = await admin.auth.admin.updateUserById(account.auth_user_id, {
      password: initialPassword,
    });
    if (authError) {
      return res.status(409).json({ error: "The temporary password could not be created." });
    }
    const { error: statusError } = await admin
      .from("student_accounts")
      .update({ status: "ready", activated_at: null, password_reset_at: new Date().toISOString() })
      .eq("student_id", row.student_id);
    if (statusError) {
      return res.status(500).json({ error: "Password changed, but activation status could not be reset. Contact support before sharing it." });
    }
    return res.status(200).json({
      action: "reset",
      credentials: [{ studentId: row.student_id, name: row.full_name, initialPassword }],
    });
  }

  const pending = selectedRoster.filter((row) => !accounts.has(identityKey(row.student_id)));
  const invalid = pending.filter(
    (row) => !row.vu_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.vu_email),
  );
  if (invalid.length) {
    return res.status(409).json({
      error: requestedStudentId
        ? "This student needs a valid, unique VU email before the account is prepared."
        : "Every pending student needs a valid, unique VU email before accounts are prepared.",
      studentIds: invalid.map((row) => row.student_id),
    });
  }

  const credentials: Array<{ studentId: string; name: string; initialPassword: string }> = [];
  let reused = selectedRoster.length - pending.length;
  for (const row of pending) {
    const authLookup = await findAuthUserByEmail(admin, row.vu_email);
    if (authLookup.error) {
      return res.status(500).json({ error: `Auth accounts could not be checked for ${row.student_id}.`, credentials });
    }
    if (authLookup.user) {
      const linkedAccount = accountsByAuthUser.get(authLookup.user.id);
      const authStudentId = identityKey(authLookup.user.user_metadata?.student_id);
      const rosterStudentId = identityKey(row.student_id);
      const linkedStudentId = identityKey(linkedAccount?.student_id);
      const matchesStudent = authStudentId === rosterStudentId || linkedStudentId === rosterStudentId;

      if (!matchesStudent) {
        const existingStudentId = linkedAccount?.student_id || authLookup.user.user_metadata?.student_id || "another student";
        return res.status(409).json({
          error: `The email for ${row.student_id} already belongs to ${existingStudentId}. A continuing student must use the same Student ID in every block; do not change their email.`,
          studentId: row.student_id,
          existingStudentId,
          credentials,
        });
      }

      if (!linkedAccount) {
        const { error: restoreError } = await admin.from("student_accounts").insert({
          student_id: row.student_id,
          auth_user_id: authLookup.user.id,
          status: authLookup.user.last_sign_in_at ? "activated" : "ready",
        });
        if (restoreError) {
          return res.status(409).json({
            error: `The existing Auth account for ${row.student_id} was found, but its platform link could not be restored.`,
            credentials,
          });
        }
      }
      reused += 1;
      continue;
    }

    const initialPassword = password();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: row.vu_email,
      password: initialPassword,
      email_confirm: true,
      app_metadata: { role: "student" },
      user_metadata: { student_id: identityKey(row.student_id) },
    });
    if (error || !created.user) {
      return res.status(409).json({
        error: `Account preparation stopped at ${row.student_id}. The Auth account could not be created; retry or inspect its Auth record.`,
        credentials,
      });
    }
    const { error: linkError } = await admin.from("student_accounts").insert({
      student_id: identityKey(row.student_id),
      auth_user_id: created.user.id,
      status: "ready",
    });
    if (linkError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return res.status(409).json({ error: `Account link failed for ${row.student_id}.`, credentials });
    }
    credentials.push({ studentId: row.student_id, name: row.full_name, initialPassword });
  }
  return res.status(200).json({ action: "prepare", credentials, reused });
}
