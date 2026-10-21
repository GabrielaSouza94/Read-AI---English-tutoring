# Read AI - Business Requirements Document (BRD)

## 1. Cover Page

| Field               | Details                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| **Project Name**    | Read AI -- English Reading Fluency Assessment (Public MVP)              |
| **Owner**           | Gabriela Souza (professional portfolio project)                         |
| **Document Author** | Gabriela Souza                                                          |
| **Date**            | October 12, 2026                                                        |
| **Version**         | 1.0                                                                     |
| **Status**          | Approved for build                                                      |
| **Based on**        | ReadAssist AI Reading Fluency PoC (BRD v2.2, November 2025)             |

---

## 2. Introduction

### 2.1 Document Purpose

This Business Requirements Document (BRD) defines the business needs, functional requirements, restrictions and success criteria for **Read AI**, a public web platform that evaluates how well people read English aloud.

Read AI reuses the proven design of the ReadAssist AI PoC (progressive sentence reading, dual speech scoring, AI feedback, word-level review) and adapts it into an **open public demo**: anyone can take a test, and anyone can open the professor portal to see how scoring and manual review work.

### 2.2 Project Scope

**In Scope (MVP):**

- A public website, with no login for test takers or for the professor portal.
- Name-based tracking: a participant enters a name or nickname; the system adds a short code so results can be found on the portal.
- A consent gate (adults only, results are public) and a captcha before every test.
- Four pre-configured reading tests of rising difficulty (CEFR A2, B1, B2, C1), each a short original story split into sentences.
- Progressive sentence reading (sentence 1, then 1+2, then 1+2+3, and so on), followed by two full-story reads.
- Dual speech scoring of every attempt: **Deepgram** (transcription with word confidence) and **Azure AI Speech pronunciation assessment** (accuracy, fluency, completeness and miscues against the story text).
- AI-generated feedback with Gemini 2.5 Flash Lite, traced and versioned in LangSmith.
- Word-level feedback: missed or mispronounced words are highlighted and must be acknowledged before a retry.
- Automatic **mismatch detection** when the two scorers disagree, feeding a public review queue.
- Manual review by any visitor: every review is signed with a name, logged, and revertible by the admin.
- One hidden admin login for moderation, deletions, review reverts and a kill switch.
- CSV export of attempts and final results.
- Privacy controls under Brazil's LGPD: consent, data minimisation, no audio storage, 90-day automatic deletion, deletion on request.
- Abuse and cost controls: rate limits, a daily speech-minute budget and a kill switch.

**Out of Scope:**

- Professor or student accounts, class management or rosters (an optional group code replaces classes).
- Use by minors.
- Storage or playback of audio recordings.
- Test authoring or editing interface (tests are seeded by the developer).
- Mobile apps; offline use.
- Languages other than English; multi-accent tuning.
- Phoneme-level coaching exercises, text-to-speech pronunciation models.
- LMS or third-party integrations.
- Production SLAs.

### 2.3 Audience

- Gabriela Souza (product owner, developer and data controller).
- Portfolio reviewers, recruiters and peers who explore the public site.
- Professors and English tutors invited to try the review workflow.
- Any future collaborator who extends the project.

---

## 3. Business Context

### 3.1 Background

Reading fluency is usually assessed by a teacher listening to each learner, which is slow and inconsistent. The ReadAssist AI PoC (2025) showed that two speech engines plus an LLM can run this assessment for K-12 classrooms.

Read AI takes that design to adult English learners and the general public, as a portfolio piece that shows the full system working end to end, including the human-in-the-loop step that decides what happens when the AI scorers disagree.

### 3.2 Problem to Solve

- Manual fluency assessment takes a lot of teacher time and produces inconsistent scores.
- AI scores alone are not trustworthy when two engines disagree; there needs to be a clear, visible way for a human to settle the result.
- People evaluating an AI education product want to see how it works from both sides, learner and professor, without asking for an account.

### 3.3 Business Objectives

1. Demonstrate a complete, working AI reading-fluency assessment to the public.
2. Show transparent scoring: both engines' results, the AI feedback, and why a test was flagged.
3. Show a human review workflow that resolves scorer disagreements and keeps a full audit trail.
4. Collect AI-vs-human score data from trusted reviews to measure scoring accuracy.
5. Run safely and cheaply in public: no exposed personal data, bounded costs, resistance to abuse.

### 3.4 Success Metrics

