/* ============================================================
   KidsLab — 平台逻辑
   levels / categories / search / i18n / themes / collapse
   ============================================================ */
// 无 DOM 的目录规则；与页面放在同一资源内，沿用主站指纹和离线缓存。
const CourseCatalog = (() => {
  const gradePattern = /^g([1-9]|1[0-2])([ab])?$/;
  const grades = (course) => new Set((Array.isArray(course.grades) ? course.grades : [])
    .filter((value) => typeof value === 'string' && gradePattern.test(value)));
  const hasGrade = (course, grade) => {
    const tokens = grades(course);
    return tokens.has(grade) || tokens.has(`${grade}a`) || tokens.has(`${grade}b`);
  };
  function matchesGrade(course, grade = 'all', term = 'all') {
    if (grade === 'all') return term === 'all';
    if (!/^g([1-9]|1[0-2])$/.test(grade)) return false;
    if (term === 'all') return hasGrade(course, grade);
    if (term !== 'a' && term !== 'b') return false;
    const tokens = grades(course);
    return tokens.has(grade) || tokens.has(`${grade}${term}`);
  }
  function matchesCategory(course, category = 'all', progress = () => null) {
    if (category === 'all') return true;
    if (category === 'recent') return !!progress(course.id);
    if (category === 'newest') return course.badge === 'new';
    return course.category === category;
  }
  function matchesScope(course, { level, grade = 'all', term = 'all', cat = 'all' }, progress) {
    return course.listed !== false && !!course.levels?.includes(level)
      && matchesGrade(course, grade, term) && matchesCategory(course, cat, progress);
  }
  function curriculumEntries(course, grade = 'all', term = 'all') {
    const tokens = grades(course);
    return (Array.isArray(course.curriculum) ? course.curriculum : []).filter(entry =>
      entry && entry.bookId && entry.unitId && gradePattern.test(entry.grade)
      && (tokens.has(entry.grade) || (/[ab]$/.test(entry.grade) && tokens.has(entry.grade.slice(0, -1))))
      && (grade === 'all' || matchesGrade({ grades: [entry.grade] }, grade, term)));
  }
  function curriculumGroups(courses, { grade, term = 'all' }, include = () => true) {
    if (!grade || grade === 'all') return [];
    const groups = new Map();
    for (const course of courses) {
      for (const entry of curriculumEntries(course, grade, term)) {
        if (!include(course, entry)) continue;
        const key = `${entry.bookId}/${entry.unitId}`;
        if (!groups.has(key)) groups.set(key, { ...entry, key, category: course.category, items: [] });
        groups.get(key).items.push({ course, entry });
      }
    }
    const subjects = ['math', 'chinese', 'science', 'physics', 'chemistry', 'programming', 'logic'];
    const semester = token => token.endsWith('a') ? 0 : token.endsWith('b') ? 1 : 2;
    const result = [...groups.values()].sort((a, b) => subjects.indexOf(a.category) - subjects.indexOf(b.category)
      || semester(a.grade) - semester(b.grade) || a.bookId.localeCompare(b.bookId)
      || a.unitOrder - b.unitOrder || a.unitId.localeCompare(b.unitId));
    for (const group of result) group.items.sort((a, b) => a.entry.page - b.entry.page
      || a.entry.lessonOrder - b.entry.lessonOrder || a.course.id.localeCompare(b.course.id)
      || (a.entry.activity || '').localeCompare(b.entry.activity || ''));
    return result;
  }
  function entryPath(course, entry) {
    if (!entry?.activity) return course.path;
    const [path, hash] = course.path.split('#');
    return `${path}${path.includes('?') ? '&' : '?'}activity=${encodeURIComponent(entry.activity)}${hash ? `#${hash}` : ''}`;
  }
  return { grades, hasGrade, matchesGrade, matchesCategory, matchesScope, curriculumEntries, curriculumGroups, entryPath };
})();

