import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ResponseLike = { status: (code: number) => ResponseLike; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };
type LookupResult = {
  outcome: "found" | "not_found" | "rate_limited" | "no_active_block" | "unavailable";
  block_label: string | null;
  team_label: string | null;
  project_name: string | null;
  teammates: string[] | null;
};

const normalise = (value: unknown) => String(value ?? "").trim().toLowerCase();
const hash = (value: string, salt: string) => createHash("sha256").update(`${salt}|${value}`).digest("hex");
const genericMismatch = "We could not find that Student ID in the active block. Check the ID or ask your teacher.";

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const salt = process.env.FIND_MY_TEAM_SALT;
  if (!url || !publishableKey || !salt) return res.status(503).json({ error: "Find My Team is not configured yet." });

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const studentId = normalise(body.studentId);
  if (studentId.length < 3 || studentId.length > 40) {
    return res.status(404).json({ error: genericMismatch });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || req.socket?.remoteAddress || "unknown";
  const requesterHash = hash(ip.trim(), salt);
  const identityHash = hash(studentId, salt);

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("find_student_team", {
    p_student_id: studentId,
    p_requester_hash: requesterHash,
    p_identity_hash: identityHash,
  });

  if (error) return res.status(503).json({ error: "Find My Team is temporarily unavailable." });

  const result = (Array.isArray(data) ? data[0] : data) as LookupResult | null;
  if (!result || result.outcome === "unavailable") {
    return res.status(503).json({ error: "Find My Team is temporarily unavailable." });
  }
  if (result.outcome === "rate_limited") {
    return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes or ask your teacher." });
  }
  if (result.outcome === "no_active_block") {
    return res.status(503).json({ error: "There is no active teaching block." });
  }
  if (result.outcome !== "found") {
    return res.status(404).json({ error: genericMismatch });
  }

  return res.status(200).json({
    block: result.block_label,
    team: result.team_label,
    projectName: result.project_name,
    teammates: result.teammates ?? [],
  });
}