- The public site is live and usable on current Chrome, Edge, Firefox and Safari desktops and Chromebooks.
- At least 25 completed tests across all 4 levels during the launch pilot.
- Both scorers return results for 100% of attempts (provider errors are logged and retried, not lost).
- Every flagged test receives at least one trusted review within 48 hours.
- AI and human final scores are captured for every reviewed test, ready for an accuracy report.
- Monthly running cost stays under $60 at full daily cap, and about $15 at the expected 50 users a month.
- No audio is stored, and no participant name is sent to Gemini or LangSmith.

---

## 4. Business Requirements

| ID        | Priority | Requirement                                   | Description |
| --------- | -------- | --------------------------------------------- | ----------- |
| **BR-01** | Critical | AI Listening and Evaluation                   | The system records the participant reading aloud and evaluates the reading with two speech scorers (Deepgram and Azure pronunciation assessment) at the same time. The participant receives AI-generated feedback after each attempt. |
| **BR-02** | High     | Progressive Reading and Feedback Loop         | Participants read sentence 1, then 1+2, then 1+2+3, until the full story, then read the full story twice more. Each step can be retried up to a per-test limit; after the limit the system moves on automatically. |
| **BR-03** | Critical | Public Access Without Login                   | The test flow and the professor portal are open to anyone with the URL. No account, password or email is required. |
| **BR-04** | Critical | Name-Based Tracking                           | Participants enter a name or nickname (shown publicly). The system assigns a 4-character code. Results are listed on the portal as display name + code (for example "Ana S. · K7Q2") and the browser remembers the participant. |
| **BR-05** | Critical | Consent Gate                                  | Before starting, participants must confirm they are 18 or older and agree that their name and scores will be public. A captcha is required. |
| **BR-06** | High     | Four Graded Reading Tests                     | The system offers 4 tests of rising difficulty (A2, B1, B2, C1). Each test has a story split into sentences, pass thresholds (WCPM, accuracy, fluency) and a retry limit per step. The participant chooses one test from a menu. |
| **BR-07** | Critical | Adaptive Word-Level Feedback                  | When an attempt falls below thresholds, missed or mispronounced words are highlighted. The participant must acknowledge each word before retrying. |
| **BR-08** | High     | Professor Portal                              | A public dashboard lists active, completed and needs-review results, with search by name or code and an optional group-code filter. Each result opens a details view with per-sentence and per-paragraph metrics from both scorers, problem words, AI feedback and the original text. |
| **BR-09** | Critical | Mismatch Detection                            | After each step and at the end of a test, the system compares the two scorers. If they disagree beyond set limits, the result is flagged "Needs review" with the reasons shown. |
| **BR-10** | Critical | Public Manual Review                          | Any visitor can review a result: enter final WCPM, accuracy and fluency (pre-filled with AI values) and notes, signed with a reviewer name. The latest review becomes the final score. AI scores are never overwritten. |
| **BR-11** | Critical | Review Audit and Revert                       | Every review is stored as an event (who, when, old and new values). The admin can revert any review and mark reviewers as trusted. Only trusted reviews count in accuracy reporting. |
| **BR-12** | High     | Admin Moderation                              | One hidden admin login can hide results, delete data, revert reviews, view usage and pause new tests instantly (kill switch). |
| **BR-13** | High     | CSV Export                                    | The portal exports an attempts report and a final-results report, with display names only, AI scores, review scores and review status. |
| **BR-14** | High     | AI Feedback and Prompt Management             | Gemini 2.5 Flash Lite generates feedback for each scorer's result. Prompts are versioned in LangSmith Prompt Hub and every LLM call is traced. |
| **BR-15** | Critical | Privacy (LGPD)                                | Audio is deleted right after scoring. Only the display name, code, scores, transcripts and feedback are stored. Results are deleted after 90 days or on request. A privacy notice names Gabriela Souza as responsible for the data. |
| **BR-16** | Critical | Abuse and Cost Controls                       | Rate limits per IP, recording size limits, input validation, a blocked-word filter for names, a daily speech-minute budget and a kill switch keep the public site safe and affordable. |
| **BR-17** | High     | Reading Step Metrics                          | For every step the system stores WCPM, accuracy, fluency, attempt count, highlighted, skipped and added words, from both scorers. |
| **BR-18** | Medium   | Guided Demo Experience                        | A demo banner, seeded example results (including flagged ones) and short explanations on the portal help first-time visitors understand the platform. |

---

## 5. Use Cases

### Use Case 1: Participant Takes a Reading Test

