# Still Runs! — CrazyGames Basic Launch build

This is a **standalone, single-file HTML5 Canvas game** at `crazygames/index.html`.

## How to package
Run this command at the repository root:

```sh
cd crazygames
zip -9 still-runs-crazygames.zip index.html
```

Or, on macOS: download the `crazygames/index.html` file, ensure it is named `index.html`, and compress that file **without wrapping it inside another directory**.

**Important:** The ZIP must contain `index.html` at its root. Do not upload the entire `aynen.fun` repo.

## Compatibility
- One click to begin, four vehicles, one pedal
- Keyboard Space / Arrow Up, and touch/pointer acceleration
- 16 stages and a black-hole escape finale
- No external script or stylesheet requests in the build
- No outbound share navigation or ad code
- SDK deliberately omitted for Basic Launch
- Fixed-step simulation tested at 60 Hz / 144 Hz

## Basic Launch QA before submitting
1. Run the ZIP in the CrazyGames Developer Portal preview.
2. Verify 907×510, 821×462, 800×450 and mobile portrait layouts.
3. On real Chrome, Edge and iPhone Safari, test audio unlock, selection, controls, restart, black-hole escape and replay.
4. Upload three covers: 1920×1080, 800×1200, 800×800 (provided separately).
5. Capture authentic, silent 15–20-second landscape and portrait preview videos.
6. Review content rights and vehicle name/trademark use.

**No live CrazyGames submission has been made.** Full Launch will require the CrazyGames SDK and further QA.

See https://docs.crazygames.com/requirements/technical/ and https://docs.crazygames.com/requirements/game-covers/
