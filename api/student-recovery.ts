import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const studentId = String(req.body?.studentId || "").trim().toLowerCase();
  if (url && key && service && studentId.length >= 3) {
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: account } = await admin.from("student_accounts").select("auth_user_id").eq("student_id", studentId).maybeSingle();
    if (account) {
      const { data } = await admin.auth.admin.getUserById(account.auth_user_id);
      if (data.user?.email) {
        const client = createClient(url, key, { auth: { persistSession: false } });
        await client.auth.resetPasswordForEmail(data.user.email, {
          redirectTo: `${String(req.headers.origin || "")}/`,
        });
      }
    }
  }
  return res.status(200).json({ message: "If the account is available, recovery instructions have been sent to its VU email." });
}
