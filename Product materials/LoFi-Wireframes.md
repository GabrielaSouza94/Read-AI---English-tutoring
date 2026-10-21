# ReadAssist AI - Low-Fidelity Wireframes Documentation

## Document Information

| Field | Details |
|-------|---------|
| **Product Name** | ReadAssist AI - Reading Fluency Assessment Platform |
| **Document Type** | Low-Fidelity Wireframes |
| **Version** | 1.0 |
| **Author** | Product Design Team |
| **Date** | October 12, 2026 |
| **Status** | Draft |

---

## 1. Overview

This document presents low-fidelity wireframes for the ReadAssist AI platform. These wireframes establish the foundational layout, information hierarchy, and user interaction patterns before visual design is applied.

### 1.1 Purpose

- Define screen layouts and component placement
- Establish information hierarchy
- Document interaction patterns
- Facilitate early stakeholder feedback
- Guide high-fidelity design development

### 1.2 Design Principles

1. **Clarity First**: Simple, uncluttered interfaces suitable for K-12 students
2. **Progressive Disclosure**: Show only relevant information at each step
3. **Immediate Feedback**: Clear visual response to user actions
4. **Accessibility**: Large touch targets, clear typography, high contrast
5. **Error Prevention**: Guide users to prevent mistakes

---

## 2. Student Portal Wireframes

### 2.1 Student Start Page

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     READASSIST AI                              │ │
│  │                  Reading Fluency Assessment                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   Welcome! Let's practice reading together.                    │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │  First Name                                               │ │ │
│  │   │  ┌────────────────────────────────────────────────────┐  │ │ │
│  │   │  │                                                    │  │ │ │
│  │   │  └────────────────────────────────────────────────────┘  │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │  Last Name                                                │ │ │
│  │   │  ┌────────────────────────────────────────────────────┐  │ │ │
│  │   │  │                                                    │  │ │ │
│  │   │  └────────────────────────────────────────────────────┘  │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │   ┌────────────────────────────────────────────────────────┐   │ │
│  │   │                                                        │   │ │
│  │   │              [    START TEST    ]                      │   │ │
│  │   │                                                        │   │ │
│  │   └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Logo and title prominently displayed
- Simple two-field form (First Name, Last Name)
- Large, prominent START TEST button
- Friendly, encouraging welcome message
- Clean, uncluttered layout appropriate for children
```

### 2.2 Student Assessment Page - Initial State

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 1 of 5                                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   READING TEXT                                                  │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │                                                           │ │ │
│  │   │   The little brown dog ran quickly across                 │ │ │
│  │   │   the green park.                                         │ │ │
│  │   │                                                           │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │                      Sentence 1 of 5                           │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   ┌────────────────────────────────────────────────────────┐   │ │
│  │   │                                                        │   │ │
│  │   │                  [  🎤 RECORD  ]                       │   │ │
│  │   │                                                        │   │ │
│  │   └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  │             Click RECORD, then read the text aloud              │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Progress bar shows current step
- Reading text displayed prominently in large font
- Sentence counter shows current position
- Large RECORD button with microphone icon
- Simple instruction text
- Clean two-section layout (text above, controls below)
```

### 2.3 Student Assessment Page - Recording State

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 1 of 5                                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   READING TEXT                                                  │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │                                                           │ │ │
│  │   │   The little brown dog ran quickly across                 │ │ │
│  │   │   the green park.                                         │ │ │
│  │   │                                                           │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   ┌────────────────────────────────────────────────────────┐   │ │
│  │   │                                                        │   │ │
│  │   │             [  ⏹ STOP RECORDING  ]                     │   │ │
│  │   │                                                        │   │ │
│  │   └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  │           ●  Recording... 0:05                                  │ │
│  │                                                                 │ │
│  │         ▁▂▃▅▆▇█▇▆▅▃▂▁▂▃▅▆▇█▇▆▅▃▂▁  (audio waveform)           │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Button changes to STOP RECORDING (different color)
- Recording indicator with red dot
- Timer shows recording duration
- Audio waveform visualization provides feedback
- Visual confirmation that recording is active
```

### 2.4 Student Assessment Page - Processing State

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 1 of 5                                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │                                                                 │ │
│  │                                                                 │ │
│  │                        ┌─────────┐                              │ │
│  │                        │  ◷◷◷◷   │                              │ │
│  │                        │ Loading │                              │ │
│  │                        └─────────┘                              │ │
│  │                                                                 │ │
│  │                Analyzing your reading...                        │ │
│  │                                                                 │ │
│  │                Please wait a moment                             │ │
│  │                                                                 │ │
│  │                                                                 │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Loading spinner centered on screen
- Friendly message explains what's happening
- Progress bar remains visible
- All interactive elements disabled during processing
```

