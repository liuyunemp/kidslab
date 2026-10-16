// 七巧板皮影戏的纯逻辑模型：无 DOM、无 Canvas，可单独单测。
// main.js 只负责渲染与事件，几何判定全部走这里。

export const PIECE_COUNT = 7;

export const COLORS = ['--coral', '--blue', '--gold', '--jade', '--violet', '--crimson', '--blue'];

export const PIECE_DEFS = [
  { id: 'large-a', shape: 'triangle', size: 1.18, points: [[-0.82, -0.82], [-0.82, 0.82], [0.82, 0.82]] },
  { id: 'large-b', shape: 'triangle', size: 1.18, points: [[-0.82, -0.82], [-0.82, 0.82], [0.82, 0.82]] },
  { id: 'medium', shape: 'triangle', size: 0.91, points: [[-0.76, -0.76], [-0.76, 0.76], [0.76, 0.76]] },
  { id: 'small-a', shape: 'triangle', size: 0.7, points: [[-0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]] },
  { id: 'small-b', shape: 'triangle', size: 0.7, points: [[-0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]] },
  { id: 'square', shape: 'square', size: 0.7, points: [[-0.63, -0.63], [0.63, -0.63], [0.63, 0.63], [-0.63, 0.63]] },
  { id: 'para', shape: 'para', size: 0.82, points: [[-0.9, -0.55], [0.4, -0.55], [0.9, 0.55], [-0.4, 0.55]] },
];

// 八幕轮廓：每幕 7 条 [x, y, rotation, flip]，x/y 是舞台比例坐标。
export const TARGETS = [
  [
    [0.35, 0.45, 225, 1], [0.55, 0.45, 315, 1], [0.45, 0.28, 45, 1],
    [0.25, 0.60, 45, 1], [0.65, 0.60, 135, 1], [0.45, 0.50, 45, 1], [0.45, 0.66, 0, 1],
  ],
  [
    [0.43, 0.48, 45, 1], [0.55, 0.53, 225, 1], [0.34, 0.34, 315, 1],
    [0.28, 0.25, 45, 1], [0.34, 0.62, 135, 1], [0.49, 0.66, 0, 1], [0.67, 0.42, 315, -1],
  ],
  [
    [0.48, 0.51, 225, 1], [0.59, 0.47, 45, 1], [0.37, 0.35, 315, 1],
    [0.31, 0.24, 45, 1], [0.66, 0.62, 225, 1], [0.45, 0.65, 0, 1], [0.68, 0.34, 45, 1],
  ],
  [[0.32, 0.57, 225, 1], [0.58, 0.57, 315, 1], [0.45, 0.35, 45, 1], [0.32, 0.39, 135, 1], [0.65, 0.39, 45, 1], [0.46, 0.68, 0, 1], [0.45, 0.52, 0, 1]],
  [[0.34, 0.32, 225, 1], [0.58, 0.32, 315, 1], [0.45, 0.57, 45, 1], [0.34, 0.64, 135, 1], [0.63, 0.64, 45, 1], [0.48, 0.45, 0, 1], [0.57, 0.49, 0, 1]],
  [[0.45, 0.31, 225, 1], [0.45, 0.49, 45, 1], [0.45, 0.64, 315, 1], [0.33, 0.48, 135, 1], [0.57, 0.48, 45, 1], [0.45, 0.78, 0, 1], [0.45, 0.68, 90, 1]],
  [[0.29, 0.42, 225, 1], [0.65, 0.42, 315, 1], [0.46, 0.52, 45, 1], [0.27, 0.62, 135, 1], [0.68, 0.62, 45, 1], [0.45, 0.65, 0, 1], [0.48, 0.34, 0, -1]],
  [[0.45, 0.27, 225, 1], [0.28, 0.46, 315, 1], [0.62, 0.46, 45, 1], [0.27, 0.66, 135, 1], [0.64, 0.66, 45, 1], [0.45, 0.55, 0, 1], [0.45, 0.75, 0, 1]],
];

export const SCENE_COUNT = TARGETS.length;

/** 角度的吸附容差：七巧板看重"朝向对不对"，不要求像素级精确。 */
export const ANGLE_TOLERANCE = 30;

