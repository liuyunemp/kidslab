// 年级/学期册标记的真源之一（另一处是 assets/js/app.js 的前端 GRADES/normalizeGrade，需保持一致）。
// grades 取值：g1–g12（整年级）；可选后缀 a=上册、b=下册。示例：g1、g1a、g6b。
export const GRADE_RE = /^g([1-9]|1[0-2])([ab])?$/;

export const isValidGrade = (value) => typeof value === 'string' && GRADE_RE.test(value);
