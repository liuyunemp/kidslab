// Authoring catalog. Runtime copies live inside each independent course.
const word = (id, zh, icon, sentence, extra = {}) => ({ id, en: id.replaceAll('-', ' '), zh, icon, sentence, ...extra });
const fruit = (id, zh, icon, article = 'a') => word(id, zh, icon, `It's ${article} ${id}.`);
const animal = (id, zh, icon, article = 'a') => word(id, zh, icon, `It's ${article} ${id}.`);
const school = (id, zh, icon, article = 'a') => word(id, zh, icon, `I have ${article} ${id.replaceAll('-', ' ')}.`);
export const courses = [
  {
    id: 'english-color-studio', kind: 'color', title: { zh: '彩色玩具屋', en: 'Color Toy Studio' }, icon: '🎨', tags: ['英语启蒙', '颜色', '3D'],
    description: { zh: '给玩具换件彩色衣裳，听听颜色的英文。', en: 'Paint your toys and hear the names of their colors.' },
    invitation: { zh: '选个颜色，给玩具涂一涂。', en: 'Pick a color and paint a toy.' },
    action: { zh: '涂上颜色', en: 'Paint the toy' }, finish: { zh: '玩具亮相', en: 'Toy show' },
    hint: { zh: '给三件玩具都涂上颜色，再让它们亮相。', en: 'Paint all three toys, then start the toy show.' },
    items: [
      word('red','红色','🔴',"It's red.",{color:'#df3239'}), word('yellow','黄色','🟡',"It's yellow.",{color:'#ffcf32'}),
      word('blue','蓝色','🔵',"It's blue.",{color:'#236ce2'}), word('green','绿色','🟢',"It's green.",{color:'#239e56'}),
      word('orange','橙色','🟠',"It's orange.",{color:'#fa7e22'}), word('purple','紫色','🟣',"It's purple.",{color:'#8340ce'}),
      word('black','黑色','⚫',"It's black.",{color:'#20232d'}), word('white','白色','⚪',"It's white.",{color:'#faf7f0'}),
    ],
    targets: [{id:'car',zh:'小车',en:'Car'},{id:'house',zh:'积木屋',en:'House'},{id:'windmill',zh:'风车',en:'Windmill'}],
  },
  {
    id: 'english-fruit-picnic', kind: 'fruit', title: { zh: '水果野餐篮', en: 'Fruit Picnic' }, icon: '🧺', tags: ['英语启蒙','水果','3D'],
    description: { zh: '摘三件水果去野餐，点一下听听英文名字。', en: 'Pick three fruits for a picnic and tap to hear their names.' },
    invitation: { zh: '把喜欢的水果放进野餐篮。', en: 'Put your favorite fruit in the picnic basket.' },
    action: { zh: '放进篮子', en: 'Add to basket' }, finish: { zh: '开野餐啦', en: 'Picnic time' },
    hint: { zh: '篮子里放三件水果，就能摆开野餐啦。', en: 'Put three fruits in the basket for your picnic.' },
    items: [fruit('apple','苹果','🍎','an'),fruit('banana','香蕉','🍌'),fruit('orange','橙子','🍊','an'),fruit('pear','梨','🍐'),fruit('grape','葡萄','🍇'),fruit('strawberry','草莓','🍓'),fruit('watermelon','西瓜','🍉'),fruit('pineapple','菠萝','🍍')],
  },
  {
    id: 'english-animal-park', kind: 'animal', title: { zh: '动物欢乐园', en: 'Animal Play Park' }, icon: '🐘', tags: ['英语启蒙','动物','3D'],
    description: { zh: '布置你的小乐园，和会动的动物朋友认识一下。', en: 'Build a little park and meet your moving animal friends.' },
    invitation: { zh: '选个动物，请它来乐园玩。', en: 'Pick an animal and invite it to the park.' },
    action: { zh: '请进乐园', en: 'Add to park' }, finish: { zh: '乐园开场', en: 'Park show' },
    hint: { zh: '请三个动物朋友进来，再开场吧。', en: 'Invite three animal friends, then start the show.' },
    items: [animal('cat','猫','🐱'),animal('dog','狗','🐶'),animal('rabbit','兔子','🐰'),animal('duck','鸭子','🦆'),animal('bird','鸟','🐦'),animal('fish','鱼','🐟'),animal('cow','奶牛','🐄'),animal('elephant','大象','🐘','an')],
  },
  {
    id: 'english-number-train', kind: 'number', title: { zh: '数字小火车', en: 'Number Train' }, icon: '🚂', tags: ['英语启蒙','英语数字','3D'],
    description: { zh: '给小火车装积木，听着英文一起数到十。', en: 'Load blocks onto a little train and count to ten in English.' },
    invitation: { zh: '给小火车装一块积木吧。', en: 'Put a block on the train.' },
    action: { zh: '装入一块', en: 'Add a block' }, finish: { zh: '小火车出发', en: 'All aboard' },
    hint: { zh: '先装一块积木，再让小火车出发。', en: 'Load a block before the train leaves.' },
    items: ['one','two','three','four','five','six','seven','eight','nine','ten'].map((id,i)=>word(id,['一','二','三','四','五','六','七','八','九','十'][i],String(i+1),`${id[0].toUpperCase()+id.slice(1)} ${i===0?'block':'blocks'}.`,{value:i+1})),
  },
  {
    id: 'english-body-show', kind: 'body', title: { zh: '身体动作秀', en: 'Body Action Show' }, icon: '👋', tags: ['英语启蒙','人体','3D'],
    description: { zh: '点一点身体部位，让小伙伴和你一起动起来。', en: 'Tap a body part and make your little friend move.' },
    invitation: { zh: '点点小伙伴，看看哪里会动。', en: 'Tap your little friend and see what moves.' },
    action: { zh: '做个动作', en: 'Try the action' }, finish: { zh: '动作串起来', en: 'Action show' },
    hint: { zh: '试过三个身体部位，就能串成动作秀。', en: 'Try three different body parts for an action show.' },
    items: [word('head','头','🙂','Touch your head.'),word('eye','眼睛','👁️','Close one eye.'),word('ear','耳朵','👂','Touch your ear.'),word('nose','鼻子','👃','Touch your nose.'),word('mouth','嘴巴','👄','Open your mouth.'),word('hand','手','👋','Wave your hand.'),word('arm','手臂','💪','Lift your arm.'),word('foot','脚','🦶','Lift your foot.')],
  },
  {
    id: 'english-school-bag', kind: 'school', title: { zh: '我的小书包', en: 'My School Bag' }, icon: '🎒', tags: ['英语启蒙','学习用品','3D'],
    description: { zh: '整理自己的小书包，把学习用品的英文带回家。', en: 'Pack your school bag and learn the names of your school things.' },
    invitation: { zh: '挑一件学习用品，装进书包。', en: 'Pick a school thing and put it in the bag.' },
    action: { zh: '装进书包', en: 'Pack it' }, finish: { zh: '拉上再打开', en: 'Zip and open' },
    hint: { zh: '装好三件学习用品，再拉上拉链。', en: 'Pack three school things, then zip up the bag.' },
    items: [school('bag','书包','🎒'),school('book','书','📕'),school('pen','钢笔','🖊️'),school('pencil','铅笔','✏️'),school('ruler','尺子','📏'),school('eraser','橡皮','🧽','an'),school('crayon','蜡笔','🖍️'),school('pencil-case','铅笔盒','👝')],
  },
].map((course,i)=>({...course,category:'english',levels:['primary'],grades:['g1','g2','g3'],order:240+i,badge:'new'}));

