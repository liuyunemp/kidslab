// Authoring source for the independent Grade 1 games. Run generate.mjs after edits.
const pair = (zh, en) => ({ zh, en });
const withIds = (rows) => rows.map((row, index) => ({ id: `q${index + 1}`, ...row }));
const mathSource = '教育部《义务教育数学课程标准（2022 年版）》第一学段“数与代数”“图形与几何”“综合与实践”；人民教育出版社《义务教育教科书 数学 一年级》相应单元。';
const chineseSource = '教育部《义务教育语文课程标准（2022 年版）》第一学段“识字与写字”“阅读与鉴赏”“表达与交流”；人民教育出版社《义务教育教科书 语文 一年级上册》相应单元。';

const comparePairs = [[7, 4], [3, 9], [6, 6], [12, 18], [20, 11], [35, 53], [47, 47], [68, 61], [90, 99], [100, 98]];
const arithmetic = (rows, kind) => withIds(rows.map(([a, b, c]) => ({ a, b, ...(c === undefined ? {} : { c }), answer: kind === 'add' ? a + b : kind === 'subtract' ? a - b : a + b - c })));
const directions = [
  ['🐱', '🐶', '🐰', '🐻', '🐸', '🐼'],
  ['🍎', '🍌', '🍇', '🍊', '🍐', '🍓'],
  ['🚗', '🚌', '🚲', '🚕', '🚎', '🚚'],
];
const directionRows = [
  [0, 1, 'left', 0], [0, 1, 'right', 2], [1, 4, 'left', 3], [1, 4, 'right', 5],
  [2, 3, 'front', 0], [2, 1, 'back', 4], [0, 4, 'above', 1], [0, 1, 'below', 4],
  [1, 3, 'front', 0], [2, 2, 'below', 5],
];
const relationText = {
  left: pair('左边', 'left of'), right: pair('右边', 'right of'),
  front: pair('前面', 'in front of'), back: pair('后面', 'behind'),
  above: pair('上面', 'above'), below: pair('下面', 'below'),
};
/* 分类洗衣坊：[筐 id, 中文名, 英文名, 图标]；id 会出现在朗读文本断言之外的答案里，避免与朗读用词重叠。 */
const colorBaskets = [['red', '红色筐', 'Red', '🔴'], ['blue', '蓝色筐', 'Blue', '🔵'], ['yellow', '黄色筐', 'Yellow', '🟡']];
const shapeBaskets = [['circle', '圆形筐', 'Round', '⭕'], ['square', '方形筐', 'Square', '🟦']];
const useBaskets = [['clothes', '衣物筐', 'Clothes', '👕'], ['toy', '玩具筐', 'Toys', '🧸']];
/* 笔顺快车站：key 是卡片标识（答案用），name 是给孩子看的笔画名。 */
const st = (key, zh, en) => ({ key, name: pair(zh, en) });