**Actor:** Participant (adult member of the public)

1. Participant opens the Read AI home page and clicks "Take a test".
2. Enters a name or nickname, ticks the consent box, completes the captcha.
3. System creates a participant with a 4-character code and remembers it in the browser.
4. Participant picks one of the 4 tests.
5. Participant records sentence 1. The system scores it with Deepgram and Azure in parallel and shows feedback.
6. If below threshold, problem words are highlighted; the participant acknowledges each and retries (up to the step limit, then auto-progresses).
7. Steps continue (1+2, 1+2+3, ...) until the full story, then two full-story reads.
8. The results page shows scores, AI feedback and the participant's code, and links to their result on the portal.

**Success outcome:** The participant gets immediate feedback and can find their result on the portal by name or code.

### Use Case 2: Visitor Explores the Portal and Reviews a Flagged Result

**Actor:** Any visitor (professor, tutor, recruiter, curious participant)

1. Visitor opens the portal; no login.
2. Opens the "Needs review" tab and selects a flagged result.
3. Sees both scorers side by side per sentence and paragraph, both transcripts against the story, the flag reasons and the AI feedback.
4. Enters final WCPM, accuracy and fluency, notes, and a reviewer name; completes the captcha.
5. System saves a review event; the result becomes "Reviewed" with the new final score. AI scores remain visible.

**Success outcome:** The disagreement is settled by a human, and the change is fully traceable.

### Use Case 3: Admin Moderates the Site

**Actor:** Admin (Gabriela)

1. Admin logs in on the hidden admin page.
2. Reviews recent results and reviews; hides an offensive name or reverts a vandalised review.
3. Marks known professors' reviewer names as trusted.
4. Processes a deletion request.
5. Checks daily speech-minute usage; pauses new tests with the kill switch if needed.

**Success outcome:** The public site stays clean, within budget and compliant.

---

## 6. Business Rules

| ID              | Rule                                  | Description |
| --------------- | ------------------------------------- | ----------- |
| **BR-RULE-01**  | Adults only                           | Tests start only after the participant confirms they are 18 or older and accepts that results are public. |
| **BR-RULE-02**  | Name or nickname only                 | No email, phone, age, school or other personal fields are collected. |
| **BR-RULE-03**  | Display name format                   | Names are shown as first name + last initial, plus the code (for example "Ana S. · K7Q2"). Only the displayed form is stored. |
| **BR-RULE-04**  | Retry and auto-progression            | Each step allows the per-test retry limit; after it, the system advances with an encouraging message. |
| **BR-RULE-05**  | Dual scoring on every attempt         | Every attempt is scored by both Deepgram and Azure. If one fails, it is retried once; a remaining failure is marked "provider error", not a mismatch. |
| **BR-RULE-06**  | No audio storage                      | Audio is discarded right after scoring and is never played on the portal. |
| **BR-RULE-07**  | AI scores are immutable               | Reviews are stored beside AI scores; the final score is the latest non-reverted review, or the AI score if none. |
| **BR-RULE-08**  | Signed reviews                        | A review requires a reviewer name and a captcha. |
| **BR-RULE-09**  | Trusted-only reporting                | The AI-vs-human accuracy report uses only reviews marked trusted by the admin. |
| **BR-RULE-10**  | Retention                             | Results and their data are deleted automatically after 90 days. |
| **BR-RULE-11**  | Right to erasure                      | A participant can delete their result from the browser that created it, or ask the admin by email. |
| **BR-RULE-12**  | No personal data to AI vendors        | Gemini and LangSmith receive only participant ids, never names. |
| **BR-RULE-13**  | Daily budget                          | New tests pause when the day's speech-minute budget is used ("demo paused until tomorrow"). |
| **BR-RULE-14**  | Prompt management                     | LLM prompts live in LangSmith Prompt Hub and can change without a code deployment. |
| **BR-RULE-15**  | Feedback tone                         | Feedback is encouraging, specific and suitable for adult English learners. |
| **BR-RULE-16**  | Developer-seeded content              | The 4 tests, thresholds and retry limits are seeded by the developer; there is no editing UI. |

---

## 7. Restrictions

Numbers are starting values, to be tuned after launch.