const SOURCES = {
  dictionary: 'Cambridge Dictionary 英文词条（如 https://dictionary.cambridge.org/dictionary/english/red ），逐词核对词义、词性与单复数形式。',
  article: 'Cambridge Dictionary Grammar, “A/an and the”（https://dictionary.cambridge.org/grammar/british-grammar/a-an-and-the ）：a 用于辅音音素前，an 用于元音音素前。',
  adjectives: 'Cambridge Dictionary Grammar, “Adjectives: position”（https://dictionary.cambridge.org/grammar/british-grammar/adjectives-position ）：形容词通常放在所修饰名词之前。',
  plural: 'Cambridge Dictionary Grammar, “Nouns: singular and plural”（https://dictionary.cambridge.org/grammar/british-grammar/nouns-singular-and-plural ）：可数名词复数通常加 -s。',
  imperative: 'Cambridge Dictionary Grammar, “Imperatives”（https://dictionary.cambridge.org/grammar/british-grammar/imperatives ）：祈使句以动词原形开头。',
  have: 'Cambridge Dictionary Grammar, “Present simple: I have”（https://dictionary.cambridge.org/grammar/british-grammar/present-simple-i-have ）：主语 I 使用 have。',
  fish: 'Cambridge Dictionary 词条 “fish”：fish 作可数名词时单复数同形。',
};

