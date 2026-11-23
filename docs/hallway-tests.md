# Hallway Test Protocol — "QR to whoa in under 15 seconds"

Run at the end of Phase 4 (Fri Nov 27), again after Phase 8 (Wed Dec 2), and once more before recording the final video. Results go in `docs/hallway-tests.md` in the repo.

---

## 1. Participants

- **3 people** who have never seen Séance (roommates, hostel neighbours, classmates). Not teammates.
- **They use their own phones.** Required mix: at least **1 iPhone** and **1 Android**. Note model + OS + browser.
- At least one person who is *not* an engineering student (if possible).
- After fixing the top problem, **1 new person** for a confirmation run.

## 2. Setup (before each person)

- [ ] Laptop on a table, landing page open on the **production-like HTTPS URL** (not localhost), full screen, volume at 50%.
- [ ] Fresh room (reload the landing page) so the QR is new and no other spirit is connected.
- [ ] Phone-side: participant's phone unlocked, normal camera app. Do **not** pre-open the link.
- [ ] Stopwatch (a second phone) or screen recording of the laptop with the system clock visible.
- [ ] A second observer if possible (one times, one watches hands and face).
- [ ] Wi-Fi: use the same network judges would plausibly use; record which (home Wi-Fi / college Wi-Fi / hotspot).

## 3. Script (say only this)

> "This is a project I'm building. Try it — do whatever you think it wants. I can't help you, but please think out loud."

Then stay silent. If they are stuck for **more than 30 s**, say only: *"What are you looking for?"* and log that as a **help event** (the run fails criterion 1 but keep observing).

After they've reached the doors (or 90 s passed), ask three questions:
1. "What do you think this does?" (one sentence)
2. "What was confusing?"
3. "What did the ghost's colour/mood mean?" (tests whether the diagnostics read as information)

## 4. What to time

| Mark | Starts when | Ends when |
|---|---|---|
| `t_scan` | Landing visible to them | They tap the URL from the camera |
| `t_tap` | Join page visible on the phone | They tap **Begin the séance** (and Allow on iOS) |
| `t_move` | Begin tapped | Ghost visibly mirrors their phone |
| **`t_total`** | Landing visible | Ghost mirroring — **the gated number** |
| `t_doors` | Landing visible | Doors visible (tutorial done or skipped) |

## 5. What to observe (tally marks)

| Observation | Count / note |
|---|---|
| Hesitations > 2 s (where?) | |
| Tried to tap/click the QR on the laptop | |
| Didn't notice the iOS permission prompt / tapped Don't Allow | |
| Looked at the phone instead of the laptop after joining | |
| Discovered "Shake me" from the prompt alone | yes / no |
| Completed "Hold still" calibration without help | yes / no |
| Smiled / laughed / said "whoa" (time) | |
| Mood tooltip opened | yes / no |
| Any error state seen (which?) | |
| Phone screen locked during the test | yes / no |

## 6. Pass / fail

The Phase 4 gate passes only if **all** hold:

1. All 3 participants: `t_total < 15 s` and **zero** help events.
2. At least 2 of 3 complete *Shake me* and *Hold still* from the prompts alone.
3. No participant hits a dead end (blank screen, frozen ghost, unexplained error).
4. At least 2 of 3 can say roughly what the mood/colour means after reading or hovering the tooltip.

If any criterion fails: fix the **single biggest** friction point (most hesitation seconds), then run the confirmation person. Do not change five things at once — you won't know what worked.

## 7. Results template (`docs/hallway-tests.md`)

```markdown
## Hallway test — <date> — build <git short sha>

| # | Phone / OS / browser | Network | t_scan | t_tap | t_move | t_total | t_doors | Help events | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | iPhone 13 / iOS 18 / Safari | hostel Wi-Fi | 4.1 | 3.0 | 1.2 | 8.3 | 31 | 0 | missed Allow at first |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |

**Biggest friction:** …
**Fix applied:** …
**Confirmation run:** t_total = … s, help events = …
**Quotes worth keeping (with permission):** "…"
```

## 8. Ethics and privacy

- Ask permission before recording anyone's face or voice; prefer recording only the laptop screen and the phone in their hand.
- Don't keep participants' traces unless they agree; delete test rooms afterwards.
- Never put a participant's name in the leaderboard or the repo.
