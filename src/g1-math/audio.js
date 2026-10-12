// Web Audio 合成音效与 BGM —— 无二进制资源、无 CDN；AudioContext 创建失败静默降级。
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  _ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
    if (m) this.stopBgm();
    else this.startBgm();
  }

  _blip(freq, dur, type = 'sine', gain = 0.3, when = 0) {
    if (!this._ensure()) return;
    this.resume();
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  tap() { this._blip(440, 0.07, 'triangle', 0.22); }
  hover() { this._blip(620, 0.05, 'sine', 0.12); }
  correct() { this._blip(660, 0.12, 'sine', 0.3); this._blip(880, 0.16, 'sine', 0.3, 0.1); }
  wrong() { this._blip(240, 0.2, 'sine', 0.22); }
  star() { this._blip(990, 0.1, 'triangle', 0.3); this._blip(1320, 0.14, 'triangle', 0.3, 0.08); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this._blip(f, 0.22, 'sine', 0.32, i * 0.13)); }

  startBgm() {
    if (this.muted || !this._ensure()) return;
    if (this.bgmTimer) return;
    // 简单的糖果色旋律循环（C 大调五声）
    const notes = [523, 587, 659, 587, 659, 784, 659, 587];
    const step = () => {
      if (this.muted) return;
      const f = notes[this.bgmStep % notes.length];
      this._blip(f, 0.34, 'sine', 0.05);
      this.bgmStep++;
    };
    step();
    this.bgmTimer = setInterval(step, 430);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