### 2.5 Student Assessment Page - Word Highlighting (Failed Attempt)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 1 of 5           Attempt 1 of 3                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   LET'S PRACTICE THESE WORDS                                   │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │                                                           │ │ │
│  │   │   The little brown dog ran [QUICKLY] across               │ │ │
│  │   │   the green park.                                         │ │ │
│  │   │                            ▲                              │ │ │
│  │   │                    highlighted word                       │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │   Click each highlighted word to review it:                    │ │
│  │                                                                 │ │
│  │        ┌───────────────┐                                       │ │
│  │        │   QUICKLY     │  ← click to acknowledge               │ │
│  │        │   ○ Not yet   │                                       │ │
│  │        └───────────────┘                                       │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │   🔊 [PLAY INSTRUCTION]  "Click each word to practice it"      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │   [  🎤 RECORD  ]  ← DISABLED until words reviewed             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Highlighted words shown in text (boxed or colored)
- Clear instruction to click each highlighted word
- Word list with acknowledgment status (○ not reviewed, ● reviewed)
- Audio instruction with play button
- RECORD button disabled until all words acknowledged
- Attempt counter shows remaining tries
```

### 2.6 Student Assessment Page - Words Acknowledged

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 1 of 5           Attempt 1 of 3                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   ✓ GREAT JOB REVIEWING!                                       │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │                                                           │ │ │
│  │   │   The little brown dog ran quickly across                 │ │ │
│  │   │   the green park.                                         │ │ │
│  │   │                                                           │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │   Words practiced:                                              │ │
│  │                                                                 │ │
│  │        ┌───────────────┐                                       │ │
│  │        │   QUICKLY     │                                       │ │
│  │        │   ● Reviewed  │  ✓                                    │ │
│  │        └───────────────┘                                       │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   ┌────────────────────────────────────────────────────────┐   │ │
│  │   │                                                        │   │ │
│  │   │              [  🎤 TRY AGAIN  ]                        │   │ │
│  │   │                                                        │   │ │
│  │   └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  │             Ready to read again? Click TRY AGAIN!              │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Success message acknowledging word review
- Highlighted words now show as "Reviewed" with checkmark
- RECORD button enabled and relabeled as "TRY AGAIN"
- Encouraging message to try reading again
- Visual indicator of reviewed status
```

### 2.7 Student Assessment Page - Success (Pass)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 1 of 5  ✓ Complete!                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │                                                                 │ │
│  │                         🎉                                      │ │
│  │                                                                 │ │
│  │                    GREAT READING!                               │ │
│  │                                                                 │ │
│  │            You read that perfectly!                             │ │
│  │                                                                 │ │
│  │         ┌─────────────────────────────────────┐                 │ │
│  │         │   Your Score                        │                 │ │
│  │         │                                     │                 │ │
│  │         │   Words per minute: 85              │                 │ │
│  │         │   Accuracy: 95%                     │                 │ │
│  │         │   Fluency: ⭐⭐⭐⭐⭐                  │                 │ │
│  │         │                                     │                 │ │
│  │         └─────────────────────────────────────┘                 │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │   ┌────────────────────────────────────────────────────────┐   │ │
│  │   │              [  NEXT SENTENCE →  ]                     │   │ │
│  │   └────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Progress bar segment fills and shows checkmark
- Celebration emoji and encouraging message
- Score summary (WCPM, Accuracy, Fluency stars)
- NEXT SENTENCE button to progress
- Positive reinforcement for successful attempt
```

### 2.8 Student Assessment Page - Progressive Reading (Step 3)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Step 3 of 5                                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   READING TEXT                                                  │ │
│  │                                                                 │ │
│  │   ┌──────────────────────────────────────────────────────────┐ │ │
│  │   │                                                           │ │ │
│  │   │   The little brown dog ran quickly across                 │ │ │
│  │   │   the green park. He jumped over the fence                │ │ │
│  │   │   and landed softly. His owner called him                 │ │ │
│  │   │   to come back home.                                      │ │ │
│  │   │                                                           │ │ │
│  │   │   ← Sentences 1, 2, and 3 displayed together              │ │ │
│  │   │                                                           │ │ │
│  │   └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │                      Sentences 1-3 of 5                        │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │   [  🎤 RECORD  ]                                               │ │
│  │   Read all sentences from the beginning                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Progress bar shows step 3 of 5
- Text area shows sentences 1, 2, AND 3 (progressive accumulation)
- Counter shows "Sentences 1-3 of 5"
- Instruction clarifies reading all sentences from beginning
- Demonstrates progressive accumulation pattern
```