const list = (course) => course.items.map((item) => `${item.en}（${item.zh}）`).join('、');

export function factsFor(course) {
  const body = {
    color: {
      scope: ['覆盖 8 个颜色词的英文听读与图文对应，以及指认单色的整句 It\'s …。', '不覆盖颜色混合、拼写默写、音标书写或教材单元顺序。'],
      facts: [
        `[F1] ${list(course)} 依次是红、黄、蓝、绿、橙、紫、黑、白的英文单词。[S1]`,
        '[F2] 指认单数物品时用 It\'s + 颜色词；It\'s 是 it is 的缩写，例如 It\'s red. 意为“它是红色的”。[S1]',
        '[F3] 颜色词是形容词，修饰名词时通常放在名词前（a red car）；本课件只用 It\'s … 句式，不训练该语序。[S2]',
      ],
      sources: ['dictionary', 'adjectives'],
    },
    fruit: {
      scope: ['覆盖 8 个水果词的英文听读与实物对应，以及 It\'s a/an … 的指认句。', '不覆盖水果分类学、复数形式、拼写默写或教材单元顺序。'],
      facts: [
        `[F1] ${list(course)} 依次是苹果、香蕉、橙子、梨、葡萄、草莓、西瓜、菠萝。[S1]`,
        '[F2] 单数可数名词前用 a 或 an：apple、orange 以元音音素开头，用 an apple、an orange；其余用 a。[S2]',
        '[F3] 例句 It\'s an apple. 中 it 指代一件物品，is 与单数主语搭配。[S1]',
      ],
      sources: ['dictionary', 'article'],
    },
    animal: {
      scope: ['覆盖 8 个动物词的英文听读与外形对应，以及 It\'s a/an … 的指认句。', '不覆盖动物分类、栖息地知识、拼写默写或教材单元顺序。'],
      facts: [
        `[F1] ${list(course)} 依次是猫、狗、兔子、鸭子、鸟、鱼、奶牛、大象。[S1]`,
        '[F2] elephant 以元音音素开头，用 an elephant；其余单词用 a。[S2]',
        '[F3] fish 作可数名词时单复数同形，一件与多件都用 fish。[S3]',
      ],
      sources: ['dictionary', 'article', 'fish'],
    },
    number: {
      scope: ['覆盖 1–10 的英文数字词，以及 one block / two blocks 的单复数对比。', '不覆盖 0、11 以上数字、序数词、拼写默写或算术训练。'],
      facts: [
        '[F1] one、two、three、four、five、six、seven、eight、nine、ten 依次表示 1 到 10。[S1]',
        '[F2] 数词与可数名词连用时，one 后接单数名词（one block），two 及以上接复数名词（two blocks）。[S2]',
        '[F3] 本课件把车厢里的积木数量与数字词一一对应，数量为 0 时不显示数字词。[S1]',
      ],
      sources: ['dictionary', 'plural'],
    },
    body: {
      scope: ['覆盖 8 个身体部位词的英文听读与指认动作，以及 Touch your … 的祈使句。', '不覆盖器官功能、内脏结构或拼写默写。'],
      facts: [
        `[F1] ${list(course)} 依次是头、眼睛、耳朵、鼻子、嘴巴、手、手臂、脚。[S1]`,
        '[F2] foot 的复数是 feet；eye、ear、hand、arm、foot 成对出现时通常用复数形式。[S1]',
        '[F3] Touch your nose. 是祈使句，以动词原形开头，表示“摸摸你的鼻子”。[S2]',
      ],
      sources: ['dictionary', 'imperative'],
    },
    school: {
      scope: ['覆盖 8 个学习用品词的英文听读与实物对应，以及 I have a/an … 的陈述句。', '不覆盖文具分类、材质知识或拼写默写。'],
      facts: [
        `[F1] ${list(course)} 依次是书包、书、钢笔、铅笔、尺子、橡皮、蜡笔、铅笔盒。[S1]`,
        '[F2] eraser 以元音音素开头，用 an eraser；其余单词用 a。[S2]',
        '[F3] I have a pencil. 表示“我有一支铅笔”，主语 I 与 have 搭配。[S3]',
      ],
      sources: ['dictionary', 'article', 'have'],
    },
  }[course.kind];
  return [
    `# ${course.id} 知识断言`,
    '',
    '## 适用范围',
    '',
    ...body.scope.map((line) => `- ${line}`),
    '',
    '## 知识断言',
    '',
    ...body.facts.map((line) => `- ${line}`),
    '',
    '## 来源',
    '',
    ...body.sources.map((key, index) => `- [S${index + 1}] ${SOURCES[key]}`),
    '',
  ].join('\n');
}

