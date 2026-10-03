# Implementation Plan

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose of this file: Turn the approved specification into an ordered, trackable build and verification plan.

## Instructions for the Developer

Set priorities, review the checklist, verify results rather than relying only on the Agent's report, and keep the project documents current as the work changes. Expect the build to take many rounds of testing and fixing; record material changes under Revisions.

To begin planning, open the project repository in a fresh chat and enter:

`Read ./plan.md and help me create the Project 3 implementation plan.`

After approving the plan, open the project repository in a fresh chat and enter:

`Read ./plan.md and help me implement the approved Project 3 plan in working checkpoints.`

## Instructions for the Agent

Read `AGENTS.md`, `brief.md`, `research.md`, `spec.md`, and this file, then inspect the relevant project files. Propose concrete tasks and checks without expanding the approved scope.

During implementation, follow the approved plan in working checkpoints and keep it current. Never mark approvals or items requiring Developer verification complete on the Developer's behalf.

## Approach

Summarize the structure, data flow, dependencies, task order, and main risks.

**Structure.** A single-page app built with Vite and plain JavaScript modules, with no UI framework. One folder per concern:

| Folder | Holds |
|---|---|
| `src/weather/` | Open-Meteo forecast and geocoding requests, and the Nominatim reverse lookup |
| `src/recommend/` | The 9 am–9 pm window, band, reminders, condition icon, outfit candidates, picks and `buildState()` |
| `src/content/` | Wordings, starter outfits and the garment-by-band table, taken from `spec.md` |
| `src/store/` | On-device storage: location, avatar values and picks in localStorage, and closet items in IndexedDB |
| `src/art/` | SVG avatar layers, garment templates and icons, recolored with CSS custom properties |
| `src/screens/` | One module per screen. Each draws from the state and passes User actions back |
| `src/vision/` | Selfie reading and garment cut-out, loaded only by setup and Add item |
| `public/` | MediaPipe models, the MediaPipe runtime (copied from the npm package by a script, not committed) and the self-hosted font |
| `tests/` | Vitest tests and saved Open-Meteo responses (fixtures) |

**Data flow.** This follows `spec.md`: location and date → one Open-Meteo request → window values → band, reminders and icon → eligible items → saved or new picks → state. `buildState()` is a pure function: the same weather, closet, avatar and saved picks always produce the same state, so the rules can be tested without the network. Screens never read weather or storage directly. Shuffle and closet changes re-enter at the picks step.

**Dependencies** (versions checked on npm 2026-10-03):
- `vite` 8 and `vitest` 5, used only for development.
- `@mediapipe/tasks-vision` 1.0.1 (Apache 2.0). It includes the face landmarker, image segmenter and interactive segmenter used in research. Its runtime is 11.8 MB.
- Model files downloaded once from Google and committed: face landmarker 3.8 MB, hair segmenter 0.8 MB, MagicTouch 6.2 MB.
- A rounded Google Font, self-hosted as WOFF2. Loading it from Google's servers would add a host that R34 doesn't allow.
- Deployment: a GitHub Actions workflow builds the app and publishes it to `https://rg-sureshkumar-goat.github.io/weather-outfit-app/`. The repo is public, but Pages isn't enabled yet.

**Task order.** Core first. Setup and the deploy pipeline come first, then the recommendation engine and its tests. Location, Today, the hand-set avatar and Info follow. Together these make a complete app that meets the brief except for the wardrobe feature, which is deployed and checked on a phone. Then come the closet, the garment cut-out and the selfie reading. The art is made in four rounds alongside the code, each approved by the Developer. The character and layer structure come first because the recoloring code depends on them, and icons and scenery come last.

**Testing.**
- Vitest unit tests cover every rule edge in R8, R10, R11, R13, R14 and R29, using saved forecasts.
- A `?fixture=<name>` switch loads a saved forecast into the running app, so screens can be checked against fixed weather (rain and wind, snow, missing UV, a missing day). It works only on the local dev server and is left out of the deployed build.
- At each checkpoint, the Agent runs the tests, checks the screens in the browser at 375 px and 1280 px and reports with screenshots. The Developer verifies, and the checkpoint is committed after that check.
- Phone checks use the deployed site. A phone on the same Wi-Fi reaches the local server without HTTPS, and camera and location need HTTPS.

**Main risks.**

