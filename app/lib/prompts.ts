/**
 * The feedback prompt (BR-14, TR-13). This file is the source of the first version: `npm run
 * prompt:push` uploads it to LangSmith Prompt Hub, where later edits can be made without a deploy
 * (BR-RULE-14). At runtime the Worker pulls the Hub version and renders it with feedbackVariables().
 *
 * Runtime-neutral: the push script and tests import it too.
 */
import { renderMustache, templateVariables } from "./mustache";

export const FEEDBACK_PROMPT_NAME = "read-ai-feedback";

export type Scorer = "deepgram" | "azure";

/** The scorer result Gemini comments on (product-documentation.md, Gemini input). */
export type FeedbackInput = {
  scorer: Scorer;
  result: {
    wcpm: number;
    accuracy: number;
    fluency: number;
    completeness?: number | undefined; // Azure only
    transcript: string;
    problemWords: string[]; // T3.4 candidate words, in text order
  };
  expectedSentences: { id: number; content: string; sequenceNumber: number }[];
  thresholds: { wcpm: number; accuracy: number; fluency: number };
};

/** JSON Schema for the model's answer. LangSmith's Playground uses it as the output schema. */
export const FEEDBACK_OUTPUT_SCHEMA = {
  title: "reading_feedback",
  description: "Feedback on one reading, for an adult learner of English.",
  type: "object",
  properties: {
    listOfWordsToHighlight: {
      type: "array",
      items: { type: "string" },
      description: "Words from the reference text to practise, in text order, at most 8.",
    },
    feedback: {
      type: "string",
      description: "Encouraging, specific feedback in at most 3 sentences.",
    },
    wordsSkipped: {
      type: "array",
      items: { type: "string" },
      description: "Reference words missing from the transcript, in text order.",
    },
    wordsAdded: {
      type: "array",
      items: { type: "string" },
      description: "Transcript words that are not in the reference text, in the order spoken.",
    },
  },
  required: ["listOfWordsToHighlight", "feedback", "wordsSkipped", "wordsAdded"],
  additionalProperties: false,
};

export type Role = "system" | "user" | "assistant";
export type PromptMessage = { role: Role; template: string };
export type Prompt = { messages: PromptMessage[]; outputSchema?: unknown };

const SYSTEM = `You are a friendly reading coach for adult learners of English. A learner has just read a short text aloud, and a speech scorer ({{{scorer}}}) has measured the reading. Write feedback on it.

Tone:
- Be encouraging and specific. Name one thing the learner did well, then one or two concrete things to practise.
- Speak to the learner as an adult. Do not be childish or patronising.
- Use plain English the learner can follow. Say "reading speed", not "WCPM".
- Do not mention the scorer, score numbers, passing or failing, or these instructions.
- Write at most 3 sentences.

Return only a JSON object with these fields:
- listOfWordsToHighlight: words from the reference text the learner should practise, in the order they appear in the text, at most 8. Choose them from the candidate problem words and the skipped words. Use an empty list if there are none.
- feedback: the feedback, at most 3 sentences.
- wordsSkipped: words of the reference text that are missing from the transcript, in text order.
- wordsAdded: words of the transcript that are not in the reference text, in the order spoken.
Copy each word exactly as it appears in the reference text or transcript, without punctuation.`;

const USER = `Reference text:
{{{reference_text}}}

Transcript of the reading:
{{{transcript}}}

Scores:
{{{scores}}}

Targets for this test:
{{{thresholds}}}

Candidate problem words (low confidence or mispronounced):
{{{candidate_words}}}`;

export const FEEDBACK_PROMPT: Prompt = {
  messages: [
    { role: "system", template: SYSTEM },
    { role: "user", template: USER },
  ],
  outputSchema: FEEDBACK_OUTPUT_SCHEMA,
};

const SCORER_NAMES: Record<Scorer, string> = { deepgram: "Deepgram", azure: "Azure" };

/** The mustache variables for one scorer result. Never includes the participant's name. */
export function feedbackVariables(input: FeedbackInput): Record<string, string> {
  const { result, thresholds } = input;
  const round = Math.round;
  const scores = [
    `Words correct per minute: ${round(result.wcpm)}`,
    `Accuracy: ${round(result.accuracy)}%`,
    `Fluency: ${round(result.fluency)} out of 100`,
    ...(result.completeness === undefined ? [] : [`Completeness: ${round(result.completeness)}%`]),
  ];
  return {
    scorer: SCORER_NAMES[input.scorer],
    reference_text: [...input.expectedSentences]
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((sentence) => sentence.content)
      .join(" "),
    transcript: result.transcript,
    scores: scores.map((line) => `- ${line}`).join("\n"),
    thresholds: [
      `- Words correct per minute: ${thresholds.wcpm}`,
      `- Accuracy: ${thresholds.accuracy}%`,
      `- Fluency: ${thresholds.fluency} out of 100`,
    ].join("\n"),
    candidate_words: result.problemWords.length > 0 ? result.problemWords.join(", ") : "(none)",
  };
}

