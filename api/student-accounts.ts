import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const password = () => `Vu!${randomBytes(12).toString("base64url")}9a`;

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
    ? (roster || []).filter((row) => row.student_id === requestedStudentId)
    : (roster || []);
  if (requestedStudentId && selectedRoster.length !== 1) {
    return res.status(404).json({ error: "The selected student is not in this teaching block." });
  }

  const ids = selectedRoster.map((row) => row.student_id);
  const { data: existing } = ids.length
    ? await admin.from("student_accounts").select("student_id, auth_user_id, status").in("student_id", ids)
    : { data: [] as Array<{ student_id: string; auth_user_id: string; status: string }> };
  const accounts = new Map((existing || []).map((row) => [row.student_id, row]));

  if (action === "reset") {
    const row = selectedRoster[0];
    const account = accounts.get(row.student_id);
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

  const pending = selectedRoster.filter((row) => !accounts.has(row.student_id));
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
  for (const row of pending) {
    const initialPassword = password();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: row.vu_email,
      password: initialPassword,
      email_confirm: true,
      app_metadata: { role: "student" },
      user_metadata: { student_id: row.student_id },
    });
    if (error || !created.user) {
      return res.status(409).json({
        error: `Account preparation stopped at ${row.student_id}. Correct duplicate email or Auth details, then retry.`,
        credentials,
      });
    }
    const { error: linkError } = await admin.from("student_accounts").insert({
      student_id: row.student_id,
      auth_user_id: created.user.id,
      status: "ready",
    });
    if (linkError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return res.status(409).json({ error: `Account link failed for ${row.student_id}.`, credentials });
    }
    credentials.push({ studentId: row.student_id, name: row.full_name, initialPassword });
  }
  return res.status(200).json({ action: "prepare", credentials });
}
