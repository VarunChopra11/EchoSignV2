/**
 * gestures.js — Rule-based ASL Gesture Detection
 *
 * Uses MediaPipe Holistic landmark indices:
 *   POSE:  33 landmarks  (see POSE_LANDMARKS below)
 *   HAND:  21 landmarks per hand  (0=wrist, 4=thumb tip, 8=index tip, etc.)
 *   FACE:  468 landmarks
 *
 * Each gesture function receives: { pose, leftHand, rightHand, face }
 * Returns: { detected: bool, confidence: 0-1 }
 *
 * ─────────────────────────────────────────────────────────────
 * GESTURE MAPPING REFERENCE
 * ─────────────────────────────────────────────────────────────
 * hello     — Open hand wave near forehead, palm outward
 * mom       — Open 5 fingers, thumb touches chin
 * dad       — Open 5 fingers, thumb touches forehead
 * happy     — Flat hand circles on chest upward
 * now       — Both hands bend down at wrists, palms up
 * please    — Flat hand circles on chest
 * give      — Both hands open, move forward from body
 * milk      — Squeeze fist motion (open/close hand)
 * thankyou  — Flat hand from chin moves forward
 * yes       — Fist nods (wrist bobs)
 * no        — Index+middle tap thumb repeatedly
 * dog       — Snap fingers (index+thumb pinch) + pat thigh
 * cat       — Pinch near cheek, pull outward (whiskers)
 * drink     — C-hand shape raises to mouth
 * go        — Both index fingers point forward then arc
 * outside   — Flat O hand pulls out of non-dominant hand
 * boy       — Grab brim of hat at forehead
 * girl      — Thumb traces jawline downward
 * water     — W handshape taps lips
 * see       — V-hand (peace) points from eyes outward
 * ─────────────────────────────────────────────────────────────
 */

// ── MediaPipe Hand Landmark Indices ──────────────────────────
export const HAND_LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

// ── MediaPipe Pose Landmark Indices ──────────────────────────
export const POSE_LM = {
  NOSE: 0, LEFT_EYE: 2, RIGHT_EYE: 5,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
};

