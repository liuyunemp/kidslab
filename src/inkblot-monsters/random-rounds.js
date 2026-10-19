import { GENERATOR_VERSION, copy, fingerprint, generateRound, remember, uint32 } from './random-core.js';
import {runRoundWorker} from './random-worker-client.js';

export function freshSeed() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; }
  catch { return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0; }
}

export function urlSeed(search = location.search) {
  const value = new URLSearchParams(search).get('seed');
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  const seed = Number(value);
  return uint32(seed) ? seed : null;
}

// Owns question snapshots only. Existing course progress remains in its original key.
export function createRounds(id) {
  const explicitSeed = urlSeed();
  const key = `kidslab.random.v1.${id}${explicitSeed === null ? '' : `.seed-${explicitSeed}`}`;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* Optional storage. */ }
  if (!saved || saved.version !== GENERATOR_VERSION || !uint32(saved.seed) || !saved.levels || typeof saved.levels !== 'object' || Array.isArray(saved.levels)) {
    saved = { version: GENERATOR_VERSION, seed: explicitSeed ?? freshSeed(), levels: {}, active: null };
  }
  const definitions = new Map();
  let leaving = false;
  let hooks = null;
  let ui = null;
  let generating=false;
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Keep working in memory. */ } };
  const definition = level => {
    const value = definitions.get(String(level));
    if (!value) throw new RangeError('Unknown round');
    return value;
  };
  const create = (level, ordinal, recent = []) => {
    const d = definition(level);
    return generateRound({ seed: saved.seed, levelId: String(level), round: ordinal, recent,
      generate: context => d.generate(copy(d.base), context.rng, context),
      validate: value => d.validate(value, d.base), identify: d.identify, fallback: () => copy(d.base),enumerate:d.enumerate?()=>d.enumerate(copy(d.base)):undefined });
  };
  const valid = (entry, d) => {
    try {
      return entry && entry.version === GENERATOR_VERSION && entry.seed === saved.seed && Number.isSafeInteger(entry.round) && entry.round >= 0 &&
        ['random','classic'].includes(entry.mode) && d.validate(entry.instance, d.base) &&
        entry.fingerprint === fingerprint(d.identify(entry.instance));
    } catch { return false; }
  };
  const createAsync=async(level,ordinal,recent=[])=>{
    const d=definition(level);
    if(!d.worker)return create(level,ordinal,recent);
    const request={seed:saved.seed,levelId:String(level),round:ordinal,recent};
    return runRoundWorker({payload:{...d.worker,base:copy(d.base),request},
      fallback:()=>({...request,version:GENERATOR_VERSION,instance:copy(d.base),fingerprint:fingerprint(d.identify(d.base))}),
      validate:record=>record?.levelId===String(level)&&record.round===ordinal&&valid({...record,mode:'random'},d)});
  };
  const api = {
    get seed() { return saved.seed; },
    get explicitSeed() { return explicitSeed; },
    get active() { return saved.active; },
    get hasSnapshot() { return Object.keys(saved.levels).length > 0; },
    prepare(bases, generate, validate, identify = value => value) {
      return bases.map((base, index) => api.define(base.id ?? index, base, generate, validate, identify));
    },
    define(level, base, generate, validate, identify = value => value, enumerate) {
      level = String(level);
      const d = { base: copy(base), generate, validate, identify, enumerate };
      definitions.set(level, d);
      if (!valid(saved.levels[level], d)) {
        const record = create(level, 0);
        saved.levels[level] = { ...record, mode: 'random', recent: [record.fingerprint], play: null };
      }
      persist();
      return copy(saved.levels[level].instance);
    },
    async defineAsync(level,base,generate,validate,identify,worker){
      level=String(level);
      const d={base:copy(base),generate,validate,identify:identify??(a=>a),worker};definitions.set(level,d);
      if(!valid(saved.levels[level],d)){
        const record=await createAsync(level,0);
        saved.levels[level]={...record,mode:'random',recent:[record.fingerprint],play:null};
      }
      persist();return copy(saved.levels[level].instance);
    },
    record(level) { return copy(saved.levels[String(level)] ?? null); },
    adopt(level, instance, play) {
      level=String(level);
      const d=definition(level);
      if(!d.validate(instance,d.base))throw new RangeError('Invalid legacy instance');
      const entry=saved.levels[level], key=fingerprint(d.identify(instance));
      saved.levels[level]={...entry,instance:copy(instance),fingerprint:key,recent:remember(entry.recent??[],key),play:copy(play)};
      saved.active=level;persist();
    },
    checkpoint() {
      if (leaving || !hooks) return;
      const level = String(hooks.active());
      if (!saved.levels[level]) return;
      try { saved.levels[level].play = copy(hooks.capture()); saved.active = level; persist(); } catch { /* Transient animation state is not a checkpoint. */ }
    },
    next(level, classic = false) {
      level = String(level);
      const previous = saved.levels[level], d = definition(level);
      if(d.worker&&!classic)throw new Error('Use nextAsync for worker generation');
      // Generate and validate first, then publish a complete new snapshot.
      const next = classic
        ? { version: GENERATOR_VERSION, seed: saved.seed, levelId: level, round: previous.round, instance: copy(d.base), fingerprint: fingerprint(d.identify(d.base)) }
        : create(level, previous.round + 1, previous.recent ?? []);
      if (!d.validate(next.instance, d.base)) throw new RangeError('Invalid round');
      saved.levels[level] = { ...next, mode: classic ? 'classic' : 'random', recent: remember(previous.recent ?? [], next.fingerprint), play: null };
      saved.active = level;
      persist();
      return copy(next.instance);
    },
    async nextAsync(level,classic=false){
      level=String(level);
      if(classic||!definition(level).worker)return api.next(level,classic);
      const previous=saved.levels[level],record=await createAsync(level,previous.round+1,previous.recent??[]);
      saved.levels[level]={...record,mode:'random',recent:remember(previous.recent??[],record.fingerprint),play:null};
      saved.active=level;persist();return copy(record.instance);
    },
    attach(options) {
      hooks = options;
      const level = String(hooks.active()), entry = saved.levels[level];
      if (entry?.play != null) {
        try { hooks.restore(copy(entry.play)); } catch { hooks.retry(); }
      }
      api.checkpoint();
      const lang = () => document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
      ui = document.createElement('div');
      ui.className = 'random-round-tools';
      ui.innerHTML = '<button type="button" data-round-action="new"></button><button type="button" data-round-action="retry"></button><button type="button" data-round-action="classic"></button><span role="status" hidden></span>';
      const style = document.createElement('style');
      style.textContent = '.random-round-tools{display:flex;flex-wrap:wrap;gap:6px;max-width:100%;margin:8px 0;background:var(--card,var(--panel-bg,var(--panel,var(--paper,Canvas))));color:var(--ink,CanvasText)}.random-round-tools button{font:inherit;font-size:16px;line-height:1.4;min-height:44px;min-width:44px;flex:1 1 80px;padding:6px;border:1px solid currentColor;border-radius:10px;color:inherit;background:inherit;cursor:pointer}.random-round-tools span{flex:1 0 100%;font-size:16px}';
      ui.append(style);
      const parent = typeof hooks.parent === 'string' ? document.querySelector(hooks.parent) : hooks.parent;
      if (!parent) throw new Error(`Missing round controls container: ${id}`);
      let container=ui,summary=null;
      if(hooks.compact){
        container=document.createElement('details');container.className='random-round-menu';
        summary=document.createElement('summary');container.append(summary,ui);
        style.textContent+='.random-round-menu{position:relative;min-width:44px}.random-round-menu summary{cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:center;font-size:16px;border:1px solid currentColor;border-radius:10px;padding:0 8px}.random-round-menu>.random-round-tools{position:fixed;right:12px;bottom:12px;left:12px;z-index:50;max-width:calc(100vw - 24px);padding:8px;border:2px solid currentColor;border-radius:12px;box-shadow:0 5px 20px #0004}.random-round-menu:not([open])>.random-round-tools{display:none}';
      }
      parent.append(container);
      // A completed-round dialog must retain access to retry and new-round actions.
      const dialog = hooks.dialog && document.querySelector(hooks.dialog);
      const place = () => {
        const destination = dialog && !dialog.hidden ? ([...dialog.children].find(child=>!['CANVAS','SVG','STYLE','SCRIPT'].includes(child.tagName)) || dialog) : parent;
        if (container.parentElement !== destination) destination.append(container);
      };
      if (dialog) new MutationObserver(place).observe(dialog, { attributes: true, attributeFilter: ['hidden'] });
      place();
      const renderLabels = () => {
        const labels = lang() === 'zh' ? ['新一局','重试','经典示例'] : ['New round','Retry','Classic'];
        if(summary)summary.textContent=lang()==='zh'?'本局':'Round';
        ui.querySelectorAll('button').forEach((button, index) => { button.textContent = labels[index]; });
      };
      renderLabels();
      new MutationObserver(renderLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      window.cool?.preferences?.subscribe(renderLabels);
      ui.addEventListener('click', async event => {
        const action = event.target.closest('[data-round-action]')?.dataset.roundAction;
        if (!action||generating) return;
        generating=true;
        ui.querySelectorAll('button').forEach(button=>{button.disabled=true;});
        const current = String(hooks.active());
        try {
          if (action === 'retry') {
            saved.levels[current].play=null;saved.active=current;persist();
            hooks.beforeReload?.();leaving=true;location.reload();return;
          }
          api.checkpoint();
          await api.nextAsync(current, action === 'classic');
          hooks.beforeReload?.();
          leaving = true;
          location.reload();
        } catch {
          const status = ui.querySelector('[role=status]');
          status.hidden = false;
          status.textContent = lang() === 'zh' ? '这一局还在，可以继续玩。' : 'Your current round is safe. Keep playing.';
          generating=false;ui.querySelectorAll('button').forEach(button=>{button.disabled=false;});
        }
      });
      for (const name of ['click','input','change','pointerup','keyup']) document.addEventListener(name, () => queueMicrotask(api.checkpoint));
      addEventListener('pagehide', api.checkpoint);
      document.addEventListener('visibilitychange', () => { if (document.hidden) api.checkpoint(); });
    },
  };
  return api;
}
