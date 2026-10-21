# ReadAssist AI - High-Fidelity Design Specification

## Document Information

| Field | Details |
|-------|---------|
| **Product Name** | ReadAssist AI - Reading Fluency Assessment Platform |
| **Document Type** | High-Fidelity Design Specification |
| **Version** | 1.0 |
| **Author** | Product Design Team |
| **Date** | October 12, 2026 |
| **Status** | Draft |
| **Based On** | LoFi Wireframes v1.0 |

---

## 1. Design System Overview

### 1.1 Design Philosophy

ReadAssist AI's design system is built on three core principles:

1. **Child-Friendly Accessibility**: Clear, readable interfaces suitable for K-12 students (ages 5-18)
2. **Educational Encouragement**: Positive visual feedback that motivates continued learning
3. **Teacher Efficiency**: Clean data visualization that enables quick assessment review

### 1.2 Design Tokens

Design tokens are the foundational values used throughout the interface.

---

## 2. Color System

### 2.1 Primary Palette

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRIMARY COLORS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY BLUE                    │  Used for: Primary actions, links,       │
│  ┌──────────────────────┐        │  active states, focus rings             │
│  │                      │        │                                          │
│  │  #2563EB             │        │  Accessible on white: ✓ AAA              │
│  │  rgb(37, 99, 235)    │        │                                          │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
│  PRIMARY BLUE LIGHT              │  Used for: Backgrounds, hover states,    │
│  ┌──────────────────────┐        │  highlights                              │
│  │                      │        │                                          │
│  │  #DBEAFE             │        │  Background color for cards              │
│  │  rgb(219, 234, 254)  │        │                                          │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
│  PRIMARY BLUE DARK               │  Used for: Text on light backgrounds,    │
│  ┌──────────────────────┐        │  dark mode accents                       │
│  │                      │        │                                          │
│  │  #1E40AF             │        │  Accessible on white: ✓ AAA              │
│  │  rgb(30, 64, 175)    │        │                                          │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Semantic Colors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SEMANTIC COLORS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUCCESS GREEN                   │  Used for: Pass states, completion,      │
│  ┌──────────────────────┐        │  positive feedback                       │
│  │                      │        │                                          │
│  │  #059669             │        │  Light: #D1FAE5                          │
│  │  rgb(5, 150, 105)    │        │  Dark: #047857                           │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
│  WARNING AMBER                   │  Used for: Review states, attention      │
│  ┌──────────────────────┐        │  needed, word highlighting               │
│  │                      │        │                                          │
│  │  #D97706             │        │  Light: #FEF3C7                          │
│  │  rgb(217, 119, 6)    │        │  Dark: #B45309                           │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
│  ERROR RED                       │  Used for: Failed attempts, errors,      │
│  ┌──────────────────────┐        │  critical messages                       │
│  │                      │        │                                          │
│  │  #DC2626             │        │  Light: #FEE2E2                          │
│  │  rgb(220, 38, 38)    │        │  Dark: #B91C1C                           │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
│  RECORDING RED                   │  Used for: Active recording indicator,   │
│  ┌──────────────────────┐        │  stop button                             │
│  │                      │        │                                          │
│  │  #EF4444             │        │  Pulsating animation during recording    │
│  │  rgb(239, 68, 68)    │        │                                          │
│  │                      │        │                                          │
│  └──────────────────────┘        │                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Neutral Colors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEUTRAL COLORS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Gray Scale:                                                                 │
│                                                                              │
│  ┌────────┐ #FFFFFF  White         - Page backgrounds                       │
│  ├────────┤ #F9FAFB  Gray-50       - Card backgrounds                       │
│  ├────────┤ #F3F4F6  Gray-100      - Subtle backgrounds                     │
│  ├────────┤ #E5E7EB  Gray-200      - Borders, dividers                      │
│  ├────────┤ #D1D5DB  Gray-300      - Disabled states                        │
│  ├────────┤ #9CA3AF  Gray-400      - Placeholder text                       │
│  ├────────┤ #6B7280  Gray-500      - Secondary text                         │
│  ├────────┤ #4B5563  Gray-600      - Body text                              │
│  ├────────┤ #374151  Gray-700      - Headings                               │
│  ├────────┤ #1F2937  Gray-800      - Primary text                           │
│  └────────┘ #111827  Gray-900      - High emphasis text                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Coach Colors (STT Provider Identification)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COACH COLORS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COACH DG (Deepgram)             │  COACH SA (SpeechAce)                    │
│  ┌──────────────────────┐        │  ┌──────────────────────┐                │
│  │                      │        │  │                      │                │
│  │  #3B82F6             │        │  │  #EC4899             │                │
│  │  Blue-500            │        │  │  Pink-500            │                │
│  │                      │        │  │                      │                │
│  └──────────────────────┘        │  └──────────────────────┘                │
│                                                                              │
│  Light: #EFF6FF                  │  Light: #FCE7F3                          │
│  Used for Coach DG sections      │  Used for Coach SA sections              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Typography

