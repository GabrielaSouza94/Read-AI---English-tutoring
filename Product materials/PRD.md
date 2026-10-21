# ReadAssist AI - Product Requirements Document (PRD)

## Document Information

| Field | Details |
|-------|---------|
| **Product Name** | ReadAssist AI - Reading Fluency Assessment Platform |
| **Version** | 1.0 |
| **Author** | Product Management Team |
| **Date** | October 12, 2026 |
| **Status** | Draft |
| **Based On** | BRD v2.2 (November 18, 2025) |

---

## 1. Executive Summary

### 1.1 Product Vision

ReadAssist AI is an AI-powered reading fluency assessment platform designed for K-12 classrooms. The platform automates reading fluency evaluations by leveraging speech-to-text technology and large language models to provide real-time, consistent, and actionable feedback to students and educators.

### 1.2 Problem Statement

Manual reading fluency assessments in K-12 classrooms currently:
- Require significant teacher time (up to 3 hours per assessment cycle)
- Produce inconsistent scoring and feedback due to human fatigue and subjectivity
- Delay student progress due to lack of immediate, actionable insights
- Scale poorly across multiple classrooms and student cohorts

### 1.3 Solution Overview

ReadAssist AI provides:
- **Automated Reading Assessment**: AI listens and evaluates student reading in real-time
- **Progressive Learning**: Sentence accumulation methodology builds fluency incrementally
- **Dual Provider Analysis**: A/B testing with Deepgram and SpeechAce for optimal accuracy
- **Adaptive Feedback**: Word-level highlighting for targeted improvement
- **Teacher Dashboard**: Comprehensive metrics, feedback review, and CSV export

### 1.4 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Classroom Assessments | 25+ real assessments | Database count |
| Dual STT Coverage | 100% of attempts | API trace logs |
| Teacher CSV Exports | Demonstrated usability | User feedback |
| LangSmith Tracing | 100% attempt coverage | LangSmith dashboard |
| Teacher Time Savings | 50% reduction | Pre/post surveys |

---

## 2. Target Users & Personas

### 2.1 Primary Persona: K-12 Student

**Name**: Alex, 8 years old (3rd Grade)

**Goals**:
- Improve reading fluency and confidence
- Receive immediate, encouraging feedback
- Understand which words need practice

**Pain Points**:
- Limited one-on-one time with teacher
- Anxiety during reading assessments
- Lack of specific guidance on improvement areas

**User Journey**:
1. Access assessment URL provided by teacher
2. Enter name and start test
3. Read displayed sentences aloud
4. Receive AI feedback with highlighted words to practice
5. Retry reading until proficient or max attempts reached
6. Complete full paragraph reading for mastery demonstration

### 2.2 Secondary Persona: Classroom Teacher

**Name**: Mrs. Johnson, Elementary Reading Specialist

**Goals**:
- Efficiently assess reading fluency for entire class
- Identify students needing additional support
- Track progress over time
- Export data for reporting

**Pain Points**:
- Manual assessments consume instructional time
- Inconsistent scoring across multiple sessions
- Difficulty tracking individual student progress
- Lack of detailed analytics

**User Journey**:
1. Access teacher dashboard via URL
2. Monitor active and completed student sessions
3. Review detailed attempt metrics (WCPM, accuracy, fluency)
4. Compare AI-generated feedback from both STT providers
5. Add qualitative teacher notes
6. Export CSV reports for analysis

---

## 3. Product Features & Requirements

### 3.1 Feature: AI-Powered Reading Assessment (PR-01)

**Priority**: Critical  
**Related BRD**: BR-01, BR-13

**Description**: The system captures student audio, processes it through dual STT providers (Deepgram and SpeechAce) simultaneously, and generates AI feedback using Gemini 2.5 Flash Lite.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-01.1 | Audio capture via web browser | MediaRecorder captures WebM/Opus format audio |
| PR-01.2 | Dual STT processing | Both Deepgram and SpeechAce process every attempt |
| PR-01.3 | Parallel API calls | STT providers called simultaneously, not sequentially |
| PR-01.4 | Metrics extraction | WCPM, accuracy, fluency extracted from both providers |
| PR-01.5 | LLM feedback generation | Gemini generates age-appropriate feedback in JSON format |
| PR-01.6 | Word-level confidence | Words with <75% confidence identified for highlighting |

**User Story**:
> As a student, I want the system to listen to me read and tell me how I did, so I can improve my reading skills.

### 3.2 Feature: Progressive Sentence Accumulation (PR-02)

**Priority**: Critical  
**Related BRD**: BR-02

