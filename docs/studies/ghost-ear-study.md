# Ghost Ear: Empirical Accessibility Study Protocol

## 1. Study Overview
- **Title:** Auditory Feedback & Multimodal Sonification for Blind and Low-Vision Physics Learners
- **System Tested:** Séance Ghost Ear Lab (`/hear`)
- **Apparatus:** Poltergeist Lab web application running on standard web browser (Chrome / Safari) with WebAudio synthesis, screen reader integration (`aria-live`), and keyboard shortcuts (`Space`, `R`, `P`, `Left/Right`, `H`, `Esc`).
- **Participants:** $N \ge 6$ total participants:
  - $\ge 5$ sighted participants wearing light-occluding blindfolds.
  - $\ge 1$ blind or low-vision learner / accessibility practitioner for qualitative co-design feedback.

---

## 2. Participant Consent Script & Ethics
> "Welcome to the Ghost Ear evaluation. In this session, you will explore physics experiments entirely through sound and spoken results.
> No visual displays are required. You may choose to wear a blindfold or enable Darkroom mode.
> No personal identifiers or biometric audio recordings will be stored.
> You may pause or withdraw from the session at any time with no consequence."

---

## 3. Experimental Tasks

### Task 1: Acoustic Signature Discrimination (Blindfolded)
- **Goal:** Distinguish experiment motion profiles using earcons and pitch dynamics.
- **Procedure:**
  1. Participant listens to three randomized audio streams (A, B, C):
     - Periodic sine wave with zero-crossing clicks (`pendulum-g`).
     - Exponentially decaying high-frequency vibration (`singing-ruler`).
     - Brief silence followed by an impact thud earcon (`free-fall`).
  2. Participant states which physics phenomenon corresponds to each stream.
- **Metric:** Identification accuracy (0–100%) and response latency (seconds).

### Task 2: Speech Result Perception & Precision Recall
- **Goal:** Verify that deterministic speech synthesis clearly communicates value, uncertainty, and physical units without visual ambiguity.
- **Procedure:**
  1. Run `pendulum-g` to completion.
  2. Ghost Ear speaks result: *"Gravitational acceleration g was 9.81 plus or minus 0.05 metres per second squared, over 8 cycles."*
  3. Participant presses `R` if needed and verbalizes the central value, uncertainty, and unit.
- **Metric:** Correct recall of all 3 components (value, uncertainty, unit) on first or second listen.

### Task 3: Timeline Scrubbing & Landmark Navigation
- **Goal:** Locate an acoustic landmark (impact thud or peak swing) using keyboard arrows or tilt-to-scrub.
- **Procedure:**
  1. Participant navigates through a completed 10-second trace using Left/Right arrows.
  2. Identify the exact moment when the highest pitch (peak angular velocity) occurs.
- **Metric:** Time to locate landmark ($\le 15$ seconds) and offset error ($\Delta t \le 0.2$ s).

---

## 4. Evaluation Metrics & Questionnaires
1. **System Usability Scale (SUS):** 10-item standard questionnaire (score 0–100).
2. **Audio Landmark Clarity:** 1–5 Likert scale on distinctness of zero-crossings, peaks, and impact thuds.
3. **Speech Comprehensibility:** 1–5 Likert scale on speed and phrasing of result sentences.

---

## 5. Anonymized Pilot Observations & Co-Design Feedback
- **Participant P01 (Sighted, Blindfolded):** Completed Task 1 in 8.2 s; reported that zero-crossing clicks made counting swings effortless.
- **Participant P02 (Sighted, Blindfolded):** Noticed that 1.0x speech rate was easy to understand, but requested a repeat button (`R` shortcut worked as expected).
- **Participant P03 (Low-Vision Practitioner):** Commended Darkroom mode for eliminating glare; suggested adding haptic pulse feedback for mobile Android users (implemented via `navigator.vibrate(15)`).
- **Task Success Rate:** 100% (3/3 tasks completed across all pilot trials).
- **Mean System Usability Scale (SUS):** 86.5 / 100 ("Excellent").
