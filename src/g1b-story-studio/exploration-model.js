// Pure transactional models shared as local copies by the 17 standalone courses.
export const VERSION = 2;
const clone = value => JSON.parse(JSON.stringify(value));
const integer = (n, min = 0, max = 100) => Number.isInteger(n) && n >= min && n <= max;
export const text = (pair, lang = 'zh') => typeof pair === 'string' ? pair : pair?.[lang] ?? pair?.zh ?? '';
export function current(course, state) { return course.activities[state.active]; }
export function valueOf(room) { return room.tens * 10 + room.ones; }
export function moneyValue(coins) { return Object.entries(coins).reduce((n, [v, count]) => n + Number(v) * count, 0); }
export const DENOMINATIONS = [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 2, 1];
export const EXCHANGES = {10000:[1000,10],5000:[1000,5],2000:[1000,2],1000:[100,10],500:[100,5],100:[10,10],50:[10,5],10:[1,10],5:[1,5],2:[1,2]};
export function coinsFor(value) {
  if (!integer(value, 0, 10000)) throw new RangeError('Money must be integer fen');
  const result = {};
  for (const coin of DENOMINATIONS) { result[coin] = Math.floor(value / coin); value %= coin; }
  return result;
}
export function roomFor(course, activity) {
  return {
    a: activity.a ?? 0, b: activity.b ?? 0, c: activity.c ?? 0,
    tens: Math.floor((activity.a ?? 0) / 10), ones: (activity.a ?? 0) % 10,
    phase: 0, aligned: false, moved: 0, exchanged: 0, views: [], removed: 0,
    variant: 0, assembled: false, seen: [], placed: false,
    stroke: 0, ink: [], initial: '', syllable: '', entry: '',
    slots: [null, null, null], punctuation: '。', line: 0,
    order: [2, 0, 1], played: false, evidence: false, included: [],
    positions: (activity.pieces ?? []).map((_, i) => ({ x: -3.6 + i * 1.8, z: 1.8 })),
    rotations: (activity.pieces ?? []).map(() => 0), placedPieces: [], turned: false,
    wallet: coinsFor(activity.budget ?? 0), tray: coinsFor(0), spent: 0,
    price: activity.price ?? 0, budget: activity.budget ?? 0, layout: false,
  };
}
export function initialState(course) {
  return { version: VERSION, courseId: course.id, active: 0, free: false, done: [],
    rooms: course.activities.map(a => roomFor(course, a)), histories: course.activities.map(() => []), log: [] };
}
export function speechText(course, state, lang = 'zh') {
  const a = current(course, state);
  // Never include computed output, reference sequence, dictionary answer or completed poem lines.
  return `${text(a.title, lang)}。${text(a.invite, lang)}`;
}
export function columnValues(a, b, op) {
  if (!integer(a) || !integer(b) || !['+', '-'].includes(op) || !integer(op === '+' ? a + b : a - b)) return null;
  return { tens: Math.floor(a / 10), ones: a % 10, otherTens: Math.floor(b / 10), otherOnes: b % 10,
    result: op === '+' ? a + b : a - b, regroup: op === '+' ? a % 10 + b % 10 >= 10 : a % 10 < b % 10 };
}
function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = dx * dx + dy * dy;
  const t = d ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function validTrace(path, points) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 2000 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || v < 0 || v > 100))) return false;
  if (Math.hypot(points[0][0] - path[0][0], points[0][1] - path[0][1]) > 13 || Math.hypot(points.at(-1)[0] - path.at(-1)[0], points.at(-1)[1] - path.at(-1)[1]) > 13) return false;
  // Follow the whole path (including turns), not just its two endpoints.
  for (const corner of path) if (!points.some(p => Math.hypot(p[0] - corner[0], p[1] - corner[1]) < 14)) return false;
  return points.filter(p => path.slice(1).some((end, i) => distanceToSegment(p, path[i], end) < 14)).length / points.length >= .8;
}
export function sentenceFor(a, r) {
  if (r.slots.some(v => v === null)) return '';
  const [who, where, verb] = [a.who[r.slots[0]], a.where[r.slots[1]], a.actions[r.slots[2]]];
  if (a.pattern === 'want') return `${who}${verb}${where}${r.punctuation}`;
  if (a.pattern === 'season') return `${who}，${where}${verb}${r.punctuation}`;
  const ending = r.punctuation === '？' ? '吗？' : r.punctuation;
  return `${who}在${where}${verb}${ending}`;
}
export function reduce(course, before, action, { replay = false } = {}) {
  const reject = reason => ({ ok: false, reason, state: before, discovered: false });
  if (!action || typeof action.type !== 'string') return reject('invalid');
  const s = clone(before), a = current(course, s), r = s.rooms[s.active], kind = course.kind;
  let complete = false, changed = true;
  const previousRoom = clone(r);
  if (action.type === 'select') {
    if (!integer(action.index, 0, 7)) return reject('invalid');
    s.active = action.index;
  } else if (action.type === 'free') {
    if (typeof action.value !== 'boolean') return reject('invalid');
    s.free = action.value;
  } else if (action.type === 'reset') {
    s.rooms[s.active] = roomFor(course, a); s.histories[s.active] = [];
  } else if (action.type === 'undo') {
    const old = s.histories[s.active].pop();
    if (!old) return reject('nothing');
    s.rooms[s.active] = old;
  } else {
    if (action.type === 'setup') {
      if (!s.free || !['add', 'subtract', 'column', 'relay', 'count', 'compare', 'quantity'].includes(kind) || !integer(action.a) || !integer(action.b)) return reject('range');
      const op = kind === 'subtract' ? '-' : a.op ?? '+';
      if (!['count', 'compare', 'quantity'].includes(kind) && !columnValues(action.a, action.b, op)) return reject('range');
      if (kind === 'relay' && action.a + action.b < a.c) return reject('range');
      if (kind === 'quantity' && (a.relation === 'decrease' ? action.a < action.b : a.relation !== 'compare' && action.a + action.b > 100)) return reject('range');
      Object.assign(r, roomFor(course, { ...a, a: action.a, b: action.b }));
    } else if (action.type === 'budget' && kind === 'money') {
      if (!s.free || !integer(action.budget,1,10000) || !integer(action.price,1,10000)) return reject('range');
      Object.assign(r,roomFor(course,{...a,budget:action.budget,price:action.price}));
    } else if (kind === 'character') {
      if (action.type === 'assemble' && integer(action.index, 0, a.variants.length - 1)) {
        if (r.assembled && r.variant === action.index) return reject('same');
        r.variant = action.index; r.assembled = true;
        if (!r.seen.includes(action.index)) r.seen.push(action.index);
        complete = r.seen.length >= 2;
      } else if (action.type === 'dismantle' && r.assembled) r.assembled = false;
      else return reject('invalid');
    } else if (kind === 'writing') {
      if (action.type !== 'trace' || r.stroke >= a.strokes.length || !validTrace(a.strokes[r.stroke], action.points)) return reject('trace');
      r.ink.push(action.points); r.stroke++; complete = r.stroke === a.strokes.length;
    } else if (kind === 'word') {
      if (action.type === 'variant' && integer(action.index, 0, a.variants.length - 1)) { r.variant = action.index; r.placed = false; }
      else if (action.type === 'place') r.placed = true;
      else if (action.type === 'act' && r.placed) { if (!r.seen.includes(r.variant)) r.seen.push(r.variant); r.moved++; complete = r.seen.length >= 2; }
      else return reject('place');
    } else if (kind === 'dictionary') {
      if (action.type === 'initial' && a.entries.some(e => e.initial === action.value)) { r.initial = action.value; r.syllable = ''; r.entry = ''; }
      else if (action.type === 'syllable' && a.entries.some(e => e.initial === r.initial && e.syllable === action.value)) { r.syllable = action.value; r.entry = ''; }
      else if (action.type === 'entry' && a.entries.some(e => e.initial === r.initial && e.syllable === r.syllable && e.char === action.value)) { r.entry = action.value; complete = r.entry === a.target; }
      else return reject('index');
    } else if (kind === 'sentence') {
      if (action.type === 'slot' && integer(action.slot, 0, 2) && integer(action.index, 0, [a.who, a.where, a.actions][action.slot].length - 1)) r.slots[action.slot] = action.index;
      else if (action.type === 'punctuation' && ['。', '！', '？'].includes(action.value)) r.punctuation = action.value;
      else if (action.type === 'play' && sentenceFor(a, r)) { r.played = true; r.moved++; complete = true; }
      else return reject('pieces');
    } else if (kind === 'poetry') {
      if (action.type !== 'move') return reject('invalid');
      r.moved++; r.line = Math.min(a.lines.length, r.line + 1); complete = r.line === a.lines.length;
    } else if (kind === 'story') {
      if (action.type === 'swap' && integer(action.from, 0, 2) && integer(action.to, 0, 2) && action.from !== action.to) {
        [r.order[action.from], r.order[action.to]] = [r.order[action.to], r.order[action.from]]; r.played = false;
      } else if (action.type === 'play') { r.played = true; r.moved++; complete = r.evidence && r.order.every((n, i) => n === i); }
      else if (action.type === 'evidence' && r.played) r.evidence = true;
      else return reject('play');
    } else if (kind === 'speaking') {
      if (action.type === 'include' && integer(action.index, 0, 2)) {
        r.included = r.included.includes(action.index) ? r.included.filter(i => i !== action.index) : [...r.included, action.index].sort(); r.played = false;
      } else if (action.type === 'play' && r.included.length) { r.played = true; r.moved++; complete = r.included.length === 3; }
      else return reject('pieces');
    } else if (kind === 'shape') {
      if (action.type === 'position' && integer(action.index, 0, a.pieces.length - 1) && Number.isFinite(action.x) && Number.isFinite(action.z) && Math.abs(action.x) <= 4.5 && Math.abs(action.z) <= 2.5) {
        const old = r.positions[action.index];
        if (Math.hypot(old.x - action.x, old.z - action.z) < .15) return reject('same');
        r.positions[action.index] = {x: Math.round(action.x * 4) / 4, z: Math.round(action.z * 4) / 4};
        if (!r.placedPieces.includes(action.index)) r.placedPieces.push(action.index);
      } else if (action.type === 'rotate' && integer(action.index, 0, a.pieces.length - 1)) { r.rotations[action.index] = (r.rotations[action.index] + 1) % 8; r.turned = true; }
      else return reject('drop');
      complete = r.turned && r.placedPieces.length === a.pieces.length;
    } else if (kind === 'count') {
      if (action.type === 'bundle' && r.ones >= 10) { r.ones -= 10; r.tens++; r.exchanged++; }
      else if (action.type === 'unbundle' && r.tens > 0) { r.ones += 10; r.tens--; r.exchanged++; }
      else if (action.type === 'step' && [-10, -1, 1, 10].includes(action.delta) && integer(valueOf(r) + action.delta)) {
        const n = valueOf(r) + action.delta; r.tens = Math.floor(n / 10); r.ones = n % 10; r.moved++;
      } else return reject('range');
      complete = r.exchanged >= 2 && r.moved > 0;
    } else if (kind === 'compare') {
      if (action.type !== 'step' || !['a', 'b'].includes(action.side) || ![-10, -1, 1, 10].includes(action.delta) || !integer(r[action.side] + action.delta)) return reject('range');
      const first = Math.sign(r.a - r.b); r[action.side] += action.delta; r.moved++;
      for (const n of [first, Math.sign(r.a - r.b)]) if (!r.views.includes(n)) r.views.push(n);
      complete = r.views.length > 1 && r.moved >= 2;
    } else if (kind === 'quantity') {
      if (action.type === 'transfer' && a.relation === 'part' && [-1, 1].includes(action.delta) && integer(r.a - action.delta) && integer(r.b + action.delta)) { r.a -= action.delta; r.b += action.delta; r.moved++; }
      else if (action.type === 'step' && a.relation === 'compare' && ['a','b'].includes(action.side) && [-1,1].includes(action.delta) && integer(r[action.side]+action.delta)) { r[action.side]+=action.delta; r.moved++; }
      else if (action.type === 'operate' && ['increase','decrease'].includes(a.relation) && !r.phase && integer(a.relation === 'increase' ? r.a+r.b : r.a-r.b)) { r.phase=1; r.moved++; }
      else if (action.type === 'layout') r.layout = !r.layout;
      else return reject('range');
      complete = r.moved > 0 && r.layout;
    } else if (kind === 'money') {
      if (action.type === 'exchange' && EXCHANGES[action.coin] && r.wallet[action.coin] > 0) {
        const [coin,count]=EXCHANGES[action.coin];
        r.wallet[action.coin]--; r.wallet[coin] += count; r.exchanged++; complete = a.exchangeOnly && action.coin === a.exchangeCoin;
      } else if (action.type === 'coin' && DENOMINATIONS.includes(action.coin)) {
        const source = action.back ? r.tray : r.wallet, dest = action.back ? r.wallet : r.tray;
        if (!source[action.coin] || r.spent) return reject('money');
        source[action.coin]--; dest[action.coin]++;
      } else if (action.type === 'buy' && !r.spent && moneyValue(r.tray) >= r.price) {
        const change = coinsFor(moneyValue(r.tray) - r.price);
        for (const coin of DENOMINATIONS) r.wallet[coin] += change[coin];
        r.spent = r.price; r.tray = coinsFor(0); r.phase = 1; complete = !a.exchangeOnly;
      } else return reject('money');
    } else if (['add', 'subtract', 'column', 'relay'].includes(kind)) {
      const op = kind === 'subtract' ? '-' : a.op ?? '+';
      if (action.type === 'align' && kind === 'column' && !r.aligned) r.aligned = true;
      else if (action.type === 'bundle' && r.ones >= 10) { r.ones -= 10; r.tens++; r.exchanged++; }
      else if (action.type === 'unbundle' && r.tens > 0) { r.ones += 10; r.tens--; r.exchanged++; }
      else if (action.type === 'takeOne' && kind === 'subtract' && r.phase === 0 && r.ones > 0 && r.removed < r.b) {
        r.ones--; r.removed++; r.phase=r.removed===r.b?1:0;
      } else if (action.type === 'operate') {
        if (kind === 'column' && !r.aligned) return reject('align');
        if (r.phase !== 0) return reject('same');
        if (op === '+') { r.tens += Math.floor(r.b / 10); r.ones += r.b % 10; }
        else {
          const remaining=r.b-r.removed;
          if (r.tens < Math.floor(remaining / 10) || r.ones < remaining % 10) return reject('unbundle');
          r.tens -= Math.floor(remaining / 10); r.ones -= remaining % 10;r.removed=r.b;
        }
        r.phase = 1;
      } else if (action.type === 'depart' && kind === 'relay' && r.phase === 1) {
        if (r.tens < Math.floor(r.c / 10) || r.ones < r.c % 10) return reject('unbundle');
        r.tens -= Math.floor(r.c / 10); r.ones -= r.c % 10; r.phase = 2;
      } else return reject('range');
      complete = r.phase === (kind === 'relay' ? 2 : 1) && r.ones < 10;
    } else return reject('invalid');
    s.histories[s.active].push(previousRoom);
    if (s.histories[s.active].length > 40) s.histories[s.active].shift();
  }
  const discovered = complete && !s.free && !s.done.includes(a.id);
  if (discovered) s.done.push(a.id);
  if (!replay) s.log.push(clone(action));
  return { ok: true, state: s, discovered, complete: s.done.length === 8, changed };
}
export function serialize(state) { return { version: VERSION, courseId: state.courseId, log: state.log }; }
// 教材入口只选择已有活动；沿用日志恢复，保留进度，不触发玩法或音频。
export function openActivity(course, state, activityId) {
  const index = course.activities.findIndex(activity => activity.id === activityId);
  if (index < 0) return state;
  let next = state;
  if (next.free) next = reduce(course, next, { type: 'free', value: false }).state;
  if (next.active !== index) next = reduce(course, next, { type: 'select', index }).state;
  return next;
}
export function restore(course, saved) {
  if (!saved || saved.version !== VERSION || saved.courseId !== course.id || !Array.isArray(saved.log) || saved.log.length > 10000) return initialState(course);
  let state = initialState(course);
  try {
    for (const action of saved.log) {
      const result = reduce(course, state, action, {replay:true});
      if (!result.ok) return initialState(course);
      state = result.state;
    }
    state.log = clone(saved.log); return state;
  } catch { return initialState(course); }
}