**Description**: Students build fluency by reading progressively accumulating sentences (sentence 1, then 1+2, then 1+2+3, etc.), with configurable retry limits and auto-progression.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-02.1 | Sentence display logic | Step N displays sentences 1 through N |
| PR-02.2 | Per-step attempt tracking | Retry counter resets at each new step |
| PR-02.3 | Max attempt enforcement | System advances after configurable max attempts |
| PR-02.4 | Progress visualization | Progress bar shows completion across all sentences |
| PR-02.5 | Paragraph mastery | Final two attempts require full paragraph reading |
| PR-02.6 | Encouraging messages | Auto-progression includes encouraging feedback |

**User Story**:
> As a student, I want to practice reading one sentence at a time, building up to the full paragraph, so I don't feel overwhelmed.

### 3.3 Feature: Adaptive Word-Level Feedback (PR-03)

**Priority**: Critical  
**Related BRD**: BR-16

**Description**: When performance falls below threshold, mispronounced words are highlighted. Students must acknowledge each word before retrying.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-03.1 | Word identification | Words below 75% confidence flagged from both STT providers |
| PR-03.2 | Visual highlighting | Flagged words displayed with visual emphasis |
| PR-03.3 | Audio instruction | Instruction audio auto-plays once; replay available |
| PR-03.4 | Acknowledgment tracking | Each highlighted word must be clicked/acknowledged |
| PR-03.5 | Record button state | Disabled until all words acknowledged |
| PR-03.6 | Visual feedback | Acknowledged words show visual indicator |

**User Story**:
> As a student, I want to see which words I mispronounced and practice them before trying again, so I can focus on improving specific areas.

### 3.4 Feature: Teacher Dashboard (PR-04)

**Priority**: High  
**Related BRD**: BR-03, BR-17

**Description**: Teachers access a dashboard to monitor sessions, review detailed metrics, add feedback, and export data.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-04.1 | Session views | Toggle between Active and Completed sessions |
| PR-04.2 | Student details modal | Per-sentence and per-paragraph metrics displayed |
| PR-04.3 | Dual provider comparison | Side-by-side display of Deepgram vs SpeechAce results |
| PR-04.4 | Teacher notes | Text area for qualitative observations |
| PR-04.5 | CSV export | Download attempts and results as CSV files |
| PR-04.6 | Refresh functionality | Manual refresh button for real-time updates |

**User Story**:
> As a teacher, I want to review detailed metrics for each student attempt and compare AI feedback from different providers, so I can make informed decisions about student support.

### 3.5 Feature: URL-Based Access Model (PR-05)

**Priority**: Critical  
**Related BRD**: BR-12

**Description**: Pre-configured URLs control access without user registration. URL parameters route to correct test and class.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-05.1 | Student URL structure | `/students/start?testId={T}&classId={C}` |
| PR-05.2 | Teacher URL structure | `/teacher?testId={T}&classId={C}` |
| PR-05.3 | Basic HTTP auth | Browser authentication dialog protects both portals |
| PR-05.4 | Data segregation | Results filtered by testId and classId parameters |
| PR-05.5 | Parameter validation | Invalid parameters return appropriate error |

**User Story**:
> As a teacher, I want to distribute a simple URL to students that automatically routes them to the correct test and class, so I don't need to manage user accounts.

### 3.6 Feature: Privacy & COPPA Compliance (PR-06)

**Priority**: Critical  
**Related BRD**: BR-10

**Description**: System maintains COPPA compliance through data minimization and immediate audio deletion.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-06.1 | No PII storage | Only anonymized identifiers (e.g., J_Smith_7B3X) |
| PR-06.2 | Immediate audio deletion | Audio files deleted after STT processing |
| PR-06.3 | Anonymized metrics | Only WCPM, accuracy, transcriptions, feedback retained |
| PR-06.4 | HTTPS communication | All data transmission encrypted |
| PR-06.5 | No tracking cookies | No persistent cookies or user tracking |

**User Story**:
> As a school administrator, I need assurance that student data is handled in compliance with COPPA, so we can legally deploy the system.

### 3.7 Feature: Observability & Prompt Management (PR-07)

**Priority**: High  
**Related BRD**: BR-15

**Description**: LangSmith integration provides comprehensive tracing and enables non-technical prompt editing.

**Functional Requirements**:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| PR-07.1 | Complete tracing | All STT and LLM interactions traced with metadata |
| PR-07.2 | Prompt Hub integration | Prompts version-controlled in LangSmith |
| PR-07.3 | Runtime prompt pull | Application pulls current prompt at execution |
| PR-07.4 | Playground editing | Non-technical users can edit prompts via web UI |
| PR-07.5 | Trace metadata | Includes attempt ID, student ID, test ID, timestamp |

**User Story**:
> As an educational stakeholder, I want to iterate on AI prompts without needing developer support, so I can optimize feedback quality.

---

## 4. User Flows