### 2.9 Student Completion Page

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Progress: Complete!                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ████████████████████████████████████████████████████████████░ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │                         🏆                                      │ │
│  │                                                                 │ │
│  │              CONGRATULATIONS!                                   │ │
│  │                                                                 │ │
│  │         You completed the reading assessment!                   │ │
│  │                                                                 │ │
│  │   ┌─────────────────────────────────────────────────────────┐  │ │
│  │   │                                                          │  │ │
│  │   │   Final Results                                          │  │ │
│  │   │                                                          │  │ │
│  │   │   Overall WCPM: 82                                       │  │ │
│  │   │   Overall Accuracy: 91%                                  │  │ │
│  │   │   Overall Fluency: ⭐⭐⭐⭐                                 │  │ │
│  │   │                                                          │  │ │
│  │   │   Total Sentences: 5                                     │  │ │
│  │   │   Paragraph Reads: 2                                     │  │ │
│  │   │                                                          │  │ │
│  │   └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  │                                                                 │ │
│  │         Great job! Your results have been saved.               │ │
│  │         You can close this window now.                         │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Full progress bar indicates completion
- Trophy/celebration icon
- Congratulations message
- Final aggregated results summary
- Clear instruction that assessment is complete
- No further action required from student
```

---

## 3. Teacher Dashboard Wireframes

### 3.1 Teacher Dashboard - Main View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  READASSIST AI - Teacher Dashboard         Class: 3B    Test: Test 1   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┬─────────────────────────────────────────┐  │
│  │  [ACTIVE SESSIONS]  │  [COMPLETED SESSIONS]        [⟳ REFRESH]       │  │
│  │        ●                                            [📥 EXPORT CSV]   │  │
│  └─────────────────────────────┴─────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ACTIVE SESSIONS (3 students in progress)                              │ │
│  │                                                                         │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Student ID    │ Current Step │ Best WCPM │ Accuracy │ Status      │ │ │
│  │  ├───────────────────────────────────────────────────────────────────┤ │ │
│  │  │ JoSm_X7K2     │ Step 3/5     │ 78        │ 88%      │ ● Recording │ │ │
│  │  │ MaJo_P2L9     │ Step 1/5     │ --        │ --       │ ● Waiting   │ │ │
│  │  │ SaBr_K4M1     │ Step 4/5     │ 92        │ 95%      │ ● Reviewing │ │ │
│  │  └───────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Note: Metrics shown are BEST scores from current attempt only              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Header shows class and test context
- Toggle between Active and Completed sessions
- Refresh and Export buttons prominently placed
- Active sessions table shows real-time status
- Student Anonymous ID format visible (e.g., JoSm_X7K2)
- Status indicators (Recording, Waiting, Reviewing)
- Metrics are best from current attempt only
```

