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
3. **Stylish and suited to the occasion:** outfits from my own clothes that look intentionally styled. Served by the closet and, after Core deploy, by the occasion choice (R41) and accessories (R42), added 2026-10-11.

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
| Setup: female or male (added 2026-10-10) | [P9](reference/screens/phone-09-setup-gender.png) | [L9](reference/screens/laptop-09-setup-gender.png) |
| Setup: selfie | [P7](reference/screens/phone-07-setup-selfie.png) | [L7](reference/screens/laptop-07-setup-selfie.png) |
| Setup: review avatar (revised 2026-10-10) | [P8](reference/screens/phone-08-setup-review.png) | [L8](reference/screens/laptop-08-setup-review.png) |

**Navigation:**
- Phone: bottom tabs for Today, Closet and Add item. Info opens from a button beside the location on Today, and "Edit avatar" is in the Closet.
- Laptop: the same tabs in a top bar, with location and Info on the right.
- First run: female or male, then selfie, then review the avatar, then location, then Today.

**Placement:** on the phone, location sits at the top, and the date strip, Shuffle and tabs sit in the lower half. Primary controls are at least 44×44 px.

**States** are specified under Requirements and appear on these screens: loading, missing data, service error, location denied, camera denied, no face found, cut-out failed and empty closet.

## Requirements

Translate every fixed brief requirement and the selected research-driven feature into a testable requirement. Define the chosen behavior, content, controls, current and forecast data, responsive layout, accessibility, error handling, privacy, credits, and deployment. The main screen should make clear the location, date, units, data source, and whether conditions are current or forecast. Include an acceptance check for each requirement.

### Weather, location and date