| Risk | Response |
|---|---|
| Art volume: 11 hairstyles, 12 garment templates and about 30 icons | The character and layer structure are approved first so the templates fit. Colors are CSS variables, not separate files. Icons come last |
| Vision on phones: a 16.5 MB first download for setup, plus memory limits and camera quirks in iOS Safari | Test on the Developer's phone in C8 and C9, not at the end. "Choose a photo" and "Set it up by hand" always work |
| Cut-out quality on real clothes | Test with the Developer's own garment photos (kept out of git). Retake message per R16 |
| Time zones and dates | The window and "the date passes" (R14) use the location's local time from Open-Meteo. Test Honolulu and Anchorage |
| On-device storage limits (Safari private browsing, full storage) | Shrink cut-outs before saving. Save each item in one step so nothing is half-saved (R18) |
| Text contrast on four sky backdrops | Check every backdrop that has text on it in C11 |
| Usage limits: Open-Meteo 10,000 calls a day, Nominatim 1 request a second | One forecast request per location per visit. One Nominatim request per tap |

## Checklist

### Approvals

- [x] Research approved
- [x] Specification approved
- [ ] Plan approved

### Build

- [ ] Create or source the assets listed in `spec.md`, starting early (art rounds in C2, C5, C7 and C10)
- [ ] **C0 · Setup and deploy pipeline.** Vite and Vitest setup, the folders, a script that copies the MediaPipe runtime, the deploy workflow, and the "Project" section of `AGENTS.md` (run, test, deploy). *Done when:* `npm run dev`, `npm test` and `npm run build` all run, and a placeholder page loads at the Pages URL over HTTPS. *Developer:* turn on Pages (Settings → Pages → Source: GitHub Actions).
- [ ] **C1 · Recommendation engine.** Forecast request and parsing (R1), window values, band, reminders and icon (R8, R10), missing data (R29), starter outfit candidates (R9, R11), wordings with fill-ins (R12), independent picks, Shuffle and saved picks (R13, R14), and `buildState()` (R7). Fixtures saved from at least 4 real places. *Done when:* tests pass for every R8 threshold edge, R10's 3-rain-hour day, 3 distinct starter outfits per band, R13's 30 draws, R14's return, reload, location-change and next-day cases, and R29's missing UV.
- [ ] **C2 · Art round 1: character and layers.** Body and face in 10 Monk tones, 2 hairstyles, and templates for the tee, shorts, pants, sneakers and light jacket with base and print colors. The layer order is fixed for every slot, and the Developer picks the font. *Done when:* a local-only art page shows the character in all 10 tones wearing starter outfits, and the Developer approves the style.
- [ ] **C3 · Location setup (P2, L2).** US-only search (R2), "Use my location" with rounded coordinates and one Nominatim lookup (R3), messages for denied permission, non-US positions and failed lookups, and one saved location (R4). *Done when:* the R2–R4 checks pass, including "Toronto" and a simulated Toronto position, and the network log shows one Nominatim request per tap.
- [ ] **C4 · Today (P1a, P1b, L1).** All from one state: the avatar in a starter outfit, weather icon, temperatures, Now or Forecast, summary, reminders, Wearing list, the 7-day strip on the phone and week list on the laptop, Shuffle and the Open-Meteo credit (R5–R7, R9). Loading, missing-data and error states with Retry (R28–R30). The layout switches at 900 px (R31), and the phone controls sit in the thumb zone (R32). Icons are placeholders until C10. *Done when:* the R5–R7 and R28–R30 checks pass with live weather and fixtures, and Mon → Tue → Mon and Shuffle → reload behave as R14 says.
- [ ] **C5 · Avatar review and first run (P8, L8).** Art round 2: all 11 hairstyles in 8 colors, stubble, beard and glasses. Review controls with a live preview (R24), the "Set it up by hand" path, and the first-run order of setup, location, then Today (R22, without the selfie yet). Avatar values are saved. *Done when:* each control updates the preview, the values survive a reload, and a fresh install walks through the steps in order.
- [ ] **C6 · Info (P6, L6).** Creator, sources with links, how outfits are picked, privacy with retention periods, credits (R27, R34, R36), and "Delete all my data" with an in-page confirmation (R35). *Done when:* every link opens its source, Delete then Confirm empties storage and starts setup, and Cancel changes nothing.
- [ ] **Core deploy.** C0–C6 deployed. *Developer:* check location permission, both layouts and one-handed reach on your phone and laptop, and record the results under Device tests.
- [ ] **C7 · Closet and Add item (P3–P5, L3, L4), without the cut-out.** Art round 3: all 12 garment templates, the 15 starter outfits, the rain jacket and 12 type icons. Add an item by camera, Photos or drop (R15). Type, sampled colors and an editable name (R17). IndexedDB storage with the storage-full message (R18). The grouped Closet, rack and item detail (R19). Edit, and delete with confirmation, re-picking only the affected slot (R20, R14). Starter items and the empty-closet prompt (R21). Today uses closet items first (R9, R11), and "Edit avatar" lives here (R26). Until C8, the whole photo stands in for the cut-out, with colors sampled from its center. *Done when:* the R15, R17–R21 and R26 checks pass, a newly added tee is used on Hot days, and deleting it re-picks only that slot.
- [ ] **C8 · Garment cut-out (P4b).** MagicTouch loads only on Add item, with download progress (R16, R37). Tap or click to outline, sample colors from inside the outline, and show the retake message when there's no usable outline. *Done when:* a flat-laid tee from the Developer's test photos gets an outline, a blank photo gets the retake message, the network log shows no upload, and Today loads no model. *Developer:* try it on your phone.
- [ ] **C9 · Selfie reading (P7, L7).** Front camera, webcam or a chosen photo. The face and hair models load only in setup, with progress (R37). Skin tone snaps to the nearest Monk tone, hair color to the nearest of 8, and hair length picks a hairstyle (R23). No-face and camera-denied messages (R25). The selfie is discarded when setup ends. *Done when:* the R22–R25 checks pass and storage holds no image after setup. *Developer:* try it on your phone.
- [ ] **C10 · Art round 4: icons and scenery.** The final 7 weather icons, 7 reminder icons, interface icons, 4 sky backdrops, closet rack and shelf, decorative map, app icon and favicon replace the placeholders. *Done when:* the Developer approves the set, and every icon has a text label.
- [ ] **C11 · Accessibility and layout pass.** Contrast on every backdrop, accessible names, a keyboard-only run, VoiceOver reading the outfit, 200% zoom, 320 px with no sideways scroll, reduced motion and target sizes (R31–R33). *Done when:* an automated audit (axe or Lighthouse) shows no contrast or naming errors, and the R31–R33 checks pass.
- [ ] **C12 · Release candidate.** Deploy, then check that a full run's network log shows only the app's host, Open-Meteo and Nominatim (R34), and that Today makes no model downloads after setup (R37). Then work through Verify and revise.
- [ ] Use the approved screen drawings to guide layout and interaction work
- [ ] Keep one recommendation state driving every visual and written output
- [ ] Test and fix each checkpoint against the specification before starting the next
- [ ] Commit meaningful working checkpoints
- [ ] Deploy to a public HTTPS URL