### 3.2 Teacher Dashboard - Completed Sessions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  READASSIST AI - Teacher Dashboard         Class: 3B    Test: Test 1   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┬─────────────────────────────────────────┐  │
│  │  [ACTIVE SESSIONS]  │  [COMPLETED SESSIONS]        [⟳ REFRESH]       │  │
│  │                              ●                       [📥 EXPORT CSV]   │  │
│  └─────────────────────────────┴─────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  COMPLETED SESSIONS (8 students finished)                              │ │
│  │                                                                         │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Student ID │ WCPM  │ Accuracy │ Fluency │ Completed    │ Action  │ │ │
│  │  ├───────────────────────────────────────────────────────────────────┤ │ │
│  │  │ AlDa_M3N7  │ 95    │ 97%      │ 92%     │ 10:32 AM     │[Details]│ │ │
│  │  │ EmWi_K8P2  │ 82    │ 89%      │ 85%     │ 10:28 AM     │[Details]│ │ │
│  │  │ NoLe_J5Q4  │ 71    │ 78%      │ 72%     │ 10:15 AM     │[Details]│ │ │
│  │  │ OlMa_H2R6  │ 88    │ 94%      │ 90%     │ 10:05 AM     │[Details]│ │ │
│  │  │ SoAn_F9S1  │ 65    │ 72%      │ 68%     │ 09:55 AM     │[Details]│ │ │
│  │  │ LiCh_G4T8  │ 90    │ 96%      │ 91%     │ 09:48 AM     │[Details]│ │ │
│  │  │ JaHa_B7U3  │ 77    │ 85%      │ 80%     │ 09:40 AM     │[Details]│ │ │
│  │  │ MiTh_A1V5  │ 84    │ 91%      │ 87%     │ 09:32 AM     │[Details]│ │ │
│  │  └───────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Note: Metrics shown are BEST scores from ALL attempts                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Completed sessions tab selected
- Table shows aggregated best scores from all attempts
- [Details] button for each student to open modal
- Completion time shown
- Sortable columns (implied)
- Metrics are best from ALL attempts for completed sessions
```

### 3.3 Teacher Dashboard - Student Details Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Student Details: AlDa_M3N7                                    [X]    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────┬──────────────────────────────────┐  │
│  │                                   │                                   │  │
│  │  PER-SENTENCE METRICS             │  TEACHER NOTES                   │  │
│  │                                   │                                   │  │
│  │  ▼ Sentence 1                     │  ┌─────────────────────────────┐ │  │
│  │  ┌─────────────────────────────┐  │  │                             │ │  │
│  │  │ Coach DG │ Coach SA         │  │  │  Add your notes here...    │ │  │
│  │  │ WCPM: 95 │ WCPM: 92         │  │  │                             │ │  │
│  │  │ Fluency: 92% │ Fluency: 90% │  │  │                             │ │  │
│  │  │ Accuracy: 97% │ Accuracy: 94%│  │  │                             │ │  │
│  │  │ Attempts: 1                  │  │  │                             │ │  │
│  │  │ Highlighted: none            │  │  │                             │ │  │
│  │  └─────────────────────────────┘  │  └─────────────────────────────┘ │  │
│  │                                   │                                   │  │
│  │  ▶ Sentence 2 (collapsed)         │  [SAVE NOTES]                    │  │
│  │  ▶ Sentence 3 (collapsed)         │                                   │  │
│  │  ▶ Sentence 4 (collapsed)         │                                   │  │
│  │  ▶ Sentence 5 (collapsed)         │                                   │  │
│  │                                   │                                   │  │
│  │  ▼ Full Paragraph (Read 1)        │                                   │  │
│  │  ┌─────────────────────────────┐  │                                   │  │
│  │  │ Coach DG │ Coach SA         │  │                                   │  │
│  │  │ WCPM: 92 │ WCPM: 89         │  │                                   │  │
│  │  │ ...                         │  │                                   │  │
│  │  └─────────────────────────────┘  │                                   │  │
│  │                                   │                                   │  │
│  │  ▶ Full Paragraph (Read 2)        │                                   │  │
│  │                                   │                                   │  │
│  └───────────────────────────────────┴──────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

(CONTINUED ON NEXT PAGE)
```

### 3.4 Teacher Dashboard - Student Details Modal (Continued)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  (Modal continued from above)                                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  WORDS WITH TROUBLE (Top 3)                                            │ │
│  │                                                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │  1. "quickly" - highlighted 3 times                            │    │ │
│  │  │  2. "softly" - highlighted 2 times                             │    │ │
│  │  │  3. "jumped" - highlighted 1 time                              │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  AI FEEDBACK                                                           │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────┬─────────────────────────────────────┐ │ │
│  │  │ Coach DG (Deepgram)         │ Coach SA (SpeechAce)                │ │ │
│  │  ├─────────────────────────────┼─────────────────────────────────────┤ │ │
│  │  │ "Great job reading today!   │ "You're making wonderful progress  │ │ │
│  │  │ You read clearly and at     │ with your reading! Your pace is    │ │ │
│  │  │ a good pace. Keep           │ excellent. Try to focus on the     │ │ │
│  │  │ practicing multi-syllable   │ word 'quickly' - break it into     │ │ │
│  │  │ words like 'quickly'."      │ parts: quick-ly."                  │ │ │
│  │  └─────────────────────────────┴─────────────────────────────────────┘ │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ORIGINAL TEXT                                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │ The little brown dog ran quickly across the green park.       │    │ │
│  │  │ He jumped over the fence and landed softly. His owner         │    │ │
│  │  │ called him to come back home.                                 │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

ANNOTATIONS:
- Modal divided into sections
- Per-sentence metrics with expandable sections
- Side-by-side comparison of Coach DG vs Coach SA
- Teacher notes section with save functionality
- Words with Trouble showing frequency
- AI Feedback from both providers displayed
- Original text for teacher reference
```

---

## 4. Component Library

### 4.1 Buttons

```
PRIMARY BUTTON:
┌────────────────────────────────────┐
│           PRIMARY ACTION           │   Large, filled background
└────────────────────────────────────┘   Used for main CTAs

SECONDARY BUTTON:
┌────────────────────────────────────┐
│          SECONDARY ACTION          │   Outlined, no fill
└────────────────────────────────────┘   Used for secondary actions

