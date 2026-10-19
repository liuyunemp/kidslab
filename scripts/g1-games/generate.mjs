// Generates self-contained static course source directories from the reviewed data.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { retryFileOperation } from '../build-workspace.mjs';
import { courses } from './data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const bgm = path.join(root, 'docs', 'courseware-template', 'audio', 'lab-glow.ogg');
/* Windows 下编辑器/杀软可能瞬时锁住刚动过的文件（UNKNOWN/EBUSY），与 build 产物发布同一套重试。 */
const write = (file, data) => retryFileOperation(() => writeFile(file, data));

for (const [index, course] of courses.entries()) {
  if (course.tasks.length < 10 || new Set(course.tasks.map((task) => task.id)).size !== course.tasks.length) {
    throw new Error(`${course.id}: expected at least ten uniquely identified tasks`);
  }
  const dir = path.join(root, 'src', course.id);
  await mkdir(path.join(dir, 'audio'), { recursive: true });
  for (const name of ['engine.js', 'model.js', 'style.css']) {
    await write(path.join(dir, name), await readFile(path.join(here, name)));
  }
  for(const [source,target] of [['core.js','random-core.js'],['browser.js','random-rounds.js'],['g1.js','random-model.js'],['worker.js','random-worker.js'],['worker-client.js','random-worker-client.js']]){
    await write(path.join(dir,target),await readFile(path.join(here,'..','random-rounds',source)));
  }
  await retryFileOperation(() => cp(bgm, path.join(dir, 'audio', 'bgm.ogg')));
  const { id, kind, category, grades, tags, icon, title, description, accent, backdrop, mascot, tasks, source, fact, order } = course;
  const config = { id, kind, category, grades, tags, icon, title, description, accent, backdrop, mascot, tasks };
  await write(path.join(dir, 'config.js'), `export const config = ${JSON.stringify(config, null, 2)};\n`);
  await write(path.join(dir, 'main.js'), "import { startGame } from './engine.js';\nimport { config } from './config.js';\nstartGame(config);\n");
  await write(path.join(dir, 'course.json'), JSON.stringify({
    id, title, description, category, levels: ['primary'], grades, tags, icon,
    order: order ?? (category === 'math' ? 30 + index : 201 + index), badge: 'new',
  }, null, 2) + '\n');
  await write(path.join(dir, 'facts.md'), `# ${id} 知识断言\n\n## 适用范围\n- 本课仅涵盖 ${title.zh} 实际出现的内容；教材归属为 ${grades.length ? grades.join("、") : "待核准，仅在全部年级显示"}，科目为 ${category}。年级依据见 docs/courseware-plan/classification-audit.md。\n\n## 知识断言\n- [F1] ${fact}[S1]\n\n## 来源\n- [S1] ${source}\n`);
  await write(path.join(dir, 'index.html'), `<!doctype html>\n<html lang="zh-CN" data-theme="light">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n  <meta name="theme-color" content="${accent}">\n  <title>${title.zh} · KidsLab</title>\n  <link rel="stylesheet" href="./style.css">\n  <script src="../../scripts/sdk/core.js" data-kidslab-sdk></script>\n  <script>try{document.documentElement.dataset.theme=localStorage.getItem('kidslab.theme')||'light'}catch{}</script>\n</head>\n<body>\n  <header class="topbar">\n    <a class="back" id="back" href="../../index.html">← 返回</a>\n    <h1 id="title">${icon} ${title.zh}</h1>\n    <div class="top-actions">\n      <button class="icon-button" id="speechBtn" type="button" aria-label="关闭朗读" aria-pressed="true">🔊</button>\n      <button class="icon-button" id="musicBtn" type="button" aria-label="关闭音乐" aria-pressed="true">♫</button>\n      <button class="icon-button" id="effectsBtn" type="button" aria-label="关闭音效" aria-pressed="true">🔔</button>\n      <button class="icon-button" id="themeBtn" type="button" aria-label="切换主题">🌙</button>\n      <button class="icon-button" id="languageBtn" type="button" aria-label="切换语言">EN</button>\n    </div>\n  </header>\n  <main class="game">\n    <button class="intro" id="intro" type="button"><span class="speak-icon" aria-hidden="true">🔊</span><span id="introText">${description.zh}</span></button>\n    <div class="progress-row"><span class="count" id="count">1/8</span><div class="track" id="track" aria-hidden="true"></div><span class="stars" id="stars">⭐ 0</span></div>\n    <section class="stage" id="stage" aria-live="polite"></section>\n    <p class="praise" id="praise" aria-live="polite" hidden></p>\n    <p class="feedback" id="feedback" aria-live="polite"></p>\n  </main>\n  <script type="module" src="./main.js"></script>\n</body>\n</html>\n`);
  process.stdout.write(`generated ${id}\n`);
}