### 3.1 Font Family

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TYPOGRAPHY                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY FONT: Inter                                                         │
│  Fallback: system-ui, -apple-system, sans-serif                             │
│                                                                              │
│  MONOSPACE FONT: JetBrains Mono (metrics/code)                              │
│  Fallback: ui-monospace, monospace                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Type Scale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TYPE SCALE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DISPLAY - Hero Headlines                                                    │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 48px (3rem)                                                      │
│  Line Height: 1.1                                                            │
│  Font Weight: 700 (Bold)                                                     │
│  Letter Spacing: -0.02em                                                     │
│                                                                              │
│  H1 - Page Titles                                                            │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 36px (2.25rem)                                                   │
│  Line Height: 1.2                                                            │
│  Font Weight: 700 (Bold)                                                     │
│  Letter Spacing: -0.01em                                                     │
│                                                                              │
│  H2 - Section Headers                                                        │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 24px (1.5rem)                                                    │
│  Line Height: 1.3                                                            │
│  Font Weight: 600 (Semibold)                                                 │
│                                                                              │
│  H3 - Card Titles                                                            │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 20px (1.25rem)                                                   │
│  Line Height: 1.4                                                            │
│  Font Weight: 600 (Semibold)                                                 │
│                                                                              │
│  BODY LARGE - Reading Text (Primary)                                         │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 24px (1.5rem)                                                    │
│  Line Height: 1.6                                                            │
│  Font Weight: 400 (Regular)                                                  │
│  * Used for student reading passages *                                       │
│                                                                              │
│  BODY - Standard Text                                                        │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 16px (1rem)                                                      │
│  Line Height: 1.5                                                            │
│  Font Weight: 400 (Regular)                                                  │
│                                                                              │
│  BODY SMALL - Secondary Text                                                 │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 14px (0.875rem)                                                  │
│  Line Height: 1.5                                                            │
│  Font Weight: 400 (Regular)                                                  │
│                                                                              │
│  CAPTION - Labels, Hints                                                     │
│  ─────────────────────────────────────────────────                          │
│  Font Size: 12px (0.75rem)                                                   │
│  Line Height: 1.5                                                            │
│  Font Weight: 500 (Medium)                                                   │
│  Text Transform: uppercase (optional)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Spacing System

