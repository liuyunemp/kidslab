// Shared source. sync.mjs publishes identical, self-contained copies to each course.
export const GENERATOR_VERSION = 1;
export const HISTORY_LIMIT = 10;
export const MAX_ATTEMPTS = 32;

export function uint32(value) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
}

export function seedFrom(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function random(seed) {
  if (!uint32(seed)) throw new RangeError('Expected an unsigned 32-bit seed');
  let value = seed;
  const next = () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let n = Math.imul(value ^ value >>> 15, value | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
  next.int = (min, max) => {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) throw new RangeError('Invalid integer range');
    return min + Math.floor(next() * (max - min + 1));
  };
  next.pick = values => {
    if (!Array.isArray(values) || !values.length) throw new RangeError('Empty choices');
    return values[next.int(0, values.length - 1)];
  };
  next.shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = next.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  return next;
}

export const copy = value => JSON.parse(JSON.stringify(value));

// A canonical representation, not a hash: distinct content cannot collide.
export function fingerprint(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${fingerprint(value[key])}`).join(',')}}`;
}

export function generateRound({ seed, levelId, round = 0, generate, validate, identify = value => value, recent = [], fallback, enumerate, now = () => 0, budgetMs = Infinity }) {
  if (!uint32(seed) || typeof levelId !== 'string' || !levelId || !Number.isSafeInteger(round) || round < 0) throw new TypeError('Invalid round identity');
  const candidates = [];
  const started=now(),expired=()=>now()-started>=budgetMs;
  const accept = instance => {
    if (!validate(instance)) return null;
    const key = fingerprint(identify(instance));
    if (typeof key !== 'string') return null;
    const candidate = { version: GENERATOR_VERSION, seed, levelId, round, instance: copy(instance), fingerprint: key };
    candidates.push(candidate);
    return recent.includes(key) ? null : candidate;
  };
  // Small known families are traversed completely before recycling their oldest member.
  if(enumerate){
    const family=enumerate();
    if(!Array.isArray(family)||family.length>MAX_ATTEMPTS)throw new RangeError('Invalid finite family');
    const rng=random(seedFrom(`${GENERATOR_VERSION}/${seed}/${levelId}/${round}/family`));
    for(const instance of rng.shuffle(family)){
      if(expired())break;
      try{const accepted=accept(instance);if(accepted&&!expired())return accepted;}catch{}
    }
    candidates.sort((a,b)=>recent.indexOf(a.fingerprint)-recent.indexOf(b.fingerprint));
    if(candidates.length)return candidates[0];
    throw new RangeError('No valid finite-family instance');
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if(expired())break;
    const rng = random(seedFrom(`${GENERATOR_VERSION}/${seed}/${levelId}/${round}/${attempt}`));
    try {
      const accepted = accept(generate({ rng, seed, levelId, round, attempt }));
      if (accepted&&!expired()) return accepted;
    } catch { /* Reject this candidate without changing the current round. */ }
  }
  if (fallback) {
    try { const accepted = accept(fallback()); if (accepted) return accepted; } catch { /* A fallback must pass the same validator. */ }
  }
  // Small finite families eventually repeat. Prefer the least recently seen candidate.
  candidates.sort((a, b) => recent.indexOf(a.fingerprint) - recent.indexOf(b.fingerprint));
  if (candidates.length) return candidates[0];
  throw new RangeError('No valid round could be generated');
}

export function remember(recent, key) {
  return [...recent.filter(item => item !== key), key].slice(-HISTORY_LIMIT);
}