// ── Utility: Euclidean distance (normalized coords) ───────────
export function dist(a, b) {
  if (!a || !b) return Infinity;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Utility: Is finger extended? ─────────────────────────────
// Returns true if fingertip is further from wrist than PIP joint
export function isFingerExtended(hand, tipIdx, pipIdx, wristIdx = 0) {
  if (!hand) return false;
  const tip = hand[tipIdx];
  const pip = hand[pipIdx];
  const wrist = hand[wristIdx];
  if (!tip || !pip || !wrist) return false;
  return dist(tip, wrist) > dist(pip, wrist);
}

// ── Utility: Is thumb extended? ──────────────────────────────
export function isThumbExtended(hand) {
  if (!hand) return false;
  return dist(hand[HAND_LM.THUMB_TIP], hand[HAND_LM.INDEX_MCP]) >
         dist(hand[HAND_LM.THUMB_IP],  hand[HAND_LM.INDEX_MCP]);
}

// ── Utility: Count extended fingers ──────────────────────────
export function countExtended(hand) {
  if (!hand) return 0;
  let count = 0;
  if (isFingerExtended(hand, HAND_LM.INDEX_TIP,  HAND_LM.INDEX_PIP))  count++;
  if (isFingerExtended(hand, HAND_LM.MIDDLE_TIP, HAND_LM.MIDDLE_PIP)) count++;
  if (isFingerExtended(hand, HAND_LM.RING_TIP,   HAND_LM.RING_PIP))   count++;
  if (isFingerExtended(hand, HAND_LM.PINKY_TIP,  HAND_LM.PINKY_PIP))  count++;
  if (isThumbExtended(hand)) count++;
  return count;
}

// ── Utility: Is fist? ────────────────────────────────────────
export function isFist(hand) {
  if (!hand) return false;
  return countExtended(hand) <= 1;
}

// ── Utility: Is hand open (5 fingers extended)? ──────────────
export function isOpenHand(hand) {
  return countExtended(hand) >= 4;
}

// ── Utility: Is pinch (thumb+index close)? ───────────────────
export function isPinch(hand, threshold = 0.07) {
  if (!hand) return false;
  return dist(hand[HAND_LM.THUMB_TIP], hand[HAND_LM.INDEX_TIP]) < threshold;
}

// ── Utility: Wrist Y relative to shoulder ────────────────────
export function wristAboveShoulder(poseWrist, poseShoulder) {
  if (!poseWrist || !poseShoulder) return false;
  return poseWrist.y < poseShoulder.y;
}

// ── Utility: Hand near face (nose region) ────────────────────
export function handNearFace(hand, pose, side = 'right') {
  if (!hand || !pose) return false;
  const nose = pose[POSE_LM.NOSE];
  const wrist = hand[HAND_LM.WRIST];
  if (!nose || !wrist) return false;
  return dist(wrist, nose) < 0.25;
}

// ── Utility: Hand near forehead ──────────────────────────────
export function handNearForehead(hand, pose) {
  if (!hand || !pose) return false;
  const nose = pose[POSE_LM.NOSE];
  const wrist = hand[HAND_LM.WRIST];
  if (!nose || !wrist) return false;
  // Forehead is above nose by ~0.1 normalized units
  return dist(wrist, { x: nose.x, y: nose.y - 0.12 }) < 0.22;
}

// ── Utility: Hand near chin/mouth ────────────────────────────
export function handNearMouth(hand, pose) {
  if (!hand || !pose) return false;
  const nose = pose[POSE_LM.NOSE];
  const wrist = hand[HAND_LM.WRIST];
  if (!nose || !wrist) return false;
  // Mouth/chin is below nose
  return dist(wrist, { x: nose.x, y: nose.y + 0.08 }) < 0.22;
}

// ── Utility: Hand near chest ─────────────────────────────────
export function handNearChest(hand, pose) {
  if (!hand || !pose) return false;
  const ls = pose[POSE_LM.LEFT_SHOULDER];
  const rs = pose[POSE_LM.RIGHT_SHOULDER];
  if (!ls || !rs) return false;
  const chestX = (ls.x + rs.x) / 2;
  const chestY = (ls.y + rs.y) / 2 + 0.1;
  const wrist = hand[HAND_LM.WRIST];
  return dist(wrist, { x: chestX, y: chestY }) < 0.3;
}

// ── Utility: V-shape (index + middle extended, others curled) ─
export function isVShape(hand) {
  if (!hand) return false;
  const indexExt  = isFingerExtended(hand, HAND_LM.INDEX_TIP,  HAND_LM.INDEX_PIP);
  const middleExt = isFingerExtended(hand, HAND_LM.MIDDLE_TIP, HAND_LM.MIDDLE_PIP);
  const ringCurl  = !isFingerExtended(hand, HAND_LM.RING_TIP,  HAND_LM.RING_PIP);
  const pinkyCurl = !isFingerExtended(hand, HAND_LM.PINKY_TIP, HAND_LM.PINKY_PIP);
  return indexExt && middleExt && ringCurl && pinkyCurl;
}

// ── Utility: W-shape (index + middle + ring extended) ────────
export function isWShape(hand) {
  if (!hand) return false;
  const indexExt  = isFingerExtended(hand, HAND_LM.INDEX_TIP,  HAND_LM.INDEX_PIP);
  const middleExt = isFingerExtended(hand, HAND_LM.MIDDLE_TIP, HAND_LM.MIDDLE_PIP);
  const ringExt   = isFingerExtended(hand, HAND_LM.RING_TIP,   HAND_LM.RING_PIP);
  const pinkyCurl = !isFingerExtended(hand, HAND_LM.PINKY_TIP, HAND_LM.PINKY_PIP);
  return indexExt && middleExt && ringExt && pinkyCurl;
}

// ── Utility: Index only extended ─────────────────────────────
export function isIndexOnly(hand) {
  if (!hand) return false;
  const indexExt  = isFingerExtended(hand, HAND_LM.INDEX_TIP,  HAND_LM.INDEX_PIP);
  const middleCurl = !isFingerExtended(hand, HAND_LM.MIDDLE_TIP, HAND_LM.MIDDLE_PIP);
  const ringCurl   = !isFingerExtended(hand, HAND_LM.RING_TIP,   HAND_LM.RING_PIP);
  const pinkyCurl  = !isFingerExtended(hand, HAND_LM.PINKY_TIP,  HAND_LM.PINKY_PIP);
  return indexExt && middleCurl && ringCurl && pinkyCurl;
}

// ─────────────────────────────────────────────────────────────
// GESTURE DEFINITIONS
// Each returns { detected: bool, confidence: 0-1 }
// ─────────────────────────────────────────────────────────────

/**
 * HELLO — Open hand (5 fingers) raised near forehead, palm out
 * Condition: dominant hand open, wrist near forehead level, above shoulder
 */
export function detectHello({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const open = isOpenHand(hand);
  const nearForehead = handNearForehead(hand, pose);
  const aboveShoulder = wristAboveShoulder(
    hand[HAND_LM.WRIST],
    pose[POSE_LM.RIGHT_SHOULDER] || pose[POSE_LM.LEFT_SHOULDER]
  );

  const score = [open, nearForehead, aboveShoulder].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * MOM — Open hand, thumb tip touches chin
 * Condition: open hand, thumb near mouth/chin area
 */
export function detectMom({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const open = isOpenHand(hand);
  const thumbNearChin = handNearMouth(hand, pose) &&
    dist(hand[HAND_LM.THUMB_TIP], hand[HAND_LM.WRIST]) > 0.08;
  const thumbBelow = hand[HAND_LM.THUMB_TIP].y > hand[HAND_LM.INDEX_MCP].y;

  const score = [open, thumbNearChin, thumbBelow].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * DAD — Open hand, thumb tip touches forehead
 * Condition: open hand, wrist near forehead, thumb tip high
 */
export function detectDad({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const open = isOpenHand(hand);
  const nearForehead = handNearForehead(hand, pose);
  const thumbHigh = hand[HAND_LM.THUMB_TIP].y < hand[HAND_LM.WRIST].y;

  const score = [open, nearForehead, thumbHigh].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * HAPPY — Flat hand brushes upward on chest (B-hand)
 * Condition: open hand near chest, fingers pointing up (low y values for tips)
 */
export function detectHappy({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const open = isOpenHand(hand);
  const nearChest = handNearChest(hand, pose);
  // Fingers pointing upward: tip y < wrist y
  const fingersUp = hand[HAND_LM.MIDDLE_TIP].y < hand[HAND_LM.WRIST].y;

  const score = [open, nearChest, fingersUp].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * NOW — Both hands bent down, palms up, at waist level
 * Condition: both hands present, below shoulder line, wrists bent (tips below wrist)
 */
export function detectNow({ pose, rightHand, leftHand }) {
  if (!rightHand || !leftHand || !pose) return { detected: false, confidence: 0 };

  const ls = pose[POSE_LM.LEFT_SHOULDER];
  const rs = pose[POSE_LM.RIGHT_SHOULDER];
  if (!ls || !rs) return { detected: false, confidence: 0 };
  const shoulderY = (ls.y + rs.y) / 2;

  const rWristBelow = rightHand[HAND_LM.WRIST].y > shoulderY;
  const lWristBelow = leftHand[HAND_LM.WRIST].y > shoulderY;
  // Bent: tips near same level as or below wrist
  const rBent = Math.abs(rightHand[HAND_LM.MIDDLE_TIP].y - rightHand[HAND_LM.WRIST].y) < 0.1;
  const lBent = Math.abs(leftHand[HAND_LM.MIDDLE_TIP].y - leftHand[HAND_LM.WRIST].y) < 0.1;

  const score = [rWristBelow, lWristBelow, rBent, lBent].filter(Boolean).length / 4;
  return { detected: score >= 0.75, confidence: score };
}

/**
 * PLEASE — Flat hand circles on chest, palm facing body
 * Condition: open hand near chest
 */
export function detectPlease({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const open = isOpenHand(hand);
  const nearChest = handNearChest(hand, pose);
  // Palm facing in: thumb side toward body (thumb x > other fingers x for right hand)
  const thumbInward = hand[HAND_LM.THUMB_TIP].x < hand[HAND_LM.PINKY_TIP].x;

  const score = [open, nearChest, thumbInward].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * GIVE — Both hands open, extended forward from body
 * Condition: both hands open, both wrists below shoulders, hands extended forward
 */
export function detectGive({ pose, rightHand, leftHand }) {
  if (!rightHand || !leftHand || !pose) return { detected: false, confidence: 0 };

  const rOpen = isOpenHand(rightHand);
  const lOpen = isOpenHand(leftHand);
  // Hands should be at mid-body level
  const ls = pose[POSE_LM.LEFT_SHOULDER];
  const rs = pose[POSE_LM.RIGHT_SHOULDER];
  if (!ls || !rs) return { detected: false, confidence: 0 };
  const shoulderY = (ls.y + rs.y) / 2;
  const rMid = rightHand[HAND_LM.WRIST].y > shoulderY - 0.05;
  const lMid = leftHand[HAND_LM.WRIST].y > shoulderY - 0.05;

  const score = [rOpen, lOpen, rMid, lMid].filter(Boolean).length / 4;
  return { detected: score >= 0.75, confidence: score };
}

/**
 * MILK — Squeeze hand repeatedly (open/close fist motion)
 * Condition: hand at mid-level, partially closed (2-3 fingers extended)
 */
export function detectMilk({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const extCount = countExtended(hand);
  // Milking gesture: partially open hand (2-4 fingers)
  const partialOpen = extCount >= 2 && extCount <= 4;
  const ls = pose[POSE_LM.LEFT_SHOULDER];
  const rs = pose[POSE_LM.RIGHT_SHOULDER];
  if (!ls || !rs) return { detected: false, confidence: 0 };
  const midY = (ls.y + rs.y) / 2 + 0.1;
  const handMid = Math.abs(hand[HAND_LM.WRIST].y - midY) < 0.2;

  const score = [partialOpen, handMid].filter(Boolean).length / 2;
  return { detected: score >= 0.5, confidence: score };
}

/**
 * THANK YOU — Flat hand (B-hand) from chin moves outward/forward
 * Condition: open hand near face/chin, fingers pointing outward
 */
export function detectThankyou({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const open = isOpenHand(hand);
  const nearFace = handNearFace(hand, pose);
  const nearMouth = handNearMouth(hand, pose);
  // Fingers pointing somewhat outward from face (tips further from center than wrist)
  const nose = pose[POSE_LM.NOSE];
  const tipsForward = nose && dist(hand[HAND_LM.MIDDLE_TIP], nose) > dist(hand[HAND_LM.WRIST], nose);

  const score = [open, nearFace || nearMouth, tipsForward].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * YES — Fist nods (S-hand)
 * Condition: fist (all fingers curled), wrist near face level
 */
export function detectYes({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const fist = isFist(hand);
  // Near or slightly below face level
  const nose = pose[POSE_LM.NOSE];
  const wrist = hand[HAND_LM.WRIST];
  const nearFaceLevel = nose && Math.abs(wrist.y - nose.y) < 0.25 && wrist.y < nose.y + 0.3;

  const score = [fist, nearFaceLevel].filter(Boolean).length / 2;
  return { detected: score >= 0.5, confidence: score };
}

/**
 * NO — Index finger and middle finger tap thumb
 * Condition: index + middle extended then close to thumb, thumb extended
 */
export function detectNo({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const indexExt  = isFingerExtended(hand, HAND_LM.INDEX_TIP, HAND_LM.INDEX_PIP);
  const middleExt = isFingerExtended(hand, HAND_LM.MIDDLE_TIP, HAND_LM.MIDDLE_PIP);
  const thumbExt  = isThumbExtended(hand);
  // Ring and pinky curled
  const ringCurl  = !isFingerExtended(hand, HAND_LM.RING_TIP, HAND_LM.RING_PIP);
  const pinkyCurl = !isFingerExtended(hand, HAND_LM.PINKY_TIP, HAND_LM.PINKY_PIP);
  // Index and middle near thumb
  const indexNearThumb = dist(hand[HAND_LM.INDEX_TIP], hand[HAND_LM.THUMB_TIP]) < 0.1;

  const score = [indexExt, middleExt, thumbExt, ringCurl, pinkyCurl, indexNearThumb]
    .filter(Boolean).length / 6;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * DOG — Snap fingers: pinch index+thumb, hand at side
 * Condition: pinch pose, hand at mid-body level, slightly to side
 */
export function detectDog({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const pinch = isPinch(hand, 0.08);
  const ls = pose[POSE_LM.LEFT_SHOULDER];
  const rs = pose[POSE_LM.RIGHT_SHOULDER];
  if (!ls || !rs) return { detected: false, confidence: 0 };
  const midY = (ls.y + rs.y) / 2;
  const handMid = hand[HAND_LM.WRIST].y > midY && hand[HAND_LM.WRIST].y < midY + 0.3;

  const score = [pinch, handMid].filter(Boolean).length / 2;
  return { detected: score >= 0.5, confidence: score };
}

/**
 * CAT — Pinch near cheek, pull outward (whiskers)
 * Condition: pinch, hand near cheek/face side
 */
export function detectCat({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const pinch = isPinch(hand, 0.09);
  const nearFace = handNearFace(hand, pose);
  // Hand at cheek level: near nose y but to the side
  const nose = pose[POSE_LM.NOSE];
  const atCheekLevel = nose && Math.abs(hand[HAND_LM.WRIST].y - nose.y) < 0.15;

  const score = [pinch, nearFace, atCheekLevel].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * DRINK — C-hand shape raises toward mouth
 * Condition: curved hand (C-shape), wrist below then near mouth
 * C-shape: all fingers slightly curled, thumb extended
 */
export function detectDrink({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  // C-shape: partially curled, 1-3 fingers extended
  const extCount = countExtended(hand);
  const cShape = extCount >= 1 && extCount <= 3;
  const nearMouth = handNearMouth(hand, pose) || handNearFace(hand, pose);
  const thumbOut = isThumbExtended(hand);

  const score = [cShape, nearMouth, thumbOut].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * GO — Both index fingers point, arc forward
 * Condition: both hands with index only extended, pointing outward
 */
export function detectGo({ pose, rightHand, leftHand }) {
  if (!rightHand || !leftHand) return { detected: false, confidence: 0 };

  const rIndex = isIndexOnly(rightHand);
  const lIndex = isIndexOnly(leftHand);
  // Both pointing: tips should be far from each other (pointing outward)
  const handsDiverge = dist(rightHand[HAND_LM.INDEX_TIP], leftHand[HAND_LM.INDEX_TIP]) > 0.25;

  const score = [rIndex, lIndex, handsDiverge].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * OUTSIDE — Flat O-hand pulls out
 * Condition: fingers bunched (O-shape), hand moves out from body
 * O-shape: all fingertips close together, near thumb
 */
export function detectOutside({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  // O-shape: all fingertips clustered (small spread)
  const tipSpread = dist(hand[HAND_LM.INDEX_TIP], hand[HAND_LM.PINKY_TIP]);
  const oShape = tipSpread < 0.1;
  // Near mid-body
  const ls = pose[POSE_LM.LEFT_SHOULDER];
  const rs = pose[POSE_LM.RIGHT_SHOULDER];
  if (!ls || !rs) return { detected: false, confidence: 0 };
  const midY = (ls.y + rs.y) / 2;
  const atMid = Math.abs(hand[HAND_LM.WRIST].y - midY) < 0.25;

  const score = [oShape, atMid].filter(Boolean).length / 2;
  return { detected: score >= 0.5, confidence: score };
}

/**
 * BOY — Grab brim at forehead (open-close near forehead)
 * Condition: pinch or partial open hand near forehead
 */
export function detectBoy({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const nearForehead = handNearForehead(hand, pose);
  const pinchOrPartial = isPinch(hand, 0.1) || (countExtended(hand) >= 2 && countExtended(hand) <= 4);

  const score = [nearForehead, pinchOrPartial].filter(Boolean).length / 2;
  return { detected: score >= 0.5, confidence: score };
}

/**
 * GIRL — Thumb traces jawline (A-hand thumb along jaw)
 * Condition: fist with thumb extended, near cheek/jaw
 */
export function detectGirl({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  // A-shape: fist + thumb out
  const fist = isFist(hand);
  const thumbOut = isThumbExtended(hand);
  // Near face (jaw level = nose y + some offset)
  const nearFace = handNearFace(hand, pose);
  const nose = pose[POSE_LM.NOSE];
  const atJawLevel = nose && hand[HAND_LM.WRIST].y > nose.y && hand[HAND_LM.WRIST].y < nose.y + 0.2;

  const score = [fist, thumbOut, nearFace || atJawLevel].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

/**
 * WATER — W-handshape taps lips (index+middle+ring extended)
 * Condition: W-shape (3 fingers), hand near mouth
 */
export function detectWater({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const wShape = isWShape(hand);
  const nearMouth = handNearMouth(hand, pose) || handNearFace(hand, pose);

  const score = [wShape, nearMouth].filter(Boolean).length / 2;
  return { detected: score >= 0.5, confidence: score };
}

/**
 * SEE — V-hand (peace sign) points from eyes outward
 * Condition: V-shape, hand near eye level, pointing forward/outward
 */
export function detectSee({ pose, rightHand, leftHand }) {
  const hand = rightHand || leftHand;
  if (!hand || !pose) return { detected: false, confidence: 0 };

  const vShape = isVShape(hand);
  // Near eye level (above nose slightly)
  const nose = pose[POSE_LM.NOSE];
  const wrist = hand[HAND_LM.WRIST];
  const atEyeLevel = nose && Math.abs(wrist.y - (nose.y - 0.07)) < 0.18;
  // Tips pointing away from face (tips further from nose than wrist)
  const tipsAway = nose && dist(hand[HAND_LM.INDEX_TIP], nose) > dist(wrist, nose) - 0.02;

  const score = [vShape, atEyeLevel, tipsAway].filter(Boolean).length / 3;
  return { detected: score >= 0.67, confidence: score };
}

// ─────────────────────────────────────────────────────────────
// GESTURE REGISTRY — maps word name → detector function
// ─────────────────────────────────────────────────────────────
export const GESTURE_REGISTRY = {
  hello:    detectHello,
  mom:      detectMom,
  dad:      detectDad,
  happy:    detectHappy,
  now:      detectNow,
  please:   detectPlease,
  give:     detectGive,
  milk:     detectMilk,
  thankyou: detectThankyou,
  yes:      detectYes,
  no:       detectNo,
  dog:      detectDog,
  cat:      detectCat,
  drink:    detectDrink,
  go:       detectGo,
  outside:  detectOutside,
  boy:      detectBoy,
  girl:     detectGirl,
  water:    detectWater,
  see:      detectSee,
};

// Word IDs from requirements
export const WORD_IDS = {
  hello: 113, mom: 145, dad: 55, happy: 105, now: 157,
  please: 173, give: 95, milk: 142, thankyou: 214, yes: 244,
  no: 153, dog: 58, cat: 38, drink: 63, go: 97,
  outside: 163, boy: 29, girl: 94, water: 234, see: 193
};
