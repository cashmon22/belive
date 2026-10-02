import { describe, expect, it } from "vitest";
import { renderEmailTemplate, sanitizeEmailHtml } from "./email-templates";
import type { EmailTemplate } from "../../shared/site-settings";

const template: EmailTemplate = {
  key: "new_application",
  label: "Application",
  subject: "Hello {{name}}",
  body: "Reference {{reference_number}}",
  html: "<p>Hello {{name}}</p><script>alert(1)</script><a href=\"javascript:alert(1)\" onclick=\"alert(1)\">unsafe</a>",
  enabled: true,
};

describe("email template rendering", () => {
  it("escapes submitted values and removes unsafe HTML", () => {
    const rendered = renderEmailTemplate(template, { name: "<img src=x onerror=alert(1)>", reference_number: "R-1" });
    expect(rendered.subject).toBe("Hello <img src=x onerror=alert(1)>");
    expect(rendered.body).toBe("Reference R-1");
    expect(rendered.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("javascript:");
    expect(rendered.html).not.toContain("onclick");
  });

  it("preserves approved formatting while dropping unsafe tags and attributes", () => {
    expect(sanitizeEmailHtml("<p onclick=\"x()\">Hello <strong>there</strong></p><iframe src=\"x\"></iframe>"))
      .toBe("<p>Hello <strong>there</strong></p>");
  });
});
