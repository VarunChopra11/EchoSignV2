/**
 * main.js — Application Entry Point
 *
 * Initializes:
 *  1. MediaPipe Holistic
 *  2. Camera capture
 *  3. Gesture Classifier
 *  4. UI Controller
 *  5. Canvas overlay drawing
 */

import { GestureClassifier } from './detection/classifier.js';
import { LandmarkDrawer } from './utils/drawing.js';
import { UIController } from './ui/ui.js';

// ── DOM References ────────────────────────────────────────────
const videoEl   = document.getElementById('input-video');
const canvasEl  = document.getElementById('output-canvas');
const btnStart  = document.getElementById('btn-start');

// ── Initialize Modules ────────────────────────────────────────
const ui         = new UIController();
const classifier = new GestureClassifier();
const drawer     = new LandmarkDrawer(canvasEl);

let holisticInstance = null;
let cameraInstance   = null;
let isRunning        = false;

// ── Classifier → UI Bridge ────────────────────────────────────
classifier.onFrame((frameData) => {
  ui.updateFrame(frameData);
});

// ── Start Camera ──────────────────────────────────────────────
async function startCamera() {
  if (isRunning) return;

  try {
    // Load MediaPipe from CDN (no bundler issues with WASM files)
    await loadMediaPipe();
    isRunning = true;
    ui.setCameraActive(true);
  } catch (err) {
    console.error('Camera init failed:', err);
    ui.setDemoError(`ERROR — ${err.message || 'Camera access denied'}`);
  }
}

// ── Load MediaPipe Holistic via CDN ───────────────────────────
async function loadMediaPipe() {
  return new Promise((resolve, reject) => {
    // Dynamically load scripts from CDN to avoid Vite WASM issues
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js',
    ];

    let loaded = 0;

    function onLoad() {
      loaded++;
      if (loaded === scripts.length) {
        initHolistic().then(resolve).catch(reject);
      }
    }

    for (const src of scripts) {
      if (document.querySelector(`script[src="${src}"]`)) {
        onLoad();
        continue;
      }
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload  = onLoad;
      s.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(s);
    }
  });
}

// ── Initialize MediaPipe Holistic ─────────────────────────────
async function initHolistic() {
  // eslint-disable-next-line no-undef
  const Holistic = window.Holistic;
  // eslint-disable-next-line no-undef
  const Camera   = window.Camera;

  if (!Holistic || !Camera) {
    throw new Error('MediaPipe scripts not loaded');
  }

  // Initialize Holistic model
  holisticInstance = new Holistic({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`;
    }
  });

  holisticInstance.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  // On results: draw + classify
  holisticInstance.onResults((results) => {
    // Sync canvas size with video
    const vw = videoEl.videoWidth  || videoEl.clientWidth;
    const vh = videoEl.videoHeight || videoEl.clientHeight;
    if (canvasEl.width !== vw || canvasEl.height !== vh) {
      drawer.resize(vw, vh);
    }

    // Draw landmarks
    drawer.draw(results);

    // Classify gesture
    classifier.processFrame(results);
  });

  // Start camera
  cameraInstance = new Camera(videoEl, {
    onFrame: async () => {
      if (holisticInstance) {
        await holisticInstance.send({ image: videoEl });
      }
    },
    width: 1280,
    height: 720,
  });

  await cameraInstance.start();
}

// ── Button Handler ────────────────────────────────────────────
btnStart.addEventListener('click', startCamera);

// ── Window Resize ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  if (videoEl.videoWidth) {
    drawer.resize(videoEl.videoWidth, videoEl.videoHeight);
  }
});
