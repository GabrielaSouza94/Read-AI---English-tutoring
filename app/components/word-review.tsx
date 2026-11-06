/**
 * Word review before a retry (T2.4; BR-07, TR-07): the step's text with the words to practise as
 * toggle buttons. The spoken instruction plays once, with a replay button. The parent keeps the
 * recorder disabled until every word is marked reviewed.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { matchHighlights, tokenize } from "~/lib/highlight";

export const INSTRUCTION_AUDIO = "/audio/word-review-instruction.mp3";

function reviewStatus(reviewed: number, total: number): string {
  if (reviewed === total) return "All words reviewed. You can record again.";
  const left = total - reviewed;
  if (reviewed === 0) return `${total} ${total === 1 ? "word" : "words"} to review`;
  return `${left} of ${total} ${total === 1 ? "word" : "words"} left to review`;
}

export function WordReview({
  text,
  words,
  onComplete,
}: {
  text: string;
  words: string[];
  /** Called with true once every highlighted word is reviewed. */
  onComplete: (complete: boolean) => void;
}) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const highlighted = useMemo(() => new Set(matchHighlights(text, words)), [text, words]);
  const [reviewed, setReviewed] = useState<ReadonlySet<number>>(new Set());
  const audio = useRef<HTMLAudioElement>(null);

  // Play the instruction once when the review appears. Browsers may block autoplay; the replay
  // button is always there.
  useEffect(() => {
    audio.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    onComplete(highlighted.size > 0 && reviewed.size === highlighted.size);
  }, [reviewed, highlighted, onComplete]);

  const toggle = (index: number) =>
    setReviewed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  if (highlighted.size === 0) {
    return <p className="mt-4 text-reading text-gray-900">{text}</p>;
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 rounded-control bg-warning-light px-4 py-3">
        <p className="text-warning">
          <span className="font-semibold">Review the highlighted words.</span> Click each one to
          mark it as reviewed, then record again.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!audio.current) return;
            audio.current.currentTime = 0;
            void audio.current.play().catch(() => {});
          }}
          className="rounded-control border-2 border-warning bg-white px-3 py-1 text-sm font-semibold text-warning hover:bg-warning-light"
        >
          Play instructions again
        </button>
        {/* No captions needed: the instruction is written out just above. */}
        <audio ref={audio} src={INSTRUCTION_AUDIO} preload="auto" />
      </div>
      <p role="status" className="mt-3 font-medium text-gray-900">
        {reviewStatus(reviewed.size, highlighted.size)}
      </p>
      <p className="mt-3 text-reading text-gray-900" data-testid="step-text">
        {tokens.map((token, i) => {
          if (token.wordIndex === null || !highlighted.has(token.wordIndex)) {
            return <span key={i}>{token.text}</span>;
          }
          const index = token.wordIndex;
          const done = reviewed.has(index);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={done}
              onClick={() => toggle(index)}
              className={`rounded-control px-1 underline decoration-2 underline-offset-4 ${
                done
                  ? "bg-success-light text-success decoration-success"
                  : "bg-warning-light text-gray-900 decoration-warning"
              }`}
            >
              {token.text}
            </button>
          );
        })}
      </p>
    </div>
  );
}
