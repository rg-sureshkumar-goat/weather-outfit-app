# Research

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose of this file: Research your context of use, references, weather guidance, technical options, and choices that will guide the specification.

## Instructions for the Developer

Judge sources and recommendations, make the consequential decisions, and keep this file current as the work develops.

To begin, open the project repository in a fresh chat and enter:

`Read ./research.md and help me begin Project 3 research.`

## Instructions for the Agent

Read `AGENTS.md`, `brief.md`, and this file. Ask one focused question at a time. Help investigate and compare options without deciding for the Developer. Verify sources directly and keep this file concise.

## Context of use

As the User, describe when and where you would use the app and what you need from it. Record important circumstances, assumptions, and limitations.

I'm a college student living on campus in Austin, TX. On a typical day I've just showered at about **8:00 am** and I'm getting dressed in my dorm before a **10-minute walk** to class. I'm on campus from **9:00 am to 9:00 pm** with no chance to return and change, so one outfit has to work all day. I check the app on my **phone**, in a hurry and often one-handed. I also want to **plan up to a week ahead**.

**What I need:** today's or a chosen day's forecast for my location, turned into **one outfit from clothes I actually own**. When I set up the app or buy something new, I photograph each item, and the app creates a digital version that **matches it almost exactly**, even complex garments like floral dresses, Hawaiian prints, or graphic tees. This must be **free** to use. Recommendations come from that wardrobe and are planned around the hardest part of the 9 am–9 pm window (coldest, hottest, or wettest). I also need reminders of what to bring: umbrella, a jacket that matches the day's outfit, sunscreen, water bottle.

**Circumstances and assumptions**
- Austin is usually very hot but often turns cloudy or rainy; the app must still work in **every US climate**, from heat to snow and freezing cold.
- **US locations only**, per the brief.
- It must be quick to read and trustworthy, since I won't get a second chance to change.

**Limitations**
- Forecasts can be wrong, especially further ahead; later-in-the-week advice is less reliable than today's.

## User story

Write at least one user story grounded in your context of use:

> As a [type of user], I want to [need or goal], so that [reason or outcome].

Focus on the need rather than prescribing an interface or feature.

> **1. Effortless.** As a college student getting dressed in a hurry before a full day on campus, I want to know exactly what to put on from my own wardrobe without thinking about it, so that I can get dressed and out the door quickly.

> **2. Comfortable all day.** As a student who can't return to change between 9 am and 9 pm, I want my outfit and what I carry to suit the whole day's weather, so that I stay comfortable from morning to night.

> **3. Stylish and suited to the occasion.** As a student whose days range from casual classes to interviews, parties, banquets, hikes, or beach trips, I want outfits from my own clothes that suit what my day involves and the weather, and that look intentionally styled, so that others think I put thought into my look even when I didn't.

## References

Collect 5–10 reference images from relevant products and interfaces. Save each image in `reference/`, identify its source, and record a brief observation about what is useful, ineffective, or relevant to this project. Reference images are examples only; do not use them in the app.

Screenshots are the publishers' own App Store or press images, retrieved 2026-10-03.