/** 拾取木片时允许的最大中心距离（CSS 像素），给孩子一点手抖空间。 */
export const PICK_RADIUS = 22;

/** 吻合判定的位置容差下限（CSS 像素）；实际取 max 值，保证小屏也能放手。 */
export const SNAP_RADIUS_MIN = 46;

/** 回弹动画时长（毫秒）。 */
export const SNAP_BACK_MS = 300;

/** 归一化到 [0, 360)。 */
export function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) return 0;
  return ((angle % 360) + 360) % 360;
}

/** 两个角度的最小夹角，结果恒在 [0, 180]。 */
export function angleDistance(a, b) {
  const difference = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(difference, 360 - difference);
}

/** 位置容差：舞台越小越用下限兜底，避免手机上要求毫米级对齐。 */
export function snapRadius(pieceScale) {
  const scale = Number.isFinite(pieceScale) ? Math.max(0, pieceScale) : 0;
  return Math.max(SNAP_RADIUS_MIN, scale * 1.15);
}

/**
 * 判定一块木片能否放入它的目标位置。
 * 返回 { ok, reason }，reason 用于给孩子更具体的提示：
 *  'ok' | 'angle'（形状/位置大致对了，只是朝向不对）| 'far'（离剪影太远）
 * | 'flip'（需要翻面）| 'unknown'（索引非法）
 */
export function resolveSnap(piece, target, pieceScale) {
  if (!piece || !target || !Number.isFinite(piece.x) || !Number.isFinite(piece.y)) {
    return { ok: false, reason: 'unknown' };
  }
  const distance = Math.hypot(piece.x - target.x, piece.y - target.y);
  const radius = snapRadius(pieceScale);
  const angleMatches = angleDistance(piece.rotation, target.rotation) <= ANGLE_TOLERANCE;
  const flipMatches = piece.flip === target.flip;

  if (distance <= radius && angleMatches && flipMatches) return { ok: true, reason: 'ok' };
  if (distance > radius) return { ok: false, reason: 'far' };
  if (!flipMatches) return { ok: false, reason: 'flip' };
  return { ok: false, reason: 'angle' };
}

/** 归一化到 [0,360) 的 45° 步进，避免浮点漂移累积。 */
export function stepRotation(rotation, delta) {
  return normalizeAngle(Math.round((normalizeAngle(rotation) + delta) / 45) * 45);
}

/** 木片的显示名索引必须是合法的七块之一。 */
export function isValidPieceIndex(index, total = PIECE_COUNT) {
  return Number.isInteger(index) && index >= 0 && index < total;
}

/** 幕索引合法性：非法值一律回落到第 0 幕，而不是让画布画出 NaN。 */
export function clampSceneIndex(index, total = SCENE_COUNT) {
  if (!Number.isInteger(index)) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}

/**
 * 校验 TARGETS 的结构不变量，供单测与构建期自检使用。
 * 返回问题描述数组，空数组代表合法。
 */
export function validateTargets(targets = TARGETS, defs = PIECE_DEFS) {
  const problems = [];
  if (!Array.isArray(targets) || targets.length === 0) {
    return ['TARGETS 必须是非空数组'];
  }
  targets.forEach((scene, sceneIndex) => {
    if (!Array.isArray(scene)) {
      problems.push(`第 ${sceneIndex + 1} 幕不是数组`);
      return;
    }
    if (scene.length !== defs.length) {
      problems.push(`第 ${sceneIndex + 1} 幕有 ${scene.length} 个位置，应为 ${defs.length} 个`);
    }
    scene.forEach((entry, pieceIndex) => {
      if (!Array.isArray(entry) || entry.length !== 4) {
        problems.push(`第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块格式错误`);
        return;
      }
      const [x, y, rotation, flip] = entry;
      if (!Number.isFinite(x) || x < 0 || x > 1) problems.push(`第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块 x 越界`);
      if (!Number.isFinite(y) || y < 0 || y > 1) problems.push(`第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块 y 越界`);
      if (!Number.isFinite(rotation) || normalizeAngle(rotation) % 45 !== 0) {
        problems.push(`第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块角度须为 45° 的倍数`);
      }
      if (flip !== 1 && flip !== -1) problems.push(`第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块 flip 须为 1 或 -1`);
    });
  });
  return problems;
}
