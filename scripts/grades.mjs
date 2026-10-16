// 年级/学期格式与 assets/js/app.js 的 CourseCatalog 保持一致。
// grades 取值：g1–g12（整年级）；可选后缀 a=上册、b=下册。示例：g1、g1a、g6b。
// grades 只表示有教材依据的归属；[] / 缺失表示仅在“全部年级”显示，不能用 tags 补推。
export const GRADE_RE = /^g([1-9]|1[0-2])([ab])?$/;

export const isValidGrade = (value) => typeof value === 'string' && GRADE_RE.test(value);