export const UI = {
  zh: {back:'返回平台',tools:'探索工具',sounds:'声音设置',music:'背景音乐',effects:'操作音效',speech:'单词与引导朗读',mute:'关闭全部声音',unmute:'恢复声音',theme:'切换主题',language:'切换语言',undo:'撤销',reset:'重新玩',remove:'取出最后一件',word:'再听单词',sentence:'听一句英语',ready:'准备好啦，继续玩吧！',done:'完成了一次探索，还可以继续玩！',full:'装满啦！可以先取出一件。',empty:'这里还没有东西，先放一件吧。',invalid:'放到亮起来的位置试试。',nothing:'还没有可以撤销的操作。',same:'试试另一个部位或换个颜色吧。',nogl:'暂时打不开 3D 舞台，请启用浏览器图形加速后重试。',selected:'当前单词',stage:'可拖动的英语探索舞台',target:'放置位置',on:'开',off:'关',bag:'这是书包，点其他用品装进去吧。',count:'车上积木',progress:'已摆好',observed:'已试过',painted:'已涂色',place:'放到这里',hint:'听听怎么玩',showing:'正在展示',retry:'暂时没能播放，点一下再试。'},
  en: {back:'Back to KidsLab',tools:'Play tools',sounds:'Sound settings',music:'Music',effects:'Sound effects',speech:'Words and guidance',mute:'Mute all sounds',unmute:'Restore sounds',theme:'Switch theme',language:'Switch language',undo:'Undo',reset:'Start again',remove:'Take the last one out',word:'Hear the word',sentence:'Hear a sentence',ready:'Ready. Keep playing!',done:'You made it! Keep exploring.',full:'It is full! Take one out first.',empty:'Nothing here yet. Add something first.',invalid:'Try the glowing spot.',nothing:'Nothing to undo yet.',same:'Try another part or change the color.',nogl:'The 3D stage is unavailable. Enable browser graphics acceleration and try again.',selected:'Current word',stage:'Interactive English play stage',target:'Place to play',on:'On',off:'Off',bag:'This is the bag. Pick something else to put inside.',count:'Blocks on board',progress:'Placed',observed:'Explored',painted:'Painted',place:'Place here',hint:'Hear how to play',showing:'Show in progress',retry:'Could not play. Tap to try again.'},
};
