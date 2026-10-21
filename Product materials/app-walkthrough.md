# Read AI App Walkthrough

This guide walks through the Participant flow, the public Professor Portal and the Admin page of Read AI.

> Screenshots will be added after the MVP build. `{BASE_URL}` stands for the public site address (staging or production).

## Table of Contents

1. [Participant Flow](#participant-flow)
   - [Starting a Test](#starting-a-test)
   - [Choosing a Test](#choosing-a-test)
   - [Assessment Page](#assessment-page)
   - [Completion](#completion)
2. [Professor Portal](#professor-portal)
   - [Dashboard Overview](#dashboard-overview)
   - [Result Details](#result-details)
   - [Reviewing a Result](#reviewing-a-result)
3. [Admin Page](#admin-page)
4. [Privacy and Limits](#privacy-and-limits)
5. [CSV Export Structure](#csv-export-structure)
6. [URL Reference](#url-reference)

---

## Participant Flow

### Starting a Test

**URL:** `{BASE_URL}/start` (or click **"Take a test"** on the home page)

1. Enter a **name or nickname**. It is shown publicly as first name + last initial (for example "Ana Silva" becomes "Ana S.").
2. Tick the consent box: *"I am 18 or older and agree my name and scores are public."*
3. Complete the captcha.
4. Click **"Continue"**.

The system creates your participant record and adds a **4-character code** (for example `K7Q2`). Your browser remembers you, so returning from the same browser keeps the same name and code.

> **Note:** Each network can start up to 3 tests per day. If the daily demo budget is used up, the page shows "Demo paused until tomorrow".

---

### Choosing a Test

**URL:** `{BASE_URL}/tests`

Pick one of four stories, from easiest to hardest:

| Test | Level | Story | Sentences |
| ---- | ----- | ----- | --------- |
| 1 | A2 | The Lost Umbrella | 5 |
| 2 | B1 | A Market Morning | 6 |
| 3 | B2 | The Night Shift | 6 |
| 4 | C1 | The Mapmaker's Problem | 7 |

Each test takes about 5 to 8 minutes including retries. Before the first recording, a short microphone check confirms your audio works.

---

### Assessment Page

**URL:** `{BASE_URL}/assessment?testId={1-4}`

1. Click **"Record"** and read the text on the left aloud.
2. Click **"Stop"** (recording stops automatically at 2 minutes).
3. You can **play back** or **re-record** before submitting.
4. Click **"Submit"**. Your reading is scored by two engines and you get feedback in a few seconds.

#### Progressive Reading

The page guides you through each step:

1. **Sentence progression** - read sentence 1, then sentences 1+2, then 1+2+3, until the whole story.
2. **Full-story reads** - read the complete story two more times.

The progress bar shows one segment per step.

#### Handling Failed Attempts

If an attempt is below the test's thresholds, the words you missed or mispronounced are **highlighted**. A short audio instruction plays once. Click each highlighted word to acknowledge it; the **Record** button turns on again when every word is acknowledged.

Each step allows a limited number of retries (3 for tests 1-2, 2 for tests 3-4). After the last retry, the system moves you to the next step with an encouraging message.

---

### Completion

**URL:** `{BASE_URL}/assessment/completed`

The results page shows:

- Your best **WCPM**, **accuracy** and **fluency**.
- AI feedback on what went well and what to practise.
- Your public identity, for example **"Ana S. · K7Q2"**, and a link to your result on the portal.
- A **"Delete my result"** button.

Reloading this page is safe; it shows the same saved result.

> **Your audio is never stored.** It is deleted right after scoring.

---

## Professor Portal

The portal is **public**: anyone can open it to see how Read AI scores and reviews results. No login is needed.

**URL:** `{BASE_URL}/portal`

### Dashboard Overview

#### Tabs

| Tab | What it shows | Metrics shown |
| --- | ------------- | ------------- |
| **Active** | Participants currently taking a test | Best scores of the current session |
| **Completed** | Finished tests | Best scores across all attempts, plus final score if reviewed |
| **Needs review** | Finished tests where the two engines disagreed and nobody has reviewed yet (count badge, oldest first) | AI scores and flag reasons |

#### Finding a Result

- Search by **name** or **code** (for example "Ana" or "K7Q2").
- Filter by **test** and by **group code** (optional, if participants entered one).

#### Status Labels

| Status | Meaning |
| ------ | ------- |
| **Auto** | Engines agreed; the AI score is final |
| **Needs review** | Engines disagreed; waiting for a review |
| **Reviewed** | A visitor reviewed it; the final score is the latest review |

Click **"Refresh"** to update the lists, and **"Download CSV Report"** to export.

Results marked **Demo** are seeded examples that show how the portal works.

---

### Result Details

Click **"View details"** on any completed result.

#### Per-Sentence Metrics

Each step shows metrics from both engines side by side:

- **Coach DG** (Deepgram) - transcription with word confidence.
- **Coach AZ** (Azure) - pronunciation assessment against the story text, including completeness.

Metrics per coach: **WCPM**, **Accuracy**, **Fluency** (Coach AZ also shows **Completeness**).

> Metrics are the **average** of all attempts for that step. Example: two attempts with fluency 50 and 100 show 75.

Also shown per step:

- **Highlighted words** - words the participant had to acknowledge.
- **Words added** - spoken words not in the story.
- **Words skipped** - story words not spoken.
- **Attempt count** - attempts before moving on.

> Because reading is progressive, the highlights for sentence 3 can include words from sentences 1 and 2.

#### Per-Paragraph Metrics

The two full-story reads, with the same metrics.

#### Flag Reasons

For flagged results, why the engines disagreed:

| Flag | Meaning |
| ---- | ------- |
| Accuracy gap | Accuracy differs by more than 15 points |
| WCPM gap | Words correct per minute differ by more than 25% |
| Verdict split | One engine passed the step, the other did not |
| Unreliable input | Much of the text was not read, or the audio was unclear |

A **provider error** (one engine did not respond) is shown separately and does not count as a disagreement.

#### Other Sections

- **Words with trouble** - the 3 words retried most often.
- **AI feedback** - from Coach DG and Coach AZ.
- **Transcripts** - both engines' transcripts aligned to the original text.
- **Original text** - the story.
- **Review history** - every review, with reviewer name, date, old and new scores, and whether it was reverted.

---

### Reviewing a Result

Any visitor can review any completed result, flagged or not.

1. Open the result's details.
2. In the **Review** panel, check the final **WCPM**, **Accuracy** and **Fluency** (pre-filled with the AI scores) and change them if needed.
3. Add a **note** (up to 500 characters) and your **reviewer name**.
4. Complete the captcha and click **"Save review"**.

The result becomes **Reviewed** and its final score is your review. The AI scores stay visible and are never changed.

> **Rules:** up to 20 reviews per network per day; scores 0-100, WCPM 0-300. Reviews are public and can be reverted by the admin. Only reviews from trusted reviewers count in the accuracy report.

---

## Admin Page

**URL:** `{BASE_URL}/admin` (login required; for the site owner only)

The admin can:

- **Hide** or **delete** a result (offensive names, deletion requests).
- **Revert** a review; the final score is recalculated.
- Mark reviewer names as **trusted**.
- See **usage**: speech minutes and tests today and this month.
- Use the **kill switch** to pause new tests at once.

---

## Privacy and Limits

| Topic | Rule |
| ----- | ---- |
| Who can take a test | Adults (18+) who accept that results are public |
| What is stored | Display name, code, scores, transcripts, feedback, reviews |
| Audio | Never stored |
| How long | 90 days, then deleted automatically |
| Deleting | "Delete my result" from the same browser, or email the contact on the privacy page |
| Responsible for the data | Gabriela (see `{BASE_URL}/privacy`) |
| Tests per network | 3 per day |
| Recording length | 2 minutes |

---

## CSV Export Structure

Clicking **"Download CSV Report"** produces **two CSV files**.

> **Allow pop-ups** in your browser; each file opens in a new tab.

### 1. Attempts Report

One row per attempt for one step.

| Column | Description |
| ------ | ----------- |
| `Attempt ID` | Unique id of the attempt |
| `Participant` | Display name + code (for example `Ana S. · K7Q2`) |
| `Test ID` | Test (1-4) |
| `Group Code` | Optional group code |
| `Sentence ID` | Sentence being read |
| `Step Number` | Step in the progressive sequence |
| `Attempt Number` | Attempt within the step |
| `Deepgram Transcript` | Text transcribed by Deepgram |
| `Deepgram WCPM` | Words correct per minute (Deepgram) |
| `Deepgram Accuracy` | Accuracy 0-100 (Deepgram) |
| `Deepgram Confidence` | Mean confidence 0-1 |
| `Azure WCPM` | Words correct per minute (Azure) |
| `Azure Accuracy` | Pronunciation accuracy 0-100 |
| `Azure Fluency` | Fluency 0-100 |
| `Azure Completeness` | Share of the text read, 0-100 |
| `Deepgram Feedback` | Coach DG feedback |
| `Azure Feedback` | Coach AZ feedback |
| `Highlighted Words` | JSON array of words to acknowledge |
| `Flags` | Mismatch flags for this attempt |
| `Provider Error` | Engine that failed, if any |
| `Passed` | Yes/No |
| `Duration (ms)` | Recording length |
| `Created At` | Timestamp |

### 2. Final Results Report

One row per completed test.

| Column | Description |
| ------ | ----------- |
| `Participant` | Display name + code |
| `Test ID` | Test (1-4) |
| `Group Code` | Optional group code |
| `AI WCPM` / `AI Accuracy` / `AI Fluency` | Best-of AI scores |
| `Final WCPM` / `Final Accuracy` / `Final Fluency` | Latest review, or AI score if not reviewed |
| `Review Status` | Auto / Needs review / Reviewed |
| `Flag Reasons` | Why it was flagged |
| `Agreement Score` | How closely the engines agreed, 0-100 |
| `Last Reviewer` | Reviewer name of the latest review |
| `Trusted` | Whether the latest review is trusted |
| `Review Note` | Note of the latest review |
| `AI Feedback (Deepgram)` | Coach DG feedback |
| `AI Feedback (Azure)` | Coach AZ feedback |
| `Original Text` | The story |
| `Finalized At` | When the test was completed |

---

## URL Reference

| Page | URL |
| ---- | --- |
| Home | `{BASE_URL}/` |
| Start a test | `{BASE_URL}/start` |
| Choose a test | `{BASE_URL}/tests` |
| Test 1 (A2) | `{BASE_URL}/assessment?testId=1` |
| Test 2 (B1) | `{BASE_URL}/assessment?testId=2` |
| Test 3 (B2) | `{BASE_URL}/assessment?testId=3` |
| Test 4 (C1) | `{BASE_URL}/assessment?testId=4` |
| Professor portal | `{BASE_URL}/portal` |
| Needs review tab | `{BASE_URL}/portal?tab=needs-review` |
| Privacy notice | `{BASE_URL}/privacy` |
| Admin | `{BASE_URL}/admin` |

> The assessment URLs work only after starting at `/start`, which creates your participant record.
