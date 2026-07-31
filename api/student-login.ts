import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!url || !key || !serviceKey) return res.status(503).json({ error: "Student login is unavailable." });
  const studentId = String(req.body?.studentId || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (studentId.length < 3 || password.length < 8) {
    return res.status(400).json({ error: "Student ID or password is incorrect." });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: account } = await admin
    .from("student_accounts")
    .select("auth_user_id")
    .eq("student_id", studentId)
    .maybeSingle();
  if (!account) return res.status(401).json({ error: "Student ID or password is incorrect." });
  const { data: user } = await admin.auth.admin.getUserById(account.auth_user_id);
  if (!user.user?.email) return res.status(401).json({ error: "Student ID or password is incorrect." });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.user.email,
    password,
  });
  if (error || !data.session) return res.status(401).json({ error: "Student ID or password is incorrect." });
  return res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}