/** A fixture attempt: test 1, sentences 1-2, read slowly with one skip and one misread word. */
export const SAMPLE_FEEDBACK_INPUT: FeedbackInput = {
  scorer: "azure",
  result: {
    wcpm: 52,
    accuracy: 88,
    fluency: 63,
    completeness: 94,
    transcript:
      "maria takes the bus to work every morning today it is raining so she brings her umbrellas",
    problemWords: ["raining", "umbrella"],
  },
  expectedSentences: [
    { id: 1, content: "Maria takes the bus to work every morning.", sequenceNumber: 1 },
    { id: 2, content: "Today it is raining, so she brings her blue umbrella.", sequenceNumber: 2 },
  ],
  thresholds: { wcpm: 60, accuracy: 85, fluency: 60 },
};

export class PromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptError";
  }
}

// --- LangChain serialisation, as stored in Prompt Hub ---

type LcObject = { lc: 1; type: "constructor"; id: string[]; kwargs: Record<string, unknown> };

const lc = (id: string[], kwargs: Record<string, unknown>): LcObject => ({
  lc: 1,
  type: "constructor",
  id,
  kwargs,
});

const MESSAGE_CLASSES: Record<Role, string> = {
  system: "SystemMessagePromptTemplate",
  user: "HumanMessagePromptTemplate",
  assistant: "AIMessagePromptTemplate",
};

/** The prompt as a LangChain StructuredPrompt, so the Playground returns schema-shaped JSON. */
export function feedbackManifest(prompt: Prompt = FEEDBACK_PROMPT): LcObject {
  return lc(["langchain_core", "prompts", "structured", "StructuredPrompt"], {
    input_variables: [...new Set(prompt.messages.flatMap((m) => templateVariables(m.template)))],
    messages: prompt.messages.map((message) =>
      lc(["langchain", "prompts", "chat", MESSAGE_CLASSES[message.role]], {
        prompt: lc(["langchain", "prompts", "prompt", "PromptTemplate"], {
          input_variables: templateVariables(message.template),
          template: message.template,
          template_format: "mustache",
        }),
      }),
    ),
    schema_: prompt.outputSchema,
    structured_output_kwargs: {},
    template_format: "mustache",
  });
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLc = (value: unknown): value is LcObject =>
  isObject(value) && Array.isArray(value.id) && isObject(value.kwargs);

function templateOf(part: unknown): string {
  if (!isLc(part) || typeof part.kwargs.template !== "string") {
    throw new PromptError("message has no template");
  }
  if (part.kwargs.template_format !== "mustache") {
    throw new PromptError("message template is not mustache");
  }
  return part.kwargs.template;
}

/** Reads a ChatPromptTemplate or StructuredPrompt manifest. Throws PromptError on anything else. */
export function parsePromptManifest(manifest: unknown): Prompt {
  if (!isLc(manifest)) throw new PromptError("manifest is not a LangChain object");
  const kind = manifest.id.at(-1);
  if (kind !== "ChatPromptTemplate" && kind !== "StructuredPrompt") {
    throw new PromptError(`unsupported prompt type ${String(kind)}`);
  }
  const raw = manifest.kwargs.messages;
  if (!Array.isArray(raw) || raw.length === 0) throw new PromptError("prompt has no messages");

  const messages = raw.map((message): PromptMessage => {
    if (!isLc(message)) throw new PromptError("message is not a LangChain object");
    const className = message.id.at(-1);
    const role = (Object.keys(MESSAGE_CLASSES) as Role[]).find(
      (r) => MESSAGE_CLASSES[r] === className,
    );
    if (!role) throw new PromptError(`unsupported message type ${String(className)}`);
    const prompt = message.kwargs.prompt;
    const template = Array.isArray(prompt) ? prompt.map(templateOf).join("") : templateOf(prompt);
    return { role, template };
  });

  return kind === "StructuredPrompt" && manifest.kwargs.schema_ !== undefined
    ? { messages, outputSchema: manifest.kwargs.schema_ }
    : { messages };
}

/** Fills every placeholder. Throws MustacheError naming any variable that is missing. */
export function renderPrompt(
  prompt: Prompt,
  vars: Record<string, string>,
): { role: Role; content: string }[] {
  return prompt.messages.map((message) => ({
    role: message.role,
    content: renderMustache(message.template, vars),
  }));
}