| Group     | Restriction | Reason |
| --------- | ----------- | ------ |
| Privacy   | Consent gate: "I am 18 or older and agree my name and scores are public" | Public data about children is not acceptable; LGPD requires consent |
| Privacy   | Collect name only | Data minimisation |
| Privacy   | Delete audio right after scoring | Voice is personal data and the portal is public |
| Privacy   | Auto-delete results after 90 days | LGPD retention limit |
| Privacy   | "Delete my result" from the creating browser, or by request to the admin | Right to erasure |
| Privacy   | Privacy notice naming Gabriela Souza as responsible, with a contact email, what is stored and for how long | LGPD transparency |
| Privacy   | Send only participant ids to Gemini and LangSmith | No personal data at third parties |
| Abuse     | Cloudflare Turnstile captcha on test start and on review save | Blocks bots |
| Abuse     | Max 3 tests per IP per day; recording max 2 minutes and 10 MB | Caps speech spend per person |
| Abuse     | Names: 2-40 letters, blocked-word filter; admin can hide a result | Offensive names on a public page |
| Abuse     | Reviews: 20 saves per IP per day; scores 0-100; WCPM 0-300; notes max 500 characters, plain text | Vandalism and script injection |
| Cost      | Daily budget of 80 speech minutes | Keeps a fully used month near $60 |
| Cost      | Admin kill switch | Traffic spikes |
| Cost      | Gemini paid tier | The free tier's 15 requests per minute will not hold public traffic |
| Integrity | AI scores never overwritten; every review revertible | A bad review cannot destroy data |

---

## 8. Assumptions and Dependencies

### Assumptions

- About 50 users a month, around 2 tests each, about 8 audio minutes per test including retries.
- Participants use a desktop or Chromebook browser with a working microphone.
- Visitors understand the site is a public demo (banner on every page).
- Story texts were drafted with AI assistance and approved by Gabriela before Sprint 3.

### Dependencies

- Deepgram API (Nova-3).
- Azure AI Speech pronunciation assessment (en-US).
- Google Gemini 2.5 Flash Lite (paid tier).
- LangSmith (Developer plan).
- Cloudflare Workers, D1, KV and Turnstile.
- A domain for the public site and a contact email for the privacy notice.

---

## 9. Exclusions

- Accounts for participants or professors; classes and enrolment.
- Use by people under 18.
- Audio storage or playback.
- Test authoring UI.
- Mobile apps, offline use, other languages.
- Phoneme-level coaching, text-to-speech models.
- LMS integrations, real-time teacher monitoring, gamification.

---

## 10. High-Level Risks

| ID      | Risk | Impact | Mitigation |
| ------- | ---- | ------ | ---------- |
| **R1**  | Bots or heavy users run many tests | Speech bill spikes | Captcha, 3 tests per IP per day, daily budget, kill switch |
| **R2**  | Visitors vandalise scores or notes | Misleading public results | Signed and logged reviews, admin revert, trusted-only reporting |
| **R3**  | Offensive or real-person names | Reputational and legal harm | Blocked-word filter, admin hide, demo banner |
| **R4**  | Minors take the test despite the gate | Children's data made public | Consent gate, name only, 90-day deletion, delete on request |
| **R5**  | One scorer fails | Result looks like a mismatch | Retry once; mark "provider error", not a mismatch |
| **R6**  | Mismatch limits too tight | Review queue floods | Calibrate on seeded and dry-run data in Sprint 5 |
| **R7**  | Accents and microphone noise skew scores | Unfair scores, more flags | Microphone check before the test; noise suppression |
| **R8**  | Azure's REST API scores at most 30 seconds of audio | Long reads cannot be scored in one call | Sprint 1 technical spike; fallback: split at sentence boundaries and average |
| **R9**  | Vendor prices change | Budget drift | Recheck prices before launch; daily cap bounds the worst case |

---

## 11. Roadmap / Timeline

12 weeks, 6 two-week sprints, 3 gates.

| Phase | Sprint | Weeks | Focus |
| ----- | ------ | ----- | ----- |
| Foundation | 1 | 1-2 | Cloudflare environments, D1 schema, seed 4 tests, captcha and rate limits, consent and privacy notice, LangSmith project, Azure long-audio spike |
| Foundation | 2 | 3-4 | Name + code entry, test picker, recording, progressive steps, word highlighting, session state |
| **Gate A** | | | A participant finishes a full test on staging |
| Build | 3 | 5-6 | Parallel Deepgram + Azure scoring, metrics, Gemini feedback, idempotent finalize, provider-error handling |
| Build | 4 | 7-8 | Public portal (active, completed, needs review), search, CSV, mismatch check, signed reviews, audit log, revert, admin moderation |
| **Gate B** | | | Feature complete; final 4 stories loaded |
| Pilot | 5 | 9-10 | Browser and microphone tests, abuse and load tests, LGPD review, dry run, tune mismatch limits and prompts |
| Pilot | 6 | 11-12 | Public launch with seeded demo results, budget cap live, AI-vs-trusted-review accuracy report |
| **Gate C** | | | MVP sign-off |

