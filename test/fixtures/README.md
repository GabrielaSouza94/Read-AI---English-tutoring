# Audio fixtures (T3.8)

Recordings and saved provider responses for testing the scoring pipeline (Epic E3) without paid
calls. The list, and what each fixture is for, is in `fixtures.ts`.

| Folder       | Contents                                                                    |
| ------------ | --------------------------------------------------------------------------- |
| `audio/`     | One 16 kHz mono 16-bit WAV per fixture, `t{test}-{kind}.wav`                |
| `responses/` | The raw Deepgram response and one raw Azure response per chunk, per fixture |

Integration tests read `responses/`, never the live services. `test/fixtures.test.ts` checks that
every fixture has both files, that each WAV is 16 kHz mono, and that the responses were saved with
the current Deepgram URL.

## Fixtures

Tests 1 and 4 have all eight kinds; tests 2 and 3 have `clean` and `slow`.

| Kind               | Reads                           | For                                       |
| ------------------ | ------------------------------- | ----------------------------------------- |
| `clean`            | Step 2 (sentences 1-2)          | Happy path, pass                          |
| `slow`             | Step 1, a pause after each word | Fail on WCPM (about 35-40 words a minute) |
| `skipped-sentence` | Step 3 without sentence 2       | Skipped words, low completeness           |
| `added-words`      | Step 2 plus three extra words   | Insertions                                |
| `mispronounced`    | Step 2, three words wrong       | Highlighting                              |
| `noise`            | Step 2 under loud noise         | Unreliable input                          |
| `silence`          | Four seconds of silence         | Error handling                            |
| `long`             | The whole story, over 30 s      | Azure chunking                            |

## Making them

```bash
npm run fixtures                         # synthetic audio, then responses, for every fixture
npm run fixtures -- --responses          # re-save responses only (after changing a provider call)
npm run fixtures -- --only t1-clean      # one fixture
```

The keys come from `.dev.vars` and are never printed. A full run costs a few cents.

The synthetic fixtures use the Azure neural voice `en-US-AvaNeural`. Noise is white noise mixed in
code (seeded, so the same every time); silence is generated.

## Recording real fixtures (owner)

Synthetic voices read too cleanly for calibration (Sprint 5), so recorded fixtures replace them.

1. **Consent.** Only adults who agree in writing that their recording is kept in this repository
   and used for testing. Keep the consent outside the repository. Never put a name in a file name
   or in `fixtures.ts`.
2. **Format.** WAV, 16 kHz, mono, 16-bit PCM. In Audacity: set the project rate to 16000 Hz,
   record in mono, then File → Export → WAV, "Signed 16-bit PCM".
3. **What to read.** The `spokenText` of the fixture in `fixtures.ts` (for `skipped-sentence`, leave
   out sentence 2; for `mispronounced`, say three words wrongly; for `noise`, record next to a fan
   or with music on).
4. **Replace and re-save.** Save it as `audio/t{test}-{kind}.wav`, change that fixture's `source` to
   `"recorded"` (the script never overwrites recorded audio), then run
   `npm run fixtures -- --responses --only t{test}-{kind}`.

## Findings from the synthetic set

- **Azure REST stops at long pauses.** With a pause after every word, Azure scores only part of
  the sentence (completeness 33-70 on the `slow` fixtures). A slow real reader may be cut off the
  same way. T3.3 must check this with recorded slow reads.
- **White noise at the same level as the voice does not disturb either scorer**; at -12 dB
  Deepgram hears nothing and Azure scores about half the words. The `noise` fixtures use -12 dB.
- **Deepgram writes "Four centuries"** for "For centuries" in the slow test 4 read: a homophone
  that the alignment in T3.4 must not count as an error.
