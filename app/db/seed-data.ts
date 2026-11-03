/**
 * The four reading tests (TRD §4.6) with their mismatch limits (TRD §4.9).
 * This file is the source of truth for test content and thresholds: change values here, then re-run
 * the seed. Thresholds are starting values, calibrated in Sprint 5 (T6.7).
 */

export type SeedTest = {
  id: number;
  title: string;
  level: number;
  cefr: "A2" | "B1" | "B2" | "C1";
  fluencyThreshold: number; // WCPM
  accuracyThreshold: number;
  fluencyScoreThreshold: number;
  maxAttemptsPerStep: number;
  mismatchAccuracyGap: number; // points
  mismatchWcpmPct: number; // percent
  sentences: string[];
};

const MISMATCH = { mismatchAccuracyGap: 15, mismatchWcpmPct: 25 };

export const SEED_TESTS: SeedTest[] = [
  {
    id: 1,
    title: "The Lost Umbrella",
    level: 1,
    cefr: "A2",
    fluencyThreshold: 60,
    accuracyThreshold: 85,
    fluencyScoreThreshold: 60,
    maxAttemptsPerStep: 3,
    ...MISMATCH,
    sentences: [
      "Maria takes the bus to work every morning.",
      "Today it is raining, so she brings her blue umbrella.",
      "At her stop, she runs to the office and forgets it on the seat.",
      "In the afternoon, the driver finds the umbrella and keeps it safe.",
      "The next day, he smiles and gives it back to her.",
    ],
  },
  {
    id: 2,
    title: "A Market Morning",
    level: 2,
    cefr: "B1",
    fluencyThreshold: 80,
    accuracyThreshold: 85,
    fluencyScoreThreshold: 65,
    maxAttemptsPerStep: 3,
    ...MISMATCH,
    sentences: [
      "Every Saturday, Daniel visits the farmers' market near the old train station.",
      "He usually buys fresh bread, a few vegetables, and flowers for his kitchen table.",
      "This week, however, he noticed a new stall selling honey from a local farm.",
      "The owner explained that her bees collect nectar from apple trees and wild lavender.",
      "Daniel tasted a small spoonful and was surprised by its light, sweet flavor.",
      "He bought a jar for himself and another as a gift for his neighbor.",
    ],
  },
  {
    id: 3,
    title: "The Night Shift",
    level: 3,
    cefr: "B2",
    fluencyThreshold: 100,
    accuracyThreshold: 88,
    fluencyScoreThreshold: 70,
    maxAttemptsPerStep: 2,
    ...MISMATCH,
    sentences: [
      "Although most of the city was asleep, the hospital's emergency department remained surprisingly busy.",
      "Elena, a nurse who had worked night shifts for most of her career, moved calmly between patients.",
      "She checked temperatures, answered worried questions, and made sure every medication was given on schedule.",
      "Shortly after midnight, an elderly man arrived with chest pain, and the team responded immediately.",
      "Thanks to their quick decisions, he was stable within an hour and resting comfortably.",
      "When the sun finally rose, Elena felt exhausted but proud of what they had accomplished together.",
    ],
  },
  {
    id: 4,
    title: "The Mapmaker's Problem",
    level: 4,
    cefr: "C1",
    fluencyThreshold: 120,
    accuracyThreshold: 90,
    fluencyScoreThreshold: 75,
    maxAttemptsPerStep: 2,
    ...MISMATCH,
    sentences: [
      "For centuries, mapmakers have faced an unavoidable problem: representing a curved planet on a flat surface.",
      "Every projection distorts something, whether it is the size of continents, the shape of coastlines, or the distances between cities.",
      "The familiar Mercator map, originally designed for navigation, preserves angles but dramatically exaggerates regions near the poles.",
      "Consequently, Greenland appears comparable to Africa, although Africa is many times larger.",
      "Alternative projections attempt to balance these compromises, sacrificing accuracy in one dimension to improve another.",
      "Choosing a map, therefore, is never entirely neutral; it subtly shapes how we perceive the world's geography.",
      "Thoughtful readers should ask not only what a map shows, but also what it inevitably leaves out.",
    ],
  },
];

/** Stable sentence ids: test 2, sentence 3 → 203. Attempts reference these, so they must never change. */
export function sentenceId(testId: number, sequenceNumber: number): number {
  return testId * 100 + sequenceNumber;
}
