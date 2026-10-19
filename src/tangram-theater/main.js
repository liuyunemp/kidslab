import {
  TARGETS as MODEL_TARGETS,
  PIECE_DEFS as MODEL_PIECE_DEFS,
  COLORS as MODEL_COLORS,
  PIECE_COUNT,
  PICK_RADIUS,
  SNAP_BACK_MS,
  normalizeAngle,
  resolveSnap,
  snapRadius,
  clampSceneIndex,
} from './model.js';
import { createAudio } from './audio.js';
import { createRounds } from './random-rounds.js';
import { tangram, validTangram, validTangramPlay } from './random-model.js';

(() => {
  'use strict';

  const I18N = {
    zh: {
      doc: '七巧板皮影戏 · KidsLab',
      back: '返回平台',
      title: '七巧板皮影戏',
      theme: '切换主题',
      eyebrow: '今晚演出：狐狸过河',
      progress: '归位',
      act: '幕',
      workbench: '后台木片桌',
      turnLeft: '左转',
      turnRight: '右转',
      flip: '翻面',
      hint: '灯笼提示：帮我放一块',
      reset: '重开本幕',
      stageLabel: '可拖动的七巧板拼图舞台',
      shelfLabel: '七巧板木片',
      controlsLabel: '木片动作',
      sound: '关闭全部声音',
      soundOff: '恢复声音',
      coach: '把手上的木板拖到发光的影子上',
      intro: '每块木片都有自己的影子。拖过去就归位！',
      selected: (name) => `已拿起${name}。把它拖到${name}的影子上去。`,
      wrongFar: '离影子还差一点，再靠近一些。',
      wrongAngle: '位置对了，形状还差个方向——转一转或翻个面。',
      wrongFlip: '就是这里！不过要翻个面才能吻合。',
      correct: (name, count) => `${name}稳稳归位！还差 ${7 - count} 块。`,
      lastPiece: '最后一块归位——剪影醒过来了！',
      locked: '先演完前一幕，后面的角色才会登场。',
      hintPlaced: (name) => `灯笼照亮了${name}的位置。看看它怎样滑动、转向，再放下一块！`,
      resetDone: '这一幕重新布景。七块木片都回到后台啦！',
      completedScene: '这一幕已经演完，可以重玩或继续后面的故事。',
      pieces: ['大三角一', '大三角二', '中三角', '小三角一', '小三角二', '正方形', '平行四边形'],
      scenes: [
        {
          tab: '第一幕 · 桥',
          mission: '第一幕缺一座桥。把七块木片都拖进发光的影子，故事才能继续！',
          title: '桥架起来了！',
          text: '七块木片没有变大或缩小，只是滑动、转向和翻面，就组成了新的轮廓。',
          art: '🦊🌉',
        },
        {
          tab: '第二幕 · 狐狸',
          mission: '桥有了，主角却没登台。拼出狐狸，让它踩着月光过河！',
          title: '狐狸抖抖尾巴，活了！',
          text: '同一组图形换了位置和方向，就从一座桥变成了狐狸。分开看是木片，合起来就是角色。',
          art: '🌙🦊',
        },
        {
          tab: '第三幕 · 大雁',
          mission: '河对岸传来翅膀声。最后拼出大雁，为狐狸引路回家！',
          title: '三幕皮影戏圆满收官！',
          text: '你用完了每一块，而且没有重叠。滑动、旋转、翻面，让七块图形讲完了一整个故事！',
          art: '🦊🪿✨',
        },
        { tab: '第四幕 · 帆船', mission: '七块木片变成一艘帆船，载狐狸过河！', title: '帆船起航！', text: '七块图形换了位置和方向，变成了帆船。', art: '⛵🦊' },
        { tab: '第五幕 · 小屋', mission: '给狐狸拼一座有屋顶的小屋。', title: '小屋亮灯啦！', text: '相同的七块木片又拼出了新的轮廓。', art: '🏠✨' },
        { tab: '第六幕 · 松树', mission: '让七块木片在舞台上长成松树。', title: '松树长高啦！', text: '三角形转一转，可以成为树冠。', art: '🌲🦊' },
        { tab: '第七幕 · 飞鸟', mission: '拼一只飞鸟，让它飞过小河。', title: '飞鸟展翅！', text: '木片翻面、转向，轮廓也跟着变化。', art: '🐦🌙' },
        { tab: '第八幕 · 星星', mission: '最后把七块木片送进星光剪影。', title: '八幕皮影戏圆满收官！', text: '你完成了八个不同的七巧板场景，每幕都用到了七块。', art: '⭐🦊🎉' },
      ],
      next: '下一幕 →',
      replay: '再演一遍',
    },
    en: {
      doc: 'Tangram Shadow Play · KidsLab',
      back: 'Back to platform',
      title: 'Tangram Shadow Play',
      theme: 'Switch theme',
      eyebrow: 'Tonight: The Fox Crosses the River',
      progress: 'Placed',
      act: 'Act',
      workbench: 'Backstage piece table',
      turnLeft: 'Turn left',
      turnRight: 'Turn right',
      flip: 'Flip',
      hint: 'Lantern hint: place one piece',
      reset: 'Restart this act',
      stageLabel: 'Draggable tangram puzzle stage',
      shelfLabel: 'Tangram pieces',
      controlsLabel: 'Piece controls',
      sound: 'Mute all sounds',
      soundOff: 'Restore sound',
      coach: 'Drag the piece in your hand onto its glowing shadow',
      intro: 'Every piece has its own shadow. Drag it over to place it!',
      selected: (name) => `${name} is in your hand. Drag it onto the matching shadow.`,
      wrongFar: 'Almost there — move a little closer to the shadow.',
      wrongAngle: 'Right spot, wrong angle. Give it a turn or a flip.',
      wrongFlip: 'Exactly there! But it needs a flip to fit.',
      correct: (name, count) => `${name} is in place! ${7 - count} pieces to go.`,
      lastPiece: 'The final piece lands — the shadow wakes up!',
      locked: 'Finish the earlier act before the next character can enter.',
      hintPlaced: (name) => `The lantern lit up the home of ${name}. Watch how it slides and turns, then place the next one!`,
      resetDone: 'The stage is reset. All seven pieces are back backstage!',
      completedScene: 'This act is complete. Replay it or continue the story.',
      pieces: ['Large triangle one', 'Large triangle two', 'Medium triangle', 'Small triangle one', 'Small triangle two', 'Square', 'Parallelogram'],
      scenes: [
        {
          tab: 'Act 1 · Bridge',
          mission: 'Act one needs a bridge. Drag all seven pieces into the glowing shadows so the story can continue!',
          title: 'The bridge rises!',
          text: 'None of the seven pieces grew or shrank. They only slid, turned, and flipped to make a brand-new outline.',
          art: '🦊🌉',
        },
        {
          tab: 'Act 2 · Fox',
          mission: 'The bridge is ready, but the hero is missing. Build the fox so it can cross under the moon!',
          title: 'The fox shakes its tail — alive!',
          text: 'The same shapes changed position and direction, turning a bridge into a fox. Each is a piece alone and a character together.',
          art: '🌙🦊',
        },
        {
          tab: 'Act 3 · Goose',
          mission: 'Wings rustle across the river. Build the goose to guide the fox home!',
          title: 'All three shadow-play acts are complete!',
          text: 'You used every piece with no overlaps. Slides, turns, and flips let seven shapes tell a whole story!',
          art: '🦊🪿✨',
        },
        { tab: 'Act 4 · Sailboat', mission: 'Use all seven pieces to build a sailboat for the fox.', title: 'The sailboat sets off!', text: 'The same seven shapes moved and turned into a boat.', art: '⛵🦊' },
        { tab: 'Act 5 · House', mission: 'Give the fox a little house with a roof.', title: 'The house lights up!', text: 'The same seven pieces form another outline.', art: '🏠✨' },
        { tab: 'Act 6 · Pine', mission: 'Grow a pine tree from all seven pieces.', title: 'The pine grows tall!', text: 'Turn triangles to make a tree crown.', art: '🌲🦊' },
        { tab: 'Act 7 · Bird', mission: 'Build a bird to fly across the river.', title: 'The bird spreads its wings!', text: 'Turn and flip pieces to change the outline.', art: '🐦🌙' },
        { tab: 'Act 8 · Star', mission: 'Put every piece into the final starlight shadow.', title: 'All eight acts complete!', text: 'You finished eight different scenes using seven pieces in each.', art: '⭐🦊🎉' },
      ],
      next: 'Next act →',
      replay: 'Play it again',
    },
  };

  const rounds=createRounds('tangram-theater');
  const instances=rounds.prepare(MODEL_TARGETS.map((targets,i)=>({targets,mirror:1,dx:0,dy:0,rotations:targets.map((_,j)=>normalizeAngle(j*45+i*90))})),tangram,validTangram,a=>a.targets);
  const TARGETS = instances.map(a=>a.targets);
  const PIECE_DEFS = MODEL_PIECE_DEFS;
  const COLORS = MODEL_COLORS;

  const SAVE_KEY = 'kidslab.tangram-theater';
  try {
    if (localStorage.getItem(`${SAVE_KEY}.eight-act-version`) !== '2') {
      localStorage.setItem(`${SAVE_KEY}.eight-act-version`, '2');
    }
  } catch { /* Storage is optional. */ }
  const canvas = document.querySelector('#stage');
  const ctx = canvas.getContext('2d');
  const els = {
    lang: document.querySelector('#langBtn'),
    theme: document.querySelector('#themeBtn'),
    sound: document.querySelector('#soundBtn'),
    coach: document.querySelector('#coach'),
    mission: document.querySelector('#mission'),
    progress: document.querySelector('#progressCount'),
    tabs: document.querySelector('#sceneTabs'),
    act: document.querySelector('#actNumber'),
    pieceName: document.querySelector('#pieceName'),
    feedback: document.querySelector('#feedback'),
    shelf: document.querySelector('#pieceShelf'),
    left: document.querySelector('#leftBtn'),
    right: document.querySelector('#rightBtn'),
    flip: document.querySelector('#flipBtn'),
    hint: document.querySelector('#hintBtn'),
    reset: document.querySelector('#resetBtn'),
    modal: document.querySelector('#modal'),
    modalKicker: document.querySelector('#modalKicker'),
    modalArt: document.querySelector('#modalArt'),
    modalTitle: document.querySelector('#modalTitle'),
    modalText: document.querySelector('#modalText'),
    next: document.querySelector('#nextBtn'),
  };

  const audio = createAudio('kidslab.tangram-theater.audio');

  let t = (key) => key;
  let sceneIndex = 0;
  let unlocked = 0;
  let completed = 0;
  let selected = 0;
  let pieces = [];
  let dragging = null;
  let finaleStarted = 0;
  let hintPulse = -1;
  let armedTarget = -1;
  let focusPulseAt = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;
  let feedbackKey = 'intro';
  let feedbackArgs = [];
  let feedbackKind = '';
  let feedbackTimer = 0;
  let audioUnlocked = false;

  // 首次用户手势解锁音频；绝不 await，玩法动作立即执行。
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.unlock();
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function readSave() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      unlocked = Math.min(TARGETS.length - 1, Math.max(0, Number(data.unlocked) || 0));
      completed = Math.min(TARGETS.length, Math.max(0, Number(data.completed) || 0));
      sceneIndex = clampSceneIndex(Math.min(unlocked, Math.max(0, Number(data.scene) || 0)), TARGETS.length);
    } catch {
      unlocked = 0;
      completed = 0;
      sceneIndex = 0;
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked, completed, scene: sceneIndex }));
    } catch {
      // Persistence is optional; the complete game remains playable.
    }
  }

  function sourceFor(index) {
    return {
      x: cssWidth * (0.12 + index * 0.125),
      y: cssHeight * 0.84,
    };
  }

  function targetFor(index) {
    const [x, y, rotation, flip] = TARGETS[sceneIndex][index];
    return { x: cssWidth * x, y: cssHeight * y, rotation, flip };
  }

  function pieceScale() {
    return Math.min(cssWidth, cssHeight) * 0.077;
  }

  function resetPieces(message = true) {
    pieces = PIECE_DEFS.map((definition, index) => {
      const source = sourceFor(index);
      return {
        ...definition,
        x: source.x,
        y: source.y,
        // 起始角度必须落在 45° 网格上：否则左右转按钮永远转不到目标角度。
        rotation: instances[sceneIndex].rotations[index],
        flip: 1,
        placed: false,
        snapBack: null,
      };
    });
    selected = 0;
    finaleStarted = 0;
    hintPulse = -1;
    armedTarget = -1;
    focusPulseAt = 0;
    if (message) setFeedback('resetDone', [], '');
    renderUI();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const previousWidth = cssWidth || rect.width;
    const previousHeight = cssHeight || rect.height;
    cssWidth = Math.max(1, rect.width);
    cssHeight = Math.max(1, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!pieces.length) {
      resetPieces(false);
      return;
    }

    pieces.forEach((piece, index) => {
      if (piece.placed) {
        const target = targetFor(index);
        piece.x = target.x;
        piece.y = target.y;
      } else {
        piece.x = piece.x / previousWidth * cssWidth;
        piece.y = piece.y / previousHeight * cssHeight;
      }
    });
  }

  function transformedPoints(piece, override = {}) {
    const scale = pieceScale() * piece.size;
    const rotation = (override.rotation ?? piece.rotation) * Math.PI / 180;
    const flip = override.flip ?? piece.flip;
    const x = override.x ?? piece.x;
    const y = override.y ?? piece.y;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return piece.points.map(([px, py]) => {
      const sx = px * scale * flip;
      const sy = py * scale;
      return [x + sx * cos - sy * sin, y + sx * sin + sy * cos];
    });
  }

  function pathPiece(piece, override) {
    const points = transformedPoints(piece, override);
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }

  function drawScenery(now) {
    const horizon = cssHeight * 0.72;
    const ink = cssVar('--line');
    const shadow = cssVar('--shadow');
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = ink;

    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= cssWidth; x += 35) {
      ctx.lineTo(x, horizon - 10 - Math.sin(x * 0.035) * 8);
    }
    ctx.lineTo(cssWidth, cssHeight);
    ctx.lineTo(0, cssHeight);
    ctx.closePath();
    ctx.fill();

    const moonX = cssWidth * 0.76;
    const moonY = cssHeight * 0.18;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = cssVar('--gold');
    ctx.beginPath();
    ctx.arc(moonX, moonY, Math.min(cssWidth, cssHeight) * 0.065, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = shadow;
    for (let i = 0; i < 5; i += 1) {
      const sway = Math.sin(now / 700 + i) * 4;
      ctx.fillRect(cssWidth * (0.1 + i * 0.2) + sway, horizon - 60 - i % 2 * 18, 4, 70);
      ctx.beginPath();
      ctx.ellipse(cssWidth * (0.1 + i * 0.2) + sway, horizon - 66 - i % 2 * 18, 17, 28, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 剪影 = 影子的"家"。两批绘制：先画安静/退后的剪影把舞台压暗，再画高亮态（选中/就绪/提示）
  // 用"明亮内芯 + 多层发光描边"做出孩子一眼能认出的光晕。旧的"光晕层"被 --ghost 深色底盖掉，
  // 在暖黄舞台上几乎看不见，这次把发光描边后置、并叠加彩色内芯，兑现"拖到发光的影子上"。
  function drawTargets(now) {
    const focused = dragging ? dragging.index : selected;
    // 供 E2E 观察高亮/就绪状态，不参与渲染逻辑。
    canvas.dataset.focusedTarget = String(focused);
    canvas.dataset.armedTarget = String(armedTarget);

    // 第一批：安静的剪影。不启用 shadowBlur（昂贵），只给极淡的底与虚线边，形成聚光灯背景。
    pieces.forEach((piece, index) => {
      if (piece.placed) return;
      if (index === focused || index === armedTarget) return;
      const target = targetFor(index);
      pathPiece(piece, target);
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = cssVar('--ghost');
      ctx.fill();
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = cssVar('--line');
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.stroke();
      ctx.restore();
    });

    // 第二批：高亮态。仅 focused / armed 一两个剪影用 shadowBlur，避免每帧 7 次模糊拖慢。
    pieces.forEach((piece, index) => {
      // 灯笼提示刚放下的那块：画一圈会呼吸的光环，兑现"灯笼照亮了它的位置"。
      if (index === hintPulse) {
        const target = targetFor(index);
        const glow = 0.5 + Math.sin(now / 200) * 0.28;
        ctx.save();
        ctx.globalAlpha = Math.max(0.18, glow);
        ctx.strokeStyle = cssVar('--gold');
        ctx.lineWidth = 4;
        ctx.setLineDash([9, 7]);
        ctx.lineDashOffset = -now / 45;
        pathPiece(piece, target);
        ctx.stroke();
        ctx.restore();
      }
      if (piece.placed) return;
      const isFocused = index === focused;
      const isArmed = index === armedTarget && Boolean(dragging);
      if (!isFocused && !isArmed) return;
      const target = targetFor(index);
      const color = isArmed ? cssVar('--success') : cssVar(COLORS[index]);
      // 呼吸节奏：就绪态最快，选中其次。
      const breath = isArmed ? Math.sin(now / 130) : Math.sin(now / 320);
      const glowPulse = 0.6 + 0.4 * (breath * 0.5 + 0.5);

      // 1) 明亮内芯：让形状本体在暖黄/深色舞台上都可辨，不再被深色底稀释到看不见。
      pathPiece(piece, target);
      ctx.save();
      ctx.globalAlpha = isArmed ? 0.50 : 0.42;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // 2) 多层发光描边：外圈粗而淡 = 光晕，内圈细而亮 = 清晰边界。两套主题都清晰可辨。
      const dashed = isArmed; // 接近落点用流动虚线强调"松手就能放"。
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = (isArmed ? 22 : 16) * glowPulse + 10;
      ctx.globalAlpha = 0.40 + 0.30 * glowPulse;
      ctx.strokeStyle = color;
      ctx.lineWidth = isArmed ? 10 : 8;
      ctx.setLineDash(dashed ? [11, 7] : []);
      ctx.lineDashOffset = dashed ? -now / 40 : 0;
      pathPiece(piece, target);
      ctx.stroke();
      // 内圈亮芯：再描一道更细的实线，锁住边界轮廓。
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = color;
      ctx.lineWidth = isArmed ? 4.5 : 3.5;
      ctx.setLineDash(dashed ? [11, 7] : []);
      ctx.lineDashOffset = dashed ? -now / 40 : 0;
      pathPiece(piece, target);
      ctx.stroke();
      ctx.restore();

      // 3) 刚被选中的一瞬：放大脉冲，把注意力引到这块影子上。
      if (isFocused && focusPulseAt) {
        const elapsed = now - focusPulseAt;
        if (elapsed < 400) {
          const progress = elapsed / 400;
          const scale = 1 + 0.16 * (1 - progress) * Math.sin(Math.PI * progress);
          ctx.save();
          ctx.globalAlpha = 0.5 * (1 - progress);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.translate(target.x, target.y);
          ctx.scale(scale, scale);
          ctx.translate(-target.x, -target.y);
          pathPiece(piece, target);
          ctx.stroke();
          ctx.restore();
        } else {
          focusPulseAt = 0;
        }
      }
    });
  }

  function drawPiece(piece, index, now) {
    const color = cssVar(COLORS[index]);
    ctx.save();
    const lift = dragging?.index === index ? -5 : 0;
    if (lift) piece.y += lift;
    ctx.shadowColor = cssVar('--shadow');
    ctx.shadowBlur = dragging?.index === index ? 15 : 7;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = dragging?.index === index ? 9 : 5;
    pathPiece(piece);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = selected === index && !piece.placed ? 4 : 2;
    ctx.strokeStyle = selected === index && !piece.placed ? cssVar('--gold') : cssVar('--line');
    ctx.stroke();

    if (piece.placed) {
      ctx.globalAlpha = 0.18 + Math.sin(now / 500 + index) * 0.04;
      ctx.fillStyle = cssVar('--spotlight');
      pathPiece(piece);
      ctx.fill();
    }
    if (lift) piece.y -= lift;
    ctx.restore();
  }

  function drawFinale(now) {
    if (!finaleStarted) return;
    const elapsed = now - finaleStarted;
    const progress = Math.min(1, elapsed / 850);
    ctx.save();
    ctx.globalAlpha = 0.22 * (1 - progress);
    ctx.fillStyle = cssVar('--gold');
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.restore();

    if (elapsed > 900 && els.modal.hidden) showModal();
  }

  function draw(now = performance.now()) {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    tickSnapBack(now);
    drawScenery(now);
    drawTargets(now);
    pieces.forEach((piece, index) => drawPiece(piece, index, now));
    drawFinale(now);
    requestAnimationFrame(draw);
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi || 0.00001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pickPiece(x, y) {
    for (let index = pieces.length - 1; index >= 0; index -= 1) {
      if (!pieces[index].placed && pointInPolygon(x, y, transformedPoints(pieces[index]))) return index;
    }
    // 精确命中落空时给一点手抖空间：小手和触屏都容易点到旁边。
    let best = -1;
    let bestDistance = PICK_RADIUS;
    for (let index = pieces.length - 1; index >= 0; index -= 1) {
      const piece = pieces[index];
      if (piece.placed) continue;
      const distance = Math.hypot(x - piece.x, y - piece.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    return best;
  }

  function setFeedback(key, args = [], kind = '') {
    clearTimeout(feedbackTimer);
    feedbackTimer = 0;
    feedbackKey = key;
    feedbackArgs = args;
    feedbackKind = kind;
    renderFeedback();
  }

  function renderFeedback() {
    els.feedback.textContent = t(feedbackKey, ...feedbackArgs);
    els.feedback.className = `feedback${feedbackKind ? ` is-${feedbackKind}` : ''}`;
  }

  // 木片正在回弹时的补间：看起来是"滑回去"，不是生硬瞬移。
  function tickSnapBack(now) {
    for (const piece of pieces) {
      if (!piece.snapBack) continue;
      const progress = Math.min(1, (now - piece.snapBack.at) / SNAP_BACK_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      piece.x = piece.snapBack.fromX + (piece.snapBack.toX - piece.snapBack.fromX) * eased;
      piece.y = piece.snapBack.fromY + (piece.snapBack.toY - piece.snapBack.fromY) * eased;
      if (progress >= 1) {
        piece.x = piece.snapBack.toX;
        piece.y = piece.snapBack.toY;
        piece.snapBack = null;
      }
    }
  }

  function trySnap(index) {
    const piece = pieces[index];
    const target = targetFor(index);
    const verdict = resolveSnap(piece, target, pieceScale());

    if (verdict.ok) {
      piece.x = target.x;
      piece.y = target.y;
      piece.rotation = target.rotation;
      piece.flip = target.flip;
      piece.placed = true;
      piece.snapBack = null;
      hintPulse = -1;
      armedTarget = -1;
      audio.tone('success');
      const count = pieces.filter((candidate) => candidate.placed).length;
      window.cool.track('place_tangram_piece', { scene: sceneIndex + 1, piece: piece.id });
      if (count === pieces.length) {
        setFeedback('lastPiece', [], 'good');
        completeScene();
      } else {
        selected = pieces.findIndex((candidate) => !candidate.placed);
        setFeedback('correct', [t('pieces')[index], count], 'good');
      }
      focusPulseAt = performance.now();
      renderUI();
      return true;
    }

    // 没放对：说清楚差在哪里，然后滑回后台，而不是瞬间消失。
    const source = sourceFor(index);
    piece.snapBack = { at: performance.now(), fromX: piece.x, fromY: piece.y, toX: source.x, toY: source.y };
    const key = verdict.reason === 'angle' ? 'wrongAngle' : verdict.reason === 'flip' ? 'wrongFlip' : 'wrongFar';
    setFeedback(key, [], 'wrong');
    audio.tone('error');
    window.cool.track(verdict.reason === 'far' ? 'misplace_far' : 'misplace_angle', { scene: sceneIndex + 1 });
    clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => setFeedback('selected', [t('pieces')[index]], ''), 1400);
    return false;
  }

  function pointerDown(event) {
    if (finaleStarted || !els.modal.hidden) return;
    unlockAudio();
    const point = canvasPoint(event);
    const index = pickPiece(point.x, point.y);

    // 点空舞台什么也不做：旧实现会把手上那块木片瞬移到点击处，孩子会被吓一跳。
    if (index < 0) return;

    selected = index;
    const piece = pieces[index];
    piece.snapBack = null;
    dragging = { index, dx: point.x - piece.x, dy: point.y - piece.y };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    audio.tone('pick');
    setFeedback('selected', [t('pieces')[index]], '');
    focusPulseAt = performance.now();
    renderUI();
  }

  function pointerMove(event) {
    if (!dragging) return;
    const point = canvasPoint(event);
    const piece = pieces[dragging.index];
    piece.x = point.x - dragging.dx;
    piece.y = point.y - dragging.dy;
    // 吸附预览：接近目标时剪影转绿，松开就能放。
    const target = targetFor(dragging.index);
    const near = Math.hypot(piece.x - target.x, piece.y - target.y) <= snapRadius(pieceScale());
    const next = near ? dragging.index : -1;
    if (next !== armedTarget) {
      armedTarget = next;
      if (near) audio.tone('hint');
    }
  }

  function pointerUp(event) {
    if (!dragging) return;
    const index = dragging.index;
    dragging = null;
    armedTarget = -1;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    trySnap(index);
  }

  function transformSelected(deltaRotation = 0, shouldFlip = false) {
    const piece = pieces[selected];
    if (!piece || piece.placed || finaleStarted) return;
    unlockAudio();
    piece.rotation = normalizeAngle(piece.rotation + deltaRotation);
    if (shouldFlip) piece.flip *= -1;
    focusPulseAt = performance.now();
    audio.tone('action');
    setFeedback('selected', [t('pieces')[selected]], '');
    window.cool.track(shouldFlip ? 'flip_tangram_piece' : 'turn_tangram_piece');
  }

  function placeHint() {
    if (finaleStarted) return;
    unlockAudio();
    let index = selected;
    if (pieces[index]?.placed) index = pieces.findIndex((piece) => !piece.placed);
    if (index < 0) return;
    const piece = pieces[index];
    const target = targetFor(index);
    piece.x = target.x;
    piece.y = target.y;
    piece.rotation = target.rotation;
    piece.flip = target.flip;
    piece.placed = true;
    piece.snapBack = null;
    hintPulse = index;
    audio.tone('hint');
    const count = pieces.filter((candidate) => candidate.placed).length;
    setFeedback(count === 7 ? 'lastPiece' : 'hintPlaced', count === 7 ? [] : [t('pieces')[index]], 'good');
    window.cool.track('use_tangram_hint', { scene: sceneIndex + 1 });
    if (count === 7) completeScene();
    else selected = pieces.findIndex((candidate) => !candidate.placed);
    renderUI();
  }

  function completeScene() {
    if (finaleStarted) return;
    finaleStarted = performance.now();
    completed = Math.max(completed, sceneIndex + 1);
    if (sceneIndex < TARGETS.length - 1) unlocked = Math.max(unlocked, sceneIndex + 1);
    audio.tone('complete');
    save();
    window.cool.stage(`act-${sceneIndex + 1}-complete`);
    if (sceneIndex === TARGETS.length - 1) window.cool.complete?.();
  }

  function showModal() {
    const scene = t('scenes')[sceneIndex];
    els.modalKicker.textContent = scene.tab;
    els.modalArt.textContent = scene.art;
    els.modalTitle.textContent = scene.title;
    els.modalText.textContent = scene.text;
    els.next.textContent = sceneIndex === TARGETS.length - 1 ? t('replay') : t('next');
    els.modal.hidden = false;
  }

  function switchScene(index) {
    if (index > unlocked) {
      setFeedback('locked', [], 'wrong');
      return;
    }
    sceneIndex = index;
    els.modal.hidden = true;
    save();
    resetPieces(false);
    setFeedback(index < completed ? 'completedScene' : 'intro', [], '');
    window.cool.stage(`act-${sceneIndex + 1}`);
    renderUI();
  }

  function nextScene() {
    if (sceneIndex === TARGETS.length - 1) {
      instances[0]=rounds.next(0);TARGETS[0]=instances[0].targets;
      switchScene(0);
      return;
    }
    switchScene(sceneIndex + 1);
  }

  function renderTabs() {
    els.tabs.innerHTML = t('scenes').map((scene, index) => `
      <button class="scene-tab ${index === sceneIndex ? 'is-active' : ''} ${index < completed ? 'is-done' : ''}"
        type="button" data-scene="${index}" ${index > unlocked ? 'disabled' : ''}>${scene.tab}</button>
    `).join('');
    els.tabs.querySelectorAll('[data-scene]').forEach((button) => {
      button.addEventListener('click', () => switchScene(Number(button.dataset.scene)));
    });
  }

  function renderShelf() {
    els.shelf.innerHTML = pieces.map((piece, index) => `
      <button class="piece-button ${selected === index ? 'is-active' : ''} ${piece.placed ? 'is-placed' : ''}"
        type="button" role="option" aria-selected="${selected === index}" data-piece="${index}"
        data-shape="${piece.shape}" aria-label="${t('pieces')[index]}"
        style="--piece-color:${cssVar(COLORS[index])}">
        <span class="piece-button__shape" aria-hidden="true"></span>
      </button>
    `).join('');
    els.shelf.querySelectorAll('[data-piece]').forEach((button) => {
      button.addEventListener('click', () => {
        selected = Number(button.dataset.piece);
        const piece = pieces[selected];
        setFeedback(piece.placed ? 'completedScene' : 'selected', piece.placed ? [] : [t('pieces')[selected]], '');
        renderUI();
      });
    });
  }

  function renderUI() {
    if (!pieces.length) return;
    const count = pieces.filter((piece) => piece.placed).length;
    const scene = t('scenes')[sceneIndex];
    els.mission.textContent = scene.mission;
    els.progress.textContent = `${count}/${PIECE_COUNT}`;
    els.act.textContent = `${sceneIndex + 1}/${TARGETS.length}`;
    els.pieceName.textContent = t('pieces')[selected];
    els.left.disabled = pieces[selected].placed || Boolean(finaleStarted);
    els.right.disabled = pieces[selected].placed || Boolean(finaleStarted);
    els.flip.disabled = pieces[selected].placed || Boolean(finaleStarted);
    els.hint.disabled = Boolean(finaleStarted);
    // 舞台上的那一句动作邀请：孩子不用去工具箱里找怎么玩。
    els.coach.textContent = count === 0 && sceneIndex === 0 ? t('coach') : '';
    els.coach.hidden = !els.coach.textContent;
    els.hint.setAttribute('aria-label', t('hint'));
    els.reset.setAttribute('aria-label', t('reset'));
    els.theme.setAttribute('aria-label', t('theme'));
    els.sound.setAttribute('aria-label', audio.muted ? t('soundOff') : t('sound'));
    els.sound.setAttribute('aria-pressed', String(audio.muted));
    els.sound.textContent = audio.muted ? '🔇' : '🔊';
    canvas.setAttribute('aria-label', t('stageLabel'));
    els.shelf.setAttribute('aria-label', t('shelfLabel'));
    document.querySelector('.control-row').setAttribute('aria-label', t('controlsLabel'));
    renderFeedback();
    renderTabs();
    renderShelf();
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  els.left.addEventListener('click', () => transformSelected(-45));
  els.right.addEventListener('click', () => transformSelected(45));
  els.flip.addEventListener('click', () => transformSelected(0, true));
  els.hint.addEventListener('click', placeHint);
  els.reset.addEventListener('click', () => {
    unlockAudio();
    resetPieces(false);
    setFeedback('resetDone', [], '');
    audio.tone('action');
    window.cool.track('reset_tangram_act', { scene: sceneIndex + 1 });
  });
  els.next.addEventListener('click', nextScene);
  els.sound.addEventListener('click', () => {
    unlockAudio();
    audio.set('muted', !audio.muted);
    renderUI();
  });
  els.lang.addEventListener('click', () => window.cool.preferences.toggleLang());
  els.theme.addEventListener('click', () => window.cool.preferences.toggleTheme());
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') transformSelected(-45);
    if (event.key === 'ArrowRight') transformSelected(45);
    if (event.key.toLowerCase() === 'f') transformSelected(0, true);
  });

  readSave();
  if(rounds.active!==null)sceneIndex=clampSceneIndex(Number(rounds.active),TARGETS.length);
  new ResizeObserver(resizeCanvas).observe(canvas);
  window.cool.bindI18n(I18N, {
    onChange({ t: translate, lang, theme }) {
      t = translate;
      document.title = t('doc');
      els.lang.textContent = lang === 'zh' ? 'EN' : '中';
      els.theme.textContent = theme === 'light' ? '🌙' : '☀️';
      renderUI();
    },
  });
  resizeCanvas();
  rounds.attach({parent:els.hint.parentElement,dialog:'#modal',compact:true,active:()=>sceneIndex,
    capture:()=>({selected,pieces:pieces.map((p,i)=>({x:p.snapBack?sourceFor(i).x/cssWidth:p.x/cssWidth,y:p.snapBack?sourceFor(i).y/cssHeight:p.y/cssHeight,rotation:p.rotation,flip:p.flip,placed:p.placed})),finished:pieces.every(p=>p.placed)}),
    restore:s=>{
      if(!validTangramPlay(s))throw new Error('Invalid tangram');
      selected=s.selected;
      pieces=s.pieces.map((p,i)=>({...PIECE_DEFS[i],...p,x:p.placed?targetFor(i).x:p.x*cssWidth,y:p.placed?targetFor(i).y:p.y*cssHeight,snapBack:null}));
      if(s.finished&&pieces.every(p=>p.placed)){finaleStarted=performance.now();showModal();}
      renderUI();
    },retry:()=>resetPieces(false)});
  requestAnimationFrame(draw);
})();