### 4.1 Student Assessment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STUDENT ASSESSMENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────────────────────┐   │
│  │  Access  │───►│  Enter   │───►│         PROGRESSIVE READING          │   │
│  │   URL    │    │   Name   │    │                                      │   │
│  └──────────┘    └──────────┘    │  Step 1: Read Sentence 1             │   │
│                                  │  Step 2: Read Sentences 1+2          │   │
│                                  │  Step 3: Read Sentences 1+2+3        │   │
│                                  │  ...                                 │   │
│                                  │  Final: Full Paragraph (x2)          │   │
│                                  └──────────────────────────────────────┘   │
│                                                  │                          │
│                                                  ▼                          │
│                                  ┌──────────────────────────────────────┐   │
│                                  │         FOR EACH STEP:               │   │
│                                  │                                      │   │
│                                  │  1. Display sentences                │   │
│                                  │  2. Click Record                     │   │
│                                  │  3. Read aloud                       │   │
│                                  │  4. Click Stop                       │   │
│                                  │  5. AI Analysis                      │   │
│                                  │                                      │   │
│                                  │  IF PASS: Progress to next step      │   │
│                                  │  IF FAIL: Highlight words → Review   │   │
│                                  │           → Retry (up to max)        │   │
│                                  └──────────────────────────────────────┘   │
│                                                  │                          │
│                                                  ▼                          │
│                                  ┌──────────────────────────────────────┐   │
│                                  │       ASSESSMENT COMPLETE            │   │
│                                  │   Results saved to database          │   │
│                                  └──────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Teacher Dashboard Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEACHER DASHBOARD FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────────────────────────────────────────────────┐   │
│  │  Access  │───►│                 DASHBOARD VIEW                       │   │
│  │   URL    │    │                                                      │   │
│  └──────────┘    │  ┌─────────────────┬─────────────────────────────┐  │   │
│                  │  │  ACTIVE SESSIONS │  COMPLETED SESSIONS         │  │   │
│                  │  │  (In Progress)   │  (View Details available)   │  │   │
│                  │  └─────────────────┴─────────────────────────────┘  │   │
│                  └──────────────────────────────────────────────────────┘   │
│                                                  │                          │
│                                 Select Student   │                          │
│                                                  ▼                          │
│                  ┌──────────────────────────────────────────────────────┐   │
│                  │              STUDENT DETAILS MODAL                   │   │
│                  │                                                      │   │
│                  │  ┌────────────────────────────────────────────────┐ │   │
│                  │  │  PER-SENTENCE METRICS                          │ │   │
│                  │  │  • Coach DG (Deepgram): WCPM, Fluency, Accuracy│ │   │
│                  │  │  • Coach SA (SpeechAce): WCPM, Fluency, Accuracy│ │   │
│                  │  │  • Highlighted words, Attempts                 │ │   │
│                  │  └────────────────────────────────────────────────┘ │   │
│                  │  ┌────────────────────────────────────────────────┐ │   │
│                  │  │  PER-PARAGRAPH METRICS                         │ │   │
│                  │  │  • Full paragraph reads (2x)                   │ │   │
│                  │  └────────────────────────────────────────────────┘ │   │
│                  │  ┌────────────────────────────────────────────────┐ │   │
│                  │  │  WORDS WITH TROUBLE (Top 3)                    │ │   │
│                  │  └────────────────────────────────────────────────┘ │   │
│                  │  ┌────────────────────────────────────────────────┐ │   │
│                  │  │  AI FEEDBACK (Coach DG & Coach SA)             │ │   │
│                  │  └────────────────────────────────────────────────┘ │   │
│                  │  ┌────────────────────────────────────────────────┐ │   │
│                  │  │  TEACHER NOTES (Editable)                      │ │   │
│                  │  └────────────────────────────────────────────────┘ │   │
│                  └──────────────────────────────────────────────────────┘   │
│                                                  │                          │
│                                                  ▼                          │
│                  ┌──────────────────────────────────────────────────────┐   │
│                  │              EXPORT OPTIONS                          │   │
│                  │  • Download Attempts CSV (detailed per-attempt)      │   │
│                  │  • Download Results CSV (summary per-student)        │   │
│                  └──────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Information Architecture

### 5.1 Site Map

```
ReadAssist AI Platform
│
├── /students
│   ├── /start                    [Entry Page]
│   │   └── ?testId=X&classId=Y   [URL Parameters]
│   │
│   ├── /assessment               [Main Assessment Interface]
│   │   └── ?testId=X&classId=Y
│   │
│   └── /assessment/completed     [Completion Screen]
│
├── /teacher                      [Teacher Dashboard]
│   └── ?testId=X&classId=Y
│
└── /api
    ├── /submit-attempt           [POST - Submit audio]
    ├── /start-session            [POST - Initialize session]
    ├── /active-sessions          [GET - In-progress sessions]
    ├── /completed-sessions       [GET - Finished sessions]
    ├── /student-detail-results   [GET - Detailed metrics]
    ├── /save-teacher-notes       [POST - Save notes]
    ├── /export-attempts-csv      [GET - Attempts export]
    └── /export-results-csv       [GET - Results export]
```

