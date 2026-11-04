/**
 * The subset of mustache that LangSmith prompts use here: `{{name}}` (HTML-escaped, as in the
 * Playground), and `{{{name}}}` or `{{& name}}` (verbatim). Sections, partials and comments are
 * rejected, so a Hub edit that adds one fails loudly instead of rendering wrongly.
 */

export class MustacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MustacheError";
  }
}

const TAG = /\{\{\{\s*([^}]*?)\s*\}\}\}|\{\{\s*([^}]*?)\s*\}\}/g;

type Tag = { name: string; raw: boolean };

function parseTag(triple: string | undefined, double: string | undefined): Tag {
  if (triple !== undefined) return { name: triple, raw: true };
  const body = double ?? "";
  if (body.startsWith("&")) return { name: body.slice(1).trim(), raw: true };
  if (/^[#^/!>=]/.test(body)) throw new MustacheError(`unsupported mustache tag: {{${body}}}`);
  return { name: body, raw: false };
}

/** Variable names in order of first use. */
export function templateVariables(template: string): string[] {
  const names = [...template.matchAll(TAG)].map((match) => parseTag(match[1], match[2]).name);
  return [...new Set(names)];
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Renders `template`, throwing a MustacheError that names every missing variable. */
export function renderMustache(template: string, vars: Record<string, string>): string {
  const missing = templateVariables(template).filter((name) => vars[name] === undefined);
  if (missing.length > 0) throw new MustacheError(`missing variables: ${missing.join(", ")}`);
  return template.replace(TAG, (_tag, triple?: string, double?: string) => {
    const { name, raw } = parseTag(triple, double);
    const value = vars[name] ?? "";
    return raw ? value : value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
  });
}
