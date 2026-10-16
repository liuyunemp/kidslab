// 教材目录是源码数据；校验/展开不写文件、不执行课件脚本或构建。
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isValidGrade } from './grades.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const bilingual = value => object(value) && ['zh', 'en'].every(lang => typeof value[lang] === 'string' && value[lang].trim());
const positive = value => Number.isInteger(value) && value > 0;
const identifier = value => typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
const covers = (grades, token) => (grades || []).includes(token) || (/[ab]$/.test(token) && (grades || []).includes(token.slice(0, -1)));
const inSourcePages = (page, pages) => typeof pages === 'string' && [...pages.matchAll(/(\d+)(?:[–—-](\d+))?/g)]
  .some(([, from, to]) => page >= Number(from) && page <= Number(to || from));
// activity 级 detail：语言无关的算式字符串，或 {zh,en} 双语对象；用于主站关卡按钮展示每关练什么。
const validDetail = value => (typeof value === 'string' && value.trim()) || bilingual(value);
const normalizedDetail = value => (typeof value === 'string' ? value.trim() : { zh: value.zh, en: value.en });
// 课件根级 expression 模板（如 "{a} + {b}"）：对 activity 字段插值；缺字段的关卡不带 detail，不报错。
const expressionDetail = (course, activity) => {
  if (activity.detail !== undefined) return normalizedDetail(activity.detail);
  if (typeof course?.expression !== 'string') return undefined;
  let missing = false;
  const text = course.expression.replace(/\{([A-Za-z_]\w*)\}/g, (_, field) => {
    const value = activity[field];
    if (value === undefined || value === null) { missing = true; return ''; }
    return String(value);
  }).trim();
  return missing || !text ? undefined : text;
};

export function expandCurriculum(catalog, courses, activities = {}) {
  const errors = [];
  if (!object(catalog) || catalog.version !== 1 || !object(catalog.books) || !object(catalog.courses)) {
    throw new Error('教材目录必须包含 version:1、books 和 courses');
  }
  const byId = new Map(courses.map(course => [course.id, course]));
  const books = new Map();
  for (const [id, book] of Object.entries(catalog.books)) {
    if (!identifier(id) || !object(book) || !isValidGrade(book.grade) || !bilingual(book.title)
      || !['math', 'chinese', 'science', 'physics', 'chemistry'].includes(book.category)
      || typeof book.edition !== 'string' || !book.edition.trim()
      || !/^https:\/\/book\.pep\.com\.cn\/\d+\/mobile\/index\.html$/.test(book.url || '')
      || !Array.isArray(book.units) || !book.units.length) {
      errors.push(`教材 ${id}: 版本、年级、科目、双语标题、来源或单元无效`);
      continue;
    }
    const units = new Map();
    for (const unit of book.units) {
      if (!object(unit) || !identifier(unit.id) || !bilingual(unit.title)
        || !['unit', 'chapter', 'topic'].includes(unit.kind)
        || (unit.kind !== 'topic' && !positive(unit.number))
        || !positive(unit.startPage) || !positive(unit.endPage) || unit.endPage < unit.startPage
        || units.has(unit.id)) {
        errors.push(`教材 ${id}: 单元定义无效或重复`);
        continue;
      }
      units.set(unit.id, unit);
    }
    books.set(id, { ...book, units });
  }
  const result = {};
  for (const [courseId, entries] of Object.entries(catalog.courses)) {
    const course = byId.get(courseId);
    if (!course || course.listed === false || !Array.isArray(entries) || !entries.length) {
      errors.push(`课件 ${courseId}: 课件不存在、隐藏或教材入口为空`);
      continue;
    }
    const seen = new Set();
    result[courseId] = [];
    if (activities[courseId]?.expression !== undefined && typeof activities[courseId].expression !== 'string') {
      errors.push(`课件 ${courseId}: expression 必须是字符串模板`);
    }
    const templateFields = typeof activities[courseId]?.expression === 'string'
      ? [...new Set([...activities[courseId].expression.matchAll(/\{([A-Za-z_]\w*)\}/g)].map(match => match[1]))] : [];
    if (templateFields.length) {
      const knownFields = new Set((activities[courseId].activities || []).flatMap(a => Object.keys(a)));
      for (const field of templateFields) {
        if (!knownFields.has(field)) errors.push(`课件 ${courseId}: expression 引用了不存在的字段 {${field}}`);
      }
    }
    for (const entry of entries) {
      const book = books.get(entry?.book);
      const unit = book?.units.get(entry?.unit);
      const key = `${entry?.book}/${entry?.unit}/${entry?.activity || ''}`;
      const activity = entry?.activity && activities[courseId]?.activities?.find(a => a.id === entry.activity);
      if (!object(entry) || !book || !unit || !covers(course.grades, book.grade)
        || book.category !== course.category || !positive(entry.page)
        || entry.page < unit.startPage || entry.page > unit.endPage || !bilingual(entry.topic)
        || (entry.lessonOrder !== undefined && !positive(entry.lessonOrder)) || seen.has(key)
        || (entry.activity !== undefined && (!identifier(entry.activity) || !activity
          || activities[courseId].book?.url !== book.url || !bilingual(activity.title) || !bilingual(activity.invite)
          || (activity.detail !== undefined && !validDetail(activity.detail))
          || !inSourcePages(entry.page, activity.source?.pages)))) {
        errors.push(`课件 ${courseId}: 教材入口 ${key} 与年级/科目/单元/页码/活动不符或重复`);
        continue;
      }
      seen.add(key);
      const detail = activity ? expressionDetail(activities[courseId], activity) : undefined;
      result[courseId].push({
        bookId: entry.book, bookTitle: book.title, grade: book.grade,
        unitId: unit.id, unitTitle: unit.title, unitKind: unit.kind, unitNumber: unit.number,
        unitOrder: unit.startPage, page: entry.page, lessonOrder: entry.lessonOrder || 1,
        topic: entry.topic,
        ...(activity ? { activity: activity.id, activityTitle: activity.title, invite: activity.invite,
          ...(detail ? { detail } : {}) } : {}),
      });
    }
  }
  if (errors.length) throw new Error(`教材目录校验失败:\n${errors.join('\n')}`);
  return result;
}

export async function loadCurriculum(root, courses) {
  let raw;
  try { raw = await readFile(path.join(root, 'src', 'curriculum.json'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  const catalog = JSON.parse(raw);
  const activities = {};
  for (const [id, entries] of Object.entries(catalog.courses || {})) {
    if (!identifier(id)) throw new Error(`教材目录课件 ID 无效: ${id}`);
    if (!Array.isArray(entries) || !entries.some(entry => entry?.activity)) continue;
    const source = await readFile(path.join(root, 'src', id, 'content.js'), 'utf8');
    // 这些活动库是 JSON 对象声明；只解析数据，禁止执行任意源码。
    const match = source.match(/export const course\s*=\s*(\{[\s\S]*\});\s*$/);
    if (!match) throw new Error(`${id}/content.js 不是可解析的活动数据`);
    activities[id] = JSON.parse(match[1]);
  }
  return expandCurriculum(catalog, courses, activities);
}
