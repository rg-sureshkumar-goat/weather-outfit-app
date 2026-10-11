# Feasibility tests (saved copies)

Copies of the test pages linked in `research.md`, saved on 2026-10-03 so they can be opened without a claude.ai account.

**What's in the repo** (Developer's decision, 2026-10-10). Only the garment-fit test and the selfie test page are committed. Left out on purpose:
- The three avatar previews, because each embeds the Developer's shirt photo and the repo is public. They are reachable through the links below.
- The selfie test's `vendor/` and `models/` folders (about 17 MB of Google MediaPipe files, Apache 2.0), which duplicate files the app itself hosts.

| File | What it tested | research.md section | In repo | Original page |
|---|---|---|---|---|
| `garment-fit-test.html` | A flat-lay shirt photo projected onto a rigged 3D tee template | Garment digitization | Yes | [link](https://claude.ai/artifact/1Rv7P5atgnG56pmmNyMoem) |
| `photo-on-2d-character.html` | Avatar preview: the shirt photo on a 2D character (rejected) | Garment digitization | No (photo) | [link](https://claude.ai/artifact/PjLGu6WXcBrNJ1RQfv5LrV) |
| `stylized-3d-avatar.html` | Avatar preview: stylized 3D avatar in a recolored template (not chosen) | Garment digitization | No (photo) | [link](https://claude.ai/artifact/UkdmYwHvvKWrXX9cxhdEyp) |
| `illustrated-2d-avatar.html` | Avatar preview: 2D illustrated avatar in a recolored template (chosen) | Garment digitization | No (photo) | [link](https://claude.ai/artifact/Esu3Vk9HdLsonAcVU6uFkU) |
| `selfie-avatar-test/index.html` | Skin tone, hair color and hair length read from a selfie on the device | Avatar from a selfie | Page only | [link](https://claude.ai/artifact/GZKB6s9QvhdXYfsdG616Yw) |

## Opening them

- `garment-fit-test.html` opens with a double-click. It needs an internet connection for fonts and three.js (loaded from a CDN). Choose a front and back garment photo in the page.
- `selfie-avatar-test/index.html` is included so its method can be read. It won't run from the repo because its MediaPipe files are left out; use the original page link to run it.
