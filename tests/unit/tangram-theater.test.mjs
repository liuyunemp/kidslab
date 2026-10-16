import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANGLE_TOLERANCE,
  PIECE_COUNT,
  PIECE_DEFS,
  SCENE_COUNT,
  SNAP_RADIUS_MIN,
  TARGETS,
  angleDistance,
  clampSceneIndex,
  isValidPieceIndex,
  normalizeAngle,
  resolveSnap,
  snapRadius,
  stepRotation,
  validateTargets,
} from '../../src/tangram-theater/model.js';

test('八幕轮廓结构合法：每幕恰好七块、角度齐 45°、flip 只有 ±1', () => {
  assert.equal(SCENE_COUNT, 8);
  assert.deepEqual(validateTargets(), []);
  for (const scene of TARGETS) assert.equal(scene.length, PIECE_COUNT);
});

test('七块木片是五个三角形加一个正方形和一个平行四边形', () => {
  const shapes = PIECE_DEFS.map((piece) => piece.shape);
  assert.equal(shapes.length, PIECE_COUNT);
  assert.equal(shapes.filter((shape) => shape === 'triangle').length, 5);
  assert.equal(shapes.filter((shape) => shape === 'square').length, 1);
  assert.equal(shapes.filter((shape) => shape === 'para').length, 1);
});

test('角度归一化把任意值收进 [0, 360)', () => {
  assert.equal(normalizeAngle(0), 0);
  assert.equal(normalizeAngle(360), 0);
  assert.equal(normalizeAngle(-45), 315);
  assert.equal(normalizeAngle(765), 45);
  assert.equal(normalizeAngle(Number.NaN), 0, 'NaN 不能污染画布坐标');
});

test('夹角取最短弧：359° 与 1° 只差 2°，不是 358°', () => {
  assert.equal(angleDistance(359, 1), 2);
  assert.equal(angleDistance(1, 359), 2);
  assert.equal(angleDistance(0, 0), 0);
  assert.equal(angleDistance(0, 180), 180);
  assert.equal(angleDistance(0, 360), 0);
});

test('位置容差有下限，小屏与触屏也不要求像素级对齐', () => {
  assert.equal(snapRadius(0), SNAP_RADIUS_MIN);
  assert.equal(snapRadius(40), SNAP_RADIUS_MIN, '小舞台用下限兜底');
  assert.ok(snapRadius(200) > SNAP_RADIUS_MIN);
});

test('放在正中间且朝向一致时判定成功并吸附', () => {
  const piece = { x: 100, y: 100, rotation: 45, flip: 1 };
  const target = { x: 100, y: 100, rotation: 45, flip: 1 };
  assert.deepEqual(resolveSnap(piece, target, 60), { ok: true, reason: 'ok' });
});

test('位置、角度、翻面三种失败各给出具体原因，而不是笼统报错', () => {
  const target = { x: 100, y: 100, rotation: 45, flip: 1 };
  assert.equal(resolveSnap({ x: 300, y: 300, rotation: 45, flip: 1 }, target, 60).reason, 'far');
  assert.equal(resolveSnap({ x: 100, y: 100, rotation: 135, flip: 1 }, target, 60).reason, 'angle');
  assert.equal(resolveSnap({ x: 100, y: 100, rotation: 45, flip: -1 }, target, 60).reason, 'flip');
  assert.equal(resolveSnap({ x: 100, y: 100, rotation: 135, flip: -1 }, target, 60).reason, 'flip',
    '角度和翻面都不对时优先提示翻面：这是更明确的一步动作');
});

test('恰好卡在角度容差边界上算通过，超出一点点就算失败', () => {
  const target = { x: 100, y: 100, rotation: 90, flip: 1 };
  const at = (rotation) => resolveSnap({ x: 100, y: 100, rotation, flip: 1 }, target, 60).ok;
  assert.equal(at(90 + ANGLE_TOLERANCE), true);
  assert.equal(at(90 - ANGLE_TOLERANCE), true);
  assert.equal(at(90 + ANGLE_TOLERANCE + 1), false);
  assert.equal(at(90 - ANGLE_TOLERANCE - 1), false);
});

test('旋转按 45° 步进，反复转动不会漂移出网格', () => {
  let rotation = 0;
  for (let i = 0; i < 8; i += 1) rotation = stepRotation(rotation, 45);
  assert.equal(rotation, 0, '转满八次正好回原位');
  assert.equal(stepRotation(0, -45), 315);
  assert.equal(stepRotation(315, 45), 0);
});

test('非法输入被拒绝而不是算出 NaN', () => {
  assert.equal(resolveSnap(null, { x: 0, y: 0 }, 60).ok, false);
  assert.equal(resolveSnap({ x: Number.NaN, y: 0 }, { x: 0, y: 0 }, 60).reason, 'unknown');
  assert.equal(isValidPieceIndex(0), true);
  assert.equal(isValidPieceIndex(6), true);
  assert.equal(isValidPieceIndex(7), false);
  assert.equal(isValidPieceIndex(-1), false);
  assert.equal(isValidPieceIndex(1.5), false);
  assert.equal(isValidPieceIndex('3'), false);
});

test('幕索引越界一律回落到有效范围，画面不会画到不存在的一幕', () => {
  assert.equal(clampSceneIndex(0), 0);
  assert.equal(clampSceneIndex(7), 7);
  assert.equal(clampSceneIndex(99), SCENE_COUNT - 1);
  assert.equal(clampSceneIndex(-5), 0);
  assert.equal(clampSceneIndex(Number.NaN), 0);
  assert.equal(clampSceneIndex('4'), 0);
});

test('每一块目标都能用左右转按钮到达（起始角度与目标角度同在 45° 网格上）', () => {
  for (const [sceneIndex, scene] of TARGETS.entries()) {
    for (const [pieceIndex, [, , rotation]] of scene.entries()) {
      // 与 main.js 的 resetPieces 保持一致：起始角度必须落在 45° 网格上。
      const start = normalizeAngle(pieceIndex * 45 + sceneIndex * 90);
      const steps = (normalizeAngle(rotation) - start) / 45;
      assert.equal(steps, Math.round(steps), `第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块必须能用 45° 步进转到`);
      assert.ok(Math.round(steps) <= 7, `第 ${sceneIndex + 1} 幕第 ${pieceIndex + 1} 块最多转 7 次就该到位`);
    }
  }
});

test('轮廓校验能挑出缺块、越界角度与非法 flip', () => {
  const broken = [[
    [0.5, 0.5, 30, 1], [0.5, 0.5, 45, 2], [0.5, 1.5, 45, 1],
  ]];
  const problems = validateTargets(broken, PIECE_DEFS);
  assert.ok(problems.some((text) => text.includes('应为 7')));
  assert.ok(problems.some((text) => text.includes('角度须为 45')));
  assert.ok(problems.some((text) => text.includes('flip')));
  assert.ok(problems.some((text) => text.includes('y 越界')));
  assert.ok(validateTargets([]).length > 0);
});
