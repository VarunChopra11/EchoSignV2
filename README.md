# ASL Sign Reader

Real-time American Sign Language (ASL) word detection using **MediaPipe Holistic** and **rule-based landmark analysis**. No ML training required — pure geometric/positional rules on hand, face, and pose landmarks.

---

## 🚀 Setup

### Prerequisites
- Node.js 18+ 
- A modern browser (Chrome recommended for best MediaPipe support)
- Webcam

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser, click **START CAMERA**, grant camera permission, and start signing.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
asl-sign-reader/
├── index.html                    # App entry point (HTML shell)
├── vite.config.js                # Vite configuration
├── package.json
├── README.md
└── src/
    ├── main.js                   # App bootstrap: MediaPipe + wiring
    ├── detection/
    │   ├── gestures.js           # Rule-based gesture detectors (all 20 words)
    │   └── classifier.js         # Smoothing, frame buffer, confidence engine
    ├── ui/
    │   ├── ui.js                 # DOM controller (panel, status, history)
    │   └── styles.css            # Full dark terminal UI stylesheet
    └── utils/
        └── drawing.js            # Canvas landmark overlay renderer
```

---

## 🤟 Supported Words & Gesture Mappings

| Word | ID | Gesture Description | Key Landmarks Used |
|------|----|--------------------|--------------------|
| **hello** | 113 | Open hand (5 fingers) raised near forehead, palm outward | Hand open, wrist near forehead, above shoulder |
| **mom** | 145 | Open hand with thumb touching chin area | Open hand, thumb tip near chin/mouth |
| **dad** | 55 | Open hand with thumb touching forehead | Open hand, wrist near forehead, thumb high |
| **happy** | 105 | Flat hand brushes upward on chest | Open hand near chest, fingers pointing up |
| **now** | 157 | Both hands bent down at wrists, palms up | Both wrists below shoulder, wrists bent |
| **please** | 173 | Flat hand circles on chest, palm toward body | Open hand near chest, thumb inward |
| **give** | 95 | Both open hands extended forward from body | Both hands open, both at mid-body level |
| **milk** | 142 | Squeeze fist motion (C-to-fist) | Partially open hand (2–4 fingers), mid-body |
| **thankyou** | 214 | Flat hand moves outward from chin | Open hand near face/chin, tips pointing away |
| **yes** | 244 | Fist nodding (S-hand wrist bob) | Fist near face level |
| **no** | 153 | Index + middle tap thumb | Index + middle + thumb extended, tips near |
| **dog** | 58 | Snap fingers (pinch) at side | Pinch pose, hand at mid-body |
| **cat** | 38 | Pinch at cheek, pull outward (whiskers) | Pinch near cheek level |
| **drink** | 63 | C-hand raises toward mouth | Curved hand (1–3 fingers), near mouth |
| **go** | 97 | Both index fingers arc forward | Both hands index-only, tips diverging |
| **outside** | 163 | O-hand pulls outward | Fingertips clustered (O-shape), mid-body |
| **boy** | 29 | Grab hat brim at forehead | Pinch or partial open, near forehead |
| **girl** | 94 | Thumb traces jawline (A-hand) | Fist + thumb out, near jaw/face |
| **water** | 234 | W-hand taps lips (3 fingers) | Index + middle + ring extended, near mouth |
| **see** | 193 | V-hand (peace) points from eyes | Index + middle extended only, near eye level |

---

## ⚙️ Detection Architecture

### Landmark System
MediaPipe Holistic provides:
- **468 face landmarks** — 3D positions across the face mesh
- **33 pose landmarks** — upper/lower body skeleton with visibility scores
- **21 hand landmarks per hand** — wrist + 4 fingers × 4 joints + fingertips

### Rule Engine (`src/detection/gestures.js`)
Each gesture is defined by geometric rules:

```
Finger extension test:  dist(tip, wrist) > dist(pip, wrist)
Pinch test:             dist(thumb_tip, index_tip) < threshold
Hand near face:         dist(wrist, nose) < 0.25  (normalized coords)
Above shoulder:         wrist.y < shoulder.y
```

All coordinates are normalized (0–1), so rules work regardless of camera resolution.

### Smoothing Engine (`src/detection/classifier.js`)

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `BUFFER_SIZE` | 64 frames | Rolling window for temporal smoothing |
| `STABILITY_WIN` | 20 frames | Short window for recent consistency check |
| `CONFIDENCE_THRESH` | 0.70 (70%) | Minimum to report a detection |
| `MIN_FRAMES_AGREE` | 8 frames | Gesture must dominate this many frames |

**Confidence formula:**
```
finalConfidence = avgConfidence × recentStability
```
Where `recentStability` = fraction of last 20 frames agreeing on same word.

### Drawing (`src/utils/drawing.js`)
Renders color-coded landmark overlays on canvas:
- 🔵 **Cyan** — Face mesh dots (every 5th landmark)
- 🟣 **Purple** — Pose skeleton + dots
- 🟢 **Green** — Left hand skeleton + dots
- 🟡 **Amber** — Right hand skeleton + dots

All landmarks are mirrored on X-axis to match the mirrored video display.

---

## 🎨 UI Design

The UI matches the reference dark terminal aesthetic:

- **Font:** Share Tech Mono (monospace) + Rajdhani (UI labels)
- **Colors:** Dark `#0d0f12` base, cyan `#00e5cc` accents, purple detections
- **Components:** Status pills, frame buffer bar, confidence bar with 70% threshold marker, stability indicator, recent signs history
- **Camera view:** Corner bracket indicators (⌜ ⌝ style), live frame counter bar at bottom

---

## 🔧 Extending

### Add a new word
1. Add detector function in `src/detection/gestures.js`:
```js
export function detectMyWord({ pose, rightHand, leftHand, face }) {
  // ... rule logic ...
  return { detected: bool, confidence: 0-1 };
}
```

2. Register it in `GESTURE_REGISTRY`:
```js
export const GESTURE_REGISTRY = {
  // ...existing words...
  myword: detectMyWord,
};
```

3. Add to `WORD_IDS` if it has an assigned ID.

### Tune detection sensitivity
Edit constants in `src/detection/classifier.js`:
```js
const CONFIDENCE_THRESH = 0.70; // Lower = more detections (less accurate)
const MIN_FRAMES_AGREE  = 8;    // Lower = faster response (more flicker)
const BUFFER_SIZE       = 64;   // Lower = faster (less smoothing)
```

---

## 🌐 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Firefox 90+ | ⚠️ May have WASM limitations |
| Safari 15+ | ⚠️ Limited MediaPipe support |

> **Note:** MediaPipe loads via CDN at runtime. An internet connection is required on first load to download the WASM model files (~3–8MB). Subsequent loads may be cached.

---

## 📝 License

MIT — Free to use and modify.