### 5.2 Data Model Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   teachers   │────►│    classes   │────►│   attempts   │
│              │     │              │     │              │
│ • id         │     │ • id         │     │ • id         │
│ • name       │     │ • teacher_id │     │ • class_id   │
│ • email      │     │ • name       │     │ • test_id    │
│ • created_at │     │ • code       │     │ • student_id │
└──────────────┘     │ • created_at │     │ • metrics... │
                     └──────────────┘     └──────────────┘
                                                 ▲
                                                 │
┌──────────────┐     ┌──────────────┐            │
│    tests     │────►│  sentences   │            │
│              │     │              │            │
│ • id         │     │ • id         │            │
│ • title      │     │ • test_id    │────────────┘
│ • fluency_   │     │ • content    │
│   threshold  │     │ • sequence_  │
│ • max_       │     │   number     │
│   attempts   │     └──────────────┘
└──────────────┘
```

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Audio upload time | < 3 seconds | For 2-minute recording |
| STT processing | < 10 seconds | Both providers combined |
| UI responsiveness | < 100ms | Button click to feedback |
| Concurrent users | 100+ sessions | Load testing verified |
| Cold start | < 50ms | Cloudflare Workers |

### 6.2 Compatibility Requirements

| Requirement | Specification |
|-------------|---------------|
| Primary Browser | Chrome 90+ |
| Target Devices | Chromebooks |
| Audio Format | WebM/Opus |
| Screen Resolution | 1366x768 minimum |
| Network | Standard school firewall compatible |

### 6.3 Accessibility Requirements

| Requirement | Standard |
|-------------|----------|
| WCAG Compliance | Level AA |
| Keyboard Navigation | Full support |
| Screen Reader | Compatible |
| Color Contrast | 4.5:1 minimum |
| Font Size | User-adjustable |

### 6.4 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Authentication | HTTP Basic Auth |
| Encryption | HTTPS only (TLS 1.3) |
| Data Storage | Anonymized, no PII |
| Audio Retention | Deleted immediately after processing |
| Rate Limiting | Cloudflare WAF |

---

## 7. Release Criteria

### 7.1 MVP Release Checklist

- [ ] All critical features implemented (PR-01 through PR-06)
- [ ] Dual STT processing functional for 100% of attempts
- [ ] Progressive sentence accumulation working
- [ ] Word highlighting and acknowledgment flow complete
- [ ] Teacher dashboard with metrics display
- [ ] CSV export functional
- [ ] LangSmith tracing capturing all interactions
- [ ] HTTP Basic Auth protecting both portals
- [ ] Chromebook compatibility verified
- [ ] 25+ classroom assessments completed
- [ ] Teacher feedback incorporated

### 7.2 Go/No-Go Criteria

| Category | Criterion | Status |
|----------|-----------|--------|
| Technical | Both STT providers operational | Required |
| Technical | LLM feedback generation working | Required |
| Technical | Database storing all metrics | Required |
| Usability | Student flow tested with K-12 | Required |
| Usability | Teacher dashboard functional | Required |
| Compliance | COPPA requirements met | Required |
| Performance | 100 concurrent users supported | Required |

---

## 8. Future Roadmap

### Phase 2: MVP Enhancements (Post-PoC)

- Multiple test management interface
- Student progress tracking over time
- Advanced analytics dashboard with visualizations
- Custom rubric configuration
- LMS integration with ReadAssist main platform

### Phase 3: General Availability

- Production SLAs
- Multi-region deployment
- Advanced security audit
- Role-based access control
- Mobile app consideration

### Deferred Features

- Phoneme-level pronunciation analysis
- Interactive word correction exercises
- AI-generated audio pronunciation modeling
- Adaptive difficulty adjustment
- Real-time pronunciation coaching
- Multi-language support

---

## 9. Appendix

### 9.1 Glossary

| Term | Definition |
|------|------------|
| WCPM | Words Correct Per Minute - primary fluency metric |
| STT | Speech-to-Text technology |
| Progressive Accumulation | Reading methodology building from single sentences to full paragraphs |
| Reading Step | Each stage of progressive reading where student reads accumulated sentences |
| Word Highlighting | Visual indication of mispronounced words requiring review |
| LangSmith | Observability platform for LLM applications |
| COPPA | Children's Online Privacy Protection Act |

### 9.2 References

1. ReadAssist AI Business Requirements Document (BRD) v2.2
2. ReadAssist AI Technical Requirements Document (TRD) v4.2
3. Deepgram API Documentation
4. SpeechAce API Documentation
5. Gemini 2.5 Flash Lite Documentation
6. LangSmith Documentation

---

*Document Version 1.0 - Created October 12, 2026*
