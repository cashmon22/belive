import type { EmailTemplate } from "../../shared/site-settings";
export type EmailVariables = {
  name?: string;
  email?: string;
  device?: string;
  reference_number?: string;
  status?: string;
  date?: string;
};

export function sanitizeEmailHtml(html: string) {
  const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h1", "h2", "h3", "blockquote"]);
  return html.replace(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi, (tag) => {
    const match = tag.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!match) return "";
    const [, closing, rawName, rawAttributes] = match;
    const name = rawName.toLowerCase();
    if (!allowedTags.has(name)) return "";
    if (closing) return name === "br" ? "" : `</${name}>`;
    if (name === "br") return "<br>";
    if (name !== "a") return `<${name}>`;
    const hrefMatch = rawAttributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "";
    if (!href || !isSafeEmailLink(href)) return "<a>";
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">`;
  });
}

export function renderEmailTemplate(template: EmailTemplate, variables: EmailVariables) {
  const subject = replaceVariables(template.subject, variables, false).replace(/[\r\n\u0000-\u001f]/g, " ").trim();
  const body = replaceVariables(template.body, variables, false);
  const html = sanitizeEmailHtml(replaceVariables(template.html, variables, true));
  return { subject, body, html };
}

function replaceVariables(input: string, variables: EmailVariables, escape: boolean) {
  return input.replace(/\{\{\s*(name|email|device|reference_number|status|date)\s*\}\}/g, (_match, key: keyof EmailVariables) => {
    const value = String(variables[key] ?? "");
    return escape ? escapeHtml(value) : value;
  });
}

function isSafeEmailLink(value: string) {
  if (/^[\u0000-\u0020]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return value.startsWith("/") && !value.startsWith("//");
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