/* ---------- 平台 UI ---------- */
(() => {
  'use strict';

  /* ---------- 常量 ---------- */
  const LS = {
    lang: 'kidslab.lang',
    theme: 'kidslab.theme',
    accent: 'kidslab.accent',
    level: 'kidslab.level',
    grade: 'kidslab.grade',
    term: 'kidslab.term',
    collapsed: 'kidslab.sidebar',
  };
  const PROGRESS_PREFIX = 'kidslab.progress.';
  const local = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); return true; } catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); return true; } catch { return false; }
    },
    keys() {
      try { return Object.keys(localStorage); } catch { return []; }
    },
  };
  const session = {
    get(key) {
      try { return sessionStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { sessionStorage.setItem(key, value); return true; } catch { return false; }
    },
  };

  const LEVELS = ['primary', 'junior', 'senior'];
  const GRADES = [
    { id: 'g1', level: 'primary' },
    { id: 'g2', level: 'primary' },
    { id: 'g3', level: 'primary' },
    { id: 'g4', level: 'primary' },
    { id: 'g5', level: 'primary' },
    { id: 'g6', level: 'primary' },
    { id: 'g7', level: 'junior' },
    { id: 'g8', level: 'junior' },
    { id: 'g9', level: 'junior' },
    { id: 'g10', level: 'senior' },
    { id: 'g11', level: 'senior' },
    { id: 'g12', level: 'senior' },
  ];
  const GRADE_IDS = new Set(GRADES.map((g) => g.id));
  const TERMS = [{ id: 'a' }, { id: 'b' }];
  const TERM_IDS = new Set(TERMS.map((tm) => tm.id));
  const LEVEL_GRADE_IDS = Object.fromEntries(LEVELS.map((lv) => [lv, new Set(GRADES.filter((g) => g.level === lv).map((g) => g.id))]));

  const CATS = [
    { id: 'all',         icon: '✨', color: 'var(--accent)' },
    { id: 'recent',      icon: '👀', color: 'var(--c-recent)', special: true },
    { id: 'newest',      icon: '🆕', color: 'var(--c-newest)', special: true },
    { id: 'math',        icon: '🧮', color: 'var(--c-math)' },
    { id: 'physics',     icon: '🧲', color: 'var(--c-physics)' },
    { id: 'chemistry',   icon: '⚗️', color: 'var(--c-chemistry)' },
    { id: 'programming', icon: '💻', color: 'var(--c-programming)' },
    { id: 'science',     icon: '🔬', color: 'var(--c-science)' },
    { id: 'logic',       icon: '🧩', color: 'var(--c-logic)' },
    { id: 'chinese',     icon: '📚', color: 'var(--c-chinese)' },
  ];
  /* 小学只显示这些分类（含两个特殊快捷项） */
  const PRIMARY_CATS = new Set(['all', 'recent', 'newest', 'math', 'chinese', 'programming', 'science', 'logic']);
  const CAT_IDS = new Set(CATS.map((c) => c.id));

  const ACCENTS = [
    { id: 'candy', sw: '#ff5d8f' },
    { id: 'ocean', sw: '#2f9df4' },
    { id: 'forest', sw: '#2fbf71' },
    { id: 'tangerine', sw: '#ff8a00' },
  ];


  /* ---------- 文案 ---------- */
  const I18N = {
    zh: {
      siteName: 'KidsLab',
      siteSub: 'K12 Playground',
      docTitle: 'KidsLab · 互动课件学习乐园',
      secLevel: '学段',
      secGrade: '年级',
      secTerm: '学期',
      secCats: '分类',
      searchPh: '搜索课件：分数、单摆、编程……',
      heroTitle: {
        primary: '嗨，小小探索家！',
        junior: '来实验室，拧旋钮看变化',
        senior: '调参数，让规律自己长出来',
      },
      tipTheme: '切换深浅主题',
      tipStarmap: '知识星图 · 换个方式探索',
      tipLang: 'Switch to English',
      tipCollapse: '收起 / 展开侧栏',
      menu: '打开菜单', navigation: '导航', home: 'KidsLab 首页', selectLevel: '选择学段', selectGrade: '选择年级', selectTerm: '选择学期', accent: '强调色', accentNames: { candy: '糖果粉', ocean: '海洋蓝', forest: '森林绿', tangerine: '橘子橙' },
      emptyTitle: '没有找到匹配的课件',
      emptyDesc: '换个关键词，或者去别的分类逛逛吧～',
      emptyReset: '清除筛选',
      footMade: '用 ❤ 为好奇心而建',
      langBtn: 'EN',
      count: (n) => `共 ${n} 个课件`,
      total: (n) => `· ${n} 个课件`,
      pinned: '精选',
      played: '玩过',
      completed: '已完成',
      offline: '可离线',
      clearProgress: '清除本机进度',
      clearProgressConfirm: '清除全部本机课件进度？语言和主题设置会保留。',
      gradeAll: '全部年级',
      otherCourses: '本年级其他课件',
      wholeCourse: '整课探索',
      curriculumCount: (courses, entries) => `共 ${courses} 个课件 · ${entries} 个探索入口`,
      unitCount: (entries) => `${entries} 个探索入口`,
      stageCount: (n, m) => `${n} 关 · 已玩 ${m} 关`,
      textbookPage: (page) => `教材第 ${page} 页`,
      loadErr: '课件清单加载失败，请先运行 npm run build 并通过 npm run preview 访问。',
      levels: { primary: '小学', junior: '初中', senior: '高中' },
      lvShort: { primary: '小', junior: '初', senior: '高' },
      grades: {
        g1: '一年级', g2: '二年级', g3: '三年级', g4: '四年级', g5: '五年级', g6: '六年级',
        g7: '七年级', g8: '八年级', g9: '九年级', g10: '高一', g11: '高二', g12: '高三',
      },
      termAll: '全部学期',
      terms: { a: '上册', b: '下册' },
      cats: {
        all: '全部', recent: '最近探索的', newest: '最新创建的',
        math: '数学', physics: '物理', chemistry: '化学',
        programming: '编程', science: '科学', logic: '逻辑', chinese: '语文', featured: '精选',
      },
    },
    en: {
      siteName: 'KidsLab',
      siteSub: 'K12 Playground',
      docTitle: 'KidsLab · Interactive Courseware Playground',
      secLevel: 'Stage',
      secGrade: 'Grade',
      secTerm: 'Term',
      secCats: 'Subjects',
      searchPh: 'Search: fractions, pendulum, coding…',
      heroTitle: {
        primary: 'Hey, little explorer!',
        junior: 'Open a lab. Twist a knob.',
        senior: 'Tune the dials. Watch the law appear.',
      },
      tipTheme: 'Toggle light / dark theme',
      tipStarmap: 'Knowledge star map · explore differently',
      tipLang: '切换到中文',
      tipCollapse: 'Collapse / expand sidebar',
      menu: 'Open menu', navigation: 'Navigation', home: 'KidsLab home', selectLevel: 'Select stage', selectGrade: 'Select grade', selectTerm: 'Select term', accent: 'Accent color', accentNames: { candy: 'Candy pink', ocean: 'Ocean blue', forest: 'Forest green', tangerine: 'Tangerine orange' },
      emptyTitle: 'No courseware found',
      emptyDesc: 'Try another keyword, or explore other subjects~',
      emptyReset: 'Clear filters',
      footMade: 'Built with ❤ for curiosity',
      langBtn: '中',
      count: (n) => `${n} courseware${n === 1 ? '' : 's'}`,
      total: (n) => `· ${n} items`,
      pinned: 'Featured',
      played: 'Played',
      completed: 'Completed',
      offline: 'Offline OK',
      clearProgress: 'Clear local progress',
      clearProgressConfirm: 'Clear all local course progress? Language and theme settings will stay unchanged.',
      gradeAll: 'All grades',
      otherCourses: 'Other courses in this grade',
      wholeCourse: 'Explore the course',
      curriculumCount: (courses, entries) => `${courses} courses · ${entries} exploration entries`,
      unitCount: (entries) => `${entries} exploration entries`,
      stageCount: (n, m) => `${n} levels · ${m} played`,
      textbookPage: (page) => `Textbook p. ${page}`,
      loadErr: 'Failed to load the manifest. Run `npm run build` then `npm run preview`.',
      levels: { primary: 'Primary', junior: 'Middle', senior: 'High' },
      lvShort: { primary: 'P', junior: 'M', senior: 'H' },
      grades: {
        g1: 'Grade 1', g2: 'Grade 2', g3: 'Grade 3', g4: 'Grade 4', g5: 'Grade 5', g6: 'Grade 6',
        g7: 'Grade 7', g8: 'Grade 8', g9: 'Grade 9', g10: 'Grade 10', g11: 'Grade 11', g12: 'Grade 12',
      },
      termAll: 'All terms',
      terms: { a: 'Fall', b: 'Spring' },
      cats: {
        all: 'All', recent: 'Recently explored', newest: 'Newly created',
        math: 'Math', physics: 'Physics', chemistry: 'Chemistry',
        programming: 'Coding', science: 'Science', logic: 'Logic', chinese: 'Chinese', featured: 'Featured',
      },
    },
  };

  /* ---------- 状态 ---------- */
  const params = new URLSearchParams(location.search);
  const state = {
    lang: params.get('lang') || local.get(LS.lang) || (navigator.language?.startsWith('zh') ? 'zh' : 'en'),
    theme: local.get(LS.theme) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    accent: local.get(LS.accent) || 'candy',
    level: params.get('level') || local.get(LS.level) || 'primary',
    grade: params.get('grade') || local.get(LS.grade) || 'all',
    term: params.get('term') || local.get(LS.term) || 'all',
    cat: params.get('cat') || session.get('kidslab.cat') || 'all',
    q: params.get('q') ?? session.get('kidslab.q') ?? '',
    courses: [],
  };
  if (!LEVELS.includes(state.level)) state.level = 'primary';
  if (state.grade !== 'all' && !GRADE_IDS.has(state.grade)) state.grade = 'all';
  if (state.grade !== 'all' && !LEVEL_GRADE_IDS[state.level]?.has(state.grade)) state.grade = 'all';
  if (state.term !== 'all' && (state.grade === 'all' || !TERM_IDS.has(state.term))) state.term = 'all';
  if (!['zh', 'en'].includes(state.lang)) state.lang = 'zh';
  if (!CAT_IDS.has(state.cat)) state.cat = 'all';
  if (!ACCENTS.some((a) => a.id === state.accent)) state.accent = 'candy';

  const t = () => I18N[state.lang];
  const $ = (s) => document.querySelector(s);

  const el = {
    app: $('#app'), sidebar: $('#sidebar'), backdrop: $('#backdrop'),
    levelSeg: $('#levelSeg'), catList: $('#catList'), accentRow: $('#accentRow'),
    gradeSec: $('#gradeSec'), gradeList: $('#gradeList'),
    termSec: $('#termSec'), termList: $('#termList'),
    grid: $('#grid'), empty: $('#emptyBox'), search: $('#searchInput'),
    heroTitle: $('#heroTitle'), crumb: $('#crumb'), countText: $('#countText'),
    courseTotal: $('#courseTotal'), clearProgress: $('#clearProgressBtn'),
  };

  /* ---------- 主题 / 强调色 / 语言 ---------- */
  function applyChrome() {
    const root = document.documentElement;
    root.dataset.theme = state.theme;
    root.dataset.accent = state.accent;
    root.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t().docTitle;

    document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t()[n.dataset.i18n] ?? n.textContent; });
    document.querySelectorAll('[data-i18n-title]').forEach((n) => { n.title = t()[n.dataset.i18nTitle] ?? n.title; n.setAttribute('aria-label', n.title); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((n) => { n.placeholder = t()[n.dataset.i18nPlaceholder] ?? ''; });
    $('#langBtn').textContent = t().langBtn;
    for (const [selector, key] of Object.entries({ '#menuBtn': 'menu', '#sidebar': 'navigation', '.brand': 'home', '#levelSeg': 'selectLevel', '#gradeList': 'selectGrade', '#termList': 'selectTerm', '#accentRow': 'accent', '#searchInput': 'searchPh' })) {
      $(selector).setAttribute('aria-label', t()[key]);
    }
    $('#themeBtn').setAttribute('aria-pressed', String(state.theme === 'dark'));
    const hero = t().heroTitle[state.level] || t().heroTitle.primary;
    el.heroTitle.innerHTML = `${hero}<span class="hero__wave">👋</span>`;
  }

  function persist() {
    local.set(LS.lang, state.lang);
    local.set(LS.theme, state.theme);
    local.set(LS.accent, state.accent);
    local.set(LS.level, state.level);
    local.set(LS.grade, state.grade);
    local.set(LS.term, state.term);
    session.set('kidslab.cat', state.cat);
    session.set('kidslab.q', state.q);
    const p = new URLSearchParams();
    if (state.level !== 'primary') p.set('level', state.level);
    if (state.grade !== 'all') p.set('grade', state.grade);
    if (state.term !== 'all') p.set('term', state.term);
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.q) p.set('q', state.q);
    history.replaceState(null, '', p.size ? `?${p}` : location.pathname);
  }

  /* ---------- 侧栏渲染 ---------- */
  function renderLevels() {
    el.levelSeg.innerHTML = '';
    for (const lv of LEVELS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'radio';
      b.dataset.level = lv;
      b.textContent = t().levels[lv];
      b.setAttribute('aria-checked', String(state.level === lv));
      b.addEventListener('click', () => {
        state.level = lv;
        if (state.grade !== 'all' && !LEVEL_GRADE_IDS[lv]?.has(state.grade)) { state.grade = 'all'; state.term = 'all'; }
        update();
      });
      el.levelSeg.appendChild(b);
    }
  }

  const inLevel = (c) => c.listed !== false && c.levels?.includes(state.level);
  const gradeInLevel = (grade, level = state.level) => grade === 'all' || LEVEL_GRADE_IDS[level]?.has(grade);

  const splitGrade = (token) => {
    const m = /^(g(?:[1-9]|1[0-2]))([ab])?$/.exec(String(token || ''));
    return m ? { grade: m[1], term: m[2] || null } : { grade: null, term: null };
  };

  const courseGrades = CourseCatalog.grades;
  const courseHasGrade = CourseCatalog.hasGrade;
  const inGrade = (c) => CourseCatalog.matchesGrade(c, state.grade, state.term);

  function availableGrades() {
    // 零门课也保留入口，不能把合法的空筛选自动放宽成“全部”。
    return GRADES.filter((g) => g.level === state.level);
  }

  function renderGrades() {
    const grades = availableGrades();
    if (!grades.length) {
      state.grade = 'all';
      state.term = 'all';
      el.gradeList.innerHTML = '';
      el.gradeSec.hidden = true;
      return;
    }
    if (!gradeInLevel(state.grade) || (state.grade !== 'all' && !grades.some((g) => g.id === state.grade))) { state.grade = 'all'; state.term = 'all'; }
    el.gradeSec.hidden = false;
    el.gradeList.innerHTML = '';

    const inCurrentScope = (c) => inLevel(c) && matchesCat(c, state.cat);
    const options = [
      { id: 'all', label: t().gradeAll, count: state.courses.filter(c => inCurrentScope(c) && matchQuery(c, state.q, 'all', 'all')).length },
      ...grades.map((g) => ({
        id: g.id,
        label: t().grades[g.id],
        count: state.courses.filter((c) => inCurrentScope(c) && courseHasGrade(c, g.id) && matchQuery(c, state.q, g.id, 'all')).length,
      })),
    ];

    for (const opt of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'radio';
      b.dataset.grade = opt.id;
      b.setAttribute('aria-checked', String(state.grade === opt.id));
      b.innerHTML = '<span class="grade__name"></span><span class="grade__count"></span>';
      b.querySelector('.grade__name').textContent = opt.label;
      b.querySelector('.grade__count').textContent = opt.count;
      b.addEventListener('click', () => { state.grade = opt.id; state.term = 'all'; closeDrawer(); update(); });
      el.gradeList.appendChild(b);
    }
  }

  function renderTerms() {
    if (!el.termSec) return;
    // 具体年级始终可选上下册，包括该册暂无课件的情况。
    if (state.grade === 'all') {
      state.term = 'all';
      el.termList.innerHTML = '';
      el.termSec.hidden = true;
      return;
    }
    if (state.term !== 'all' && !TERM_IDS.has(state.term)) state.term = 'all';
    el.termSec.hidden = false;
    el.termList.innerHTML = '';

    const inCurrentScope = (c) => inLevel(c) && matchesCat(c, state.cat)
      && courseHasGrade(c, state.grade);
    const countTerm = (termId) => state.courses.filter((c) => {
      if (!inCurrentScope(c)) return false;
      const set = courseGrades(c);
      return (set.has(state.grade) || set.has(`${state.grade}${termId}`)) && matchQuery(c, state.q, state.grade, termId);
    }).length;
    const options = [
      { id: 'all', label: t().termAll, count: state.courses.filter(c => inCurrentScope(c) && matchQuery(c, state.q, state.grade, 'all')).length },
      ...TERMS.map((tm) => ({ id: tm.id, label: t().terms[tm.id], count: countTerm(tm.id) })),
    ];

    for (const opt of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'radio';
      b.dataset.term = opt.id;
      b.setAttribute('aria-checked', String(state.term === opt.id));
      b.innerHTML = '<span class="grade__name"></span><span class="grade__count"></span>';
      b.querySelector('.grade__name').textContent = opt.label;
      b.querySelector('.grade__count').textContent = opt.count;
      b.addEventListener('click', () => { state.term = opt.id; closeDrawer(); update(); });
      el.termList.appendChild(b);
    }
  }

  function renderCats() {
    el.catList.innerHTML = '';
    const visible = state.level === 'primary' ? CATS.filter((c) => PRIMARY_CATS.has(c.id) || c.id === state.cat) : CATS;
    for (const cat of visible) {
      const n = state.courses.filter((c) => inLevel(c) && inGrade(c) && matchesCat(c, cat.id) && matchQuery(c, state.q)).length;
      const li = document.createElement('li');
      if (cat.special) li.className = 'cat-list__special';
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.cat = cat.id;
      b.style.setProperty('--cat-c', cat.color);
      b.classList.toggle('is-active', state.cat === cat.id);
      b.innerHTML = `<span class="cat__dot">${cat.icon}</span><span class="cat__name"></span><span class="cat__count">${n}</span>`;
      b.querySelector('.cat__name').textContent = t().cats[cat.id];
      b.addEventListener('click', () => { state.cat = cat.id; closeDrawer(); update(); });
      li.appendChild(b);
      el.catList.appendChild(li);
    }
  }

  function renderAccents() {
    el.accentRow.innerHTML = '';
    for (const a of ACCENTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--sw', a.sw);
      b.title = t().accentNames[a.id];
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', String(state.accent === a.id));
      b.classList.toggle('is-active', state.accent === a.id);
      b.addEventListener('click', () => { state.accent = a.id; update(); });
      el.accentRow.appendChild(b);
    }
  }

  /* ---------- 过滤 + 卡片 ---------- */
  function matchQuery(c, q, grade = state.grade, term = state.term, entry = null) {
    if (!q) return true;
    const base = [
      c.title?.zh, c.title?.en, c.description?.zh, c.description?.en,
      ...(c.tags || []), ...(c.keywords || []), t().cats[c.category] || c.category,
      ...Array.from(courseGrades(c)).flatMap((tok) => {
        const { grade, term } = splitGrade(tok);
        const base = grade ? [I18N.zh.grades[grade], I18N.en.grades[grade]] : [];
        const termLabels = term ? [I18N.zh.terms[term], I18N.en.terms[term]] : [];
        return [...base, ...termLabels, tok];
      }),
    ].join(' ').toLowerCase();
    const words = q.toLowerCase().trim().split(/\s+/);
    const matches = hay => words.every(word => hay.includes(word));
    if (matches(base)) return true;
    return (entry ? [entry] : CourseCatalog.curriculumEntries(c, grade, term)).some(e => matches([
      base, e.bookTitle?.zh, e.bookTitle?.en, e.unitTitle?.zh, e.unitTitle?.en,
      e.topic?.zh, e.topic?.en, e.activityTitle?.zh, e.activityTitle?.en,
      unitLabel(e, 'zh'), unitLabel(e, 'en'),
    ].join(' ').toLowerCase()));
  }

  function matchesCat(c, catId = state.cat) {
    return CourseCatalog.matchesCategory(c, catId, courseProgressMeta);
  }

  function filtered() {
    const q = state.q;
    const list = state.courses.filter((c) => matchQuery(c, q)
      && CourseCatalog.matchesScope(c, state, courseProgressMeta));

    if (state.cat === 'recent') {
      return sortPinnedFirst(list, (a, b) => {
        const diff = courseProgressMeta(b.id).updatedAt - courseProgressMeta(a.id).updatedAt;
        return diff || a.id.localeCompare(b.id);
      });
    }
    if (state.cat === 'newest') {
      return sortPinnedFirst(list, (a, b) => {
        const diff = (b.order ?? 0) - (a.order ?? 0);
        return diff || a.id.localeCompare(b.id);
      });
    }
    return sortPinnedFirst(list, () => 0);
  }

  function sortPinnedFirst(list, compare) {
    const pinned = [];
    const rest = [];
    for (const c of list) (c.pinned ? pinned : rest).push(c);
    rest.sort(compare);
    return pinned.concat(rest);
  }

  function catColor(id) {
    return (CATS.find((c) => c.id === id) || {}).color || 'var(--c-featured)';
  }

  function courseProgressMeta(id) {
    try {
      const value = JSON.parse(local.get(`${PROGRESS_PREFIX}${id}`) || 'null');
      if (!value || !['played', 'completed'].includes(value.status)) return null;
      const updatedAt = Number(value.updatedAt);
      return {
        status: value.status,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
      };
    } catch {
      return null;
    }
  }

  function courseProgress(id) {
    return courseProgressMeta(id)?.status || '';
  }

  // 关卡级完成清单：课件存档 kidslab.exploration-v2.<id>.done；旧存档没有该字段时返回空数组降级。
  function stageDone(courseId) {
    try {
      const value = JSON.parse(local.get(`kidslab.exploration-v2.${courseId}`) || 'null');
      return Array.isArray(value?.done) ? value.done.filter((id) => typeof id === 'string') : [];
    } catch { return []; }
  }

  function card(c, i, entry = null) {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = CourseCatalog.entryPath(c, entry);
    a.dataset.courseId = c.id;
    if (entry?.activity) a.dataset.activity = entry.activity;
    a.style.setProperty('--i', Math.min(i, 8));
    a.style.setProperty('--cat-c', c.pinned ? 'var(--c-featured)' : catColor(c.category));

    const cover = document.createElement('div');
    cover.className = 'card__cover';
    cover.innerHTML = `<span class="card__emoji">${c.icon || '📘'}</span>`;
    if (c.pinned) cover.insertAdjacentHTML('beforeend', `<span class="card__pin">⭐ ${t().pinned}</span>`);
    if (c.badge === 'new') cover.insertAdjacentHTML('beforeend', `<span class="card__new">✨</span>`);
    const progress = courseProgress(c.id);
    if (progress) {
      a.dataset.progress = progress;
      const status = document.createElement('span');
      status.className = `card__progress card__progress--${progress}`;
      status.textContent = t()[progress];
      cover.appendChild(status);
    }
    if (offlineIds.has(c.id)) {
      const off = document.createElement('span');
      off.className = 'card__offline';
      off.textContent = `📥 ${t().offline}`;
      off.title = state.lang === 'zh' ? '本课资源已完整保存，断网也能玩' : 'Cached on this device — playable offline';
      cover.appendChild(off);
    }

    const body = document.createElement('div');
    body.className = 'card__body';
    const h = document.createElement('h3');
    h.className = 'card__title';
    h.textContent = entry?.activityTitle?.[state.lang] || c.title[state.lang];
    const p = document.createElement('p');
    p.className = 'card__desc';
    p.textContent = entry?.invite?.[state.lang] || c.description[state.lang];
    body.append(h);
    if (entry) {
      const topic = document.createElement('p');
      topic.className = 'card__curriculum';
      topic.textContent = `${entry.activity ? c.title[state.lang] : t().wholeCourse} · ${entry.topic[state.lang]} · ${t().textbookPage(entry.page)}`;
      body.append(topic);
    }
    body.append(p);

    const meta = document.createElement('div');
    meta.className = 'card__meta';
    const chip = document.createElement('span');
    chip.className = 'chip chip--cat';
    chip.textContent = t().cats[c.category] || c.category;
    const lvs = document.createElement('span');
    lvs.className = 'card__levels';
    for (const lv of LEVELS) {
      if (c.levels.includes(lv)) lvs.insertAdjacentHTML('beforeend', `<span class="lv" title="${t().levels[lv]}">${t().lvShort[lv]}</span>`);
    }
    meta.append(chip, lvs);

    a.append(cover, body, meta);
    return a;
  }

  // 聚合卡：同一课件的多关合并为一张卡，卡内关卡按钮直达对应关（?activity=）。
  function groupCard(course, entries, i) {
    const box = document.createElement('article');
    box.className = 'card card--group';
    box.dataset.courseId = course.id;
    box.style.setProperty('--i', Math.min(i, 8));
    box.style.setProperty('--cat-c', course.pinned ? 'var(--c-featured)' : catColor(course.category));

    const cover = document.createElement('div');
    cover.className = 'card__cover';
    cover.innerHTML = `<span class="card__emoji">${course.icon || '📘'}</span>`;
    if (course.pinned) cover.insertAdjacentHTML('beforeend', `<span class="card__pin">⭐ ${t().pinned}</span>`);
    if (course.badge === 'new') cover.insertAdjacentHTML('beforeend', `<span class="card__new">✨</span>`);
    const progress = courseProgress(course.id);
    if (progress) {
      box.dataset.progress = progress;
      const status = document.createElement('span');
      status.className = `card__progress card__progress--${progress}`;
      status.textContent = t()[progress];
      cover.appendChild(status);
    }
    if (offlineIds.has(course.id)) {
      const off = document.createElement('span');
      off.className = 'card__offline';
      off.textContent = `📥 ${t().offline}`;
      off.title = state.lang === 'zh' ? '本课资源已完整保存，断网也能玩' : 'Cached on this device — playable offline';
      cover.appendChild(off);
    }

    const body = document.createElement('div');
    body.className = 'card__body';
    const h = document.createElement('h3');
    h.className = 'card__title';
    h.textContent = course.title[state.lang];
    const meta = document.createElement('p');
    meta.className = 'card__group-meta';
    const done = stageDone(course.id);
    meta.textContent = t().stageCount(entries.length, entries.filter((entry) => done.includes(entry.activity)).length);
    const stages = document.createElement('div');
    stages.className = 'card__stages';
    entries.forEach((entry, stageIndex) => {
      const link = document.createElement('a');
      link.className = 'stage';
      link.dataset.courseId = course.id;
      link.dataset.activity = entry.activity;
      link.href = CourseCatalog.entryPath(course, entry);
      const played = done.includes(entry.activity);
      if (played) link.dataset.done = '';
      link.setAttribute('aria-label', entry.activityTitle?.[state.lang] || entry.activity);
      const label = typeof entry.detail === 'string' ? entry.detail : entry.detail?.[state.lang];
      link.innerHTML = `<span class="stage__num" aria-hidden="true">${stageIndex + 1}</span>`
        + `<span class="stage__label">${esc(label || entry.activityTitle?.[state.lang] || entry.activity)}</span>`
        + (played ? `<span class="stage__check" aria-hidden="true">✓</span>` : '');
      stages.appendChild(link);
    });
    body.append(h, meta, stages);

    const foot = document.createElement('div');
    foot.className = 'card__meta';
    const chip = document.createElement('span');
    chip.className = 'chip chip--cat';
    chip.textContent = t().cats[course.category] || course.category;
    foot.append(chip);

    box.append(cover, body, foot);
    return box;
  }

  function unitLabel(entry, lang = state.lang) {
    if (entry.unitKind === 'topic') return '';
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const n = entry.unitNumber;
    const number = n < 10 ? digits[n] : n < 20 ? `十${n % 10 ? digits[n % 10] : ''}` : `${digits[Math.floor(n / 10)] || n}十${n % 10 ? digits[n % 10] : ''}`;
    return lang === 'zh' ? `第${number}${entry.unitKind === 'chapter' ? '章' : '单元'}`
      : `${entry.unitKind === 'chapter' ? 'Chapter' : 'Unit'} ${n}`;
  }

  function renderGrid() {
    const list = filtered();
    el.grid.innerHTML = '';
    const groups = CourseCatalog.curriculumGroups(list, state, (c, entry) => matchQuery(c, state.q, state.grade, state.term, entry));
    const grouped = new Set(groups.flatMap(group => group.items.map(item => item.course.id)));
    const rest = list.filter(c => !grouped.has(c.id));
    el.grid.classList.toggle('grid--curriculum', groups.length > 0);
    let index = 0;
    for (const [groupIndex, group] of groups.entries()) {
      const section = document.createElement('section');
      section.className = 'curriculum-unit';
      section.dataset.book = group.bookId;
      section.dataset.unit = group.unitId;
      const heading = document.createElement('h2');
      heading.id = `curriculum-unit-${groupIndex}`;
      heading.className = 'curriculum-unit__title';
      section.setAttribute('aria-labelledby', heading.id);
      const book = document.createElement('p');
      book.className = 'curriculum-unit__book';
      book.textContent = group.bookTitle[state.lang];
      heading.textContent = [unitLabel(group), group.unitTitle[state.lang]].filter(Boolean).join(' · ');
      const count = document.createElement('p');
      count.className = 'curriculum-unit__count';
      count.textContent = t().unitCount(group.items.length);
      const grid = document.createElement('div');
      grid.className = 'grid curriculum-unit__grid';
      // 同课件多关聚合成一张卡；单关或整课入口保持一课一卡，位置仍按教材页序。
      const stageCounts = new Map();
      for (const { course, entry } of group.items) {
        if (entry.activity) stageCounts.set(course.id, (stageCounts.get(course.id) || 0) + 1);
      }
      const rendered = new Set();
      for (const { course, entry } of group.items) {
        if (entry.activity && stageCounts.get(course.id) > 1) {
          if (rendered.has(course.id)) continue;
          rendered.add(course.id);
          const entries = group.items.filter((item) => item.course.id === course.id && item.entry.activity).map((item) => item.entry);
          grid.appendChild(groupCard(course, entries, index++));
        } else {
          grid.appendChild(card(course, index++, entry));
        }
      }
      section.append(book, heading, count, grid);
      el.grid.appendChild(section);
    }
    if (rest.length) {
      const grid = groups.length ? document.createElement('section') : el.grid;
      if (groups.length) {
        grid.className = 'grid curriculum-unit__rest';
        const heading = document.createElement('h2');
        heading.className = 'curriculum-unit__title';
        heading.textContent = t().otherCourses;
        grid.appendChild(heading);
        el.grid.appendChild(grid);
      }
      rest.forEach(c => grid.appendChild(card(c, index++)));
    }
    el.empty.hidden = list.length > 0;
    el.countText.textContent = groups.length ? t().curriculumCount(list.length, index) : t().count(list.length);
    el.crumb.innerHTML = `<b>${t().levels[state.level]}</b>${state.grade !== 'all' ? ` · ${t().grades[state.grade]}` : ''}${state.term !== 'all' ? ` · ${t().terms[state.term]}` : ''} · ${t().cats[state.cat]}${state.q ? ` · “${esc(state.q)}”` : ''}`;
    el.courseTotal.textContent = t().total(state.courses.length);
    el.clearProgress.hidden = !local.keys().some((key) => key.startsWith(PROGRESS_PREFIX));
  }

  const esc = (s) => s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  function update() {
    applyChrome();
    renderLevels();
    renderGrades();
    renderTerms();
    renderCats();
    renderAccents();
    renderGrid();
    persist();
  }

  /* ---------- 侧栏收拢 / 移动抽屉 ---------- */
  const isMobile = () => matchMedia('(max-width: 860px)').matches;

  function closeDrawer() {
    const wasOpen = el.app.classList.contains('menu-open');
    el.app.classList.remove('menu-open');
    el.backdrop.hidden = true;
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    $('.main').inert = false;
    el.sidebar.inert = isMobile();
    if (wasOpen && isMobile()) $('#menuBtn').focus();
  }
  matchMedia('(max-width: 860px)').addEventListener('change', closeDrawer);
  closeDrawer();
  el.sidebar.addEventListener('keydown', (event) => {
    if (!isMobile() || !el.app.classList.contains('menu-open') || event.key !== 'Tab') return;
    const items = [...el.sidebar.querySelectorAll('a,button')].filter((item) => item.getClientRects().length && !item.hidden);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  $('#collapseBtn').addEventListener('click', () => {
    const on = el.app.classList.toggle('is-collapsed');
    local.set(LS.collapsed, on ? '1' : '');
    $('#collapseBtn').setAttribute('aria-expanded', String(!on));
  });
  $('#menuBtn').addEventListener('click', () => {
    el.app.classList.add('menu-open');
    el.backdrop.hidden = false;
    el.sidebar.inert = false;
    $('#menuBtn').setAttribute('aria-expanded', 'true');
    $('.main').inert = true;
    el.sidebar.querySelector('a,button').focus();
  });
  el.backdrop.addEventListener('click', closeDrawer);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  if (local.get(LS.collapsed) === '1') el.app.classList.add('is-collapsed');
  $('#collapseBtn').setAttribute('aria-expanded', String(!el.app.classList.contains('is-collapsed')));

  /* ---------- 顶栏交互 ---------- */
  $('#themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    update();
  });
  $('#langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    update();
  });
  $('#resetBtn').addEventListener('click', () => {
    state.q = '';
    state.grade = 'all';
    state.term = 'all';
    state.cat = 'all';
    el.search.value = '';
    update();
    el.search.focus();
  });
  el.clearProgress.addEventListener('click', () => {
    if (!confirm(t().clearProgressConfirm)) return;
    local.keys()
      .filter((key) => key.startsWith(PROGRESS_PREFIX))
      .forEach((key) => local.remove(key));
    update();
    closeDrawer();
  });

  let debounce = 0;
  el.search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = el.search.value; update(); }, 120);
  });
  addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(input|textarea)$/i.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      el.search.focus();
    }
  });

  /* ---------- PWA：Service Worker + 「可离线」角标 ---------- */
  const offlineIds = new Set();

  /* 读运行时缓存（cache-on-visit），标记断网可玩的课件 */
  async function refreshOfflineBadges() {
    if (!('caches' in window)) return;
    try {
      const stateCache = await caches.open('kidslab-offline-state-v2');
      const prefix = new URL('__offline__/courses/', document.baseURI).href;
      const next = new Set();
      const records = await stateCache.keys();
      for (const key of records) {
        if (!key.url.startsWith(prefix)) continue;
        const record = await (await stateCache.match(key)).json();
        const base = new URL(`courseware/${record.id}/`, document.baseURI);
        const cache = await caches.open(record.cache);
        const marker = await cache.match(new URL('offline.json', base).href);
        if (!marker) continue;
        const manifest = await marker.json();
        const urls = new Set((await cache.keys()).map((request) => request.url));
        if (manifest.version === record.version && manifest.assets.every((asset) => urls.has(new URL(asset.path, base).href))) next.add(record.id);
      }
      const changed = next.size !== offlineIds.size || [...next].some((id) => !offlineIds.has(id));
      offlineIds.clear();
      next.forEach((id) => offlineIds.add(id));
      if (changed && state.courses.length) renderGrid();
    } catch { /* Cache API 不可用（如隐私模式）时静默降级 */ }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'kidslab-offline-updated') refreshOfflineBadges();
    });
    addEventListener('load', () => {
      /* 更新策略保守：不 skipWaiting，新版本等所有页面关闭后接管 */
      navigator.serviceWorker.register('sw.js').then(refreshOfflineBadges).catch(() => {});
    });
  }

  /* ---------- 启动 ---------- */
  el.search.value = state.q;
  applyChrome();

  fetch('courseware/index.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((m) => { state.courses = m.courses || []; update(); return refreshOfflineBadges(); })
    .catch(() => {
      el.grid.innerHTML = '';
      el.empty.hidden = false;
      el.empty.querySelector('.empty__scope').textContent = '⚠️';
      el.empty.querySelector('h3').removeAttribute('data-i18n');
      el.empty.querySelector('h3').textContent = t().loadErr;
      el.empty.querySelector('p').textContent = '';
      el.empty.querySelector('p').removeAttribute('data-i18n');
      $('#resetBtn').hidden = true;
    });
  addEventListener('pageshow', () => {
    if (state.courses.length) update();
    refreshOfflineBadges();
  });
})();
