import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ResponseLike = { status: (code: number) => ResponseLike; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

const normalise = (value: unknown) => String(value ?? "").trim().toLowerCase();
const hash = (value: string, salt: string) => createHash("sha256").update(`${salt}|${value}`).digest("hex");
const genericMismatch = "We could not find that Student ID in the active block. Check the ID or ask your teacher.";

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = process.env.FIND_MY_TEAM_SALT;
  if (!url || !serviceKey || !salt) return res.status(503).json({ error: "Find My Team is not configured yet." });

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const studentId = normalise(body.studentId);
  if (studentId.length < 3 || studentId.length > 40) {
    return res.status(404).json({ error: genericMismatch });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || req.socket?.remoteAddress || "unknown";
  const requesterHash = hash(ip.trim(), salt);
  const identityHash = hash(studentId, salt);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count, error: rateError } = await supabase
    .from("team_lookup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("requester_hash", requesterHash)
    .gte("attempted_at", windowStart);
  if (rateError) return res.status(503).json({ error: "Find My Team is temporarily unavailable." });
  if ((count ?? 0) >= 5) return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes or ask your teacher." });

  const { data: block, error: blockError } = await supabase
    .from("teaching_blocks")
    .select("id, academic_year, block_code")
    .eq("status", "active")
    .single();
  if (blockError || !block) return res.status(503).json({ error: "There is no active teaching block." });

  const { data: student } = await supabase
    .from("student_roster")
    .select("id, block_id, team_number, project_name, preferred_name, full_name")
    .eq("block_id", block.id)
    .eq("student_id", studentId)
    .maybeSingle();

  await supabase.from("team_lookup_attempts").insert({
    requester_hash: requesterHash,
    identity_hash: identityHash,
    succeeded: Boolean(student),
  });

  if (!student) return res.status(404).json({ error: genericMismatch });

  const { data: members, error: membersError } = await supabase
    .from("student_roster")
    .select("id, preferred_name, full_name")
    .eq("block_id", block.id)
    .eq("team_number", student.team_number)
    .order("full_name", { ascending: true });
  if (membersError) return res.status(503).json({ error: "Your team was matched, but its details could not be loaded." });

  return res.status(200).json({
    block: `${block.academic_year} · ${block.block_code}`,
    team: `Team ${student.team_number}`,
    projectName: student.project_name || null,
    teammates: (members ?? []).filter((member) => member.id !== student.id).map((member) => member.preferred_name || member.full_name),
  });
}
