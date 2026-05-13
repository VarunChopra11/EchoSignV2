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

    // Language Toggle
    this.elLangToggle      = document.getElementById('lang-toggle');

    /** Language State */
    this.languages = ['en-US', 'hi-IN', 'fr-FR'];
    this.languageLabels = ['ENG', 'HIN', 'FRA'];
    this.currentLangIndex = 0;

    // Bind toggle click
    if (this.elLangToggle) {
      this.elLangToggle.addEventListener('click', () => this.toggleLanguage());
    }

    /** Dictionary for translations */
    this.dictionary = {
      'hello': { 'en-US': 'hello', 'hi-IN': 'नमस्ते', 'fr-FR': 'bonjour' },
      'mom': { 'en-US': 'mom', 'hi-IN': 'माँ', 'fr-FR': 'maman' },
      'dad': { 'en-US': 'dad', 'hi-IN': 'पिता', 'fr-FR': 'papa' },
      'happy': { 'en-US': 'happy', 'hi-IN': 'खुश', 'fr-FR': 'heureux' },
      'now': { 'en-US': 'now', 'hi-IN': 'अभी', 'fr-FR': 'maintenant' },
      'please': { 'en-US': 'please', 'hi-IN': 'कृपया', 'fr-FR': 's\'il vous plaît' },
      'give': { 'en-US': 'give', 'hi-IN': 'देना', 'fr-FR': 'donner' },
      'milk': { 'en-US': 'milk', 'hi-IN': 'दूध', 'fr-FR': 'lait' },
      'thankyou': { 'en-US': 'thank you', 'hi-IN': 'धन्यवाद', 'fr-FR': 'merci' },
      'yes': { 'en-US': 'yes', 'hi-IN': 'हाँ', 'fr-FR': 'oui' },
      'no': { 'en-US': 'no', 'hi-IN': 'नहीं', 'fr-FR': 'non' },
      'dog': { 'en-US': 'dog', 'hi-IN': 'कुत्ता', 'fr-FR': 'chien' },
      'cat': { 'en-US': 'cat', 'hi-IN': 'बिल्ली', 'fr-FR': 'chat' },
      'drink': { 'en-US': 'drink', 'hi-IN': 'पीना', 'fr-FR': 'boire' },
      'go': { 'en-US': 'go', 'hi-IN': 'जाना', 'fr-FR': 'aller' },
      'outside': { 'en-US': 'outside', 'hi-IN': 'बाहर', 'fr-FR': 'dehors' },
      'boy': { 'en-US': 'boy', 'hi-IN': 'लड़का', 'fr-FR': 'garçon' },
      'girl': { 'en-US': 'girl', 'hi-IN': 'लड़की', 'fr-FR': 'fille' },
      'water': { 'en-US': 'water', 'hi-IN': 'पानी', 'fr-FR': 'eau' },
      'see': { 'en-US': 'see', 'hi-IN': 'देखना', 'fr-FR': 'voir' }
    };

    /** Recent signs history */
    this.recentHistory = [];
    this.lastDetectedWord = null;

    /** TTS */
    this._synth = window.speechSynthesis || null;
    this._speaking = false;
  }

  toggleLanguage() {
    this.currentLangIndex = (this.currentLangIndex + 1) % this.languages.length;
    if (this.elLangToggle) {
      this.elLangToggle.querySelector('.status-label').textContent = this.languageLabels[this.currentLangIndex];
    }
  }

  getTranslatedWord(word) {
    const lang = this.languages[this.currentLangIndex];
    if (this.dictionary[word] && this.dictionary[word][lang]) {
      return this.dictionary[word][lang];
    }
    return word; // fallback
  }

  /**
   * Speak a word aloud via Web Speech API
   */
  _speak(word) {
    if (!this._synth || this._speaking) return;

    const lang = this.languages[this.currentLangIndex];
    const translatedWord = this.getTranslatedWord(word);

    const utterance = new SpeechSynthesisUtterance(translatedWord);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find a specific voice for the language
    const voices = this._synth.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

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
      const displayWord = this.getTranslatedWord(detection.word);
      this.elDetectedSign.textContent = displayWord.toUpperCase();
      this.elDetectedSign.classList.add('active');
      this.elConfidenceValue.textContent = `${confPct}%`;
      this.elConfidenceFill.style.width = `${Math.min(confPct, 100)}%`;

      // Add to recent if new word
      if (detection.word !== this.lastDetectedWord) {
        this.addRecent(detection.word, displayWord, confPct);
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
  addRecent(originalWord, translatedWord, confPct) {
    this.recentHistory.unshift({ word: translatedWord, confPct });
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