| ID | Requirement | Acceptance check |
|---|---|---|
| R1 | **Live weather.** Current conditions and a 7-day forecast (today plus 6 days) come only from Open-Meteo, in °F and mph. Each hour includes feels-like temperature, rain chance, UV index, wind gusts and snowfall. | The network log shows only `api.open-meteo.com` for weather. On-screen values match the API response for the same hour |
| R2 | **Location by search.** The User types a US city or ZIP. Matches come from Open-Meteo geocoding limited to the US (`countryCode=US`) and show the city and state. If nothing matches, the app points to the other two ways in (revised 2026-10-11): "We couldn't find that US city. Enter your ZIP code instead, or use your phone's location." (for a ZIP: "We couldn't find that ZIP code. Check it, or use your phone's location."), right above the "Use my location" button. Only cities and towns are listed, not landmarks such as dams or parks, and for a city search only places whose name contains the typed text. | "Austin" lists Austin, Texas and other states. "78705" finds Austin, TX. "Toronto" lists only US towns named Toronto (such as Toronto, OH), never Toronto, Canada. "Saskatoon" shows the not-found message above "Use my location". "Toronto" doesn't list Toronto Dam or Toronto State Park. "Austin" doesn't list Ardmore, TN |
| R3 | **Location by device.** "Use my location" asks the browser for permission. If granted, the coordinates are rounded to 2 decimals (about 1 km). Weather comes from Open-Meteo. The place name and US check come from **one** OpenStreetMap Nominatim reverse lookup per tap, and the result is saved with the location; there are no background or repeated lookups ([usage policy](https://operations.osmfoundation.org/policies/nominatim/)). A non-US position shows "This app works for US locations only," and the search field stays ready. | In Austin the pill shows "Austin, TX". The network log shows one Nominatim request per tap, with rounded coordinates. Deny: a message explains how to turn location on, and the search field stays ready. A simulated Toronto position shows the US-only message |
| R4 | **Saved location.** Only the most recent location (name and rounded coordinates) is saved, on this device, and it's restored on the next visit. | After a reload the same location appears. Storage holds exactly one location entry, and choosing another replaces it |
| R5 | **Date choice.** Today and the next 6 days can be selected. Today shows **Now** with the current temperature, and its outfit always covers the full 9 am–9 pm window, even after 9 pm. Other days show **Forecast** with the high and low. | Selecting each of the 7 days updates the label, the date and the temperatures to match the API. After 9 pm, Today still shows that day's outfit |
| R6 | **Main screen clarity.** Location, date, °F, the Open-Meteo credit, and Now or Forecast are visible on Today at phone and laptop sizes. | All five are visible without scrolling on P1a and L1, except the phone credit, which is on P1b |

### Recommendation

| ID | Requirement | Acceptance check |
|---|---|---|
| R7 | **One recommendation state.** For the selected location and date, the app builds one state from Open-Meteo's 9 am–9 pm hours and weather codes: band, weather icon and word, reminders, outfit items and the chosen wording. The avatar, weather icon, written recommendation, reminders and "Wearing" list are drawn only from this state. | Changing the location, date or Shuffle updates all five outputs together. Fixed test weather always gives the same band and reminders |
| R8 | **Rules from research.md.** The band comes from the warmest feels-like hour. Reminders: "layer for later" when the coldest hour is below 70°F and in a colder band; umbrella at 40% rain chance or more; sunscreen at UV 3 or more; water at a feels-like of 80°F or more (stronger wording at 90°F); wind at gusts of 25 mph or more; snow if any falls. When gusts reach 25 mph and rain 40%, "Wind and rain" replaces both Umbrella and Wind. On a snow day when the outfit's shoes aren't boots, Snow uses its "no boots" wordings (see Garment types by band). | Tests at each threshold edge: 84°F is Warm and 85°F is Hot; 39% rain gets no umbrella and 40% does; and so on for every rule. Gusts of 25 mph with 40% rain show only "Wind and rain" |
| R9 | **Outfit from the closet.** Each outfit has a top, a bottom and shoes, plus an outer layer when the band calls for one (see Garment types by band). Each slot uses one of the User's items whose type suits the band. If there isn't one, a starter item fills the slot and is labeled "Starter item". | Empty closet: all starter items. After adding a tee, Hot days use it. The "Wearing" labels match where each item came from |
| R10 | **Weather icon and word.** The app shows Open-Meteo's weather code as given and never works out a condition of its own. Each day in the strip and week list, and a forecast day's header, uses that day's daily code ("the most severe weather condition on a given day", covering all 24 hours). Today's header uses the current code, beside the current temperature. The word is Open-Meteo's own description of the code ("Light drizzle"), and the icon is one of 10 families (see Weather codes). A missing or unknown code shows no icon (R29). | Every strip day's icon and word match the daily codes Open-Meteo returned for that place, and Today's header matches the current code. All 29 codes in Open-Meteo's table have a word and an icon |

### Variation and Shuffle

| ID | Requirement | Acceptance check |
|---|---|---|
| R11 | **Outfit variations.** Every band has at least 3 possible outfits. Candidates are the combinations of eligible items, with the User's items first. If they make fewer than 3 distinct outfits, starter items are mixed in until there are 3. | With an empty closet, each band shows 3 different starter outfits across Shuffles. With one tee, Hot outfits still vary |
| R12 | **Wording variations.** Each reminder type, and each band's summary line, has at least 3 wordings (see Content variation). | Every wording in the content list appears across repeated tests |
| R13 | **Chosen independently.** The outfit and each reminder's wording are drawn separately at random, so the same outfit can appear with different wording, and the reverse. | Across 30 test draws, the same outfit appears with at least two different wordings |
| R14 | **Same date, same look, after reloads too.** Returning to a date shows the same outfit and wording, including after the page reloads. Picks are saved on this device for the current location only (item IDs and wording numbers, nothing else) and cleared when the location changes or the date passes. Shuffle draws a different outfit (wording stays), which becomes the date's outfit. If the band changes after a forecast update, or a chosen item is deleted, only the affected part is re-picked. If the gender changes (R40), only slots holding starter items are re-picked. | Select Mon, then Tue, then Mon again: identical. Shuffle on Mon, reload, return to Mon: the shuffled outfit stays. Change location: saved picks are gone. Yesterday's picks are gone the next day |

### Closet

| ID | Requirement | Acceptance check |
|---|---|---|
| R15 | **Add by photo.** Phone: a live camera in the page (P4a), or "Photos". Laptop: choose or drop a photo, with the camera as an option (L4). If camera access is denied or unavailable, a message says so and choosing a photo still works. | Deny the camera: the message appears and Photos works. On a laptop, dropping a JPEG starts the cut-out step |
| R16 | **Cut out on the device.** The User taps or clicks the item, and MediaPipe MagicTouch (6.2 MB model, Apache 2.0, hosted with the app) outlines it on the device. If there's no usable outline, the message says to retake on a plain background in good light, and the User can tap again. | The network log shows no photo upload. A flat-laid tee gets an outline. A blank photo gets the retake message |
| R17 | **Type, colors and name.** The User picks one of 17 garment types: tee, short-sleeve button-up, long-sleeve shirt, sweater or hoodie, crop top, spaghetti-strap top, light jacket, warm coat, hooded rain jacket, pants, shorts, skirt, sneakers, boots, sandals, clogs, heels (P4c; crop top, spaghetti-strap top, sandals, clogs and heels added 2026-10-11; occasion and accessory types follow in R41 and R42). Base and print colors are sampled from the cut-out and can be changed. The name is suggested from color and type ("Navy tee") and can be edited. The weather it suits comes from its type. | Picking Tee shows Hot and Warm. Changing the base color updates the avatar preview. Save stays disabled until a type is picked |
| R18 | **Kept on this device.** Each item (cut-out image, type, colors, name, date added) is stored in the browser's on-device storage and never uploaded. Items survive reloads. If storage is full, a message says so and nothing is half-saved. | The network log shows no upload on save. Items remain after a reload. A simulated storage error shows the message |
| R19 | **Browse the closet.** Items are grouped by type (Tops, Pants, Outer layers, Shoes) with counts. The rack header shows the 3 most recently added. Opening an item shows its detail (P5; beside the grid on a laptop, L3). | After adding an item, it appears on the rack and in its group, and the count goes up |
| R20 | **Edit and delete.** Edit reopens the confirm step. Delete asks for confirmation in the page, then permanently removes the item from the device. Outfits that used it re-pick that slot (R14). | Delete, then Cancel: the item stays. Delete, then Delete: the item is gone after a reload, and Today shows a replacement |
| R21 | **Starter items.** Starter items from the User's gender set (R40) are always listed in the Closet, marked "Starter", and can't be edited or deleted. An empty closet also shows a prompt to add the first item, and Today uses starter outfits (R9). | On a fresh install, the Closet shows starter items and the prompt, and Today's "Wearing" list says "Starter item" |

### Avatar and first setup

| ID | Requirement | Acceptance check |
|---|---|---|
| R22 | **First setup.** On first open: female or male (P9, L9; R40), then selfie (P7, L7), then review the avatar (P8, L8), then location (P2, L2), then Today. "Take a selfie" opens the phone's front camera, or the webcam in the page on a laptop. "Choose a photo" and "Set it up by hand" are always offered. | A fresh install walks through the 4 steps in order. "Set it up by hand" skips straight to the review with the gender's default values |
| R23 | **Read on the device, then discarded.** MediaPipe face and hair models read the selfie on the device. Skin tone is sampled from the cheeks and forehead and snapped to the nearest Monk tone. Hair color is matched to the nearest of 8. Hair length pre-selects a hairstyle (bald → Bald, very short → Buzz, short → Short crop, medium → Medium straight, long → Long straight). The selfie is never uploaded or stored, and it's discarded when setup ends. Only the chosen avatar values are saved. | The network log shows no image upload. After setup, on-device storage holds no image. Reloading during the review loses the selfie |
| R24 | **Review and adjust.** Gender (Female, Male), which sets the body and face as R40 describes; skin tone (10 Monk tones), hair color (8), hairstyle (bald, buzz, short crop, short curls or coils, afro, medium straight, medium curly, long straight, long curly, braids or locs, bun or ponytail), facial hair (none, stubble, beard; Male only, see R40) and glasses (on or off). The preview updates as each one changes. "Looks good" saves the avatar values on this device. | Each control changes the preview right away. After a reload, the avatar matches the saved values |
| R25 | **Setup problems.** No face found: "No face found. Try a front-facing photo in even light, or set it up by hand," with the adjust controls ready. Camera denied or unavailable: a message, and choosing a photo still works. | A photo without a face shows the message and controls. Denying the camera shows the message, and Choose a photo works |
| R26 | **Edit later.** "Edit avatar" in the Closet opens the review screen with the current values, plus Retake. | Change the hairstyle there: Today's avatar shows it |
| R40 | **Female or male** (added 2026-10-10; revised 2026-10-11). The first setup step asks "Female" or "Male". One must be picked to continue, and there is no third option (see Revisions). This one choice sets the avatar's body and face; there are no separate body or face controls. It also sets the hairstyle for hand setup (Female: Long straight, Male: Short crop; facial hair starts on None) and the starter outfit set (Content variation). Facial hair is offered only for Male: the Facial hair control is hidden for Female, and a female avatar never has facial hair. Everything else stays open to both: every hairstyle, glasses choice and closet item type. Changing it on the review screen changes the body, face and starter set together, and keeps skin, hair and glasses. Switching to Female sets facial hair to None. A hairstyle read from a selfie (R23) overrides the default. Gender is never read from the selfie. It is saved on this device with the avatar values, never sent, and can be changed in "Edit avatar" (R26). | A fresh install shows this step first, and Continue stays disabled until one is picked. Male, then "Set it up by hand": the review shows the male body and face and Short crop. Female: the female body and face and Long straight. Switching to Female on the review changes body and face together, hides Facial hair and removes any stubble or beard. The review has no separate Body or Face control. With an empty closet, Hot days use the Female set for Female and the Male set for Male. No network request carries the gender |
| R41 | **Occasions** (added 2026-10-11; built after Core deploy, plan.md C7a–C7c). Today offers an occasion choice: Class (the default), Interview, Party, Banquet, Hike, Beach. Class never uses special-occasion clothes. When the User deliberately picks another occasion, the outfit comes from closet items suited to it; any slot the closet can't fill uses that occasion's starter garment, labeled "Starter item". Weather rules (bands, rain, snow) still apply. One-piece garments (dresses, swimsuits) fill top and bottom together. The detailed rules are specified with the Developer before each occasion checkpoint: the picker's place on Today, whether the occasion is saved per date, how items are tagged for occasions, and each occasion's garment types, bands and starter garments. | With an empty closet, Interview shows a complete starter interview outfit with every item labeled "Starter item". Class never shows a blazer, suit, tuxedo, dress or swimwear. After adding a blazer, Interview uses it |
| R42 | **Weather-linked accessories** (added 2026-10-11; built after Core deploy, plan.md C7d). The avatar wears accessories when the weather calls for them: a cap or sun hat and sunglasses at UV 3 or more, a beanie and scarf on Cold and Freezing days. The User's own accessories come first (cap, sun hat, beanie, scarf, sunglasses become closet types), otherwise starter accessories. They appear on the avatar and in the Wearing list. The details are specified with the Developer before that checkpoint. | A UV 6 day with an empty closet shows a starter cap and sunglasses. A Cold day shows a beanie and scarf. An added scarf is used on Cold days |
| R43 | **Full avatar customizer** (added 2026-10-11; options settled 2026-10-11; built after Core deploy, plan.md C6a–C6d). The review screen (R24) and "Edit avatar" (R26) offer the range of a profile-avatar builder like Snapchat's Bitmoji, drawn as original art. **Body type** (one choice after Female or Male; "Average" is today's body): Female: Slim, Average, Athletic, Hourglass, Pear, Plus-size; Male: Slim, Average, Athletic, Broad, Stocky, Plus-size. **Face**, 8 choices each, open to both: face shape (Oval, Round, Square, Heart, Oblong, Diamond, Triangle, Rectangle), eye shape (Almond, Round, Hooded, Monolid, Upturned, Downturned, Deep-set, Close-set), eye color (Dark brown, Brown, Amber, Hazel, Green, Blue, Light blue, Grey), eyebrows (Straight, Soft arch, High arch, Rounded, Thick, Thin, Bushy, Angled), nose (Straight, Button, Rounded, Wide, Narrow, Upturned, Aquiline, Flat), mouth (Medium, Full, Thin, Wide, Small, Heart-shaped, Full lower lip, Full upper lip), ears (Average, Small, Large, Round, Pointed, Close to the head, Protruding, Attached lobes). **Extras**, open to both: freckles (None, Light, Medium, Heavy), beauty mark (None, Cheek, Chin, Above the lip), face lines and age (None, Smile lines, Forehead lines, Crow's feet, All), eyelashes (Natural, Medium, Long), makeup: lip color (none or 8), eyeshadow (none or 8), eyeliner (None, Thin, Winged), blush (none or 4). Every hairstyle fits every face shape, and every facial-hair option fits every face shape on the male face. Every garment, shoe and accessory fits all 12 bodies, computed from the body's measurements rather than drawn per body. **Tabs:** Body (Female or Male, body type, skin tone) · Face (face shape, ears, lines and age) · Eyes (eye shape, eye color, eyebrows, eyelashes, glasses) · Nose and mouth · Hair (hairstyle, hair color, facial hair for Male) · Details (freckles, beauty mark) · Makeup (lips, eyeshadow, eyeliner, blush). | Each new control updates the preview right away and survives a reload. On the art page's grids, every garment fits all 12 bodies and every hairstyle fits all 8 face shapes, with no gaps, overlaps or skin showing through. Every option is visible on all 10 skin tones |

### Info, states and quality

Location denied, camera denied, no face, failed cut-out and empty closet are covered in R3, R15, R16, R21 and R25.

| ID | Requirement | Acceptance check |
|---|---|---|
| R27 | **Info screen.** Shows the creator (RG Sureshkumar), the weather source (Open-Meteo, CC BY 4.0), the place-name sources (GeoNames, CC BY 4.0, for city and ZIP search; © OpenStreetMap contributors, ODbL, for "Use my location"), how outfits are picked (bands and reminder rules, with linked NWS, EPA and CDC sources), privacy (R34), "Delete all my data" (R35) and credits (R36). | Every item is on P6 and L6, and every link opens its source |
| R28 | **Loading.** While weather loads, Today shows the location and date, a placeholder where the avatar goes, and "Getting the forecast…". Controls that need data are disabled. Model downloads show progress. | On a throttled network the loading state appears, then real data. The screen is never blank |
| R29 | **Missing data.** If a value is missing for some hours, rules use the hours that exist. If it's missing all day, that rule is skipped and a note says so ("UV data isn't available for this day"). A day with no weather code shows no icon and the note "Sky conditions aren't available for this day." A day with no forecast, including no feels-like value in any 9 am–9 pm hour, is disabled in the strip. | Test data with no UV shows no sunscreen reminder, plus the note. A missing day 7 is disabled |
| R30 | **Service errors and offline.** If Open-Meteo or Nominatim fails, or the device is offline, a message says what failed and offers Retry. Weather already loaded in this visit stays visible, labeled with its time. Search keeps the typed text. | Blocking Open-Meteo shows the message and Retry. Unblocking and pressing Retry loads the data |
| R31 | **Responsive layouts.** Below 900 px wide: the phone layout (P screens). At 900 px and wider: the laptop layout (L screens). Touch on phones, mouse and keyboard on laptops. No sideways scrolling down to 320 px. | Resizing from 320 to 1440 px switches the layout at 900 px, with no sideways scroll and nothing clipped |
| R32 | **One-handed phone use.** The date strip, Shuffle and tabs are in the lower half of the screen. Primary controls are at least 44×44 px. On screens narrower than 342 px, the strip's day buttons narrow to 40 px wide (they stay over 70 px tall) so all seven days fit. | In dev tools, every primary control measures ≥44 px. On a real phone, they can be reached with the thumb of the holding hand |
| R33 | **Accessibility (WCAG 2.2 AA).** Text contrast is at least 4.5:1 on every sky backdrop. Every target is at least 24 px. Everything works by keyboard on a laptop, with visible focus. The avatar has a text description listing the full outfit, and icons have text labels. Reduced motion is respected. The app works at 200% zoom. | An automated audit shows no contrast or naming errors. A keyboard-only run works through Today, Closet and Add item. VoiceOver reads the outfit |
| R34 | **Privacy.** Stored only on this device: the latest location, avatar values (including gender), closet items and saved picks. Sent off the device: rounded coordinates to Open-Meteo, the typed city or ZIP to Open-Meteo's place search, and one Nominatim lookup per "Use my location" tap. GitHub Pages, which hosts the app, logs each visitor's IP address for security. No accounts, cookies, analytics or ads. Selfies and item photos never leave the device. Info explains all of this, including that Open-Meteo deletes its logs after 90 days, and that OpenStreetMap logs each lookup with the IP address under the OSMF privacy policy, which states no deletion period for those logs. | A full run's network log shows only the app's own host, Open-Meteo and Nominatim. On-device storage matches this list |
| R35 | **Delete all my data.** A button on Info clears the location, avatar (including gender), closet and saved picks from this device after an in-page confirmation, then returns to first setup. | Confirm: storage is empty and setup starts. Cancel: nothing changes |
| R36 | **Credits.** Open-Meteo (CC BY 4.0), GeoNames place data via Open-Meteo's geocoding (CC BY 4.0), OpenStreetMap contributors (ODbL), Google MediaPipe models (Apache 2.0), Monk Skin Tone Scale by Ellis Monk (CC BY 4.0), original artwork, and any fonts with their licenses. | Every third-party asset in the Assets list appears in Credits |
| R37 | **Download size.** Today never loads the vision models. Setup loads the runtime plus the face and hair models (about 16.5 MB, once). Add item loads the cut-out model (6.2 MB, once). All are hosted with the app and cached by the browser. | After setup, reloading Today shows no model downloads in the network log |
| R38 | **Deployment.** A public HTTPS URL on GitHub Pages, tested on a real phone and a laptop, separately from the local version. On an iPhone it can be added to the Home Screen from Safari and opens full-screen as a web app, with its own icon (added 2026-10-10). No offline support is added. | The URL loads over HTTPS, location permission works, and plan.md records the device tests. On an iPhone, Share → Add to Home Screen shows the Quick Dresser icon, and opening it shows the app without Safari's toolbars |
| R39 | **Peer-tested improvement.** Three peers test the deployed app, and at least one improvement supported by the findings is built. | plan.md has 3 session notes, and the Revisions section records the change and its evidence |

## Recommendation state and data flow

Define the weather inputs, recommendation categories, coded rules, and shared state. Weather values must come from the provider, and rules must follow the weather guidance cited in `research.md`. The selected location, date, and live weather data must produce one recommendation state that drives every visual and written output.

**Weather inputs.** One Open-Meteo request per location, with coordinates rounded to 2 decimals (all field names verified live 2026-10-03):
- hourly: `temperature_2m, apparent_temperature, precipitation_probability, uv_index, wind_gusts_10m, snowfall`
- daily: `temperature_2m_max, temperature_2m_min, weather_code`
- current: `temperature_2m, apparent_temperature, weather_code`
- options: °F, mph, inches, local time zone, 7 days

**Window.** The 13 hourly values from 9 am to 9 pm local time, inclusive. Values are rounded to whole numbers before the rules run, so the numbers on screen match the rules. Snowfall is the exception: it's in inches and never shown as a number, and rounding would erase light snow, so any amount above 0 counts.

**Derived values.** Highest feels-like and its time, lowest feels-like and its time, highest rain chance and its time, highest UV and its time, highest gust, and total snowfall with the time of the first snow.

**Categories and rules.** Five bands from the highest feels-like: Hot ≥85 · Warm 70–84 · Chilly 55–69 · Cold 35–54 · Freezing <35. Reminders follow R8, the icon follows R10, and outfits follow Garment types by band.

**Weather codes** (WMO codes, with Open-Meteo's own descriptions from open-meteo.com/en/docs, checked 2026-10-11). The word on screen is the description; the icon is the family:

| Icon family | Codes and Open-Meteo's words |
|---|---|
| Clear | 0 Clear sky |
| Partly cloudy | 1 Mainly clear · 2 Partly cloudy |
| Overcast | 3 Overcast |
| Fog | 45 Fog · 48 Depositing rime fog |
| Drizzle | 51 Light drizzle · 53 Moderate drizzle · 55 Dense drizzle |
| Rain | 61 Slight rain · 63 Moderate rain · 65 Heavy rain |
| Freezing rain | 56 Light freezing drizzle · 57 Dense freezing drizzle · 66 Light freezing rain · 67 Heavy freezing rain |
| Showers | 80 Slight rain showers · 81 Moderate rain showers · 82 Violent rain showers |
| Snow | 71 Slight snowfall · 73 Moderate snowfall · 75 Heavy snowfall · 77 Snow grains · 85 Slight snow showers · 86 Heavy snow showers |
| Thunderstorm | 95 Thunderstorm · 96 Thunderstorm with slight hail · 97 Heavy thunderstorm · 99 Thunderstorm with heavy hail |

The sky backdrop behind the avatar follows the day's family: clear (clear, partly cloudy), overcast (overcast, fog, or no code), rain (drizzle, rain, freezing rain, showers, thunderstorm) or snow.

**Shared state**, one per location and date:

| Field | Comes from |
|---|---|
| Location | Saved location (R4) |
| Date, is-today | Date strip |
| Display: Now or Forecast, temperature (current, or high and low), feels-like, weather icon and word, update time | Open-Meteo current or daily data (R10) |
| Window values | Derived above |
| Band | Highest feels-like |
| Reminders: type, wording number, values | R8 plus saved picks |
| Outfit: top, bottom, shoes, outer layer, each marked closet or starter | Closet, the garment table, the gender's starter set (R40) and saved picks |
| Summary wording number | Saved picks |
| Avatar look, including gender, body and face | Avatar values (R24, R40) |

**Flow.** Location and date → Open-Meteo forecast → window values and weather codes → band, reminders, icon and word → eligible items (closet first, then the gender's starters) → saved or new picks (R14) → **state** → avatar, weather icon, summary, reminders and "Wearing" list. Shuffle, closet changes and a gender change re-enter at the picks step. A new location or date starts from the top. Nothing on screen reads weather or storage directly.

### Garment types by band

Which of the User's items can be picked for each band (Developer's judgement; research fixes only the bands).

| Type | Hot ≥85°F | Warm 70–84 | Chilly 55–69 | Cold 35–54 | Freezing <35 |
|---|---|---|---|---|---|
| Tee, short-sleeve button-up | ✓ | ✓ | | | |
| Crop top (added 2026-10-11) | ✓ | ✓ | | | |
| Spaghetti-strap top (added 2026-10-11) | ✓ | ✓ | | | |
| Long-sleeve shirt | | ✓ | ✓ | ✓ under coat | ✓ under coat |
| Sweater or hoodie | | | ✓ | ✓ under coat | ✓ under coat |
| Shorts, skirt | ✓ | ✓ | | | |
| Pants | | ✓ | ✓ | ✓ | ✓ |
| Sneakers | ✓ | ✓ | ✓ | ✓ | |
| Boots | | | | ✓ | ✓, and any snow day |
| Sandals (added 2026-10-11) | ✓ | ✓ | | | |
| Clogs (added 2026-10-11) | ✓ | ✓ | ✓ | | |
| Heels (added 2026-10-11) | ✓ | ✓ | ✓ | | |
| **Outer layer** | none | none | light jacket | warm coat | warm coat |

- **Hooded rain jacket** (rain chance 40% or more and gusts of 25 mph or more; research.md reminder rule). It is added on Hot and Warm days and replaces the light jacket on Chilly days. On Cold and Freezing days it is worn over the warm coat: both are in the outfit, and the rain jacket is drawn on top. The User's own rain jacket comes first, otherwise the starter one. In summaries, {outer} names the coat when both are worn.
- **Snow days** (any snowfall from 9 am to 9 pm). If the User owns boots, the shoes are one of their boots. If they own shoes but no boots, the shoes come from their own shoes in any band, closed shoes first: sneakers, then clogs, then heels, and sandals only if they own nothing else (revised 2026-10-11). The Snow reminder then uses its "no boots" wordings. If they own no shoes, starter boots are used.
- **Layer for later jacket:** a light jacket if the coldest hour is Chilly, a warm coat if it's Cold or Freezing. It's picked at random, in this order of preference: the User's neutral jackets, the User's other jackets, starter neutral jackets, other starter jackets. Neutral means a starter color marked neutral (white, cream, greys, black, navy, tan, khaki, camel, olive, denim, brown), or, for the User's items, a sampled base color with CIE LCh chroma below 30. The pick is saved with the day's other picks (R14).
- **Hat and gloves** (Cold and Freezing, per NWS guidance) appear only in the written recommendation, not on the avatar.

## Content variation

Define at least three outfit variations for each recommendation category and at least three wording variations for each reminder type. Define how outfit and reminder variations are chosen independently at random, and how a previously selected date keeps the same variations, including whether they persist after the page reloads.

Selection and persistence rules: R11–R14. Outfits use the User's items first; the starter outfits for the User's gender (R40) fill in until the closet can make 3 outfits for a band. Each item is a drawn template in a starter colorway, fitted to the avatar's body.

How candidates are built (R9, R11):
- Starter outfits stay whole, and the User's eligible items replace the matching slot.
- With an empty closet, a band offers exactly its 3 starter outfits.
- With one tee, Hot offers the tee with each starter outfit's bottom and shoes.
- Once the User's own items make 3 or more distinct outfits, starters drop out.

### Starter outfits: Man set

| Band | Outfit 1 | Outfit 2 | Outfit 3 |
|---|---|---|---|
| **Hot** ≥85°F | White tee · khaki shorts · white sneakers | Light-blue short-sleeve button-up · navy shorts · grey sneakers | Heather-grey tee · olive shorts · white sneakers |
| **Warm** 70–84 | Navy tee · light jeans · white sneakers | Sage short-sleeve button-up · khaki shorts · white sneakers | White long-sleeve shirt · dark jeans · grey sneakers |
| **Chilly** 55–69 | White long-sleeve shirt · dark jeans · white sneakers · denim jacket | Grey hoodie · khaki pants · grey sneakers · navy light jacket | Navy sweater · light jeans · white sneakers · tan light jacket |
| **Cold** 35–54 | Grey sweater · dark jeans · brown boots · navy coat | White long-sleeve shirt · black pants · grey sneakers · charcoal coat | Maroon hoodie · dark jeans · brown boots · olive coat |
| **Freezing** <35 | Navy sweater · dark jeans · brown boots · black coat | Grey hoodie · black pants · black boots · red coat | Cream sweater · khaki pants · brown boots · navy coat |

### Starter outfits: Woman set

Added 2026-10-10 (R40). Skirts appear only where the garment table allows them (Hot and Warm).

| Band | Outfit 1 | Outfit 2 | Outfit 3 |
|---|---|---|---|
| **Hot** ≥85°F | White tee · denim skirt · white sneakers | Coral short-sleeve button-up · white shorts · white sneakers | Lavender tee · khaki skirt · grey sneakers |
| **Warm** 70–84 | Sage tee · light jeans · white sneakers | White short-sleeve button-up · navy skirt · white sneakers | Rose long-sleeve shirt · light jeans · white sneakers |
| **Chilly** 55–69 | Cream sweater · light jeans · white sneakers · denim jacket | White long-sleeve shirt · black pants · grey sneakers · tan light jacket | Lavender hoodie · dark jeans · white sneakers · olive light jacket |
| **Cold** 35–54 | Cream sweater · dark jeans · brown boots · camel coat | Rose hoodie · black pants · black boots · charcoal coat | Navy long-sleeve shirt · light jeans · brown boots · burgundy coat |
| **Freezing** <35 | Grey sweater · black pants · black boots · camel coat | Cream hoodie · dark jeans · brown boots · burgundy coat | Navy sweater · khaki pants · brown boots · forest-green coat |

Both sets share one starter **yellow hooded rain jacket** for the rain-and-wind rule.

### Wordings

Words in braces fill in from the selected day's 9 am–9 pm hours or the chosen outfit. Each line keeps the advice in `research.md`. Times read like "3 pm". Reminders appear in the order of this table.

**Reminders** (the bold title stays fixed; the line varies):

| Reminder (trigger) | 1 | 2 | 3 |
|---|---|---|---|
| **Umbrella** (rain ≥40%) | {rain}% chance of rain around {rainTime}. Pack the umbrella. | Rain could show up by {rainTime} ({rain}%). An umbrella in your bag saves the day. | Showers possible around {rainTime}. Bring an umbrella just in case. |
| **Sunscreen** (UV ≥3) | UV reaches {uv} around {uvTime}. Put on SPF 15+ before you head out. | Strong sun midday (UV {uv}). Sunscreen now, sunglasses in your bag. | UV {uv} today. A layer of SPF 15+ before the walk is a good idea. |
| **Water** (feels ≥80°) | Feels like {feelsMax}° by {maxTime}. Bring a water bottle. | Warm one out there. Fill your water bottle before class. | It'll feel like {feelsMax}° this afternoon. Keep water with you. |
| **Water, strong** (feels ≥90°) | Feels like {feelsMax}° by {maxTime}. Bring a full bottle and drink before you're thirsty. | Serious heat today. Drink more water than usual, even if you're not thirsty. | {feelsMax}° feels-like this afternoon. Refill your bottle whenever you can. |
| **Layer for later** (coldest <70°, colder band) | Drops to {feelsMin}° by {minTime}. Bring your {jacket}. | Cooler tonight, around {feelsMin}°. Your {jacket} goes with this outfit. | The evening gets chilly ({feelsMin}°). Toss your {jacket} in your bag. |
| **Wind** (gusts ≥25 mph) | Gusts up to {gust} mph. Expect a blustery walk to class. | Windy today, with gusts near {gust} mph. Keep loose papers zipped away. | Gusty out there ({gust} mph). A zip-up layer helps. |
| **Wind and rain** (gusts ≥25 and rain ≥40%; replaces Umbrella and Wind) | Rain and gusts to {gust} mph. An umbrella won't hold up, so wear the hooded rain jacket. | Wind and rain together today. Skip the umbrella and use your rain jacket's hood. | Gusts near {gust} mph will flip an umbrella. Your hooded rain jacket is the move. |
| **Snow** (any snowfall) | Snow expected around {snowTime}. Wear waterproof boots. | Snow on the way. Boots with good grip keep your feet dry. | Slick sidewalks likely with snow today. Waterproof boots, please. |
| **Snow**, no boots (any snowfall, and the outfit's shoes aren't boots; replaces Snow) | Snow expected around {snowTime}. Your {shoes} will do, but boots would keep your feet drier. | Snow on the way and no boots in your closet. Step carefully in your {shoes}. | Slick, snowy sidewalks likely today. Boots would be a better choice than your {shoes}. |

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
| Character base: two bodies (A, B) and two sets of face details (A, B), recolored to 10 skin tones | Today, setup, add-item preview | SVG | Created by the Agent, art-directed by the Developer: "Original artwork created for this project" |
| Customizer art (R43): 12 body types (6 per gender); face shapes, eye shapes, eye colors, eyebrows, noses, mouths and ears (8 each); freckles, beauty marks, face lines, eyelashes and makeup | Avatar | SVG | Created (as above), in C6a–C6c |
| 11 hairstyles in 8 colors; stubble, beard, glasses | Avatar | SVG | Created (as above) |
| 16 garment templates (recolorable base and print), each fitted to both bodies; sandals and heels show the foot in the wearer's skin tone | Avatar, add-item preview | SVG | Created |
| 30 starter outfits (15 per gender) and the yellow rain jacket | Outfits, Closet | Color data on the templates | Created |
| 16 garment-type icons | Type picker, Closet tiles for starter items | SVG | Created |
| 10 weather icons (clear, partly cloudy, overcast, fog, drizzle, rain, freezing rain, showers, snow, thunderstorm) | Today, date strip, week list | SVG | Created |
| 7 reminder icons (umbrella, sunscreen, water, layer, wind, rain jacket, snow) | Reminders | SVG | Created |
| Interface icons (location, info, Shuffle, tabs, camera, photos, close, back, search, edit, delete, check, lock) | Throughout | SVG | Created |
| 4 sky backdrops (clear, overcast, rain, snow) | Today's avatar stage | CSS/SVG | Created |
| Closet rack with a decorative shelf (cap, folded clothes, umbrella) | Closet header | SVG | Created |
| Decorative map | Location setup | SVG | Created (abstract shapes, not map data) |
| App icon and favicon | Browser tab, home screen | SVG/PNG | Created; a placeholder (white hanger on coral) from C0, final in C10 |
| Web app manifest | Home Screen install (R38) | JSON | Created |
| Rounded web font: Nunito (variable), chosen by the Developer in C2 | All text | WOFF2, bundled with the app from the npm package @fontsource-variable/nunito 5.3.0 | Licensed, SIL Open Font License 1.1 (Nunito by Vernon Adams and others); credited on Info |
| MediaPipe runtime; Face Landmarker, Hair Segmenter and MagicTouch models | Setup, add item | JS, WASM, model files | Licensed, Apache 2.0, hosted with the app |
| Monk Skin Tone Scale colors | Skin palette | Color values | Licensed, CC BY 4.0 (Ellis Monk) |
| Place names for city and ZIP search | Location setup | Data from Open-Meteo's geocoding API | GeoNames, CC BY 4.0 ("Location data based on GeoNames", Open-Meteo geocoding docs); credited on Info |

## Out of scope

Record features intentionally excluded from this project.

- Exact garments on the avatar, photo-real try-on and 3D avatars.
- Bags and other accessories not named in R42. (The occasion picker, dresses and accessories as closet items moved into scope on 2026-10-11: R41, R42. Body builds, face shapes and face features moved into scope the same day: R43.)
- Gender options other than Woman and Man (Developer's decision, 2026-10-10; see Revisions).
- Accounts, cloud sync and use on more than one device.
- Non-US locations, metric units, forecasts beyond 7 days, and an hourly view.
- Notifications and alarms; outfit history, laundry tracking and calendars.
- Offline use beyond showing weather already loaded in the current visit.
- Commercial use: Open-Meteo's free tier is non-commercial.
- A separate tablet layout: tablets get the phone or laptop layout depending on width.

## Revisions

After implementation or testing, record requirement changes and the evidence that prompted them. Update the screen drawings when a material layout or interaction changes.

- **2026-10-10 — Woman or man in setup (new R40).** The Developer directed that setup let the User pick their gender and build the avatar from it. In the decisions that followed, the Developer chose:
  - Gender sets the body, face details, default hairstyle and starter outfits.
  - Only Woman and Man are offered.
  - Nothing is limited by gender.
  - Gender gets its own first setup step.
  - **Trade-offs accepted:** anyone who is neither a woman nor a man has no fitting option. Two bodies double the garment art (12 templates, each fitted to both bodies) and the starter outfits (15 → 30), so Core deploy (C0–C6) lands later.
  - Gender is chosen by the User and never read from the selfie: MediaPipe's face models don't classify gender, and guessing it risks getting it wrong.
  - **Changed:** R14, R21, R22, R24, R34, R35, the shared state and flow, Content variation (new Woman set), Assets and Out of scope ("body-shape options" narrowed).
  - **Wireframes:** P9 and L9 added; P7, P8, L7 and L8 updated with the 4-step count and the Gender, Body and Face controls.
- **2026-10-10 — Home Screen web app (R38).** The Developer wants to test on their iPhone as the app is built. A native iOS app was considered and not chosen: the brief requires a browser-based app, free Xcode installs expire after 7 days, and TestFlight needs a paid developer account. The app instead gets a web app manifest and a home-screen icon, so Safari's Add to Home Screen installs it and it opens full-screen. A Home Screen app keeps its own on-device storage, separate from Safari's. No service worker: offline use stays out of scope.
- **2026-10-10 — Rule edges settled before C1.** The spec left five rule edges open. The Developer decided:
  1. **Layer for later** names a jacket of the right weight, neutral colors first.
  2. **Rain and wind on Cold and Freezing days:** the hooded rain jacket goes over the warm coat instead of replacing it. Replacing it could leave someone under-dressed below 35 °F, against the NWS layering advice in research.md.
  3. **Snow days:** the User's own shoes always win, with boots preferred. If they own shoes but no boots, a new "Snow, no boots" warning (3 wordings, approved) replaces the Snow reminder. This holds even on Freezing days, which overrides the garment table there.
  4. **Wind and rain** replaces both Umbrella and Wind, so the gusts aren't mentioned twice.
  5. **Icon ties** go to the most severe condition.
  - **Agent defaults, stated to the Developer before building:** times read "3 pm"; reminders follow the table order; a day with no feels-like data is unavailable. The way candidates are built (R9, R11) is recorded under Content variation.
  - **Found while building C1:** snowfall isn't rounded. Real fixtures showed 0.249 in of snow in Minneapolis, which rounding would turn into 0, so "snow if any falls" would never fire.
  - **Changed:** R8, R10, R29, Window, Garment types by band, Content variation and Wordings.
- **2026-10-11 — Four new garment types: crop top, sandals, clogs, heels (C2 art round).** After seeing the first character art, the Developer asked for a crop top, to check the art handles clothes that show skin, and for sandals, Crocs-style clogs and heels, to widen the shoes. Asked whether they should be mockups only or real types, the Developer chose real types.
  - **Bands** (Developer approved the proposed table): crop top and sandals on Hot and Warm days; clogs and heels on Hot, Warm and Chilly days.
  - **Snow days without boots:** closed shoes first (sneakers, clogs, heels), sandals last.
  - **Heels** are open to both genders, keeping R40's rule that gender limits nothing.
  - **Starter sets are unchanged:** the new types appear only as the User's own items.
  - **Clogs** are drawn generic, not as any brand.
  - **Changed:** R17 (12 → 16 types), Garment types by band, Snow days and Assets. The type picker (P4c, L4) needs four more tiles; its wireframes get updated in C7, where that screen is built.
- **2026-10-11 — Occasions, formal wear, accessories and a spaghetti-strap top (C2 art review).** The Developer asked for:
  - more natural bodies
  - a spaghetti-strap top
  - professional and formal clothing: suits, blazers, tuxedos, formal and banquet dresses
  - accessories: hats, caps, scarves, glasses, sunglasses
  - hoodies and sweaters

  The Agent flagged that dresses, accessories as closet items and the occasion picker were out of scope, that formal wear needs occasions (the app picks by weather alone), and that this is a schedule risk. The Developer then chose:
  - **Real formal types with an occasion picker,** covering the full user-story list: Class, Interview, Party, Banquet, Hike, Beach. Special-occasion clothes appear only when the User picks that occasion, from the closet first, with missing slots filled by that occasion's labeled starter garments (new R41).
  - **Weather-linked accessories, including closet items** (new R42).
  - **A spaghetti-strap top,** a real type for Hot and Warm days (R17).
  - **Scheduling:** occasions and accessories are built in phases after the closet (C7), with Core deploy unchanged, but all the mockups are drawn now in C2.

  **Changed:** Goal (story 3), R17, Garment types by band, new R41 and R42, and Out of scope.
- **2026-10-11 — Art round 1 approved (C2).** Decisions recorded:
  - **Font:** Nunito, self-hosted.
  - **Review-screen labels:** Body and Face read "Female" and "Male", replacing A and B.
  - **How garments fit both bodies:** one drawing per garment, built from each body's measurements and its weight-shift pose (Developer confirmed, keeping the approach in the approved art).
  - **Art direction:** from reference 10, an expressive face, soft shading and a relaxed weight-shift pose, with Body B's legs set apart.
  - **Deferred to the start of C5:** more hairstyles come in C5 as planned. Whether face shapes and more body sizes join the spec gets decided then, with options and costs, since body sizes are out of scope today.
  - **Wireframes:** P8 and L8 relabeled.
- **2026-10-11 — One Female/Male choice sets body and face (R24, R40).**
  - The Developer wants to pick Male or Female once, with the matching body and face following, instead of setting Body and Face separately. This reverses the 2026-10-10 choice that let them be changed on their own.
  - The labels change from Woman/Man to Female/Male.
  - Everything else stays open to both genders: hairstyles, facial hair, glasses and closet item types.
  - **Wireframes:** P9 and L9 relabeled; the Body and Face controls are removed from P8 and L8.
- **2026-10-11 — R2's no-match case (C3).**
  - **Evidence:** R2's check expected "Toronto" to show "No US place matches." Live Open-Meteo data (2026-10-11) returns 10 US towns named Toronto (Ohio, Kansas, South Dakota, Iowa and more), so the check could not pass and the app is right to list them.
  - **The Developer's rule:** when no city is found, point the User to their phone's location or their ZIP code instead.
  - "Saskatoon", which has no US match, now tests the not-found message, and "Toronto" tests that only US places are listed.
  - **Also found in C3:** Open-Meteo returned "Toronto Dam" and "Toronto State Park" for "Toronto". Results are now limited to populated places (GeoNames feature codes PPL…), since R2 asks for a city.
  - **Also found in C3:** Open-Meteo returns real towns matched on alternate names, such as Ardmore, TN and Cazadero, CA for "Austin". The Developer chose to hide places whose name doesn't contain the typed text. ZIP searches are unaffected.
- **2026-10-11 — Privacy wording and a missing credit (R27, R34, R36; start of C6).** Both were checked against their sources before writing Info:
  - **Open-Meteo, 90 days:** confirmed. The terms say "All log files will be deleted after a period of 90 days."
  - **OpenStreetMap, 180 days:** not supported for this app. The OSMF privacy policy (last edited January 2026) gives 180 days only for Piwik analytics on its own websites, which the app never loads. For server requests such as Nominatim lookups, it says IP addresses and requests are logged, and Nominatim queries may be analysed to improve the map, but it gives no deletion period. Nominatim's usage policy defers to the OSMF policy. The Developer chose to state this accurately, linking the policy.
  - **GeoNames credit:** city and ZIP search uses Open-Meteo's geocoding, whose docs say "Location data based on GeoNames". GeoNames data is licensed CC BY 4.0, which requires credit, so it joins Credits, the place-name sources on Info, and the Assets list.
  - **Also missing from R34, added:** the typed city or ZIP goes to Open-Meteo's place search, and GitHub Pages, which hosts the app, logs each visitor's IP address for security ([GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), "Data collection").
  - **Changed:** R27, R34, R36 and Assets.
- **2026-10-11 — Art round 2 approved (C5).** The 11 hairstyles in 8 colors, stubble and beard (Male only) and glasses. Every hairstyle is drawn from head measurements so it can fit the face shapes coming in R43. Agent defaults for the screens, stated to the Developer:
  - Hand setup starts on Monk 6 and Dark brown hair until C9's selfie reading sets them.
  - "Take a selfie" and "Choose a photo" are shown but disabled until C9.
  - With no selfie, the review's Retake reads "Back".
- **2026-10-11 — Facial hair for Male only (R24, R40, C5 art round 2).**
  - **Evidence:** the art round 2 sheets showed stubble and a beard on the female face, as R40 allowed ("every facial-hair option open to both").
  - **The Developer's direction:** no female avatar has facial hair. This reverses that part of the 2026-10-10 decision that nothing is limited by gender.
  - **Agent defaults:** the Facial hair control is hidden for Female. Switching from Male to Female sets facial hair to None, and switching back starts from None.
  - **Unchanged:** hairstyles, glasses and closet item types stay open to both.
  - **Changed:** R24, R40 and R43. The P8 and L8 notes say Facial hair is Male only.
- **2026-10-11 — Body types approved (C6a).** The Developer approved the 12 body types and the redrawn P8 and L8 with the 7 tabs. Found while fitting:
  - Pant legs started just under the waistband at full thigh width, so they stuck out past wide hips and under the hem of tees on male bodies. Shorts, pants and trousers now share one fix: the hips follow the body's curve, and the legs start at the hip line.
  - The avatar's drawing area was widened to the full 400 px so the widest bodies fit. Screens that size the avatar by its height keep it the same size.
- **2026-10-11 — Customizer options settled (R43, start of C6a).** The Developer chose:
  - **Named body types** over stepped or free sliders: 6 per gender, gender-specific (Female: Slim, Average, Athletic, Hourglass, Pear, Plus-size; Male: Slim, Average, Athletic, Broad, Stocky, Plus-size). There are no separate height, bust or hip controls, which narrows R43's first wording.
  - **8 or more choices per face feature** over 5–6 or 3–4, accepting that neighbouring choices look alike at small sizes and that every hairstyle is refitted to 8 face shapes.
  - **All four extras:** freckles and beauty marks, makeup, face lines and age, and eyelashes, all open to both genders.
  - The option list and the 7 review tabs above, approved as drafted.
  - **Costs the Agent stated:** about 35 garment, shoe and accessory drawings fit to 12 bodies; 11 hairstyles fit to 8 face shapes; every option checked on 10 skin tones. C6a–C6d will take many sessions, and the closet, occasions, cut-out and selfie wait until they're done. If time runs short, the extras and some 8-choice features are the first candidates to trim, and the Developer decides.
  - **Changed:** R43, Assets. P8 and L8 are redrawn with the tabs in C6a.
- **2026-10-11 — Full avatar customizer (new R43, start of C5).**
  - **Background:** the C2 art review deferred to C5 whether face shapes and more body sizes join the spec.
  - **The Agent's proposal:** 3 face shapes now, with body sizes later if time allows.
  - **The Developer's direction:** many more face shapes and body sizes than that, close to what Snapchat offers when setting up a profile avatar, as personal as possible, with garments refitted to every body type.
  - **Costs the Agent raised:**
    - This is the largest piece of work in the project.
    - Hand-fitting each garment per body doesn't scale, so garments are computed from body measurements and checked on a grid of sample bodies.
    - The review screen needs category tabs, so P8 and L8 are redrawn.
    - Done before Core deploy, it would push the first live release and everything after it back by several sessions.
  - **The Developer chose:** build it right after Core deploy, in phases before the closet (plan.md C6a–C6d).
  - **C5 is unchanged:** two bodies and one face per gender, plus the 11 hairstyles, facial hair and glasses. The hairstyles are drawn from head measurements so they can later fit every face shape.
  - **The art stays original:** it matches Bitmoji's breadth of choice, not its look.
  - **Changed:** new R43; Out of scope no longer excludes other body shapes.
- **2026-10-11 — Weather icons come straight from Open-Meteo (R10, C4).**
  - **Evidence:** in C4, live Austin data showed Tuesday with a Rain icon at a 3–9% rain chance. Three hours of light drizzle (code 51, 0.1 mm) met R10's "rain wins with 3 or more hours" rule.
  - **The Developer's direction:** the app shouldn't decide which icon to use. It should show what the weather API gives for the day.
  - **Agent's finding:** Open-Meteo sends no icons, only a WMO code with a description. Its daily code is documented as "the most severe weather condition on a given day" and covers all 24 hours, not the 9 am–9 pm window.
  - **The Developer chose:**
    - Open-Meteo's own words with 10 icon families (over keeping 7 icons, or one icon per code).
    - On Today, the header shows the current code; each day in the strip shows the daily code.
  - **Agent defaults:**
    - The sky backdrop follows the day's code, since the outfit is for the day.
    - With no code, the backdrop stays neutral (overcast) and the R29 note shows.
  - **Removed:** the window condition rule, its severity order for ties, and the hourly `weather_code` field, which nothing else used.
  - **Unchanged:** reminders (an umbrella still follows the rain chance) and outfits.
  - **Changed:** R7, R10, R29, Weather inputs, Weather codes (was Condition codes), Shared state, Flow and Assets (7 → 10 weather icons). The 2026-10-10 "icon ties" rule no longer applies.
- **2026-10-11 — Day buttons on narrow phones (R32, C4).**
  - **Evidence:** at 320 px wide, seven 44 px day buttons plus gaps and margins need about 362 px, so Saturday and part of the "Add item" tab were cut off. With tighter spacing, 44 px holds down to 342 px.
  - **Options:** narrow the buttons to 40 px so all seven fit, or let the strip scroll sideways and keep 44 px with the last day partly hidden.
  - **The Developer chose** 40 px buttons. They stay about 75 px tall, so the tap area is still large, and they're well above R33's 24 px minimum.
  - **Changed:** R32.

## Approval

The Developer reviews and explicitly approves this specification and its screen designs before planning begins.

## Saving the transcript

After the Developer approves the specification, ask them to enter `save transcript`. When directed, save the complete conversation as `transcripts/spec-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.
