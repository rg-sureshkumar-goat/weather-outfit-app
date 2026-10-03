# Technical Specification

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose of this file: Turn the approved research, project brief, and hand-drawn screen designs into testable requirements.

## Instructions for the Developer

Make and approve the product decisions, draw every proposed screen, provide the drawings to the Agent, and keep this file current as the intended result changes.

To begin, open the project repository in a fresh chat and enter:

`Read ./spec.md and help me begin the Project 3 specification.`

## Instructions for the Agent

Read `AGENTS.md`, `brief.md`, `research.md`, and this file. Review the screen drawings the Developer provides. Ask one focused question at a time, surface gaps and trade-offs without inventing requirements, and keep the specification concise and testable.

## Goal

State what the app should help its Users accomplish and name the user story or stories that define that need.

**App name: Quick Dresser.**

Help a US college student get dressed quickly for a full day away from their room. For today or any of the next six days, the app picks one outfit from the student's own clothes that suits the hardest weather between 9 am and 9 pm, shows it on an avatar that looks like them, and reminds them what to bring.

Defined by the user stories in `research.md`:
1. **Effortless:** know what to wear from my own wardrobe without thinking about it.
2. **Comfortable all day:** my outfit and what I carry suit the whole 9 am–9 pm window.
3. **Stylish and suited to the occasion:** outfits from my own clothes that look intentionally styled. *Served in part:* outfits come from the User's own clothes, but matching an outfit to an occasion is out of scope.

## Screen designs

Draw every proposed screen by hand, in both phone and laptop layouts, on paper, a tablet, a whiteboard, or another hand-drawing surface. Save photos or exports in `reference/`, provide them to the Agent, and link them here. Use the drawings to define layout, hierarchy, controls, navigation, and important interaction states.