| # | Image | Source | Observation |
|---|---|---|---|
| 1 | [01-acloset-home.jpg](reference/01-acloset-home.jpg) | [Acloset, App Store](https://apps.apple.com/us/app/acloset-ai-fashion-assistant/id1542311809) | **Useful:** headline outfit labeled with date, city, and high/low, with a one-tap refresh icon, matching story 1 and my refresh idea. **Ineffective:** outfits are flat item collages, not worn by a character; a busy row of feature buttons competes with the outfit. |
| 2 | [02-acloset-ai-stylist.jpg](reference/02-acloset-ai-stylist.jpg) | Acloset | **Useful:** plain-language recommendation tied to the forecast ("a bit chilly… long sleeve or a short sleeve with a jacket") above the outfit; a model for the written recommendation. **Relevant:** "Make it more formal?" prompt shows occasion adjustment. Uses °C; US users expect °F. |
| 3 | [03-acloset-calendar.jpg](reference/03-acloset-calendar.jpg) | Acloset | **Relevant:** month calendar of planned outfits supports planning ahead. **Ineffective for my need:** a month with no weather shown; I need a week with each day's forecast. |
| 4 | [04-whering-dress-me.jpg](reference/04-whering-dress-me.jpg) | [Whering, App Store](https://apps.apple.com/us/app/whering-your-digital-wardrobe/id1519461680) | **Useful:** "Dress me" shuffle with top / bottom / shoes rows and pins to lock an item, close to my top-to-bottom item list plus refresh. **Ineffective:** no weather input; shuffling is random rather than suited to the day. |
| 5 | [05-whering-wardrobe.jpg](reference/05-whering-wardrobe.jpg) | Whering | **Useful:** wardrobe grid of background-removed photos with category chips (Tops, Bottoms, Outerwear, Shoes); cutout photos of real items look clean and recognizable. **Relevant:** chips are a pattern for the occasion picker. |
| 6 | [06-bitmoji-fashion.jpg](reference/06-bitmoji-fashion.jpg) | [Bitmoji, App Store](https://apps.apple.com/us/app/bitmoji/id868077558) | **Useful:** character fills the top half, clothing picker the bottom half, with a category tab bar along the bottom edge within thumb reach; a good one-handed phone pattern. **Ineffective:** clothes are a preset catalog, not the user's own. |
| 7 | [07-carrot-phone.jpg](reference/07-carrot-phone.jpg) | [CARROT Weather, App Store](https://apps.apple.com/us/app/carrot-weather-alerts-radar/id961390574) | **Useful:** playful tone (big temperature, witty one-line summary, small illustrated scene) followed by hourly and daily forecast; personality and clear data can coexist. **Relevant:** bottom tab bar for one-handed use. |
| 8 | [08-carrot-mac.jpg](reference/08-carrot-mac.jpg) | [CARROT Weather (Mac), App Store](https://apps.apple.com/us/app/carrot-weather-talking-forecast/id993487541?mt=12) | **Useful:** laptop layout spreads the hourly timeline and 7-day row across the wide window instead of stacking like the phone, which is the brief's "use the larger screen." **Ineffective:** dense small text is hard to scan quickly. |
| 9 | [09-snapchat-3d-bitmoji.jpg](reference/09-snapchat-3d-bitmoji.jpg) | [Snap Newsroom, "Bitmoji introduces a new avatar style" (Jul 19, 2023)](https://newsroom.snap.com/bitmoji-introduces-a-new-avatar-style) | **Useful:** full-body 3D avatars in detailed, textured, patterned clothing (floral shirt, zebra skirt), with inclusive body types and a wheelchair user; the look I want for my avatar. **Limitation:** Snap designs each garment by hand; they are not generated from user photos. |

**Gaps:** no reference yet for an error / location-denied state. (An occasion-picker reference is no longer needed; the occasion picker moved to future work.)

## Weather and technical evidence

Record each useful source, what it supports, and important limitations. Research the weather variables, apparel guidance, reminders, accessibility, privacy, artwork, weather providers, and technical options needed for informed decisions.

### Garment digitization

**Feasibility test (2026-10-03).** Built a browser test ([Garment Fit Test](https://claude.ai/artifact/1Rv7P5atgnG56pmmNyMoem)): a flat-lay photo projected onto a rigged 3D tee template on a stand-in mannequin (three.js).
- **Works:** the photo wraps around the template and stays on the body when the arms move; front and back prints read correctly.
- **Problems (Developer observed):** rough background removal (simple color method; BiRefNet would replace it); wrinkles and lighting carried over from the photo; a gap where sleeves meet the body; overall look doesn't feel real because the shirt is a rigid shell with no drape or folds. Print also stretches at the sides.
- **Implication:** realistic fit needs artist-made templates or cloth simulation, which is high effort and needs 3D skill. Photo accuracy and natural drape pull against each other.

**Avatar previews (2026-10-03).** Three mockups of the main screen, built with the Developer's own shirt photo (cut out on-device with Apple Vision) and Austin's real forecast:
- **Photo on a 2D character** ([preview](https://claude.ai/artifact/PjLGu6WXcBrNJ1RQfv5LrV)): exact garment, but read as a paper cutout. Rejected by the Developer.
- **Stylized 3D avatar, recolored template** ([preview](https://claude.ai/artifact/UkdmYwHvvKWrXX9cxhdEyp)): Snapchat-like look; the Developer chose to stay 2D.
- **2D illustrated avatar, recolored template** ([preview](https://claude.ai/artifact/Esu3Vk9HdLsonAcVU6uFkU)): drawn button-up filled with the photo's sampled colors (olive #666947, print #4a5030), matching pocket, placket, and buttons; real photo shown beside. Chosen.

**Sources**
- Gemini image models: free tier "Not available" for image output ([Google AI pricing, updated 2026-10-01](https://ai.google.dev/gemini-api/docs/pricing)).
- Cloudflare Workers AI: 10,000 free neurons/day ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)); Workers free plan 100,000 requests/day ([limits](https://developers.cloudflare.com/workers/platform/pricing/)). FLUX.2 [klein] 4B is Apache 2.0 and supports image editing ([BFL](https://bfl.ai/blog/flux2-klein-towards-interactive-visual-intelligence)); no published garment-fidelity data.
- BiRefNet_lite: MIT, runs in the browser via Transformers.js ([Hugging Face](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX)). RMBG-1.4: non-commercial only ([Hugging Face](https://huggingface.co/briaai/RMBG-1.4)). `@imgly/background-removal`: AGPL ([package](https://classic.yarnpkg.com/en/package/@imgly/background-removal)).
- IDM-VTON virtual try-on: non-commercial, needs GPU ([FASHN comparison](https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models)).
- Photo-to-3D: Garment3DGen produces drapeable garments but is research code needing GPU and base meshes ([arXiv 2403.18816](https://arxiv.org/abs/2403.18816)); TRELLIS is MIT but outputs a static object, not a rigged garment ([Hugging Face](https://huggingface.co/microsoft/TRELLIS-image-large)).
- Snap's 3D Bitmoji garments are hand-crafted, not generated from user photos ([Snap Newsroom](https://newsroom.snap.com/bitmoji-introduces-a-new-avatar-style)).
- BiRefNet_lite ONNX weights: 224 MB (fp32), 114.5 MB (fp16), too heavy for a first-use phone download ([Hugging Face](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX)).
- MediaPipe Interactive Segmenter (MagicTouch): user taps the object to select it; 6.2 MB model; ~208 ms CPU latency in Google's benchmark; Web/JS supported ([Google](https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter)). Google's model file showed no cross-site access headers, so the app should host it. Model card: Apache 2.0 ([model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MagicTouch.pdf)). Google's page now links a newer int8 model (30.5 MB); the 6.2 MB original is still published and is the one specified.

### Avatar from a selfie

**Feasibility test (2026-10-03).** [Selfie Avatar Test](https://claude.ai/artifact/GZKB6s9QvhdXYfsdG616Yw): Google MediaPipe face and hair models run in the browser, read skin tone, hair color and hair length from a selfie, and set up the 2D character. The selfie is never uploaded.
- With the Developer's selfie: face found; skin `#7a593e` (nearest Monk 7), dark brown hair, short length, all judged correct. About 110 ms on a Mac. Exact and nearest-preset colors looked almost the same.
- Not detected: hair texture, facial hair, glasses. First load on a phone not yet timed.

**Sources**
- MediaPipe Face Landmarker: 478 face landmarks, Web supported ([Google](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)); 3.8 MB model. Hair Segmenter: hair mask, ~58 ms CPU in Google's benchmark ([Google](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)); 0.8 MB model. The web runtime (11.8 MB) is shared with the garment cutout tool.
- Model cards for the face detector, face mesh, blendshapes and hair models: Apache 2.0; face models "do not provide facial recognition or identification."
- MediaPipe's related multiclass segmentation model card reports lower accuracy on the darkest skin tones (Monk 9–10: mean IoU 68 vs. 77 overall, 31 samples) ([model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)), so the User must be able to correct the result.
- Monk Skin Tone Scale: 10 tones by Ellis Monk with Google, CC BY 4.0 ([Wikipedia](https://en.wikipedia.org/wiki/Monk_Skin_Tone_Scale)).

### Weather provider

Tested live 2026-10-03 (Austin, TX): both candidates returned real data and send `Access-Control-Allow-Origin: *`, so they work from a static GitHub Pages site.
- **Open-Meteo:** no API key; up to 16-day forecast (7 default); daily and hourly temperature, feels-like, rain probability, **UV index**, wind; °F/mph/inch units; built-in US geocoding ("Austin" and ZIP "78705" both resolved). US data from NOAA GFS and HRRR ([docs](https://open-meteo.com/en/docs)). Free tier is **non-commercial only** (no ads or subscriptions), 10,000 calls/day, **CC BY 4.0 attribution required** ([pricing](https://open-meteo.com/en/pricing), [terms](https://open-meteo.com/en/terms)).
- **NWS API:** no key (User-Agent requested), US only, 7 days, public open data "free to use for any purpose," includes HeatRisk and wet-bulb globe temperature ([docs](https://www.weather.gov/documentation/services-web-api)). **No UV field** among its 59 gridpoint fields and no geocoding, so it would need a second provider.
- **Keyed APIs** (AccuWeather, OpenWeather, Tomorrow.io): the key would be exposed in a static site, so they'd need a proxy server.

### Apparel and reminder guidance

- **UV:** protection needed from UV Index 3 (broad-spectrum SPF 15+, hat, sunglasses); extra protection from 8 ([EPA](https://www.epa.gov/sunsafety/uv-index-scale-0)).
- **Heat:** heat index 80–90°F "Caution," 90–103°F "Extreme Caution," 103–124°F "Danger" ([NWS](https://www.weather.gov/ama/heatindex)). Wear loose, lightweight, light-colored clothing; drink more water than usual and don't wait until thirsty ([CDC](https://stacks.cdc.gov/view/cdc/152760/cdc_152760_DS1.pdf)).
- **Cold:** chilly: 1–2 layers plus a wind/rain outer layer; cold: 2–3 layers, hat, gloves, boots; extreme cold: 3+ layers (one insulating). No numeric thresholds given ([NWS](https://www.weather.gov/wrn/winter-sm)).
- **Rain:** probability of precipitation 30–50% = "Chance," 60–70% = "Likely" ([NWS](https://www.weather.gov/ppg/forecast_terms)).
- **Wind:** Beaufort force 6 (25–31 mph): "umbrellas used with difficulty" ([NWS](https://www.weather.gov/mfl/beaufort)).
- **Limitation:** no authoritative source sets mid-range clothing bands; ASHRAE 55 only separates summer (~0.5 clo) from winter (~1.0 clo) clothing ([Wikipedia](https://en.wikipedia.org/wiki/ASHRAE_55)). The Warm, Chilly, and Cold cut-offs are the Developer's judgement.

### Accessibility and one-handed use

- **WCAG 2.2 AA:** text contrast ≥4.5:1 (≥3:1 for large text) ([1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)); touch targets ≥24×24 CSS px ([2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)), with 44×44 px (AAA 2.5.5) recommended for important controls.
- **How phones are held:** 1,333 observations found 49% one-handed, 36% cradled, 15% two-handed use; people switch grips often, so every control must stay reachable rather than only the "easy" zone ([Hoober, UXmatters, 2013](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)).

### Privacy

- **Device location:** the browser Geolocation API works only on HTTPS and only after the user grants permission; a denial returns `PERMISSION_DENIED`, which the app must handle ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)).
- **Open-Meteo:** no cookies or tracking, no sharing with third parties; server logs may include IP addresses and coordinates and are deleted after 90 days ([terms](https://open-meteo.com/en/terms)).

## Decisions

Record the selected weather provider, forecast range, recommendation categories and rules, screen structure, visual direction, artwork approach (original, AI-generated, or appropriately licensed), deployment method, and one additional feature justified by the research. Briefly explain important trade-offs.

Once the recommendation categories are chosen, estimate the art needed: the character, three outfit variations per category, weather icons, and reminder icons. Use that estimate to choose the artwork approach.

- **Weather provider: Open-Meteo.** The only option covering forecast, UV, and location search from one provider with no key. Conditions: stay non-commercial (the Client needs a paid plan if the app is monetized); credit Open-Meteo under CC BY 4.0 on the info screen.
- **Forecast range: 7 days** (today + 6). Matches the context of use; reliability drops beyond about a week.
- **Recommendation categories: 5 bands by feels-like temperature:** Hot ≥85°F · Warm 70–84 · Chilly 55–69 · Cold 35–54 · Freezing <35.
- **Band rule:** the warmest feels-like hour between 9 am and 9 pm on the selected date picks the band. If the coldest feels-like hour in that window is below 70°F (Chilly or colder) and in a colder band than the outfit, add a "layer for later" reminder naming a jacket that matches the outfit.
- **Reminders** (any hour, 9 am–9 pm): umbrella if rain chance ≥40%; sunscreen if UV ≥3; water bottle if feels-like ≥80°F (stronger wording ≥90°F); layer for later per the band rule; wind if gusts ≥25 mph (suggest a hooded rain jacket instead of an umbrella when rain is also likely); snow/ice if any snowfall (suggest waterproof boots).
- **Accessibility target: WCAG 2.2 AA.** Primary controls are ≥44×44 px. The date strip and Shuffle sit in the lower half of the phone screen; location, which is saved and rarely changed, sits at the top. All controls stay reachable. The written recommendation doubles as a text description of the character's outfit; weather and reminder icons get text labels; motion respects `prefers-reduced-motion`.
- **Privacy:** store only the most recent location on the device (localStorage); round coordinates to 2 decimals (~1 km) before sending them to Open-Meteo; no accounts, cookies, or analytics. The info screen explains the location permission, what Open-Meteo receives, and its 90-day log retention. Wardrobe photos stay on the device (see Wardrobe storage). The setup selfie is read on the device and discarded; it is never uploaded or stored.
- **Avatar and garments: 2D illustrated.** The avatar wears drawn garment templates (one per garment type) filled with the base color and print sampled from the User's photo, keeping key details (collar, pockets, buttons). The User's real cutout photo appears beside it in the "Wearing" list; the exact garment is shown in the photo, not on the avatar. The avatar is generated at setup from a selfie read on the device: skin tone (snapped to the Monk Skin Tone Scale), hair color and hair length (which pre-selects a hairstyle). The User confirms or adjusts it, adds facial hair or glasses, or sets it up by hand. Final character art is still to be chosen; the previews use placeholder art.
- **Artwork approach: original SVG drawn by the Agent, art-directed by the Developer.** Free; every piece built to be recolored and to fit one character. The Developer supplies the style reference and approves each round. The final character must be original, not a copy of Bitmoji. Credit: "Original artwork created for this project."
- **Art estimate:** 1 character (10 skin tones, 8 hair colors, 11 hairstyles: bald, buzz, short crop, short curls or coils, afro, medium straight, medium curly, long straight, long curly, braids or locs, bun or ponytail; facial hair: stubble, beard; glasses); 12 garment templates: tops (tee, short-sleeve button-up, long-sleeve shirt, sweater/hoodie), outer layers (light jacket, warm coat, hooded rain jacket), bottoms (pants, shorts, skirt), shoes (sneakers, boots); ~7 weather icons (clear, partly cloudy, cloudy, fog, rain, storm, snow); 7 reminder icons (umbrella, sunscreen, water, layer, wind, rain jacket, snow). The brief's 3+ outfit variations per band come from recoloring and combining templates.
- **Additional feature: digital wardrobe.** Users add their clothes by photo; recommendations use their items, with starter templates filling gaps. Justified by all three user stories and by the reference wardrobe apps (Acloset, Whering, Indyx). **Occasion picker moves to future work.**
- **Wardrobe storage:** photos and tags stay on the device (IndexedDB); no uploads or accounts; each item can be deleted; the info screen explains this.
- **Adding an item:** the User taps the garment to cut it out (MediaPipe MagicTouch, hosted with the app), picks its garment type from the template list, and confirms the auto-sampled base and print colors and the suggested name. The item's suitable bands come from its type.
- **Screen structure:** Tabs for Today, Closet and Add item; Info opens from Today; first-run setup takes the selfie, reviews the avatar, then sets the location. States for loading, missing data, service error, location denied, camera denied, no face found and empty closet. Phone: bottom tabs, with the 7-day strip and Shuffle in the thumb zone. Laptop: avatar centered, week in one side column, recommendation, reminders and wearing list in the other; top navigation. Layout: spec.md, Screen designs.
- **Visual direction: sky and daylight.** Backdrop changes with conditions (clear, overcast, rain, snow); warm off-white cards; one coral accent; rounded, friendly type. Contrast must meet WCAG 2.2 AA on every backdrop.
- **Deployment: GitHub Pages** from the public repo. Static hosting over HTTPS (required by the Geolocation API), free, no server or API keys needed since Open-Meteo is keyless and wardrobe processing runs on the device.

## Revisions

Record new evidence or changed decisions and explain why they changed.

- **2026-10-03 — Client redefined.** `brief.md` describes the Client as a new clothing brand for US college students; the Developer redefined the Client as an app developer. Why: the app is not tied to one brand, so recommendations may use any garments the User owns, including other brands' logos (kept on-device for personal use).
- **2026-10-03 — Exact garment on the avatar dropped.** Context of use asked for a digital version matching each garment "almost exactly." Tests showed exact photos look unreal on a 3D body and like paper cutouts on a 2D one, and Snapchat-style polish relies on hand-made garments. The Developer chose a 2D illustrated avatar wearing recolored look-alike templates, with the exact photo shown beside it.
- **2026-10-03 — "Layer for later" threshold.** With Austin's real forecast, the original rule (any drop to a colder band) asked for a layer on evenings that still felt like 72–80°F. Now it fires only when the coldest hour is below 70°F.
- **2026-10-03 — Avatar generated from a selfie.** The approved decision had the User pick from a few skin tones and hairstyles. The Developer chose to generate the avatar from a setup selfie, read on the device. An image-AI cartoon was rejected because it sends the face to a server, needs a proxy, and returns a flat image the garment templates can't layer onto. The selfie test confirmed the approach.
- **2026-10-03 — Shuffle moves down; location stays up.** The Developer's main-screen drawing placed location and Shuffle at the top, against the thumb-zone decision. The Developer chose a split: the date strip and Shuffle in the lower half, and location at the top because it is saved and rarely changed.

## Approval

The Developer reviews the sources and decisions, corrects this file, and explicitly approves it before specification begins.

## Saving the transcript

After the Developer approves the research, ask them to enter `save transcript`. When directed, save the complete conversation as `transcripts/research-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.
