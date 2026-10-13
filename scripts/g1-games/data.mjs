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

export const courses = [
  {
    id: 'g1-compare-bridge', kind: 'compare', category: 'math', grades: ['g1a', 'g1b'], tags: ['比大小', '数的认识'], icon: '🐊',
    title: pair('比大小桥', 'Number Bridge'), description: pair('给数字桥装上大于、小于或等于的桥牌，比较 20 和 100 以内的数。', 'Fit the greater, less or equal bridge sign between numbers up to 100.'),
    accent: '#e2663d', backdrop: '#fff1dc', mascot: '🐊', source: mathSource,
    fact: '比较两个 0 到 100 的整数时，可以先比较十位，再比较个位；相同的两个数用等号连接。',
    tasks: withIds(comparePairs.map(([left, right]) => ({ left, right, answer: left > right ? '>' : left < right ? '<' : '=', prompt: pair('把合适的桥牌放在中间。', 'Place the right sign on the bridge.') }))),
  },
  {
    id: 'g1-addition-depot', kind: 'add', category: 'math', grades: ['g1b'], tags: ['加减法', '数位'], icon: '🚂',
    title: pair('加法车站', 'Addition Depot'), description: pair('开动十位和个位小火车，把两批乘客合在一起。', 'Drive tens and ones trains to join two groups of passengers.'),
    accent: '#dc6b43', backdrop: '#fff1d4', mascot: '🚂', source: mathSource,
    fact: '100 以内整数相加时，个位和个位相加、十位和十位相加；个位满十可换成一个十。',
    tasks: arithmetic([[12, 5], [20, 13], [34, 20], [26, 7], [41, 18], [57, 8], [35, 24], [68, 12], [49, 21], [77, 13]], 'add'),
  },
  {
    id: 'g1-subtraction-depot', kind: 'subtract', category: 'math', grades: ['g1b'], tags: ['加减法', '数位'], icon: '🚋',
    title: pair('减法车站', 'Subtraction Depot'), description: pair('让乘客下车，沿数线退回正确的站台。', 'Let passengers off and move back to the right stop on the number line.'),
    accent: '#3c83b8', backdrop: '#e5f4ff', mascot: '🚋', source: mathSource,
    fact: '100 以内整数相减可按十位和个位分解；被减数不足以减去个位时，可把一个十换成十个一。',
    tasks: arithmetic([[18, 5], [35, 10], [48, 6], [30, 7], [64, 21], [72, 8], [95, 40], [83, 18], [100, 29], [56, 37]], 'subtract'),
  },
  {
    id: 'g1-mixed-relay', kind: 'mixed', category: 'math', grades: ['g1b'], tags: ['加减法', '运算'], icon: '🏃',
    title: pair('加减接力', 'Add-Subtract Relay'), description: pair('沿数线先接住一批、再送走一批，完成两步接力。', 'Take a group on, then let a group off to finish each two-step relay.'),
    accent: '#9a65c9', backdrop: '#f4ecff', mascot: '🏃', source: mathSource,
    fact: '只有加法和减法的两步算式，在没有括号时按从左到右的顺序计算，且本课每一步结果均在 0 到 100 之间。',
    tasks: arithmetic([[8, 5, 3], [15, 7, 4], [28, 10, 6], [34, 8, 12], [40, 20, 15], [57, 9, 16], [23, 30, 11], [68, 12, 20], [45, 25, 17], [72, 8, 26]], 'mixed'),
  },
  {
    id: 'g1-weight-lab', kind: 'weight', category: 'math', grades: ['g1a'], tags: ['轻重', '计量单位'], icon: '⚖️',
    title: pair('轻重天平', 'Balance Playground'), description: pair('看天平哪边下沉，找出重的、轻的或一样重的东西。', 'Watch the balance tip to find heavier, lighter and equal objects.'),
    accent: '#c4842c', backdrop: '#fff3da', mascot: '⚖️', source: mathSource,
    fact: '在同一架等臂天平上，较重的一侧下沉；两侧一样重时天平保持平衡。',
    tasks: withIds([
      ['🍎', 3, '🍉', 8], ['🧸', 6, '🪶', 1], ['📚', 5, '🧱', 5], ['🍋', 2, '🍍', 7], ['🎈', 1, '🏀', 4],
      ['🥥', 7, '🥭', 3], ['🧃', 4, '🥛', 4], ['🪨', 9, '🍃', 1], ['🎁', 6, '📦', 8], ['🧸', 5, '⚽', 5],
    ].map(([leftEmoji, leftMass, rightEmoji, rightMass]) => ({ leftEmoji, leftMass, rightEmoji, rightMass, answer: leftMass > rightMass ? 'left' : leftMass < rightMass ? 'right' : 'equal' }))),
  },
  {
    id: 'g1-direction-town', kind: 'direction', category: 'math', grades: ['g1a'], tags: ['位置'], icon: '🧭',
    title: pair('方位小镇', 'Direction Town'), description: pair('在小镇地图上找前后、左右、上下的位置。', 'Find neighbors in front, behind, left, right, above and below on a town map.'),
    accent: '#328c8b', backdrop: '#e6faf5', mascot: '🧭', source: mathSource,
    fact: '前后、左右、上下都要相对于指定的人或物确定；本课地图上方标为“前”，屏幕左边标为“左”。',
    tasks: withIds(directionRows.map(([set, anchor, relation, target]) => ({ items: directions[set], anchor, relation, answer: String(target), prompt: pair(`${directions[set][anchor]} 的${relationText[relation].zh}是谁？`, `Who is ${relationText[relation].en} ${directions[set][anchor]}?`) }))),
  },
  {
    id: 'g1-flat-shapes', kind: 'shape', category: 'math', grades: ['g1b'], tags: ['平面图形'], icon: '🔷',
    title: pair('图形拼搭', 'Shape Workshop'), description: pair('为小房子、风筝和车轮挑合适的平面图形。', 'Pick flat shapes for roofs, kites, wheels and more.'),
    accent: '#6886d9', backdrop: '#eef2ff', mascot: '🔷', source: mathSource,
    fact: '本课使用圆、三角形、长方形、正方形、平行四边形五类平面图形；图形旋转后种类不变。',
    tasks: withIds([
      ['circle', '车轮', 'wheel'], ['triangle', '屋顶', 'roof'], ['square', '方窗', 'square window'], ['rectangle', '门', 'door'], ['parallelogram', '斜旗', 'slanted flag'],
      ['triangle', '帆船的帆', 'sail'], ['circle', '太阳', 'sun'], ['rectangle', '书本封面', 'book cover'], ['square', '棋盘格', 'board square'], ['parallelogram', '斜斜的积木', 'slanted block'],
    ].map(([answer, zhScene, enScene]) => ({ answer, scene: pair(zhScene, enScene) }))),
  },
  {
    id: 'g1-character-garden', kind: 'character', category: 'chinese', grades: ['g1a'], tags: ['识字'], icon: '🌱',
    title: pair('汉字寻宝', 'Character Garden'), description: pair('在图画花园里给常见汉字找到对应的事物。', 'Find the picture that belongs to each familiar character.'),
    accent: '#54a05b', backdrop: '#e9f8e8', mascot: '🌱', source: chineseSource,
    fact: '本课选用一年级上册识字内容中的常见字，借助图画联系字形和字义，如日、月、山、水、火。',
    tasks: withIds([
      ['天', '☀️', '🌳', '💧'], ['地', '🌍', '🌙', '🐟'], ['人', '🧍', '🌼', '🔥'], ['日', '☀️', '🌙', '🪨'], ['月', '🌙', '☀️', '🌳'],
      ['水', '💧', '🔥', '🪶'], ['火', '🔥', '💧', '🌸'], ['口', '👄', '👂', '👀'], ['耳', '👂', '👄', '✋'], ['山', '⛰️', '🌾', '🌊'],
    ].map(([char, answer, wrongA, wrongB]) => ({ char, answer, choices: [answer, wrongA, wrongB] }))),
  },
  {
    id: 'g1-pinyin-tracks', kind: 'pinyin', category: 'chinese', grades: ['g1a'], tags: ['拼音'], icon: '🚃',
    title: pair('拼音轨道', 'Pinyin Tracks'), description: pair('把声母、韵母和声调车厢接起来，拼出图画里的字音。', 'Join initial, final and tone cars to spell pictured syllables.'),
    accent: '#e47794', backdrop: '#fff0f4', mascot: '🚃', source: chineseSource,
    fact: '普通话音节可由声母、韵母和声调组成；本课展示的拼音及声调分别对应所给汉字的普通话读音。',
    tasks: withIds([
      ['妈', '👩', 'm', 'a', '1'], ['爸', '👨', 'b', 'a', '4'], ['米', '🍚', 'm', 'i', '3'], ['土', '🌱', 't', 'u', '3'], ['山', '⛰️', 'sh', 'an', '1'],
      ['花', '🌼', 'h', 'ua', '1'], ['鸟', '🐦', 'n', 'iao', '3'], ['马', '🐴', 'm', 'a', '3'], ['火', '🔥', 'h', 'uo', '3'], ['猫', '🐱', 'm', 'ao', '1'],
    ].map(([char, picture, initial, final, tone]) => ({ char, picture, initial, final, tone, answer: `${initial}|${final}|${tone}` }))),
  },
  {
    id: 'g1-stroke-workshop', kind: 'stroke', category: 'chinese', grades: ['g1a'], tags: ['识字'], icon: '🖌️',
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
    id: 'g1-word-post', kind: 'word', category: 'chinese', grades: ['g1a'], tags: ['识字'], icon: '📮',
    title: pair('词语邮局', 'Word Post Office'), description: pair('把词语卡片送到对应的图画信箱。', 'Deliver each word card to its matching picture mailbox.'),
    accent: '#d47b4c', backdrop: '#fff1e8', mascot: '📮', source: chineseSource,
    fact: '本课使用由一年级常见汉字组成的日常词语，通过图画理解词语所指的事物。',
    tasks: withIds([
      ['太阳', '☀️', '月亮', '小山'], ['月亮', '🌙', '太阳', '小鱼'], ['大山', '⛰️', '河水', '白云'], ['河水', '🌊', '大山', '小鸟'], ['小鸟', '🐦', '小鱼', '小猫'],
      ['小鱼', '🐟', '小鸟', '小花'], ['白云', '☁️', '大山', '月亮'], ['小花', '🌸', '白云', '小猫'], ['小猫', '🐱', '小鱼', '太阳'], ['大树', '🌳', '小花', '河水'],
    ].map(([answer, picture, wrongA, wrongB]) => ({ answer, picture, choices: [answer, wrongA, wrongB] }))),
  },
  {
    id: 'g1-rhyme-stage', kind: 'rhyme', category: 'chinese', grades: ['g1a'], tags: ['识字', '找规律'], icon: '🥁',
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
    id: 'g1-sentence-train', kind: 'sentence', category: 'chinese', grades: ['g1a'], tags: ['识字'], icon: '🚄',
    title: pair('句子列车', 'Sentence Train'), description: pair('把主角、地点、动作车厢按示例顺序连起来。', 'Link who, where and action cars in the shown order.'),
    accent: '#578acb', backdrop: '#eaf4ff', mascot: '🚄', source: chineseSource,
    fact: '本课只练习“谁—在哪里—做什么”这一种简单句表达方式；它不是汉语句子的唯一合法语序。',
    tasks: withIds([
      ['小鸟', '在天上', '飞'], ['小鱼', '在水里', '游'], ['小兔', '在草地上', '跑'], ['小猫', '在椅子上', '睡觉'], ['妈妈', '在厨房', '做饭'],
      ['爸爸', '在花园里', '种花'], ['小狗', '在门口', '等我'], ['太阳', '在天空中', '发光'], ['我', '在教室里', '读书'], ['我们', '在操场上', '玩'],
    ].map(([who, where, action]) => ({ words: [who, where, action], answer: [who, where, action].join('|') }))),
  },
];
