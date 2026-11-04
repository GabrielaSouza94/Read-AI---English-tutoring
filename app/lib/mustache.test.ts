import { describe, expect, it } from "vitest";

import { MustacheError, renderMustache, templateVariables } from "./mustache";

describe("templateVariables", () => {
  it("lists each variable once, in order of first use", () => {
    expect(templateVariables("{{{a}}} {{ b }} {{a}} {{&c}}")).toEqual(["a", "b", "c"]);
  });

  it("rejects sections and partials, which the prompt does not use", () => {
    expect(() => templateVariables("{{#words}}x{{/words}}")).toThrow(MustacheError);
    expect(() => templateVariables("{{> other}}")).toThrow(MustacheError);
  });
});

describe("renderMustache", () => {
  it("fills triple-brace and ampersand variables verbatim", () => {
    expect(renderMustache("{{{text}}} / {{& text}}", { text: '"a" < b' })).toBe(
      '"a" < b / "a" < b',
    );
  });

  it("HTML-escapes double-brace variables, like the Playground", () => {
    expect(renderMustache("{{text}}", { text: `<i>&"'` })).toBe("&lt;i&gt;&amp;&quot;&#39;");
  });

  it("names every missing variable", () => {
    expect(() => renderMustache("{{{a}}} {{{b}}} {{{c}}}", { b: "" })).toThrow(
      "missing variables: a, c",
    );
  });

  it("does not re-render braces inside a value", () => {
    expect(renderMustache("{{{a}}}", { a: "{{{b}}}" })).toBe("{{{b}}}");
  });
});
