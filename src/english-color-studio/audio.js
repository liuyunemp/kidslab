const BGM_URL = new URL('./audio/lab-glow.ogg', import.meta.url);
const BGM_LEVEL = 0.2;
const DUCK_LEVEL = 0.05;
const MASTER_LEVEL = 0.72;

export function createAudio(courseId) {
  const storageKey = `kidslab.english.${courseId}`;
  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(`${storageKey}.${key}`);
        return value === null ? fallback : value === '1';
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(`${storageKey}.${key}`, value ? '1' : '0'); } catch { /* private mode */ }
    },
  };

  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let bgmBuffer = null;
  let bgmSource = null;
  let loading = null;
  let unlocked = false;
  let musicOn = store.get('music', true);
  let sfxOn = store.get('sfx', true);
  let ducked = false;

  function ensureContext() {
    if (ctx) return true;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try {
      ctx = new Ctor();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 3.4;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.22;
      compressor.connect(ctx.destination);

      master = ctx.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(compressor);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.0001;
      musicGain.connect(master);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxOn ? 0.85 : 0.0001;
      sfxGain.connect(master);
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function loadBgm() {
    if (!ctx) return Promise.resolve(false);
    if (loading) return loading;
    loading = fetch(BGM_URL)
      .then((response) => {
        if (!response.ok) throw new Error('bgm missing');
        return response.arrayBuffer();
      })
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((decoded) => { bgmBuffer = decoded; return true; })
      .catch(() => false);
    return loading;
  }

  function ramp(node, value, seconds = 0.18) {
    if (!ctx || !node) return;
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), now);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0001, value), now + seconds);
  }

  function startBgm() {
    if (!ctx || !bgmBuffer || bgmSource || !musicOn || !unlocked) return;
    const source = ctx.createBufferSource();
    source.buffer = bgmBuffer;
    source.loop = true;
    source.connect(musicGain);
    source.start(ctx.currentTime + 0.03);
    bgmSource = source;
    ramp(musicGain, ducked ? DUCK_LEVEL : BGM_LEVEL, 1.1);
  }

  async function unlock() {
    if (!ensureContext()) return false;
    unlocked = true;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      return false;
    }
    const loaded = await loadBgm();
    if (loaded) startBgm();
    return true;
  }

  function tone({ type = 'sine', from, to = from, at, duration, level }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, from), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(sfxGain);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  function ready() {
    return Boolean(ctx && unlocked && sfxOn && ctx.state === 'running');
  }

  function pick() {
    if (!ready()) return;
    const now = ctx.currentTime;
    tone({ type: 'triangle', from: 520, to: 720, at: now, duration: 0.08, level: 0.05 });
  }

  function place() {
    if (!ready()) return;
    const now = ctx.currentTime;
    tone({ type: 'sine', from: 330, to: 220, at: now, duration: 0.11, level: 0.06 });
    tone({ type: 'triangle', from: 660, to: 880, at: now + 0.06, duration: 0.1, level: 0.045 });
  }

  function paint() {
    if (!ready()) return;
    const now = ctx.currentTime;
    tone({ type: 'sine', from: 420, to: 900, at: now, duration: 0.18, level: 0.05 });
  }

  function success() {
    if (!ready()) return;
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, index) => {
      tone({ type: 'triangle', from: freq, to: freq * 1.01, at: now + index * 0.09, duration: 0.16, level: 0.055 });
    });
  }

  function present() {
    if (!ready()) return;
    const now = ctx.currentTime;
    [392, 523, 659, 784, 1046].forEach((freq, index) => {
      tone({ type: 'sine', from: freq, to: freq, at: now + index * 0.1, duration: 0.26, level: 0.06 });
    });
  }

  function error() {
    if (!ready()) return;
    const now = ctx.currentTime;
    tone({ type: 'square', from: 220, to: 160, at: now, duration: 0.12, level: 0.03 });
  }

  function countNote(index = 0) {
    if (!ready()) return;
    const scale = [523, 587, 659, 698, 784, 880, 988, 1046, 1175, 1319];
    tone({ type: 'triangle', from: scale[index % 10], to: scale[index % 10], at: ctx.currentTime, duration: 0.12, level: 0.05 });
  }

  function setMusic(value) {
    musicOn = Boolean(value);
    store.set('music', musicOn);
    if (!ctx) return;
    if (musicOn) {
      startBgm();
      ramp(musicGain, ducked ? DUCK_LEVEL : BGM_LEVEL, 0.5);
    } else {
      ramp(musicGain, 0.0001, 0.25);
    }
  }

  function setSfx(value) {
    sfxOn = Boolean(value);
    store.set('sfx', sfxOn);
    if (sfxGain) ramp(sfxGain, sfxOn ? 0.85 : 0.0001, 0.12);
  }

  function duck() {
    ducked = true;
    if (ctx && musicOn) ramp(musicGain, DUCK_LEVEL, 0.2);
  }

  function restore() {
    ducked = false;
    if (ctx && musicOn) ramp(musicGain, BGM_LEVEL, 0.35);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') ctx.suspend().catch(() => {});
    } else if (unlocked && (musicOn || sfxOn)) {
      ctx.resume().then(startBgm).catch(() => {});
    }
  });

  return {
    unlock,
    pick, place, paint, success, present, error, countNote,
    duck, restore, setMusic, setSfx,
    get musicOn() { return musicOn; },
    get sfxOn() { return sfxOn; },
  };
}