const legacyCourses = [
  {
    id: 'g1-compare-bridge', kind: 'compare', category: 'math', grades: ["g1b"], tags: ['比大小', '数的认识'], icon: '🐊', order: 32,
    title: pair('比大小桥', 'Number Bridge'), description: pair('给数字桥装上大于、小于或等于的桥牌，比较 20 和 100 以内的数。', 'Fit the greater, less or equal bridge sign between numbers up to 100.'),
    accent: '#e2663d', backdrop: '#fff1dc', mascot: '🐊', source: mathSource,
    fact: '比较两个 0 到 100 的整数时，可以先比较十位，再比较个位；相同的两个数用等号连接。',
    tasks: withIds(comparePairs.map(([left, right]) => ({ left, right, answer: left > right ? '>' : left < right ? '<' : '=', prompt: pair('把合适的桥牌放在中间。', 'Place the right sign on the bridge.') }))),
  },
  {
    id: 'g1-addition-depot', kind: 'add', category: 'math', grades: ["g1b"], tags: ['加减法', '数位'], icon: '🚂', order: 33,
    title: pair('加法车站', 'Addition Depot'), description: pair('开动十位和个位小火车，把两批乘客合在一起。', 'Drive tens and ones trains to join two groups of passengers.'),
    accent: '#dc6b43', backdrop: '#fff1d4', mascot: '🚂', source: mathSource,
    fact: '100 以内整数相加时，个位和个位相加、十位和十位相加；个位满十可换成一个十。',
    tasks: arithmetic([[12, 5], [20, 13], [34, 20], [26, 7], [41, 18], [57, 8], [35, 24], [68, 12], [49, 21], [77, 13]], 'add'),
  },
  {
    id: 'g1-subtraction-depot', kind: 'subtract', category: 'math', grades: ["g1b"], tags: ['加减法', '数位'], icon: '🚋', order: 34,
    title: pair('减法车站', 'Subtraction Depot'), description: pair('让乘客下车，沿数线退回正确的站台。', 'Let passengers off and move back to the right stop on the number line.'),
    accent: '#3c83b8', backdrop: '#e5f4ff', mascot: '🚋', source: mathSource,
    fact: '100 以内整数相减可按十位和个位分解；被减数不足以减去个位时，可把一个十换成十个一。',
    tasks: arithmetic([[18, 5], [35, 10], [48, 6], [30, 7], [64, 21], [72, 8], [95, 40], [83, 18], [100, 29], [56, 37]], 'subtract'),
  },
  {
    id: 'g1-mixed-relay', kind: 'mixed', category: 'math', grades: ["g1b"], tags: ['加减法', '运算'], icon: '🏃', order: 38,
    title: pair('加减接力', 'Add-Subtract Relay'), description: pair('沿数线先接住一批、再送走一批，完成两步接力。', 'Take a group on, then let a group off to finish each two-step relay.'),
    accent: '#9a65c9', backdrop: '#f4ecff', mascot: '🏃', source: mathSource,
    fact: '只有加法和减法的两步算式，在没有括号时按从左到右的顺序计算，且本课每一步结果均在 0 到 100 之间。',
    tasks: arithmetic([[8, 5, 3], [15, 7, 4], [28, 10, 6], [34, 8, 12], [40, 20, 15], [57, 9, 16], [23, 30, 11], [68, 12, 20], [45, 25, 17], [72, 8, 26]], 'mixed'),
  },
  {
    id: 'g1-weight-lab', kind: 'weight', category: 'math', grades: [], tags: ['轻重', '计量单位'], icon: '⚖️', order: 34,
    title: pair('轻重天平', 'Balance Playground'), description: pair('看天平哪边下沉，找出重的、轻的或一样重的东西。', 'Watch the balance tip to find heavier, lighter and equal objects.'),
    accent: '#c4842c', backdrop: '#fff3da', mascot: '⚖️', source: mathSource,
    fact: '在同一架等臂天平上，较重的一侧下沉；两侧一样重时天平保持平衡。',
    tasks: withIds([
      ['🍎', 3, '🍉', 8], ['🧸', 6, '🪶', 1], ['📚', 5, '🧱', 5], ['🍋', 2, '🍍', 7], ['🎈', 1, '🏀', 4],
      ['🥥', 7, '🥭', 3], ['🧃', 4, '🥛', 4], ['🪨', 9, '🍃', 1], ['🎁', 6, '📦', 8], ['🧸', 5, '⚽', 5],
    ].map(([leftEmoji, leftMass, rightEmoji, rightMass]) => ({ leftEmoji, leftMass, rightEmoji, rightMass, answer: leftMass > rightMass ? 'left' : leftMass < rightMass ? 'right' : 'equal' }))),
  },
  {
    id: 'g1-direction-town', kind: 'direction', category: 'science', grades: ["g1b"], tags: ['位置'], icon: '🧭', order: 35,
    title: pair('方位小镇', 'Direction Town'), description: pair('在小镇地图上找前后、左右、上下的位置。', 'Find neighbors in front, behind, left, right, above and below on a town map.'),
    accent: '#328c8b', backdrop: '#e6faf5', mascot: '🧭', source: '人民教育出版社《科学 一年级下册》第一单元“位置和方向”，1–13页；官方电子教材版本 1244001102241：https://book.pep.com.cn/1244001102241/mobile/index.html 。',
    fact: '前后、左右、上下都要相对于指定的人或物确定；本课地图上方标为“前”，屏幕左边标为“左”。',
    tasks: withIds(directionRows.map(([set, anchor, relation, target]) => ({ items: directions[set], anchor, relation, answer: String(target), prompt: pair(`${directions[set][anchor]} 的${relationText[relation].zh}是谁？`, `Who is ${relationText[relation].en} ${directions[set][anchor]}?`) }))),
  },
  {
    id: 'g1-flat-shapes', kind: 'shape', category: 'math', grades: ["g1b"], tags: ['平面图形'], icon: '🔷', order: 30,
    title: pair('图形拼搭', 'Shape Workshop'), description: pair('为小房子、风筝和车轮挑合适的平面图形。', 'Pick flat shapes for roofs, kites, wheels and more.'),
    accent: '#6886d9', backdrop: '#eef2ff', mascot: '🔷', source: mathSource,
    fact: '本课使用圆、三角形、长方形、正方形、平行四边形五类平面图形；图形旋转后种类不变。',
    tasks: withIds([
      ['circle', '车轮', 'wheel'], ['triangle', '屋顶', 'roof'], ['square', '方窗', 'square window'], ['rectangle', '门', 'door'], ['parallelogram', '斜旗', 'slanted flag'],
      ['triangle', '帆船的帆', 'sail'], ['circle', '太阳', 'sun'], ['rectangle', '书本封面', 'book cover'], ['square', '棋盘格', 'board square'], ['parallelogram', '斜斜的积木', 'slanted block'],
    ].map(([answer, zhScene, enScene]) => ({ answer, scene: pair(zhScene, enScene) }))),
  },
  {
    id: 'g1-character-garden', kind: 'character', category: 'chinese', grades: ["g1a"], tags: ['识字'], icon: '🌱', order: 208,
    title: pair('汉字寻宝', 'Character Garden'), description: pair('在图画花园里给常见汉字找到对应的事物。', 'Find the picture that belongs to each familiar character.'),
    accent: '#54a05b', backdrop: '#e9f8e8', mascot: '🌱', source: chineseSource,
    fact: '本课选用一年级上册识字内容中的常见字，借助图画联系字形和字义，如日、月、山、水、火。',
    tasks: withIds([
      ['天', '☀️', '🌳', '💧'], ['地', '🌍', '🌙', '🐟'], ['人', '🧍', '🌼', '🔥'], ['日', '☀️', '🌙', '🪨'], ['月', '🌙', '☀️', '🌳'],
      ['水', '💧', '🔥', '🪶'], ['火', '🔥', '💧', '🌸'], ['口', '👄', '👂', '👀'], ['耳', '👂', '👄', '✋'], ['山', '⛰️', '🌾', '🌊'],
    ].map(([char, answer, wrongA, wrongB]) => ({ char, answer, choices: [answer, wrongA, wrongB] }))),
  },
  {
    id: 'g1-pinyin-tracks', kind: 'pinyin', category: 'chinese', grades: ["g1a"], tags: ['拼音'], icon: '🚃', order: 209,
    title: pair('拼音轨道', 'Pinyin Tracks'), description: pair('把声母、韵母和声调车厢接起来，拼出图画里的字音。', 'Join initial, final and tone cars to spell pictured syllables.'),
    accent: '#e47794', backdrop: '#fff0f4', mascot: '🚃', source: chineseSource,
    fact: '普通话音节可由声母、韵母和声调组成；本课展示的拼音及声调分别对应所给汉字的普通话读音。',
    tasks: withIds([
      ['妈', '👩', 'm', 'a', '1'], ['爸', '👨', 'b', 'a', '4'], ['米', '🍚', 'm', 'i', '3'], ['土', '🌱', 't', 'u', '3'], ['山', '⛰️', 'sh', 'an', '1'],
      ['花', '🌼', 'h', 'ua', '1'], ['鸟', '🐦', 'n', 'iao', '3'], ['马', '🐴', 'm', 'a', '3'], ['火', '🔥', 'h', 'uo', '3'], ['猫', '🐱', 'm', 'ao', '1'],
    ].map(([char, picture, initial, final, tone]) => ({ char, picture, initial, final, tone, answer: `${initial}|${final}|${tone}` }))),
  },
  {
    id: 'g1-stroke-workshop', kind: 'stroke', category: 'chinese', grades: ["g1a"], tags: ['识字'], icon: '🖌️', order: 210,
    title: pair('笔画工坊', 'Stroke Workshop'), description: pair('用手指沿着发光路线描写基本笔画。', 'Trace the glowing routes of basic Chinese strokes.'),
    accent: '#ab76be', backdrop: '#f9edff', mascot: '🖌️', source: chineseSource,
    fact: '本课练习的横、竖、撇、捺、点、提、折、钩是汉字常见基本笔画或笔画组合；描写按箭头方向进行。',
    tasks: withIds([
      ['横', 'horizontal', [[25, 55], [50, 55], [80, 55]]], ['竖', 'vertical', [[50, 20], [50, 50], [50, 82]]],
      ['撇', 'left-falling', [[68, 20], [52, 50], [24, 80]]], ['捺', 'right-falling', [[30, 25], [45, 50], [76, 80]]],
      ['点', 'dot', [[45, 30], [49, 40], [55, 52]]], ['提', 'rising', [[25, 75], [50, 55], [77, 36]]],
      ['横折', 'horizontal turn', [[22, 30], [72, 30], [72, 80]]], ['竖钩', 'vertical hook', [[48, 18], [48, 75], [35, 67]]],
      ['横钩', 'horizontal hook', [[20, 30], [78, 30], [69, 43]]], ['竖弯钩', 'curved hook', [[40, 18], [40, 70], [65, 78], [77, 67]]],
    ].map(([stroke, english, points]) => ({ stroke: pair(stroke, english), points, answer: 'traced' }))),
  },
  {
    id: 'g1-word-post', kind: 'word', category: 'chinese', grades: [], tags: ['识字'], icon: '📮', order: 211,
    title: pair('词语邮局', 'Word Post Office'), description: pair('把词语卡片送到对应的图画信箱。', 'Deliver each word card to its matching picture mailbox.'),
    accent: '#d47b4c', backdrop: '#fff1e8', mascot: '📮', source: chineseSource,
    fact: '本课使用由一年级常见汉字组成的日常词语，通过图画理解词语所指的事物。',
    tasks: withIds([
      ['太阳', '☀️', '月亮', '小山'], ['月亮', '🌙', '太阳', '小鱼'], ['大山', '⛰️', '河水', '白云'], ['河水', '🌊', '大山', '小鸟'], ['小鸟', '🐦', '小鱼', '小猫'],
      ['小鱼', '🐟', '小鸟', '小花'], ['白云', '☁️', '大山', '月亮'], ['小花', '🌸', '白云', '小猫'], ['小猫', '🐱', '小鱼', '太阳'], ['大树', '🌳', '小花', '河水'],
    ].map(([answer, picture, wrongA, wrongB]) => ({ answer, picture, choices: [answer, wrongA, wrongB] }))),
  },
  {
    id: 'g1-rhyme-stage', kind: 'rhyme', category: 'chinese', grades: ["g1a"], tags: ['识字', '找规律'], icon: '🥁', order: 212,
    title: pair('对韵小剧场', 'Rhyme Stage'), description: pair('敲响搭档卡，让对韵歌中的两边在舞台相遇。', 'Bring the paired words of a rhyme together on stage.'),
    accent: '#cd6ca3', backdrop: '#fff0f8', mascot: '🥁', source: chineseSource,
    fact: '《对韵歌》中有“云对雨、雪对风、花对树、鸟对虫、山清对水秀、柳绿对桃红”等对应词语；本课练习这些原文配对。',
    tasks: withIds([
      ['云', '雨', '风', '雪'], ['雨', '云', '花', '虫'], ['雪', '风', '云', '桃红'], ['风', '雪', '鸟', '水秀'],
      ['花', '树', '雨', '虫'], ['树', '花', '风', '山清'], ['鸟', '虫', '雪', '柳绿'], ['虫', '鸟', '花', '雨'],
      ['山清', '水秀', '桃红', '花'], ['柳绿', '桃红', '水秀', '树'],
    ].map(([left, answer, wrongA, wrongB]) => ({ left, answer, choices: [answer, wrongA, wrongB] }))),
  },
  {
    id: 'g1-sentence-train', kind: 'sentence', category: 'chinese', grades: [], tags: ['识字'], icon: '🚄', order: 213,
    title: pair('句子列车', 'Sentence Train'), description: pair('把主角、地点、动作车厢按示例顺序连起来。', 'Link who, where and action cars in the shown order.'),
    accent: '#578acb', backdrop: '#eaf4ff', mascot: '🚄', source: chineseSource,
    fact: '本课只练习“谁—在哪里—做什么”这一种简单句表达方式；它不是汉语句子的唯一合法语序。',
    tasks: withIds([
      ['小鸟', '在天上', '飞'], ['小鱼', '在水里', '游'], ['小兔', '在草地上', '跑'], ['小猫', '在椅子上', '睡觉'], ['妈妈', '在厨房', '做饭'],
      ['爸爸', '在花园里', '种花'], ['小狗', '在门口', '等我'], ['太阳', '在天空中', '发光'], ['我', '在教室里', '读书'], ['我们', '在操场上', '玩'],
    ].map(([who, where, action]) => ({ words: [who, where, action], answer: [who, where, action].join('|') }))),
  },
  {
    id: 'g1-sort-laundry', kind: 'sort', category: 'math', grades: ["g2a"], tags: ['分类'], icon: '🧺', order: 39,
    title: pair('分类洗衣坊', 'Sorting Laundry'), description: pair('把洗衣篮里的东西分进合适的筐，还能换个标准再分一次。', 'Sort the laundry into the right baskets, then try a different rule.'),
    accent: '#e2703a', backdrop: '#fdf3e7', mascot: '🧺', source: '人民教育出版社《数学 二年级上册》“分类与整理”，1–9页；官方电子教材版本 1221001201251：https://book.pep.com.cn/1221001201251/mobile/index.html 。',
    fact: '分类时依据的依据叫分类标准；同一堆物品可以按颜色、形状、用途等不同标准分类，标准不同，分出的结果也不同。',
    tasks: withIds([
      { item: '🍎', criterion: pair('按颜色', 'by color'), baskets: colorBaskets, choices: ['red', 'blue', 'yellow'], answer: 'red' },
      { item: '🍋', criterion: pair('按颜色', 'by color'), baskets: colorBaskets, choices: ['red', 'blue', 'yellow'], answer: 'yellow' },
      { item: '🫐', criterion: pair('按颜色', 'by color'), baskets: colorBaskets, choices: ['red', 'blue', 'yellow'], answer: 'blue' },
      { item: '🌶️', criterion: pair('按颜色', 'by color'), baskets: colorBaskets, choices: ['red', 'blue', 'yellow'], answer: 'red' },
      { item: '🌻', criterion: pair('按颜色', 'by color'), baskets: colorBaskets, choices: ['red', 'blue', 'yellow'], answer: 'yellow' },
      { item: '⚽', criterion: pair('按形状', 'by shape'), baskets: shapeBaskets, choices: ['circle', 'square'], answer: 'circle' },
      { item: '🧊', criterion: pair('按形状', 'by shape'), baskets: shapeBaskets, choices: ['circle', 'square'], answer: 'square' },
      { item: '🍪', criterion: pair('按形状', 'by shape'), baskets: shapeBaskets, choices: ['circle', 'square'], answer: 'circle' },
      { item: '🧦', criterion: pair('按用处', 'by use'), baskets: useBaskets, choices: ['clothes', 'toy'], answer: 'clothes' },
      { item: '🪀', criterion: pair('按用处', 'by use'), baskets: useBaskets, choices: ['clothes', 'toy'], answer: 'toy' },
    ]),
  },
  {
    id: 'g1-poem-stage', kind: 'poem', category: 'chinese', grades: [], tags: ['识字', '古诗'], icon: '🖼️', order: 228,
    title: pair('诗画猜猜台', 'Poem Picture Stage'), description: pair('看画面猜诗句、接上下句，再把整首诗排回原顺序。', 'Match lines to pictures, finish couplets and order whole poems.'),
    accent: '#b0567a', backdrop: '#fff0f5', mascot: '🖼️', source: chineseSource,
    fact: '本课选用一年级常见古诗《咏鹅》《静夜思》《画》《悯农》《古朗月行（节选）》《风》，三种玩法是看图配句、接下句和把诗句排回原文顺序；诗句均按教材原文。',
    tasks: withIds([
      { form: 'guess', scene: '🦢💦', title: pair('咏鹅', 'A Goose'), answer: '白毛浮绿水，', choices: ['白毛浮绿水，', '曲项向天歌。', '红掌拨清波。'] },
      { form: 'guess', scene: '⛰️🌸', title: pair('画', 'A Painting'), answer: '春去花还在，', choices: ['春去花还在，', '人来鸟不惊。', '近听水无声。'] },
      { form: 'guess', scene: '🌕🐇', title: pair('古朗月行（节选）', 'A Bright Moon'), answer: '小时不识月，', choices: ['小时不识月，', '呼作白玉盘。', '飞在青云端。'] },
      { form: 'next', line: '白毛浮绿水，', answer: '红掌拨清波。', choices: ['红掌拨清波。', '曲项向天歌。', '鹅，鹅，鹅。'] },
      { form: 'next', line: '床前明月光，', answer: '疑是地上霜。', choices: ['疑是地上霜。', '举头望明月。', '低头思故乡。'] },
      { form: 'next', line: '锄禾日当午，', answer: '汗滴禾下土。', choices: ['汗滴禾下土。', '粒粒皆辛苦。', '谁知盘中餐。'] },
      { form: 'next', line: '解落三秋叶，', answer: '能开二月花。', choices: ['能开二月花。', '过江千尺浪。', '入竹万竿斜。'] },
      { form: 'order', lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'], answer: '床前明月光，|疑是地上霜。|举头望明月，|低头思故乡。' },
      { form: 'order', lines: ['鹅，鹅，鹅，', '曲项向天歌。', '白毛浮绿水，', '红掌拨清波。'], answer: '鹅，鹅，鹅，|曲项向天歌。|白毛浮绿水，|红掌拨清波。' },
      { form: 'order', lines: ['远看山有色，', '近听水无声。', '春去花还在，', '人来鸟不惊。'], answer: '远看山有色，|近听水无声。|春去花还在，|人来鸟不惊。' },
    ]),
  },
  {
    id: 'g1-stroke-order', kind: 'stroke-order', category: 'chinese', grades: ["g1a"], tags: ['识字', '笔顺'], icon: '🚉', order: 229,
    title: pair('笔顺快车站', 'Stroke Order Station'), description: pair('按笔顺规则把笔画卡片依次装上小火车。', 'Load the stroke cards onto the train in writing order.'),
    accent: '#2f9e8f', backdrop: '#e7f7f2', mascot: '🚉',
    source: '国家语言文字工作委员会《现代汉语通用字笔顺规范》；教育部《义务教育语文课程标准（2022 年版）》第一学段“识字与写字”；人民教育出版社《义务教育教科书 语文 一年级上册》。',
    fact: '汉字笔顺基本规则是先横后竖、先撇后捺、从上到下、从左到右、先外后内再封口；本课按这些规则排列十、人、八、三、大、川、木、口、日、月的基本笔画。',
    tasks: withIds([
      { char: '十', strokes: [st('h1', '横', 'horizontal'), st('v1', '竖', 'vertical')], answer: 'h1|v1', hints: { 1: pair('先写横，再写竖。', 'Horizontal first, then vertical.') } },
      { char: '人', strokes: [st('p1', '撇', 'left-falling'), st('n1', '捺', 'right-falling')], answer: 'p1|n1', hints: { 1: pair('先写撇，再写捺。', 'Left-falling first, then right-falling.') } },
      { char: '八', strokes: [st('p1', '撇', 'left-falling'), st('n1', '捺', 'right-falling')], answer: 'p1|n1' },
      { char: '三', strokes: [st('h1', '横', 'horizontal'), st('h2', '横', 'horizontal'), st('h3', '横', 'horizontal')], answer: 'h1|h2|h3', hints: { 0: pair('三的三个横，从上到下写。', 'Write the three horizontals from top to bottom.') } },
      { char: '大', strokes: [st('h1', '横', 'horizontal'), st('p1', '撇', 'left-falling'), st('n1', '捺', 'right-falling')], answer: 'h1|p1|n1' },
      { char: '川', strokes: [st('p1', '撇', 'left-falling'), st('v1', '竖', 'vertical'), st('v2', '竖', 'vertical')], answer: 'p1|v1|v2' },
      { char: '木', strokes: [st('h1', '横', 'horizontal'), st('v1', '竖', 'vertical'), st('p1', '撇', 'left-falling'), st('n1', '捺', 'right-falling')], answer: 'h1|v1|p1|n1' },
      { char: '口', strokes: [st('v1', '竖', 'vertical'), st('t1', '横折', 'horizontal turn'), st('h1', '横', 'horizontal')], answer: 'v1|t1|h1', hints: { 2: pair('先外后内再封口。', 'Outside first, then inside, then close it.') } },
      { char: '日', strokes: [st('v1', '竖', 'vertical'), st('t1', '横折', 'horizontal turn'), st('h1', '横', 'horizontal'), st('h2', '横', 'horizontal')], answer: 'v1|t1|h1|h2' },
      { char: '月', strokes: [st('p1', '撇', 'left-falling'), st('t1', '横折钩', 'hooked turn'), st('h1', '横', 'horizontal'), st('h2', '横', 'horizontal')], answer: 'p1|t1|h1|h2' },
    ]),
  },
];

// These URLs now own standalone exploration sources. Never regenerate them here.
const migrated = new Set(["g1-compare-bridge","g1-addition-depot","g1-subtraction-depot","g1-mixed-relay","g1-flat-shapes"]);
export const courses = legacyCourses.filter(course => !migrated.has(course.id));