The Developer hand-drew four phone screens: Today, Location setup, Closet and Add item ([drawing](reference/screens/phone-main-screens.jpg)). From these, the Agent built digital wireframes of every screen in phone and laptop layouts, which the Developer approved on 2026-10-03 ([source](reference/screens/wireframes.html), [review page](https://claude.ai/artifact/CsU25CwupePeP9eBUkVoyU)). **Deviation from the brief:** the brief asks for hand-drawn phone and laptop designs of every screen. The Developer chose digital wireframes for the rest.

| Screen | Phone | Laptop |
|---|---|---|
| Today | [P1a first view](reference/screens/phone-01a-today.png), [P1b scrolled](reference/screens/phone-01b-today-scrolled.png) | [L1](reference/screens/laptop-01-today.png) |
| Location setup | [P2](reference/screens/phone-02-location.png) | [L2](reference/screens/laptop-02-location.png) |
| Closet | [P3](reference/screens/phone-03-closet.png) | [L3, with item detail](reference/screens/laptop-03-closet-detail.png) |
| Add item | [P4a camera](reference/screens/phone-04a-add-camera.png), [P4b cut out](reference/screens/phone-04b-add-cutout.png), [P4c type](reference/screens/phone-04c-add-type.png), [P4d confirm](reference/screens/phone-04d-add-confirm.png) | [L4](reference/screens/laptop-04-add-item.png) |
| Item detail | [P5](reference/screens/phone-05-item-detail.png) | Part of L3 |
| Info | [P6](reference/screens/phone-06-info.png) | [L6](reference/screens/laptop-06-info.png) |
| Setup: selfie | [P7](reference/screens/phone-07-setup-selfie.png) | [L7](reference/screens/laptop-07-setup-selfie.png) |
| Setup: review avatar | [P8](reference/screens/phone-08-setup-review.png) | [L8](reference/screens/laptop-08-setup-review.png) |

**Navigation:**
- Phone: bottom tabs for Today, Closet and Add item. Info opens from a button beside the location on Today, and "Edit avatar" is in the Closet.
- Laptop: the same tabs in a top bar, with location and Info on the right.
- First run: selfie, then review the avatar, then location, then Today.

**Placement:** on the phone, location sits at the top, and the date strip, Shuffle and tabs sit in the lower half. Primary controls are at least 44×44 px.

**States** are specified under Requirements and appear on these screens: loading, missing data, service error, location denied, camera denied, no face found, cut-out failed and empty closet.

## Requirements

Translate every fixed brief requirement and the selected research-driven feature into a testable requirement. Define the chosen behavior, content, controls, current and forecast data, responsive layout, accessibility, error handling, privacy, credits, and deployment. The main screen should make clear the location, date, units, data source, and whether conditions are current or forecast. Include an acceptance check for each requirement.

### Weather, location and date

| ID | Requirement | Acceptance check |
|---|---|---|
| R1 | **Live weather.** Current conditions and a 7-day forecast (today plus 6 days) come only from Open-Meteo, in °F and mph. Each hour includes feels-like temperature, rain chance, UV index, wind gusts and snowfall. | The network log shows only `api.open-meteo.com` for weather. On-screen values match the API response for the same hour |
| R2 | **Location by search.** The User types a US city or ZIP. Matches come from Open-Meteo geocoding limited to the US (`countryCode=US`) and show the city and state. | "Austin" lists Austin, Texas and other states. "78705" finds Austin, TX. "Toronto" shows "No US place matches." |
| R3 | **Location by device.** "Use my location" asks the browser for permission. If granted, the coordinates are rounded to 2 decimals (about 1 km). Weather comes from Open-Meteo. The place name and US check come from **one** OpenStreetMap Nominatim reverse lookup per tap, and the result is saved with the location; there are no background or repeated lookups ([usage policy](https://operations.osmfoundation.org/policies/nominatim/)). A non-US position shows "This app works for US locations only," and the search field stays ready. | In Austin the pill shows "Austin, TX". The network log shows one Nominatim request per tap, with rounded coordinates. Deny: a message explains how to turn location on, and the search field stays ready. A simulated Toronto position shows the US-only message |
| R4 | **Saved location.** Only the most recent location (name and rounded coordinates) is saved, on this device, and it's restored on the next visit. | After a reload the same location appears. Storage holds exactly one location entry, and choosing another replaces it |
| R5 | **Date choice.** Today and the next 6 days can be selected. Today shows **Now** with the current temperature, and its outfit always covers the full 9 am–9 pm window, even after 9 pm. Other days show **Forecast** with the high and low. | Selecting each of the 7 days updates the label, the date and the temperatures to match the API. After 9 pm, Today still shows that day's outfit |
| R6 | **Main screen clarity.** Location, date, °F, the Open-Meteo credit, and Now or Forecast are visible on Today at phone and laptop sizes. | All five are visible without scrolling on P1a and L1, except the phone credit, which is on P1b |

### Recommendation

| ID | Requirement | Acceptance check |
|---|---|---|
| R7 | **One recommendation state.** For the selected location and date, the app builds one state from Open-Meteo's 9 am–9 pm hours: band, condition icon, reminders, outfit items and the chosen wording. The avatar, weather icon, written recommendation, reminders and "Wearing" list are drawn only from this state. | Changing the location, date or Shuffle updates all five outputs together. Fixed test weather always gives the same band and reminders |
| R8 | **Rules from research.md.** The band comes from the warmest feels-like hour. Reminders: "layer for later" when the coldest hour is below 70°F and in a colder band; umbrella at 40% rain chance or more; sunscreen at UV 3 or more; water at a feels-like of 80°F or more (stronger wording at 90°F); wind at gusts of 25 mph or more; snow if any falls. | Tests at each threshold edge: 84°F is Warm and 85°F is Hot; 39% rain gets no umbrella and 40% does; and so on for every rule |
| R9 | **Outfit from the closet.** Each outfit has a top, a bottom and shoes, plus an outer layer when the band calls for one (see Garment types by band). Each slot uses one of the User's items whose type suits the band. If there isn't one, a starter item fills the slot and is labeled "Starter item". | Empty closet: all starter items. After adding a tee, Hot days use it. The "Wearing" labels match where each item came from |
| R10 | **Condition icon.** Shows the most frequent condition from 9 am to 9 pm. Rain, storm or snow wins if it occurs in 3 or more hours. | A test day with 3 rain hours and 9 clear hours shows the rain icon |

### Variation and Shuffle

| ID | Requirement | Acceptance check |
|---|---|---|
| R11 | **Outfit variations.** Every band has at least 3 possible outfits. Candidates are the combinations of eligible items, with the User's items first. If they make fewer than 3 distinct outfits, starter items are mixed in until there are 3. | With an empty closet, each band shows 3 different starter outfits across Shuffles. With one tee, Hot outfits still vary |
| R12 | **Wording variations.** Each reminder type, and each band's summary line, has at least 3 wordings (see Content variation). | Every wording in the content list appears across repeated tests |
| R13 | **Chosen independently.** The outfit and each reminder's wording are drawn separately at random, so the same outfit can appear with different wording, and the reverse. | Across 30 test draws, the same outfit appears with at least two different wordings |
| R14 | **Same date, same look, after reloads too.** Returning to a date shows the same outfit and wording, including after the page reloads. Picks are saved on this device for the current location only (item IDs and wording numbers, nothing else) and cleared when the location changes or the date passes. Shuffle draws a different outfit (wording stays), which becomes the date's outfit. If the band changes after a forecast update, or a chosen item is deleted, only the affected part is re-picked. | Select Mon, then Tue, then Mon again: identical. Shuffle on Mon, reload, return to Mon: the shuffled outfit stays. Change location: saved picks are gone. Yesterday's picks are gone the next day |

### Closet

| ID | Requirement | Acceptance check |
|---|---|---|
| R15 | **Add by photo.** Phone: a live camera in the page (P4a), or "Photos". Laptop: choose or drop a photo, with the camera as an option (L4). If camera access is denied or unavailable, a message says so and choosing a photo still works. | Deny the camera: the message appears and Photos works. On a laptop, dropping a JPEG starts the cut-out step |
| R16 | **Cut out on the device.** The User taps or clicks the item, and MediaPipe MagicTouch (6.2 MB model, Apache 2.0, hosted with the app) outlines it on the device. If there's no usable outline, the message says to retake on a plain background in good light, and the User can tap again. | The network log shows no photo upload. A flat-laid tee gets an outline. A blank photo gets the retake message |
| R17 | **Type, colors and name.** The User picks one of 12 garment types: tee, short-sleeve button-up, long-sleeve shirt, sweater or hoodie, light jacket, warm coat, hooded rain jacket, pants, shorts, skirt, sneakers, boots (P4c). Base and print colors are sampled from the cut-out and can be changed. The name is suggested from color and type ("Navy tee") and can be edited. The weather it suits comes from its type. | Picking Tee shows Hot and Warm. Changing the base color updates the avatar preview. Save stays disabled until a type is picked |
| R18 | **Kept on this device.** Each item (cut-out image, type, colors, name, date added) is stored in the browser's on-device storage and never uploaded. Items survive reloads. If storage is full, a message says so and nothing is half-saved. | The network log shows no upload on save. Items remain after a reload. A simulated storage error shows the message |
| R19 | **Browse the closet.** Items are grouped by type (Tops, Pants, Outer layers, Shoes) with counts. The rack header shows the 3 most recently added. Opening an item shows its detail (P5; beside the grid on a laptop, L3). | After adding an item, it appears on the rack and in its group, and the count goes up |
| R20 | **Edit and delete.** Edit reopens the confirm step. Delete asks for confirmation in the page, then permanently removes the item from the device. Outfits that used it re-pick that slot (R14). | Delete, then Cancel: the item stays. Delete, then Delete: the item is gone after a reload, and Today shows a replacement |
| R21 | **Starter items.** Starter items are always listed in the Closet, marked "Starter", and can't be edited or deleted. An empty closet also shows a prompt to add the first item, and Today uses starter outfits (R9). | On a fresh install, the Closet shows starter items and the prompt, and Today's "Wearing" list says "Starter item" |

### Avatar and first setup

| ID | Requirement | Acceptance check |
|---|---|---|
| R22 | **First setup.** On first open: selfie (P7, L7), then review the avatar (P8, L8), then location (P2, L2), then Today. "Take a selfie" opens the phone's front camera, or the webcam in the page on a laptop. "Choose a photo" and "Set it up by hand" are always offered. | A fresh install walks through the 3 steps in order. "Set it up by hand" skips straight to the review with default values |
| R23 | **Read on the device, then discarded.** MediaPipe face and hair models read the selfie on the device. Skin tone is sampled from the cheeks and forehead and snapped to the nearest Monk tone. Hair color is matched to the nearest of 8. Hair length pre-selects a hairstyle (bald → Bald, very short → Buzz, short → Short crop, medium → Medium straight, long → Long straight). The selfie is never uploaded or stored, and it's discarded when setup ends. Only the chosen avatar values are saved. | The network log shows no image upload. After setup, on-device storage holds no image. Reloading during the review loses the selfie |
| R24 | **Review and adjust.** Skin tone (10 Monk tones), hair color (8), hairstyle (bald, buzz, short crop, short curls or coils, afro, medium straight, medium curly, long straight, long curly, braids or locs, bun or ponytail), facial hair (none, stubble, beard) and glasses (on or off). The preview updates as each one changes. "Looks good" saves the avatar values on this device. | Each control changes the preview right away. After a reload, the avatar matches the saved values |
| R25 | **Setup problems.** No face found: "No face found. Try a front-facing photo in even light, or set it up by hand," with the adjust controls ready. Camera denied or unavailable: a message, and choosing a photo still works. | A photo without a face shows the message and controls. Denying the camera shows the message, and Choose a photo works |
| R26 | **Edit later.** "Edit avatar" in the Closet opens the review screen with the current values, plus Retake. | Change the hairstyle there: Today's avatar shows it |

### Info, states and quality

Location denied, camera denied, no face, failed cut-out and empty closet are covered in R3, R15, R16, R21 and R25.

| ID | Requirement | Acceptance check |
|---|---|---|
| R27 | **Info screen.** Shows the creator (RG Sureshkumar), the weather source (Open-Meteo, CC BY 4.0), the place-name source (© OpenStreetMap contributors, ODbL), how outfits are picked (bands and reminder rules, with linked NWS, EPA and CDC sources), privacy (R34), "Delete all my data" (R35) and credits (R36). | Every item is on P6 and L6, and every link opens its source |
| R28 | **Loading.** While weather loads, Today shows the location and date, a placeholder where the avatar goes, and "Getting the forecast…". Controls that need data are disabled. Model downloads show progress. | On a throttled network the loading state appears, then real data. The screen is never blank |
| R29 | **Missing data.** If a value is missing for some hours, rules use the hours that exist. If it's missing all day, that rule is skipped and a note says so ("UV data isn't available for this day"). A day with no forecast is disabled in the strip. | Test data with no UV shows no sunscreen reminder, plus the note. A missing day 7 is disabled |
| R30 | **Service errors and offline.** If Open-Meteo or Nominatim fails, or the device is offline, a message says what failed and offers Retry. Weather already loaded in this visit stays visible, labeled with its time. Search keeps the typed text. | Blocking Open-Meteo shows the message and Retry. Unblocking and pressing Retry loads the data |
| R31 | **Responsive layouts.** Below 900 px wide: the phone layout (P screens). At 900 px and wider: the laptop layout (L screens). Touch on phones, mouse and keyboard on laptops. No sideways scrolling down to 320 px. | Resizing from 320 to 1440 px switches the layout at 900 px, with no sideways scroll and nothing clipped |
| R32 | **One-handed phone use.** The date strip, Shuffle and tabs are in the lower half of the screen. Primary controls are at least 44×44 px. | In dev tools, every primary control measures ≥44 px. On a real phone, they can be reached with the thumb of the holding hand |
| R33 | **Accessibility (WCAG 2.2 AA).** Text contrast is at least 4.5:1 on every sky backdrop. Every target is at least 24 px. Everything works by keyboard on a laptop, with visible focus. The avatar has a text description listing the full outfit, and icons have text labels. Reduced motion is respected. The app works at 200% zoom. | An automated audit shows no contrast or naming errors. A keyboard-only run works through Today, Closet and Add item. VoiceOver reads the outfit |
| R34 | **Privacy.** Stored only on this device: the latest location, avatar values, closet items and saved picks. Sent off the device: rounded coordinates to Open-Meteo, and one Nominatim lookup per "Use my location" tap. No accounts, cookies, analytics or ads. Selfies and item photos never leave the device. Info explains all of this, including Open-Meteo's 90-day and OpenStreetMap's 180-day log retention. | A full run's network log shows only the app's own host, Open-Meteo and Nominatim. On-device storage matches this list |
| R35 | **Delete all my data.** A button on Info clears the location, avatar, closet and saved picks from this device after an in-page confirmation, then returns to first setup. | Confirm: storage is empty and setup starts. Cancel: nothing changes |
| R36 | **Credits.** Open-Meteo (CC BY 4.0), OpenStreetMap contributors (ODbL), Google MediaPipe models (Apache 2.0), Monk Skin Tone Scale by Ellis Monk (CC BY 4.0), original artwork, and any fonts with their licenses. | Every third-party asset in the Assets list appears in Credits |
| R37 | **Download size.** Today never loads the vision models. Setup loads the runtime plus the face and hair models (about 16.5 MB, once). Add item loads the cut-out model (6.2 MB, once). All are hosted with the app and cached by the browser. | After setup, reloading Today shows no model downloads in the network log |
| R38 | **Deployment.** A public HTTPS URL on GitHub Pages, tested on a real phone and a laptop, separately from the local version. | The URL loads over HTTPS, location permission works, and plan.md records the device tests |
| R39 | **Peer-tested improvement.** Three peers test the deployed app, and at least one improvement supported by the findings is built. | plan.md has 3 session notes, and the Revisions section records the change and its evidence |

## Recommendation state and data flow

Define the weather inputs, recommendation categories, coded rules, and shared state. Weather values must come from the provider, and rules must follow the weather guidance cited in `research.md`. The selected location, date, and live weather data must produce one recommendation state that drives every visual and written output.

**Weather inputs.** One Open-Meteo request per location, with coordinates rounded to 2 decimals (all field names verified live 2026-10-03):
- hourly: `temperature_2m, apparent_temperature, precipitation_probability, uv_index, wind_gusts_10m, snowfall, weather_code`
- daily: `temperature_2m_max, temperature_2m_min`
- current: `temperature_2m, apparent_temperature, weather_code`
- options: °F, mph, inches, local time zone, 7 days

**Window.** The 13 hourly values from 9 am to 9 pm local time, inclusive. Values are rounded to whole numbers before the rules run, so the numbers on screen match the rules.

**Derived values.** Highest feels-like and its time, lowest feels-like and its time, highest rain chance and its time, highest UV and its time, highest gust, and total snowfall with the time of the first snow.

**Categories and rules.** Five bands from the highest feels-like: Hot ≥85 · Warm 70–84 · Chilly 55–69 · Cold 35–54 · Freezing <35. Reminders follow R8, the icon follows R10, and outfits follow Garment types by band.

**Condition codes** (WMO codes from Open-Meteo): 0 clear; 1–2 partly cloudy; 3 cloudy; 45, 48 fog; 51–67 and 80–82 rain; 71–77 and 85–86 snow; 95–99 storm.

**Shared state**, one per location and date:

| Field | Comes from |
|---|---|
| Location | Saved location (R4) |
| Date, is-today | Date strip |
| Display: Now or Forecast, temperature (current, or high and low), feels-like, condition, update time | Open-Meteo current or daily data |
| Window values | Derived above |
| Band | Highest feels-like |
| Reminders: type, wording number, values | R8 plus saved picks |
| Outfit: top, bottom, shoes, outer layer, each marked closet or starter | Closet, the garment table and saved picks |
| Summary wording number | Saved picks |
| Avatar look | Avatar values (R24) |

**Flow.** Location and date → Open-Meteo forecast → window values → band, reminders and condition → eligible items (closet first, then starters) → saved or new picks (R14) → **state** → avatar, weather icon, summary, reminders and "Wearing" list. Shuffle and closet changes re-enter at the picks step. A new location or date starts from the top. Nothing on screen reads weather or storage directly.

### Garment types by band

Which of the User's items can be picked for each band (Developer's judgement; research fixes only the bands).

| Type | Hot ≥85°F | Warm 70–84 | Chilly 55–69 | Cold 35–54 | Freezing <35 |
|---|---|---|---|---|---|
| Tee, short-sleeve button-up | ✓ | ✓ | | | |
| Long-sleeve shirt | | ✓ | ✓ | ✓ under coat | ✓ under coat |
| Sweater or hoodie | | | ✓ | ✓ under coat | ✓ under coat |
| Shorts, skirt | ✓ | ✓ | | | |
| Pants | | ✓ | ✓ | ✓ | ✓ |
| Sneakers | ✓ | ✓ | ✓ | ✓ | |
| Boots | | | | ✓ | ✓, and any snow day |
| **Outer layer** | none | none | light jacket | warm coat | warm coat |

- **Hooded rain jacket:** replaces the outer layer, or is added, when rain chance is 40% or more and gusts reach 25 mph (research.md reminder rule).
- **Hat and gloves** (Cold and Freezing, per NWS guidance) appear only in the written recommendation, not on the avatar.

## Content variation

Define at least three outfit variations for each recommendation category and at least three wording variations for each reminder type. Define how outfit and reminder variations are chosen independently at random, and how a previously selected date keeps the same variations, including whether they persist after the page reloads.

Selection and persistence rules: R11–R14. Outfits use the User's items first; these starter outfits fill in until the closet can make 3 outfits for a band. Each item is a drawn template in a starter colorway.

### Starter outfits

| Band | Outfit 1 | Outfit 2 | Outfit 3 |
|---|---|---|---|
| **Hot** ≥85°F | White tee · khaki shorts · white sneakers | Light-blue short-sleeve button-up · navy shorts · grey sneakers | Heather-grey tee · olive shorts · white sneakers |
| **Warm** 70–84 | Navy tee · light jeans · white sneakers | Sage short-sleeve button-up · khaki shorts · white sneakers | White long-sleeve shirt · dark jeans · grey sneakers |
| **Chilly** 55–69 | White long-sleeve shirt · dark jeans · white sneakers · denim jacket | Grey hoodie · khaki pants · grey sneakers · navy light jacket | Navy sweater · light jeans · white sneakers · tan light jacket |
| **Cold** 35–54 | Grey sweater · dark jeans · brown boots · navy coat | White long-sleeve shirt · black pants · grey sneakers · charcoal coat | Maroon hoodie · dark jeans · brown boots · olive coat |
| **Freezing** <35 | Navy sweater · dark jeans · brown boots · black coat | Grey hoodie · black pants · black boots · red coat | Cream sweater · khaki pants · brown boots · navy coat |

Plus one starter **yellow hooded rain jacket** for the rain-and-wind rule.

### Wordings

Words in braces fill in from the selected day's 9 am–9 pm hours or the chosen outfit. Each line keeps the advice in `research.md`.

**Reminders** (the bold title stays fixed; the line varies):

| Reminder (trigger) | 1 | 2 | 3 |
|---|---|---|---|
| **Umbrella** (rain ≥40%) | {rain}% chance of rain around {rainTime}. Pack the umbrella. | Rain could show up by {rainTime} ({rain}%). An umbrella in your bag saves the day. | Showers possible around {rainTime}. Bring an umbrella just in case. |
| **Sunscreen** (UV ≥3) | UV reaches {uv} around {uvTime}. Put on SPF 15+ before you head out. | Strong sun midday (UV {uv}). Sunscreen now, sunglasses in your bag. | UV {uv} today. A layer of SPF 15+ before the walk is a good idea. |
| **Water** (feels ≥80°) | Feels like {feelsMax}° by {maxTime}. Bring a water bottle. | Warm one out there. Fill your water bottle before class. | It'll feel like {feelsMax}° this afternoon. Keep water with you. |
| **Water, strong** (feels ≥90°) | Feels like {feelsMax}° by {maxTime}. Bring a full bottle and drink before you're thirsty. | Serious heat today. Drink more water than usual, even if you're not thirsty. | {feelsMax}° feels-like this afternoon. Refill your bottle whenever you can. |
| **Layer for later** (coldest <70°, colder band) | Drops to {feelsMin}° by {minTime}. Bring your {jacket}. | Cooler tonight, around {feelsMin}°. Your {jacket} goes with this outfit. | The evening gets chilly ({feelsMin}°). Toss your {jacket} in your bag. |
| **Wind** (gusts ≥25 mph) | Gusts up to {gust} mph. Expect a blustery walk to class. | Windy today, with gusts near {gust} mph. Keep loose papers zipped away. | Gusty out there ({gust} mph). A zip-up layer helps. |
| **Wind and rain** (gusts ≥25 and rain ≥40%; replaces Umbrella) | Rain and gusts to {gust} mph. An umbrella won't hold up, so wear the hooded rain jacket. | Wind and rain together today. Skip the umbrella and use your rain jacket's hood. | Gusts near {gust} mph will flip an umbrella. Your hooded rain jacket is the move. |
| **Snow** (any snowfall) | Snow expected around {snowTime}. Wear waterproof boots. | Snow on the way. Boots with good grip keep your feet dry. | Slick sidewalks likely with snow today. Waterproof boots, please. |

**Band summaries** (the title is the one-liner on the phone's first view; the sentence follows it):

| Band | 1 | 2 | 3 |
|---|---|---|---|
| **Hot** | **Hot all day.** Feels like {feelsMax}° by {maxTime}. Your {top} and {bottom} keep you cool. | **Scorcher.** Light and loose today: {top}, {bottom} and {shoes}. | **Heat's on.** It peaks at {feelsMax}°. Keep it breezy with your {top} and {bottom}. |
| **Warm** | **Pleasantly warm.** At its warmest it feels like {feelsMax}°. Your {top} and {bottom} are just right. | **Easy weather.** A comfortable {feelsMax}° at most. Go with your {top} and {bottom}. | **Warm and easy.** Nothing tricky today: {top}, {bottom} and {shoes}. |
| **Chilly** | **Cool day.** It only reaches {feelsMax}°. Wear your {top} under your {outer}. | **Jacket weather.** It stays between {feelsMin}° and {feelsMax}°. Your {outer} over your {top} does the job. | **Crisp out there.** Layer up: {top}, {bottom} and your {outer}. |
| **Cold** | **Cold day.** It tops out at {feelsMax}°. Wear your {outer} over your {top}, plus a hat and gloves. | **Bundle up.** It feels like {feelsMin}° at its coldest. Coat, warm layers, hat and gloves. | **Coat on.** {feelsMax}° at best. Your {outer} and {shoes} keep the cold out. Add a hat and gloves. |
| **Freezing** | **Freezing.** Down to {feelsMin}°. Layer up under your {outer} and wear a hat and gloves. | **Seriously cold.** It feels like {feelsMin}°. Warm layers, your {outer}, a hat and gloves. | **Bundle all the way.** {feelsMax}° is as warm as it gets. Warm layers, {shoes}, hat and gloves. |

## Assets

List every art and graphical asset: the character, each outfit variation, icons, and any other visuals. For each, note where it appears, its format, and whether it will be created, generated, or licensed, with its credit or license.

| Asset | Where it appears | Format | Source and credit |
|---|---|---|---|
| Character base: body and face, recolored to 10 skin tones | Today, setup, add-item preview | SVG | Created by the Agent, art-directed by the Developer: "Original artwork created for this project" |
| 11 hairstyles in 8 colors; stubble, beard, glasses | Avatar | SVG | Created (as above) |
| 12 garment templates (recolorable base and print) | Avatar, add-item preview | SVG | Created |
| 15 starter outfits and the yellow rain jacket | Outfits, Closet | Color data on the templates | Created |
| 12 garment-type icons | Type picker, Closet tiles for starter items | SVG | Created |
| 7 weather icons (clear, partly cloudy, cloudy, fog, rain, storm, snow) | Today, date strip, week list | SVG | Created |
| 7 reminder icons (umbrella, sunscreen, water, layer, wind, rain jacket, snow) | Reminders | SVG | Created |
| Interface icons (location, info, Shuffle, tabs, camera, photos, close, back, search, edit, delete, check, lock) | Throughout | SVG | Created |
| 4 sky backdrops (clear, overcast, rain, snow) | Today's avatar stage | CSS/SVG | Created |
| Closet rack with a decorative shelf (cap, folded clothes, umbrella) | Closet header | SVG | Created |
| Decorative map | Location setup | SVG | Created (abstract shapes, not map data) |
| App icon and favicon | Browser tab, home screen | SVG/PNG | Created |
| Rounded web font | All text | WOFF2 | A Google Font under the SIL Open Font License, chosen during the build and credited |
| MediaPipe runtime; Face Landmarker, Hair Segmenter and MagicTouch models | Setup, add item | JS, WASM, model files | Licensed, Apache 2.0, hosted with the app |
| Monk Skin Tone Scale colors | Skin palette | Color values | Licensed, CC BY 4.0 (Ellis Monk) |

## Out of scope

Record features intentionally excluded from this project.

- The occasion picker (interview, party, hike); research moved it to future work.
- Exact garments on the avatar, photo-real try-on and 3D avatars.
- Dresses and other one-piece garments; accessories as closet items (hats, bags); body-shape options.
- Accounts, cloud sync and use on more than one device.
- Non-US locations, metric units, forecasts beyond 7 days, and an hourly view.
- Notifications and alarms; outfit history, laundry tracking and calendars.
- Offline use beyond showing weather already loaded in the current visit.
- Commercial use: Open-Meteo's free tier is non-commercial.
- A separate tablet layout: tablets get the phone or laptop layout depending on width.

## Revisions

After implementation or testing, record requirement changes and the evidence that prompted them. Update the screen drawings when a material layout or interaction changes.

## Approval

The Developer reviews and explicitly approves this specification and its screen designs before planning begins.

## Saving the transcript

After the Developer approves the specification, ask them to enter `save transcript`. When directed, save the complete conversation as `transcripts/spec-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.