DISABLED BUTTON:
┌────────────────────────────────────┐
│          DISABLED ACTION           │   Grayed out
└────────────────────────────────────┘   Not clickable

ICON BUTTON:
┌──────┐
│  ⟳  │   Icon only, square
└──────┘   Used for refresh, etc.
```

### 4.2 Form Elements

```
TEXT INPUT:
┌──────────────────────────────────────────────────┐
│ Label                                            │
│ ┌──────────────────────────────────────────────┐ │
│ │ Placeholder text...                          │ │
│ └──────────────────────────────────────────────┘ │
│ Helper text (optional)                           │
└──────────────────────────────────────────────────┘

TEXT AREA:
┌──────────────────────────────────────────────────┐
│ Label                                            │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ │ Multi-line input area                        │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 4.3 Progress Indicators

```
PROGRESS BAR:
┌────────────────────────────────────────────────────────────────┐
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   50% complete
└────────────────────────────────────────────────────────────────┘

SEGMENTED PROGRESS:
┌───────┬───────┬───────┬───────┬───────┐
│ ████  │ ████  │ ░░░░  │ ░░░░  │ ░░░░  │   Step 2 of 5
│  ✓    │  ●    │       │       │       │
└───────┴───────┴───────┴───────┴───────┘

LOADING SPINNER:
    ◜ ◝
    ◟ ◞    Animated spinning indicator
```

### 4.4 Status Indicators

```
SUCCESS:     ✓ or ● (green)
WARNING:     ⚠ or ● (yellow)
ERROR:       ✗ or ● (red)
INFO:        ℹ or ● (blue)
IN PROGRESS: ◷ or ● (animated)
```

### 4.5 Cards and Containers

```
CARD:
┌─────────────────────────────────────────────────┐
│                                                 │
│  Card Title                                     │
│                                                 │
│  Card content goes here with relevant           │
│  information displayed clearly.                 │
│                                                 │
│                            [ACTION]             │
│                                                 │
└─────────────────────────────────────────────────┘

EXPANDABLE SECTION:
▶ Collapsed Section Title
──────────────────────────────────────────────────

▼ Expanded Section Title
┌─────────────────────────────────────────────────┐
│ Section content visible when expanded           │
└─────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Recording Flow State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
    ┌─────────┐  Click   ┌───────────┐  Click   ┌──────────┐ │
    │  IDLE   │ ────────>│ RECORDING │ ────────>│PROCESSING│ │
    └─────────┘  Record  └───────────┘  Stop    └──────────┘ │
         ▲                                            │      │
         │                                            │      │
         │         ┌───────────────────────────┐      │      │
         │         │                           │      │      │
         │         ▼                           │      │      │
         │   ┌─────────┐        ┌──────────┐   │      │      │
         │   │HIGHLIGHT│───────>│  REVIEW  │   │      │      │
         │   │ WORDS   │ ack all│  DONE    │   │      │      │
         │   └─────────┘        └──────────┘   │      │      │
         │         ▲                  │        │      │      │
         │         │                  │        │      │      │
         │         └──────────────────┘        │      │      │
         │              Retry                  │      │      │
         │                                     │      │      │
         └────────────────────── Pass ─────────┴──────┘      │
                                                             │
         ┌───────────────────── Complete ────────────────────┘
         ▼
    ┌─────────┐
    │COMPLETE │
    └─────────┘
```

### 5.2 Word Acknowledgment Pattern

```
1. Words highlighted in text
2. Word list displayed below
3. Each word shows ○ (not reviewed)
4. User clicks word
5. Word shows ● (reviewed) with checkmark
6. Repeat until all words ●
7. RECORD button enables
```

### 5.3 Navigation Pattern

```
Student Flow:
Start → Assessment (loop through steps) → Complete

Teacher Flow:
Dashboard → Session List → Student Details (modal) → Return to List
                ↓
              Export CSV
```

---

## 6. Responsive Considerations

### 6.1 Primary Target: Chromebook (1366x768)

All wireframes designed for this resolution as the primary target.

### 6.2 Minimum Supported: 1024x768

- Reduce padding
- Stack horizontal elements vertically if needed
- Maintain touch targets ≥44x44px

### 6.3 Touch Target Guidelines

- Minimum button size: 44x44 pixels
- Minimum spacing between targets: 8px
- Form inputs: Full width on mobile

---

## 7. Wireframe Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 12, 2026 | Product Design Team | Initial wireframe documentation |

---

*Low-Fidelity Wireframes Document v1.0 - Created October 12, 2026*
