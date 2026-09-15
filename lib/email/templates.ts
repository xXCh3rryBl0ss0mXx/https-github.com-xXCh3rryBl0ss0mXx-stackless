import type { NudgeKind } from "@/lib/data/types";

export function nudgeSubject(kind: NudgeKind): string {
  return kind === "invoice" ? "Invoice reminder" : "Quick check-in";
}

export function nudgeEmailText(draftText: string): string {
  return draftText.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function draftToHtml(draftText: string): string {
  const escaped = escapeHtml(draftText.trim());
  if (!escaped) return "";
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 1rem 0;">${block.replaceAll("\n", "<br />")}</p>`)
    .join("");
}

/** Soft peach/mint HTML wrapper. Body is the draft text (escaped). */
export function nudgeEmailHtml(kind: NudgeKind, draftText: string): string {
  const tagBg = kind === "invoice" ? "#f3e8ff" : "#dff7ec";
  const tagFg = kind === "invoice" ? "#6d28d9" : "#1f7a55";
  const tagLabel = kind === "invoice" ? "Invoice" : "Follow-up";
  const body = draftToHtml(draftText) || "<p style=\"margin:0 0 1rem 0;\">Hi — just checking in.</p>";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#fff8f0;">
    <div style="max-width:560px;margin:24px auto;padding:28px 24px;background:#ffffff;border:1px solid #f0e2d4;border-radius:20px;font-family:'Trebuchet MS','Segoe UI',sans-serif;color:#2b2118;line-height:1.55;font-size:16px;">
      <div style="display:inline-block;background:${tagBg};color:${tagFg};border-radius:999px;padding:2px 10px;font-size:12px;font-weight:800;margin-bottom:16px;">${tagLabel}</div>
      ${body}
      <p style="margin:24px 0 0;font-size:13px;color:#6f5b4a;">Sent with Stackless</p>
    </div>
  </body>
</html>`;
}