### Verify and revise

- [ ] Check every specification requirement (R1–R39) against its acceptance check
- [ ] Test multiple locations, current and forecast dates, recommendation categories, outfit and reminder variations, and failure states. Live places: Austin TX, Seattle WA, Chicago IL, Minneapolis MN, Anchorage AK and Honolulu HI, which also test time zones. Fixtures cover any band or reminder the live weather doesn't show that week
- [ ] Verify that eligible outfit and reminder variations are selected independently rather than as fixed pairs
- [ ] Verify that returning to a previously selected date shows the same variations
- [ ] Test the deployed app, independently of the local version, on a real phone and a laptop, including both screens, accessibility, and one-handed controls
- [ ] Prepare the usability test below
- [ ] Test with three peers and record each session
- [ ] Add the chosen improvement to this checklist, and update `spec.md` if the intended result changes
- [ ] Implement, verify, and redeploy at least one meaningful revision

### Deliver

- [ ] Confirm all brief deliverables, sources, privacy information, and asset credits
- [ ] Save all chat transcripts
- [ ] Complete the debrief

## Device tests

The Developer records each check of the deployed app here (R38).

| Date | Device and browser | Commit | What was checked | Result |
|---|---|---|---|---|

## Usability testing

Before testing, record the purpose, a few realistic tasks, non-leading prompts, and a consistent note format. For each session, use a non-identifying label and record the task, what the tester did or said, successes, barriers or questions, and possible changes. Keep observations separate from interpretations. After all three sessions, summarize the strongest findings and the improvement they support.

## Revisions

Record material plan changes and why they were made.

## Saving transcripts

At the end of planning, ask the Developer to enter `save transcript`. When directed, save the complete conversation as `transcripts/plan-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.

At the end of every implementation chat, ask the Developer to enter `save transcript`. When directed, save the complete conversation as `transcripts/build-YYYY-MM-DD_HHMMSS.md` using the same formatting.
