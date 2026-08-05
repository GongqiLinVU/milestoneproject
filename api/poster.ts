import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = "poster-gallery";
const maxBytes = 1 * 1024 * 1024;
const types = new Set(["application/pdf", "image/png", "image/jpeg"]);

type Access = {
  userId: string;
  role: "student" | "teacher";
  blockId: string;
  teamId: string;
};

const cleanFilename = (value: unknown) =>
  String(value || "poster").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255) || "poster";

function extension(type: string) {
  return type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg";
}

function matchesSignature(bytes: Uint8Array, type: string) {
  if (type === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!url || !serviceKey) return res.status(503).json({ error: "Poster Gallery is not configured." });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in before using Poster Gallery." });
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return res.status(401).json({ error: "Your session has expired. Please sign in again." });

  const action = String(req.body?.action || "");
  const requestedTeamId = String(req.body?.teamId || "");

  async function access(): Promise<Access | null> {
    if (user?.app_metadata?.role === "teacher") {
      if (!/^[0-9a-f-]{36}$/i.test(requestedTeamId)) return null;
      const { data: team } = await admin.from("teams").select("id,block_id").eq("id", requestedTeamId).maybeSingle();
      return team ? { userId: user.id, role: "teacher", blockId: team.block_id, teamId: team.id } : null;
    }
    const { data: account } = await admin.from("student_accounts").select("student_id,status").eq("auth_user_id", user.id).eq("status", "activated").maybeSingle();
    if (!account) return null;
    const { data: roster } = await admin
      .from("student_roster")
      .select("block_id,team_number,block:teaching_blocks!inner(status,starts_on,created_at)")
      .eq("student_id", account.student_id)
      .eq("block.status", "active")
      .limit(1)
      .maybeSingle();
    if (!roster) return null;
    const { data: team } = await admin.from("teams").select("id").eq("block_id", roster.block_id).eq("team_number", roster.team_number).maybeSingle();
    if (!team || (requestedTeamId && requestedTeamId !== team.id)) return null;
    return { userId: user.id, role: "student", blockId: roster.block_id, teamId: team.id };
  }

  if (action === "request-upload") {
    const type = String(req.body?.mimeType || "");
    const size = Number(req.body?.sizeBytes || 0);
    if (!types.has(type)) return res.status(400).json({ error: "Use a one-page PDF, PNG, JPG or JPEG file." });
    if (!Number.isSafeInteger(size) || size < 1 || size > maxBytes) return res.status(400).json({ error: "Keep it simple — Poster files must be 1 MB or smaller." });
    const scope = await access();
    if (!scope) return res.status(403).json({ error: "You can upload only for your authorised Team." });
    const path = `drafts/${scope.blockId}/${scope.teamId}/${randomUUID()}.${extension(type)}`;
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) return res.status(500).json({ error: "A secure Poster upload could not be prepared." });
    return res.status(200).json({ path, token: data.token });
  }

  if (action === "finalize-upload") {
    const scope = await access();
    if (!scope) return res.status(403).json({ error: "You can finalise only your authorised Team Poster." });
    const path = String(req.body?.path || "");
    const type = String(req.body?.mimeType || "");
    const expectedPrefix = `drafts/${scope.blockId}/${scope.teamId}/`;
    if (!path.startsWith(expectedPrefix) || !types.has(type)) return res.status(400).json({ error: "This Poster upload is not valid for the selected Team." });
    const { data: file, error: downloadError } = await admin.storage.from(bucket).download(path);
    if (downloadError || !file) return res.status(400).json({ error: "The uploaded Poster could not be validated. Please upload it again." });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const reject = async (message: string) => {
      await admin.storage.from(bucket).remove([path]);
      return res.status(400).json({ error: message });
    };
    if (bytes.length < 1 || bytes.length > maxBytes) return reject("Keep it simple — Poster files must be 1 MB or smaller.");
    if (!matchesSignature(bytes, type)) return reject("The file content does not match the selected PDF or image format.");
    if (type === "application/pdf") {
      try {
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
        if (pdf.getPageCount() !== 1) return reject("Poster PDF files must contain exactly one page.");
      } catch {
        return reject("This PDF could not be read. Export a standard, non-password-protected one-page PDF and try again.");
      }
    }
    const originalFilename = cleanFilename(req.body?.originalFilename);
    const { data: version, error: versionError } = await admin.from("poster_versions").insert({
      block_id: scope.blockId,
      team_id: scope.teamId,
      storage_path: path,
      original_filename: originalFilename,
      mime_type: type,
      size_bytes: bytes.length,
      uploader_auth_user_id: scope.userId,
      uploader_role: scope.role,
    }).select("id,original_filename,mime_type,size_bytes,created_at").single();
    if (versionError || !version) {
      await admin.storage.from(bucket).remove([path]);
      return res.status(500).json({ error: "The validated Poster could not be recorded. Please try again." });
    }
    const { error: pointerError } = await admin.from("team_posters").upsert({
      block_id: scope.blockId,
      team_id: scope.teamId,
      draft_version_id: version.id,
    }, { onConflict: "block_id,team_id" });
    if (pointerError) {
      await admin.from("poster_versions").delete().eq("id", version.id);
      await admin.storage.from(bucket).remove([path]);
      return res.status(500).json({ error: "The Team Poster could not be linked. Please try again." });
    }
    return res.status(200).json({
      versionId: version.id,
      originalFilename: version.original_filename,
      mimeType: version.mime_type,
      sizeBytes: version.size_bytes,
      createdAt: version.created_at,
    });
  }

  if (action === "view") {
    const versionId = String(req.body?.versionId || "");
    if (!/^[0-9a-f-]{36}$/i.test(versionId)) return res.status(400).json({ error: "Select a valid Poster." });
    const { data: version } = await admin.from("poster_versions").select("id,block_id,team_id,storage_path,status").eq("id", versionId).eq("status", "ready").maybeSingle();
    if (!version) return res.status(404).json({ error: "Poster not found." });

    let allowed = user?.app_metadata?.role === "teacher";
    if (!allowed) {
      const { data: account } = await admin.from("student_accounts").select("student_id").eq("auth_user_id", user.id).eq("status", "activated").maybeSingle();
      if (account) {
        const { data: roster } = await admin.from("student_roster").select("block_id,team_number,block:teaching_blocks!inner(status)").eq("student_id", account.student_id).eq("block_id", version.block_id).eq("block.status", "active").maybeSingle();
        const { data: gallery } = await admin.from("poster_gallery_settings").select("is_published").eq("block_id", version.block_id).maybeSingle();
        const { data: targetTeam } = await admin.from("teams").select("team_number").eq("id", version.team_id).maybeSingle();
        const { data: pointer } = await admin.from("team_posters").select("draft_version_id,published_version_id").eq("team_id", version.team_id).maybeSingle();
        const ownTeam = roster && targetTeam && roster.team_number === targetTeam.team_number;
        allowed = Boolean(roster && pointer && (
          (ownTeam && pointer.draft_version_id === version.id) ||
          (gallery?.is_published && pointer.published_version_id === version.id)
        ));
      }
    }
    if (!allowed) return res.status(403).json({ error: "This Poster is not available to your account." });
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(version.storage_path, 600);
    if (error || !data?.signedUrl) return res.status(500).json({ error: "Poster preview could not be opened." });
    return res.status(200).json({ signedUrl: data.signedUrl });
  }

  return res.status(400).json({ error: "Unsupported Poster action." });
}
