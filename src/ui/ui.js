/**
 * ui.js — UI State Controller
 *
 * Manages all DOM updates for the detection panel,
 * status indicators, recent signs history, and frame buffer display.
 */

const MAX_RECENT = 6;

export class UIController {
  constructor() {
    // Elements
    this.elDetectedSign    = document.getElementById('detected-sign');
    this.elConfidenceValue = document.getElementById('confidence-value');
    this.elConfidenceFill  = document.getElementById('confidence-fill');
    this.elBufferValue     = document.getElementById('buffer-value');
    this.elBufferFill      = document.getElementById('buffer-fill');
    this.elStabilityValue  = document.getElementById('stability-value');
    this.elStabilityFill   = document.getElementById('stability-fill');
    this.elRecentSigns     = document.getElementById('recent-signs');
    this.elFpsValue        = document.getElementById('fps-value');
    this.elStatusError     = document.getElementById('status-error');
    this.elStatusCam       = document.getElementById('status-cam');
    this.elFrameInfo       = document.getElementById('frame-info');
    this.elFrameBar        = document.getElementById('frame-bar');
    this.elFrameLabel      = document.getElementById('frame-label');
    this.elDemoBanner      = document.getElementById('demo-banner');
    this.elDemoText        = document.getElementById('demo-text');
    this.elCameraOverlay   = document.getElementById('camera-overlay');
    this.elVideo           = document.getElementById('input-video');

    /** Recent signs history */
    this.recentHistory = [];
    this.lastDetectedWord = null;

    /** TTS */
    this._synth = window.speechSynthesis || null;
    this._speaking = false;
  }

  /**
   * Speak a word aloud via Web Speech API
   */
  _speak(word) {
    if (!this._synth || this._speaking) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    this._speaking = true;
    utterance.onend = () => { this._speaking = false; };
    utterance.onerror = () => { this._speaking = false; };
    this._synth.speak(utterance);
  }

  /**
   * Update all panel values from a frame event
   */
  updateFrame({ detection, bufferFill, bufferCount, bufferSize, fps, stability }) {
    // FPS
    this.elFpsValue.textContent = `${fps} FPS`;

    // Buffer
    const pct = Math.round(bufferFill * 100);
    this.elBufferValue.textContent = `${bufferCount}/${bufferSize}`;
    this.elBufferFill.style.width = `${pct}%`;
    this.elFrameLabel.textContent = `COLLECTING FRAMES  ${bufferCount}/${bufferSize}`;
    this.elFrameBar.style.width = `${pct}%`;

    // Stability
    const stabPct = Math.round((stability || 0) * 100);
    this.elStabilityValue.textContent = `${stabPct}%`;
    this.elStabilityFill.style.width = `${stabPct}%`;

    // Detection
    if (detection) {
      const confPct = Math.round(detection.confidence * 100);
      this.elDetectedSign.textContent = detection.word.toUpperCase();
      this.elDetectedSign.classList.add('active');
      this.elConfidenceValue.textContent = `${confPct}%`;
      this.elConfidenceFill.style.width = `${Math.min(confPct, 100)}%`;

      // Add to recent if new word
      if (detection.word !== this.lastDetectedWord) {
        this.addRecent(detection.word, confPct);
        this._speak(detection.word);
        this.lastDetectedWord = detection.word;
      }
    } else {
      if (bufferFill < 0.3) {
        this.elDetectedSign.textContent = 'BUFFERING...';
      } else {
        this.elDetectedSign.textContent = '—';
      }
      this.elDetectedSign.classList.remove('active');
      this.elConfidenceValue.textContent = '—';
      this.elConfidenceFill.style.width = '0%';
      this.lastDetectedWord = null;
    }
  }

  /**
   * Add entry to recent signs history
   */
  addRecent(word, confPct) {
    this.recentHistory.unshift({ word, confPct });
    if (this.recentHistory.length > MAX_RECENT) {
      this.recentHistory.pop();
    }
    this._renderRecent();
  }

  _renderRecent() {
    if (this.recentHistory.length === 0) {
      this.elRecentSigns.innerHTML = '<div class="recent-empty">No signs detected yet</div>';
      return;
    }
    this.elRecentSigns.innerHTML = this.recentHistory.map((item, i) => `
      <div class="recent-item" style="opacity: ${1 - i * 0.15}">
        <span class="recent-word">${item.word}</span>
        <span class="recent-conf">${item.confPct}%</span>
      </div>
    `).join('');
  }

  /**
   * Set error state
   */
  setError(hasError) {
    const dot = this.elStatusError.querySelector('.status-dot');
    if (hasError) {
      dot.className = 'status-dot error';
    } else {
      dot.className = 'status-dot off';
    }
  }

  /**
   * Set camera active state
   */
  setCameraActive(active) {
    if (active) {
      this.elCameraOverlay.classList.add('hidden');
      this.elVideo.classList.add('active');
      this.elFrameInfo.style.display = 'flex';
      this.elDemoText.textContent = 'LIVE — Camera active, real-time detection running';
      this.setError(false);
    } else {
      this.elCameraOverlay.classList.remove('hidden');
      this.elVideo.classList.remove('active');
    }
  }

  /**
   * Set error message in demo banner
   */
  setDemoError(msg) {
    this.elDemoText.textContent = msg;
    this.setError(true);
  }
}