### 4.1 Spacing Scale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SPACING SCALE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Token       │ Value    │ Use Cases                                         │
│  ────────────┼──────────┼────────────────────────────────────────────────── │
│  space-0     │ 0px      │ No spacing                                        │
│  space-1     │ 4px      │ Tight spacing, icon padding                       │
│  space-2     │ 8px      │ Element gaps, small padding                       │
│  space-3     │ 12px     │ Default padding                                   │
│  space-4     │ 16px     │ Card padding, section gaps                        │
│  space-5     │ 20px     │ Comfortable spacing                               │
│  space-6     │ 24px     │ Section separators                                │
│  space-8     │ 32px     │ Large gaps                                        │
│  space-10    │ 40px     │ Page sections                                     │
│  space-12    │ 48px     │ Major section breaks                              │
│  space-16    │ 64px     │ Page margins                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Container Widths

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CONTAINER WIDTHS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Container      │ Max Width  │ Use Case                                     │
│  ───────────────┼────────────┼───────────────────────────────────────────── │
│  container-sm   │ 640px      │ Narrow content (student forms)               │
│  container-md   │ 768px      │ Standard content                             │
│  container-lg   │ 1024px     │ Wide content                                 │
│  container-xl   │ 1280px     │ Full dashboard layouts                       │
│                                                                              │
│  Page Padding:  │ 16px       │ Mobile                                       │
│                 │ 24px       │ Tablet                                       │
│                 │ 32px       │ Desktop                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 Buttons

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BUTTON SPECIFICATIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY BUTTON                                                              │
│  ┌────────────────────────────────────────────────┐                         │
│  │                                                │                         │
│  │            START TEST                          │                         │
│  │                                                │                         │
│  └────────────────────────────────────────────────┘                         │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #2563EB (primary-blue)                                        │
│  • Text: #FFFFFF (white)                                                     │
│  • Font: 18px, Semibold (600)                                               │
│  • Padding: 16px 32px                                                        │
│  • Border Radius: 12px                                                       │
│  • Min Width: 200px                                                          │
│  • Min Height: 56px (for touch targets)                                      │
│                                                                              │
│  States:                                                                     │
│  • Hover: Background #1D4ED8, transform scale(1.02)                         │
│  • Active: Background #1E40AF, transform scale(0.98)                        │
│  • Focus: Ring 4px #93C5FD (blue-300)                                       │
│  • Disabled: Background #D1D5DB, cursor not-allowed                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RECORD BUTTON (Student Portal)                                              │
│  ┌────────────────────────────────────────────────┐                         │
│  │     🎤                                         │                         │
│  │            RECORD                              │                         │
│  │                                                │                         │
│  └────────────────────────────────────────────────┘                         │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #2563EB (primary-blue)                                        │
│  • Icon: Microphone, 24px                                                    │
│  • Width: 100% (max 400px)                                                   │
│  • Height: 72px (extra large for children)                                   │
│  • Border Radius: 16px                                                       │
│  • Box Shadow: 0 4px 14px rgba(37, 99, 235, 0.25)                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STOP RECORDING BUTTON                                                       │
│  ┌────────────────────────────────────────────────┐                         │
│  │     ⏹                                          │                         │
│  │        STOP RECORDING                          │                         │
│  │                                                │                         │
│  └────────────────────────────────────────────────┘                         │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #EF4444 (recording-red)                                       │
│  • Animation: Subtle pulse (scale 1.0 → 1.02, 1.5s)                         │
│  • Icon: Stop square, 24px                                                   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SECONDARY BUTTON                                                            │
│  ┌────────────────────────────────────────────────┐                         │
│  │                                                │                         │
│  │            VIEW DETAILS                        │                         │
│  │                                                │                         │
│  └────────────────────────────────────────────────┘                         │
│                                                                              │
│  Properties:                                                                 │
│  • Background: transparent                                                   │
│  • Border: 2px solid #2563EB                                                 │
│  • Text: #2563EB                                                             │
│  • Padding: 12px 24px                                                        │
│  • Border Radius: 8px                                                        │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ICON BUTTON                                                                 │
│  ┌──────────┐                                                               │
│  │    ⟳     │                                                               │
│  └──────────┘                                                               │
│                                                                              │
│  Properties:                                                                 │
│  • Size: 44px x 44px (touch target)                                          │
│  • Background: #F3F4F6 (gray-100)                                            │
│  • Icon Size: 20px                                                           │
│  • Border Radius: 8px                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Form Inputs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FORM INPUT SPECIFICATIONS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEXT INPUT                                                                  │
│                                                                              │
│  First Name                                                                  │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │                                                                │         │
│  │  Enter your first name                                         │         │
│  │                                                                │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  Properties:                                                                 │
│  • Label: 14px, Semibold, Gray-700                                          │
│  • Label Margin Bottom: 8px                                                  │
│  • Input Height: 56px (large for children)                                   │
│  • Input Padding: 16px                                                       │
│  • Input Font: 18px, Regular                                                 │
│  • Border: 2px solid #E5E7EB                                                 │
│  • Border Radius: 12px                                                       │
│  • Placeholder: Gray-400                                                     │
│                                                                              │
│  States:                                                                     │
│  • Focus: Border #2563EB, Ring 4px rgba(37, 99, 235, 0.2)                   │
│  • Error: Border #DC2626, Error message below                                │
│  • Filled: Border #D1D5DB                                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TEXT AREA (Teacher Notes)                                                   │
│                                                                              │
│  Teacher Notes                                                               │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │                                                                │         │
│  │  Add your observations here...                                 │         │
│  │                                                                │         │
│  │                                                                │         │
│  │                                                                │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  Properties:                                                                 │
│  • Min Height: 120px                                                         │
│  • Resize: vertical                                                          │
│  • Font: 14px                                                                │
│  • Other properties same as text input                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Progress Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PROGRESS COMPONENTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROGRESS BAR (Student Portal)                                               │
│                                                                              │
│  Progress: Step 3 of 5                                                       │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  Properties:                                                                 │
│  • Height: 12px                                                              │
│  • Background: #E5E7EB (gray-200)                                            │
│  • Fill: #059669 (success-green)                                             │
│  • Border Radius: 9999px (pill)                                              │
│  • Transition: width 0.5s ease-out                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SEGMENTED PROGRESS (with step indicators)                                   │
│                                                                              │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                         │
│  │  ✓    │ │  ✓    │ │  ●    │ │       │ │       │                         │
│  │ Step 1│ │ Step 2│ │ Step 3│ │ Step 4│ │ Step 5│                         │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘                         │
│    Done      Done     Active    Pending   Pending                            │
│                                                                              │
│  Step States:                                                                │
│  • Completed: Background #D1FAE5, Icon ✓ in #059669                         │
│  • Active: Background #DBEAFE, Border 2px #2563EB                           │
│  • Pending: Background #F3F4F6, Border 1px #E5E7EB                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  LOADING SPINNER                                                             │
│                                                                              │
│     ┌───────────────┐                                                        │
│     │     ◜ ◝       │                                                        │
│     │     ◟ ◞       │                                                        │
│     │               │                                                        │
│     │   Loading...  │                                                        │
│     └───────────────┘                                                        │
│                                                                              │
│  Properties:                                                                 │
│  • Size: 48px                                                                │
│  • Color: #2563EB                                                            │
│  • Animation: rotate 1s linear infinite                                      │
│  • Text: 14px, Gray-500, margin-top 12px                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Cards and Containers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CARD SPECIFICATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STANDARD CARD                                                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  Card Title                                                          │    │
│  │                                                                      │    │
│  │  Card content goes here. This is body text that provides            │    │
│  │  information or context to the user.                                │    │
│  │                                                                      │    │
│  │                                              [ACTION BUTTON]         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #FFFFFF                                                       │
│  • Border: 1px solid #E5E7EB                                                 │
│  • Border Radius: 16px                                                       │
│  • Padding: 24px                                                             │
│  • Box Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)                                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  READING TEXT CARD (Student Portal)                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │    The little brown dog ran quickly across                          │    │
│  │    the green park. He jumped over the fence                         │    │
│  │    and landed softly.                                               │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #F9FAFB                                                       │
│  • Border: 2px solid #E5E7EB                                                 │
│  • Border Radius: 20px                                                       │
│  • Padding: 32px                                                             │
│  • Font: 24px reading text (BODY LARGE)                                      │
│  • Line Height: 1.8 (extra spacing for readability)                          │
│  • Min Height: 200px                                                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  COACH COMPARISON CARD (Teacher Dashboard)                                   │
│                                                                              │
│  ┌─────────────────────────────┬──────────────────────────────────────┐     │
│  │                             │                                      │     │
│  │  Coach DG                   │  Coach SA                            │     │
│  │  (Deepgram)                 │  (SpeechAce)                         │     │
│  │                             │                                      │     │
│  │  WCPM: 95                   │  WCPM: 92                            │     │
│  │  Fluency: 92%               │  Fluency: 90%                        │     │
│  │  Accuracy: 97%              │  Accuracy: 94%                       │     │
│  │                             │                                      │     │
│  └─────────────────────────────┴──────────────────────────────────────┘     │
│                                                                              │
│  Properties:                                                                 │
│  • Split layout: 50/50                                                       │
│  • Left side: Background #EFF6FF (blue-50), header text #3B82F6             │
│  • Right side: Background #FCE7F3 (pink-50), header text #EC4899            │
│  • Divider: 1px solid #E5E7EB                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Word Highlighting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WORD HIGHLIGHTING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HIGHLIGHTED WORD (Needs Review)                                             │
│                                                                              │
│  The little brown dog ran ┌─────────┐ across the park.                      │
│                           │ quickly │                                        │
│                           └─────────┘                                        │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #FEF3C7 (warning-amber-light)                                 │
│  • Border: 2px solid #D97706                                                 │
│  • Border Radius: 6px                                                        │
│  • Padding: 2px 6px                                                          │
│  • Cursor: pointer                                                           │
│  • Animation: subtle pulse on appearance                                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  WORD ACKNOWLEDGMENT LIST                                                    │
│                                                                              │
│  Click each word to review it:                                               │
│                                                                              │
│  ┌────────────────────────────────────────────┐                             │
│  │  ○  quickly                                │  ← Not reviewed             │
│  └────────────────────────────────────────────┘                             │
│                                                                              │
│  ┌────────────────────────────────────────────┐                             │
│  │  ●  softly   ✓                             │  ← Reviewed                 │
│  └────────────────────────────────────────────┘                             │
│                                                                              │
│  Properties:                                                                 │
│  • Not Reviewed: Border #D97706, Background #FEF3C7                         │
│  • Reviewed: Border #059669, Background #D1FAE5, ✓ icon                     │
│  • Font: 18px, Medium weight                                                 │
│  • Padding: 12px 16px                                                        │
│  • Border Radius: 8px                                                        │
│  • Transition: all 0.2s ease                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TABLE SPECIFICATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DATA TABLE (Teacher Dashboard)                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Student ID │ WCPM │ Accuracy │ Fluency │ Completed  │ Actions       │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ AlDa_M3N7  │ 95   │ 97%      │ 92%     │ 10:32 AM   │ [Details]     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ EmWi_K8P2  │ 82   │ 89%      │ 85%     │ 10:28 AM   │ [Details]     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ NoLe_J5Q4  │ 71   │ 78%      │ 72%     │ 10:15 AM   │ [Details]     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Properties:                                                                 │
│  • Header Row: Background #F9FAFB, Font 14px Semibold, Gray-700             │
│  • Body Rows: Background #FFFFFF, Font 14px Regular                         │
│  • Row Hover: Background #F3F4F6                                             │
│  • Row Border: 1px solid #E5E7EB                                             │
│  • Cell Padding: 16px                                                        │
│  • Border Radius (table): 12px                                               │
│  • Box Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)                                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  METRICS DISPLAY (within cards)                                              │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  WCPM              Accuracy           Fluency                          │  │
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐                     │  │
│  │  │    95    │      │   97%    │      │   92%    │                     │  │
│  │  └──────────┘      └──────────┘      └──────────┘                     │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Properties:                                                                 │
│  • Label: 12px, Medium, Gray-500, uppercase                                  │
│  • Value: 32px, Bold, Gray-900                                               │
│  • Grid: 3 columns, equal width                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.7 Modals

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MODAL SPECIFICATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  OVERLAY                                                                     │
│  • Background: rgba(0, 0, 0, 0.5)                                            │
│  • Animation: fadeIn 0.2s ease                                               │
│                                                                              │
│  MODAL CONTAINER                                                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  Student Details: AlDa_M3N7                              [X Close]   │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │                                                                      │    │
│  │                                                                      │    │
│  │  (Modal content here - see Student Details Modal)                   │    │
│  │                                                                      │    │
│  │                                                                      │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Properties:                                                                 │
│  • Background: #FFFFFF                                                       │
│  • Border Radius: 24px                                                       │
│  • Max Width: 900px                                                          │
│  • Max Height: 90vh                                                          │
│  • Overflow: auto                                                            │
│  • Box Shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)                        │
│  • Animation: slideUp 0.3s ease                                              │
│                                                                              │
│  Header:                                                                     │
│  • Background: #F9FAFB                                                       │
│  • Border Bottom: 1px solid #E5E7EB                                          │
│  • Padding: 20px 24px                                                        │
│  • Position: sticky, top: 0                                                  │
│                                                                              │
│  Close Button:                                                               │
│  • Position: absolute, right: 24px                                           │
│  • Size: 44px x 44px                                                         │
│  • Icon: X, 20px, Gray-500                                                   │
│  • Hover: Background #F3F4F6                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Animation & Interaction

