/* ============================================================
   金字塔魔方 · 初级还原 + 倒带兜底
   阶段：tips → centers → edges（BFS）
   输出：[{ vertex, layer, turns, stage }]
   ============================================================ */

import {applyTwist} from './random-model.js';

function cloneState(s) {
  return {
    tipOri: [...s.tipOri],
    cenOri: [...s.cenOri],
    edgePerm: [...s.edgePerm],
    edgeOri: [...s.edgeOri],
  };
}

function apply(s,mv){applyTwist(s,mv,{kind:'pyramid'});}

function tipsSolved(s) { return s.tipOri.every((o) => o === 0); }
function centersSolved(s) { return s.cenOri.every((o) => o === 0); }
function edgesSolved(s) {
  for (let i = 0; i < 6; i++) if (s.edgePerm[i] !== i || s.edgeOri[i] !== 0) return false;
  return true;
}
function solved(s) { return tipsSolved(s) && centersSolved(s) && edgesSolved(s); }

function sig(s) {
  return s.tipOri.join('') + '|' + s.cenOri.join('') + '|' + s.edgePerm.join('') + '|' + s.edgeOri.join('');
}

/** 所有深层 + 尖角转动 */
function allMoves() {
  const m = [];
  for (let v = 0; v < 4; v++) {
    for (const layer of [0, 1]) {
      for (const turns of [1, 2]) m.push({ vertex: v, layer, turns });
    }
  }
  return m;
}

const MOVES = allMoves();
const DEEP = MOVES.filter((m) => m.layer === 1);
const TIP = MOVES.filter((m) => m.layer === 0);

function bfs(start, goal, moveSet, maxDepth = 8) {
  if (goal(start)) return [];
  const q = [{ s: cloneState(start), path: [] }];
  const seen = new Set([sig(start)]);
  while (q.length) {
    const cur = q.shift();
    if (cur.path.length >= maxDepth) continue;
    for (const mv of moveSet) {
      const ns = cloneState(cur.s);
      apply(ns, mv);
      const k = sig(ns);
      if (seen.has(k)) continue;
      seen.add(k);
      const path = [...cur.path, mv];
      if (goal(ns)) return path;
      q.push({ s: ns, path });
    }
  }
  return null;
}

/**
 * 初级层先：尖角 → 中心 → 棱
 * 失败时返回 null（由上层倒带）
 */
export function solvePyraminx(state) {
  if (!state) return null;
  const s = cloneState(state);
  if (solved(s)) return [];
  const out = [];

  // 1) tips
  if (!tipsSolved(s)) {
    const path = bfs(s, tipsSolved, TIP, 4);
    if (!path) return null;
    for (const mv of path) {
      apply(s, mv);
      out.push({ ...mv, stage: 'tips' });
    }
  }

  // 2) centers（只动深层；可能暂时弄乱棱）
  if (!centersSolved(s)) {
    const path = bfs(s, (x) => tipsSolved(x) && centersSolved(x), DEEP, 6);
    if (!path) {
      // 放宽：允许尖角一起动
      const path2 = bfs(s, (x) => tipsSolved(x) && centersSolved(x), MOVES, 7);
      if (!path2) return null;
      for (const mv of path2) {
        apply(s, mv);
        out.push({ ...mv, stage: 'centers' });
      }
    } else {
      for (const mv of path) {
        apply(s, mv);
        out.push({ ...mv, stage: 'centers' });
      }
    }
  }

  // 3) edges
  if (!edgesSolved(s)) {
    const path = bfs(s, solved, DEEP, 10);
    if (!path) {
      const path2 = bfs(s, solved, MOVES, 11);
      if (!path2) return null;
      for (const mv of path2) {
        apply(s, mv);
        out.push({ ...mv, stage: 'edges' });
      }
    } else {
      for (const mv of path) {
        apply(s, mv);
        out.push({ ...mv, stage: 'edges' });
      }
    }
  }

  return out;
}

export function isSolvedState(state) {
  return solved(state);
}

/** 当前局面的逆转动。 */
export function invertMove(mv) {
  return { vertex: mv.vertex, layer: mv.layer, turns: (3 - (mv.turns % 3)) % 3 };
}
