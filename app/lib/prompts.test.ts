import { describe, expect, it } from "vitest";

import { templateVariables } from "./mustache";
import {
  FEEDBACK_OUTPUT_SCHEMA,
  FEEDBACK_PROMPT,
  feedbackManifest,
  feedbackVariables,
  parsePromptManifest,
  PromptError,
  renderPrompt,
  SAMPLE_FEEDBACK_INPUT,
} from "./prompts";

describe("feedback prompt", () => {
  it("uses exactly the variables feedbackVariables() provides", () => {
    const used = FEEDBACK_PROMPT.messages.flatMap((m) => templateVariables(m.template));
    expect(new Set(used)).toEqual(new Set(Object.keys(feedbackVariables(SAMPLE_FEEDBACK_INPUT))));
  });

  it("states the tone rules and the output fields", () => {
    const system = FEEDBACK_PROMPT.messages[0]?.template ?? "";
    expect(system).toMatch(/encouraging/i);
    expect(system).toMatch(/adult/i);
    expect(system).toMatch(/at most 3 sentences/i);
    for (const field of FEEDBACK_OUTPUT_SCHEMA.required) expect(system).toContain(field);
  });

  it("requires all four output fields", () => {
    expect(FEEDBACK_OUTPUT_SCHEMA.required).toEqual([
      "listOfWordsToHighlight",
      "feedback",
      "wordsSkipped",
      "wordsAdded",
    ]);
  });
});

describe("feedbackVariables", () => {
  it("formats scores and targets, and lists the reference text in step order", () => {
    const vars = feedbackVariables({
      ...SAMPLE_FEEDBACK_INPUT,
      expectedSentences: [
        { id: 2, content: "Second.", sequenceNumber: 2 },
        { id: 1, content: "First.", sequenceNumber: 1 },
      ],
    });
    expect(vars.reference_text).toBe("First. Second.");
    expect(vars.scores).toContain("Words correct per minute: 52");
    expect(vars.thresholds).toContain("Accuracy: 85%");
  });

  it("omits completeness for Deepgram and says when there are no candidate words", () => {
    const vars = feedbackVariables({
      ...SAMPLE_FEEDBACK_INPUT,
      scorer: "deepgram",
      result: { ...SAMPLE_FEEDBACK_INPUT.result, completeness: undefined, problemWords: [] },
    });
    expect(vars.scorer).toBe("Deepgram");
    expect(vars.scores).not.toContain("Completeness");
    expect(vars.candidate_words).toBe("(none)");
  });
});

describe("manifest", () => {
  it("round-trips through the LangChain StructuredPrompt format", () => {
    const manifest = feedbackManifest();
    expect(manifest.id.at(-1)).toBe("StructuredPrompt");
    expect(parsePromptManifest(manifest)).toEqual(FEEDBACK_PROMPT);
  });

  it("also reads a plain ChatPromptTemplate", () => {
    const manifest = {
      ...feedbackManifest(),
      id: ["langchain", "prompts", "chat", "ChatPromptTemplate"],
    };
    expect(parsePromptManifest(manifest).messages).toEqual(FEEDBACK_PROMPT.messages);
  });

  it("rejects f-string templates, which would not render with our variables", () => {
    const manifest = JSON.parse(
      JSON.stringify(feedbackManifest()).replaceAll('"mustache"', '"f-string"'),
    ) as unknown;
    expect(() => parsePromptManifest(manifest)).toThrow(PromptError);
  });

  it("rejects something that is not a prompt", () => {
    expect(() => parsePromptManifest({ hello: "world" })).toThrow(PromptError);
  });
});

describe("renderPrompt", () => {
  it("fills every placeholder", () => {
    const messages = renderPrompt(FEEDBACK_PROMPT, feedbackVariables(SAMPLE_FEEDBACK_INPUT));
    expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
    for (const message of messages) expect(message.content).not.toMatch(/\{\{|\}\}/);
    expect(messages[1]?.content).toContain(SAMPLE_FEEDBACK_INPUT.result.transcript);
  });
});
