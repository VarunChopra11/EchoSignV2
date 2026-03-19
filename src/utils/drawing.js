/**
 * drawing.js — Canvas overlay for MediaPipe landmark visualization
 *
 * Draws:
 *  - Face mesh (dots, cyan)
 *  - Pose skeleton (purple)
 *  - Left hand skeleton (green)
 *  - Right hand skeleton (amber)
 */

// Hand connections (pairs of landmark indices)
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],   // Thumb
  [0,5],[5,6],[6,7],[7,8],   // Index
  [0,9],[9,10],[10,11],[11,12], // Middle
  [0,13],[13,14],[14,15],[15,16], // Ring
  [0,17],[17,18],[18,19],[19,20], // Pinky
  [5,9],[9,13],[13,17],      // Palm
];

// Pose connections (upper body relevant)
const POSE_CONNECTIONS = [
  [11,12], // Shoulders
  [11,13],[13,15], // Left arm
  [12,14],[14,16], // Right arm
  [11,23],[12,24], // Torso sides
  [23,24],         // Hips
];

export class LandmarkDrawer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Resize canvas to match video element
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw all landmarks from MediaPipe results
   */
  draw(results) {
    this.clear();
    const { width, height } = this.canvas;

    if (results.faceLandmarks) {
      this._drawFace(results.faceLandmarks, width, height);
    }
    if (results.poseLandmarks) {
      this._drawPose(results.poseLandmarks, width, height);
    }
    if (results.leftHandLandmarks) {
      this._drawHand(results.leftHandLandmarks, width, height, 'left');
    }
    if (results.rightHandLandmarks) {
      this._drawHand(results.rightHandLandmarks, width, height, 'right');
    }
  }

  _toCanvas(lm, width, height) {
    // MediaPipe landmarks are 0-1 normalized
    // CSS transform: scaleX(-1) on the canvas handles mirroring,
    // so we draw coordinates as-is (no JS-side mirror needed)
    return {
      x: lm.x * width,
      y: lm.y * height,
    };
  }

  _drawFace(landmarks, width, height) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 229, 204, 0.5)';
    // Draw sparse face dots (every 5th to keep it clean)
    for (let i = 0; i < landmarks.length; i += 5) {
      const pt = this._toCanvas(landmarks[i], width, height);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawPose(landmarks, width, height) {
    const ctx = this.ctx;
    // Draw connections
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
    ctx.lineWidth = 2;
    for (const [a, b] of POSE_CONNECTIONS) {
      const la = landmarks[a], lb = landmarks[b];
      if (!la || !lb || la.visibility < 0.5 || lb.visibility < 0.5) continue;
      const pa = this._toCanvas(la, width, height);
      const pb = this._toCanvas(lb, width, height);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    // Draw dots
    ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (!lm || lm.visibility < 0.5) continue;
      const pt = this._toCanvas(lm, width, height);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawHand(landmarks, width, height, side) {
    const ctx = this.ctx;
    const color = side === 'left'
      ? { line: 'rgba(34, 197, 94, 0.8)', dot: 'rgba(34, 197, 94, 1)' }
      : { line: 'rgba(245, 158, 11, 0.8)', dot: 'rgba(245, 158, 11, 1)' };

    // Draw connections
    ctx.strokeStyle = color.line;
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      const la = landmarks[a], lb = landmarks[b];
      if (!la || !lb) continue;
      const pa = this._toCanvas(la, width, height);
      const pb = this._toCanvas(lb, width, height);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // Draw dots
    ctx.fillStyle = color.dot;
    for (const lm of landmarks) {
      if (!lm) continue;
      const pt = this._toCanvas(lm, width, height);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