### 6.1 Transitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TRANSITION STANDARDS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TIMING FUNCTIONS                                                            │
│                                                                              │
│  ease-out:    cubic-bezier(0, 0, 0.2, 1)     → Most interactions            │
│  ease-in:     cubic-bezier(0.4, 0, 1, 1)     → Exit animations              │
│  ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)   → Moving elements              │
│  bounce:      cubic-bezier(0.34, 1.56, 0.64, 1) → Celebratory animations    │
│                                                                              │
│  DURATION                                                                    │
│                                                                              │
│  fast:        150ms    → Hover states, micro-interactions                   │
│  normal:      200ms    → Standard transitions                               │
│  slow:        300ms    → Modal open/close, major state changes              │
│  slower:      500ms    → Page transitions                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Micro-Interactions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MICRO-INTERACTIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BUTTON HOVER                                                                │
│  transform: scale(1.02)                                                      │
│  transition: transform 150ms ease-out                                        │
│                                                                              │
│  BUTTON PRESS                                                                │
│  transform: scale(0.98)                                                      │
│  transition: transform 100ms ease-out                                        │
│                                                                              │
│  CARD HOVER                                                                  │
│  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)                                 │
│  transform: translateY(-2px)                                                 │
│  transition: all 200ms ease-out                                              │
│                                                                              │
│  RECORDING PULSE                                                             │
│  @keyframes pulse {                                                          │
│    0%, 100% { transform: scale(1); opacity: 1; }                            │
│    50% { transform: scale(1.02); opacity: 0.9; }                            │
│  }                                                                           │
│  animation: pulse 1.5s ease-in-out infinite                                  │
│                                                                              │
│  SUCCESS CELEBRATION                                                         │
│  @keyframes celebrate {                                                      │
│    0% { transform: scale(0); }                                               │
│    50% { transform: scale(1.2); }                                            │
│    100% { transform: scale(1); }                                             │
│  }                                                                           │
│  animation: celebrate 500ms cubic-bezier(0.34, 1.56, 0.64, 1)               │
│                                                                              │
│  WORD HIGHLIGHT APPEAR                                                       │
│  @keyframes highlight {                                                      │
│    0% { background-color: transparent; }                                     │
│    100% { background-color: #FEF3C7; }                                       │
│  }                                                                           │
│  animation: highlight 400ms ease-out forwards                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Iconography

### 7.1 Icon System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ICON SPECIFICATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ICON LIBRARY: Heroicons (MIT License)                                       │
│  STYLE: Outline (24px) for UI, Solid (20px) for indicators                  │
│                                                                              │
│  CORE ICONS                                                                  │
│                                                                              │
│  🎤  Microphone       - Record button                                       │
│  ⏹   Stop             - Stop recording                                      │
│  ▶️  Play             - Play audio instruction                               │
│  ⟳  Refresh           - Refresh dashboard                                   │
│  📥 Download          - Export CSV                                           │
│  ✓  Check             - Success, completed                                   │
│  ✗  X                 - Close, error                                         │
│  ℹ  Info              - Information                                         │
│  ⚠  Warning           - Attention needed                                     │
│  →  Arrow Right       - Next step, progress                                  │
│  ★  Star              - Fluency rating                                       │
│  👁 Eye               - View details                                         │
│  💾 Save              - Save notes                                           │
│                                                                              │
│  SIZE STANDARDS                                                              │
│                                                                              │
│  XS: 12px   - Inline indicators                                              │
│  SM: 16px   - Table actions                                                  │
│  MD: 20px   - Standard UI                                                    │
│  LG: 24px   - Primary actions                                                │
│  XL: 32px   - Hero icons                                                     │
│  2XL: 48px  - Celebration icons                                              │
│                                                                              │
│  COLOR APPLICATION                                                           │
│  • Default: Gray-600                                                         │
│  • Hover: Gray-900                                                           │
│  • Active/Selected: Primary Blue                                             │
│  • Success: Success Green                                                    │
│  • Error: Error Red                                                          │
│  • Warning: Warning Amber                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Page Layouts

### 8.1 Student Portal Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                              HEADER                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  [Logo]  ReadAssist AI                                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                           PROGRESS BAR                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Step X of Y  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                                              │
│                                                                              │
│                       ┌───────────────────────────┐                         │
│                       │                           │                         │
│                       │      READING TEXT         │                         │
│                       │        CARD               │                         │
│                       │                           │                         │
│                       │                           │                         │
│                       └───────────────────────────┘                         │
│                                                                              │
│                                                                              │
│                       ┌───────────────────────────┐                         │
│                       │                           │                         │
│                       │      CONTROL AREA         │                         │
│                       │   (Record/Stop/Retry)     │                         │
│                       │                           │                         │
│                       └───────────────────────────┘                         │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Properties:
• Max Content Width: 640px (centered)
• Vertical Padding: 32px
• Background: White
• Focus on central content for children
```

### 8.2 Teacher Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  HEADER                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  [Logo]  Teacher Dashboard          Class: 3B    Test: 1    [Refresh] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  TABS & ACTIONS                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  [Active]  [Completed]                                   [Export CSV] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                          DATA TABLE                                     │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  FOOTER NOTE                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Note: Metrics shown are BEST scores from ALL attempts                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Properties:
• Max Content Width: 1280px (centered)
• Side Padding: 32px
• Background: #F3F4F6 (gray-100)
• Table Card: White background
```

---

## 9. Accessibility Guidelines

### 9.1 WCAG 2.1 AA Compliance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ACCESSIBILITY REQUIREMENTS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COLOR CONTRAST                                                              │
│  • Normal Text: 4.5:1 minimum                                                │
│  • Large Text (24px+): 3:1 minimum                                           │
│  • UI Components: 3:1 minimum                                                │
│                                                                              │
│  FOCUS MANAGEMENT                                                            │
│  • Visible focus indicators on all interactive elements                      │
│  • Focus ring: 4px offset, #2563EB (primary blue)                           │
│  • Tab order follows visual layout                                           │
│  • Skip links provided                                                       │
│                                                                              │
│  KEYBOARD NAVIGATION                                                         │
│  • All functionality accessible via keyboard                                 │
│  • Enter/Space activates buttons                                             │
│  • Escape closes modals                                                      │
│  • Arrow keys navigate within components                                     │
│                                                                              │
│  SCREEN READER SUPPORT                                                       │
│  • Semantic HTML structure                                                   │
│  • ARIA labels where needed                                                  │
│  • Live regions for dynamic content                                          │
│  • Reading order matches visual order                                        │
│                                                                              │
│  MOTOR ACCESSIBILITY                                                         │
│  • Touch targets: 44px minimum                                               │
│  • Spacing between targets: 8px minimum                                      │
│  • No time limits on interactions                                            │
│                                                                              │
│  COGNITIVE ACCESSIBILITY                                                     │
│  • Clear, simple language (suitable for K-12)                                │
│  • Consistent navigation patterns                                            │
│  • Progress indicators                                                       │
│  • Error prevention and recovery                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Responsive Breakpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RESPONSIVE DESIGN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BREAKPOINTS                                                                 │
│                                                                              │
│  Mobile:     < 640px   (sm)                                                  │
│  Tablet:     ≥ 640px   (md)                                                  │
│  Laptop:     ≥ 1024px  (lg)   ← PRIMARY TARGET: Chromebooks                 │
│  Desktop:    ≥ 1280px  (xl)                                                  │
│                                                                              │
│  PRIMARY DESIGN TARGET: 1366x768 (Chromebook)                               │
│                                                                              │
│  RESPONSIVE ADJUSTMENTS                                                      │
│                                                                              │
│  < 640px:                                                                    │
│  • Stack columns vertically                                                  │
│  • Full-width buttons                                                        │
│  • Reduced padding (16px)                                                    │
│  • Modal becomes full-screen                                                 │
│                                                                              │
│  ≥ 1024px:                                                                   │
│  • Side-by-side layouts                                                      │
│  • Standard padding (24-32px)                                                │
│  • Modal max-width 900px                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Asset Specifications

### 11.1 Audio Assets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AUDIO ASSETS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INSTRUCTION AUDIO                                                           │
│  • Format: MP3 (fallback: WAV)                                               │
│  • Sample Rate: 44100 Hz                                                     │
│  • Bitrate: 128 kbps                                                         │
│  • Voice: Child-friendly, encouraging tone                                   │
│  • Duration: 3-5 seconds per instruction                                     │
│                                                                              │
│  Required Audio Files:                                                       │
│  • word-review-instruction.mp3                                               │
│    "Click each highlighted word to practice it"                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Logo Specifications

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LOGO SPECIFICATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Primary Logo                                                                │
│  • Format: SVG (preferred), PNG (fallback)                                   │
│  • Height: 40px (header)                                                     │
│  • Clear space: 16px on all sides                                            │
│                                                                              │
│  Favicon                                                                     │
│  • Format: ICO, PNG                                                          │
│  • Sizes: 16x16, 32x32, 180x180 (Apple Touch)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Implementation Notes

### 12.1 CSS Framework

- **Primary**: Tailwind CSS 4.x
- **Customization**: Extend default theme with design tokens
- **Dark Mode**: Not required for PoC

### 12.2 Component Library

- **Custom Components**: Built with React + Tailwind
- **State Management**: React hooks
- **Animation Library**: Framer Motion (optional)

### 12.3 Development Guidelines

1. Use design tokens consistently
2. Follow component specifications exactly
3. Test on 1366x768 resolution (Chromebook)
4. Verify color contrast with accessibility tools
5. Include focus states for all interactive elements

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | October 12, 2026 | Product Design Team | Initial high-fidelity design specification |

---

*High-Fidelity Design Specification v1.0 - Created October 12, 2026*
