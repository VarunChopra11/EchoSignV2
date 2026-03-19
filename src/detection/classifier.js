/**
 * classifier.js — Gesture Classification Engine
 *
 * Responsibilities:
 *  - Run all gesture detectors against current landmarks
 *  - Apply temporal smoothing to reduce flicker
 *  - Track confidence and stability over a sliding window
 *  - Emit finalized detections above threshold
 */

import { GESTURE_REGISTRY } from './gestures.js';

const BUFFER_SIZE     = 64;   // frames in sliding window
const STABILITY_WIN   = 20;   // frames to check stability
const CONFIDENCE_THRESH = 0.70; // minimum to report detection
const MIN_FRAMES_AGREE = 8;   // minimum frames where gesture dominates

export class GestureClassifier {
  constructor() {
    /** @type {Array<{word: string, confidence: number}|null>} */
    this.frameBuffer = [];

    /** Most recently emitted detection */
    this.currentDetection = null;

    /** Stability: how consistent is the leading gesture */
    this.stabilityScore = 0;

    /** Frame count for FPS */
    this.frameCount = 0;
    this.fpsTimestamp = performance.now();
    this.fps = 0;

    /** Listeners */
    this._onDetection = null;
    this._onFrame = null;
  }

  /**
   * Process one frame of MediaPipe results
   * @param {object} results - MediaPipe Holistic results
   */
  processFrame(results) {
    this.frameCount++;

    // Compute FPS every second
    const now = performance.now();
    if (now - this.fpsTimestamp >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.fpsTimestamp));
      this.frameCount = 0;
      this.fpsTimestamp = now;
    }

    const landmarks = this._extractLandmarks(results);

    // Run all gesture detectors
    const detections = this._runDetectors(landmarks);

    // Find best detection this frame
    const best = this._getBest(detections);

    // Push to rolling buffer
    this.frameBuffer.push(best);
    if (this.frameBuffer.length > BUFFER_SIZE) {
      this.frameBuffer.shift();
    }

    // Aggregate buffer
    const { word, confidence, stability } = this._aggregateBuffer();
    this.stabilityScore = stability;

    // Update current detection
    if (confidence >= CONFIDENCE_THRESH && word) {
      this.currentDetection = { word, confidence, stability };
    } else {
      this.currentDetection = null;
    }

    // Notify frame listener
    if (this._onFrame) {
      this._onFrame({
        detection: this.currentDetection,
        bufferFill: this.frameBuffer.length / BUFFER_SIZE,
        bufferCount: this.frameBuffer.length,
        bufferSize: BUFFER_SIZE,
        fps: this.fps,
        stability,
        allDetections: detections,
        landmarks,
      });
    }
  }

  /**
   * Extract structured landmarks from MediaPipe results
   */
  _extractLandmarks(results) {
    return {
      pose:      results.poseLandmarks      || null,
      leftHand:  results.leftHandLandmarks  || null,
      rightHand: results.rightHandLandmarks || null,
      face:      results.faceLandmarks      || null,
    };
  }

  /**
   * Run all gesture detectors and return array of { word, confidence }
   */
  _runDetectors(landmarks) {
    const results = [];
    for (const [word, detectFn] of Object.entries(GESTURE_REGISTRY)) {
      try {
        const result = detectFn(landmarks);
        results.push({ word, confidence: result.confidence, detected: result.detected });
      } catch (e) {
        results.push({ word, confidence: 0, detected: false });
      }
    }
    return results;
  }

  /**
   * Find the highest-confidence detection in current frame
   */
  _getBest(detections) {
    let best = null;
    for (const d of detections) {
      if (d.detected && (!best || d.confidence > best.confidence)) {
        best = { word: d.word, confidence: d.confidence };
      }
    }
    return best;
  }

  /**
   * Aggregate the frame buffer: find dominant word and measure stability
   * Returns { word, confidence, stability }
   */
  _aggregateBuffer() {
    if (this.frameBuffer.length === 0) {
      return { word: null, confidence: 0, stability: 0 };
    }

    // Count occurrences of each word in buffer
    const counts = {};
    const confSums = {};
    let total = this.frameBuffer.length;

    for (const frame of this.frameBuffer) {
      if (!frame) continue;
      counts[frame.word]  = (counts[frame.word]  || 0) + 1;
      confSums[frame.word] = (confSums[frame.word] || 0) + frame.confidence;
    }

    // Find dominant word
    let bestWord = null;
    let bestCount = 0;
    for (const [word, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestWord = word;
      }
    }

    if (!bestWord || bestCount < MIN_FRAMES_AGREE) {
      return { word: null, confidence: 0, stability: bestCount / BUFFER_SIZE };
    }

    const avgConf = confSums[bestWord] / bestCount;
    const stability = bestCount / total;

    // Stability check: look at recent STABILITY_WIN frames
    const recent = this.frameBuffer.slice(-STABILITY_WIN);
    const recentMatch = recent.filter(f => f && f.word === bestWord).length;
    const recentStability = recentMatch / Math.min(STABILITY_WIN, recent.length);

    const finalConfidence = avgConf * recentStability;

    return {
      word: bestWord,
      confidence: finalConfidence,
      stability: recentStability,
    };
  }

  onFrame(fn) { this._onFrame = fn; return this; }
  onDetection(fn) { this._onDetection = fn; return this; }

  reset() {
    this.frameBuffer = [];
    this.currentDetection = null;
    this.stabilityScore = 0;
  }
}