---

## 12. Decisions Log

| Decision | Outcome | Date |
| -------- | ------- | ---- |
| Technology stack | Reuse the ReadAssist stack (React Router 7, Cloudflare Workers, D1, KV, Gemini, LangSmith) | Oct 7, 2026 |
| Delivery horizon | 12-week MVP | Oct 7, 2026 |
| Access model | Public website; open professor portal; no login except a hidden admin | Oct 7, 2026 |
| Audio retention | None; reviews use transcripts | Oct 7, 2026 |
| Name collisions | Name + auto 4-character code | Oct 7, 2026 |
| Audience | General public, adults only | Oct 7, 2026 |
| Who may change a score | Any visitor; signed, logged, revertible | Oct 7, 2026 |
| Data controller | Gabriela Souza (professional portfolio) | Oct 7, 2026 |
| Story content | AI-drafted, approved by Gabriela | Oct 7, 2026 |
| Speech scorers | Deepgram + Azure pronunciation assessment (SpeechAce dropped for cost) | Oct 8, 2026 |

---

## 13. Appendices

### Appendix A -- Workflow Overview

1. **Setup:** developer seeds 4 tests, deploys the site, configures captcha, budgets and the admin account.
2. **Test:** participant enters a name, consents, picks a test and reads through the progressive steps; each attempt is scored by both engines and audio is discarded.
3. **Flagging:** the system compares the scorers and flags disagreements.
4. **Review:** any visitor can open the portal and review flagged or other results; reviews are signed and logged.
5. **Moderation:** the admin hides abuse, reverts bad reviews, marks trusted reviewers and handles deletions.
6. **Analysis:** CSV exports and trusted reviews feed the AI-vs-human accuracy report.

### Appendix B -- Reading Tests

| Test | Level | Sentences | Words | Pass WCPM | Pass accuracy | Pass fluency | Retries per step |
| ---- | ----- | --------- | ----- | --------- | ------------- | ------------ | ---------------- |
| 1 · The Lost Umbrella | A2 | 5 | 55 | 60 | 85% | 60 | 3 |
| 2 · A Market Morning | B1 | 6 | 81 | 80 | 85% | 65 | 3 |
| 3 · The Night Shift | B2 | 6 | 91 | 100 | 88% | 70 | 2 |
| 4 · The Mapmaker's Problem | C1 | 7 | 114 | 120 | 90% | 75 | 2 |

Full texts are in the Technical Requirements Document, section 4.6.

### Appendix C -- Terminology

| Term | Definition |
| ---- | ---------- |
| **Participant** | A member of the public taking a test. |
| **Display name** | The public name: first name + last initial. |
| **Code** | 4-character id added to a display name to tell participants apart. |
| **Professor portal** | The public dashboard of results and reviews. |
| **Reviewer** | Any visitor who submits a review; signed with a name. |
| **Trusted review** | A review by the admin or a reviewer the admin has marked trusted. |
| **Mismatch** | Disagreement between Deepgram and Azure beyond set limits. |
| **Needs review** | Status of a result with at least one mismatch flag and no review yet. |
| **Progressive reading** | Reading sentence 1, then 1+2, then 1+2+3, until the full story. |
| **Reading step** | One stage of progressive reading or one full-story read. |
| **WCPM** | Words correct per minute. |
| **Word highlighting** | Marking problem words the participant must acknowledge before retrying. |
| **Auto-progression** | Moving to the next step after the retry limit regardless of pass. |
| **Kill switch** | Admin control that pauses new tests at once. |
| **LGPD** | Lei Geral de Proteção de Dados, Brazil's data protection law. |

### Appendix D -- Revision History

| Version | Date | Author | Changes |
| ------- | ---- | ------ | ------- |
| 1.0 | October 12, 2026 | Gabriela Souza | Read AI BRD created from the ReadAssist AI BRD v2.2: public access model, name + code tracking, consent gate, 4 graded tests, mismatch detection, public review with audit and revert, admin moderation, LGPD privacy, abuse and cost restrictions, Deepgram + Azure scoring, 12-week roadmap. |
