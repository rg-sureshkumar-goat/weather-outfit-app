# Project 3 Brief

## Client need and project challenge

A client is launching a new clothing brand targeted at US college students. As part of its social-engagement campaign, it wants us to prototype a playful application that recommends attire for the day based on the weather forecast. The app needs to access and display real up-to-date weather data, present apparel recommendations as a character whose clothing changes based on the forecast, and offer helpful reminders when conditions call for an umbrella, sunscreen, extra hydration, etc.

For this project, you will serve as both User and Developer. Testing should be conducted with your peers.

## Project requirements

- A browser-based app that uses current and forecast data from one live weather provider.
- Manual entry and device location for choosing a US location. Users select today or a forecast date. Save only the most recent location on the device.
- The character is the focus of the main screen. The character's outfit, weather icons, written recommendation, and reminders must all come from one recommendation state.
- At least three outfit variations for each recommendation category and three wording variations for each reminder, chosen independently at random so similar forecasts don't look identical. Returning to a previously selected date shows the same variations.
- Include an information screen that identifies the creator, weather-data source, recommendation methods and sources, privacy practices, and art credits or licenses.
- Handle loading, missing data, service errors, and denied location permission clearly.
- Make the app responsive and accessible, adapting to laptop and phone screens with platform-appropriate input and interaction. The phone version must be comfortable to use with one hand. The laptop version should make use of the larger screen rather than copy the phone layout.
- Add one additional feature justified by your research.
- Test a working version with three peers and implement at least one improvement supported by the findings.
- Deploy to a public HTTPS URL. GitHub Pages is recommended.

## Workflow

This project asks you to develop a working app prototype from scratch. You'll follow the same research, specification, planning, and build process as in Project 2, with fewer prompts and more flexibility. You'll make more of the consequential decisions yourself, so stay attentive to the process: keep the project documents current, direct the Agent deliberately, and verify its work. The deliverables are split into two phases to help you scope the work and deliver quality results.

1. Set up. Create a new repository from the provided Project 3 template. Review the included files: `brief.md`, `research.md`, `spec.md`, `plan.md`, and the `reference/` folder.
2. Research. Follow `research.md` to describe your context of use, write at least one user story, analyze 5–10 reference images saved in `reference/`, and research weather guidance and providers.
3. Specify. Draw every proposed screen by hand in both phone and laptop layouts, save photos of the drawings in `reference/`, share them with the Agent to guide screen layout, and follow `spec.md` to define testable requirements.
4. Plan. Follow `plan.md` to order the build and verification tasks.
5. Build, verify, and deploy. Work in small checkpoints, testing each against the specification and fixing problems before moving on. Expect many rounds of testing and revision before the app is ready for Users. Record changes in `plan.md`, or in `spec.md` if the intended result changes. Deploy once the app works reliably.
6. Test and revise. Run usability testing as described in `plan.md`, then implement and verify at least one improvement.
7. Debrief. Add the provided `debrief.md` and follow its instructions.

## Deliverables

### Phase 1: Research, specification, and plan (week 1)

1. An approved `research.md` documenting your context of use, user story, reference observations, weather and technical sources, decisions, and art estimate.
2. 5–10 reference images saved in `reference/`, each with its source and observation recorded in `research.md`.
3. An approved `spec.md` defining the goal, testable requirements with acceptance checks, recommendation state, content variation, asset list, and what is out of scope.
4. Hand-drawn phone and laptop designs for every proposed screen, saved in `reference/` and linked in `spec.md`.
5. An approved `plan.md` containing the approach, ordered build tasks, and verification steps.
6. Chat transcripts from research, specification, and planning conversations.

### Phase 2: Build, test, and revise (week 2)

1. A working app built through tested checkpoints, with commit history and updated `spec.md` and `plan.md` recording revisions made during the build.
2. The app deployed at a public HTTPS address, matching the approved specification.
3. Usability-testing notes from three peers in `plan.md`, with findings and the resulting improvement.
4. A completed debrief conversation examining your decisions, direction of the Agent, and verification of the finished app.
5. Chat transcripts from implementation and debrief conversations.
