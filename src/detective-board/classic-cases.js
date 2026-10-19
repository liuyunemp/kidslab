const L=(zh,en)=>({zh,en});
export const LEGACY_CASES = [
    {
      icon: '🍰', size: 3,
      title: L('偷吃蛋糕案', 'Cake Crumb Mystery'),
      brief: L('厨房只剩奶油脚印。谁喝了什么？', 'Only creamy footprints remain. Who drank what?'),
      people: [p('milo', '🐻', '小熊', 'Milo'), p('nina', '🐰', '妮娜', 'Nina'), p('toto', '🐸', '托托', 'Toto')],
      dims: [dim('drink', '🥤', '饮料', 'Drink', [v('milk', '🥛', '牛奶', 'Milk'), v('juice', '🧃', '橙汁', 'Juice'), v('tea', '🍵', '热茶', 'Tea')])],
      solution: { milo: { drink: 'tea' }, nina: { drink: 'milk' }, toto: { drink: 'juice' } },
      clues: [
        clue(L('小熊没有喝橙汁。', 'Milo did not drink juice.'), not('milo', 'drink', 'juice')),
        clue(L('妮娜喝的是白白的饮料。', 'Nina drank the white drink.'), is('nina', 'drink', 'milk')),
        clue(L('托托的杯子不是热茶杯。', "Toto's cup was not tea."), not('toto', 'drink', 'tea')),
      ],
      story: [L('妮娜举起牛奶胡子：我只喝了一口！', 'Nina shows a milk moustache: I only had one sip!'), L('托托拿着橙汁路过冰箱。', 'Toto walked by the fridge with juice.'), L('小熊端着热茶，承认蛋糕是他“检查”过的。', 'Milo held tea and admitted he “inspected” the cake.')],
    },
    {
      icon: '📦', size: 3,
      title: L('错寄包裹案', 'Mixed-up Parcel Case'), brief: L('三只包裹被送错门牌。宠物和房色能对上吗？', 'Three parcels reached odd doors. Match pets and house colors.'),
      people: [p('ada', '🦊', '艾达', 'Ada'), p('ben', '🐼', '本本', 'Ben'), p('coco', '🐱', '可可', 'Coco')],
      dims: [
        dim('pet', '🐾', '宠物', 'Pet', [v('cat', '🐱', '猫', 'Cat'), v('dog', '🐶', '狗', 'Dog'), v('bird', '🐦', '鸟', 'Bird')]),
        dim('house', '🏠', '房色', 'House', [v('red', '🔴', '红房子', 'Red'), v('blue', '🔵', '蓝房子', 'Blue'), v('green', '🟢', '绿房子', 'Green')]),
      ],
      solution: { ada: { pet: 'bird', house: 'blue' }, ben: { pet: 'dog', house: 'green' }, coco: { pet: 'cat', house: 'red' } },
      clues: [
        clue(L('可可养猫。', 'Coco owns the cat.'), is('coco', 'pet', 'cat')),
        clue(L('艾达不住红房子，也不养狗。', 'Ada lives in neither the red house nor with the dog.'), not('ada', 'house', 'red'), not('ada', 'pet', 'dog')),
        clue(L('养狗的人住绿房子。', 'The dog owner lives in the green house.'), link('pet', 'dog', 'house', 'green')),
        clue(L('蓝房子的主人养鸟。', 'The blue-house owner keeps the bird.'), link('house', 'blue', 'pet', 'bird')),
      ],
      story: [L('红房子门口，可可的猫咪坐在包裹上。', "At the red house, Coco's cat sat on the parcel."), L('绿房子的本本牵着小狗来签收。', 'Ben at the green house signed with a dog leash.'), L('蓝房子的艾达打开鸟粮包裹：终于寄对啦！', 'Ada in the blue house opened bird food: delivered at last!')],
    },
    {
      icon: '👻', size: 3,
      title: L('图书馆幽灵案', 'Library Ghost Case'), brief: L('书架夜里哗啦响，其实是三位同学的书签。', 'Shelves rattled at night — actually three bookmarks.'),
      people: [p('lulu', '🦉', '露露', 'Lulu'), p('max', '🦁', '马克', 'Max'), p('ivy', '🐨', '艾薇', 'Ivy')],
      dims: [
        dim('book', '📚', '书', 'Book', [v('stars', '🌟', '星星书', 'Stars'), v('robot', '🤖', '机器人书', 'Robot'), v('ocean', '🌊', '海洋书', 'Ocean')]),
        dim('mark', '🔖', '书签', 'Bookmark', [v('moon', '🌙', '月亮', 'Moon'), v('leaf', '🍃', '叶子', 'Leaf'), v('bolt', '⚡', '闪电', 'Bolt')]),
      ],
      solution: { lulu: { book: 'stars', mark: 'moon' }, max: { book: 'ocean', mark: 'bolt' }, ivy: { book: 'robot', mark: 'leaf' } },
      clues: [clue(L('露露借了星星书。', 'Lulu borrowed the stars book.'), is('lulu', 'book', 'stars')), clue(L('机器人书里夹着叶子书签。', 'The robot book had the leaf bookmark.'), link('book', 'robot', 'mark', 'leaf')), clue(L('马克没有月亮书签，也没借机器人书。', 'Max had neither the moon bookmark nor the robot book.'), not('max', 'mark', 'moon'), not('max', 'book', 'robot')), clue(L('海洋书配闪电书签。', 'The ocean book used the bolt bookmark.'), link('book', 'ocean', 'mark', 'bolt'))],
      story: [L('露露的星星书闪着月亮书签。', "Lulu's stars book held the moon bookmark."), L('艾薇找到机器人书里的叶子。', 'Ivy found the leaf in the robot book.'), L('马克的海洋书和闪电书签哗啦一响，幽灵破案！', "Max's ocean book and bolt bookmark made the ghostly rattle.")],
    },
    {
      icon: '🏃', size: 4,
      title: L('运动会号码案', 'Sports Day Numbers'), brief: L('四位选手、四个项目、四个号码牌。', 'Four players, four events, four bib numbers.'),
      people: [p('ann', '🐯', '安安', 'Ann'), p('bo', '🐵', '波波', 'Bo'), p('kim', '🐶', '奇奇', 'Kim'), p('ray', '🐧', '瑞瑞', 'Ray')],
      dims: [dim('event', '🏅', '项目', 'Event', [v('run', '🏃', '短跑', 'Run'), v('jump', '🦘', '跳远', 'Jump'), v('swim', '🏊', '游泳', 'Swim'), v('throw', '🥏', '投掷', 'Throw')]), dim('num', '#', '号码', 'Number', [v('11', '①', '11号', 'No.11'), v('22', '②', '22号', 'No.22'), v('33', '③', '33号', 'No.33'), v('44', '④', '44号', 'No.44')])],
      solution: { ann: { event: 'jump', num: '22' }, bo: { event: 'run', num: '11' }, kim: { event: 'throw', num: '44' }, ray: { event: 'swim', num: '33' } },
      clues: [clue(L('波波是11号。', 'Bo wears No.11.'), is('bo', 'num', '11')), clue(L('安安参加跳远。', 'Ann enters jump.'), is('ann', 'event', 'jump')), clue(L('游泳选手是33号。', 'The swimmer is No.33.'), link('event', 'swim', 'num', '33')), clue(L('奇奇不短跑，也不是22号。', 'Kim neither runs nor wears No.22.'), not('kim', 'event', 'run'), not('kim', 'num', '22')), clue(L('投掷选手是44号。', 'The thrower is No.44.'), link('event', 'throw', 'num', '44'))],
      story: [L('波波戴着11号冲过终点。', 'Bo crossed the line with No.11.'), L('安安在22号牌下跳出远远一跃。', 'Ann jumped far under No.22.'), L('瑞瑞33号去游泳，奇奇44号投出飞盘。', 'Ray swam as No.33; Kim threw as No.44.')],
    },
    {
      icon: '🎨', size: 4,
      title: L('美术室颜料案', 'Art Room Paint Case'), brief: L('谁拿走了哪种颜色和工具？', 'Who took which color and tool?'),
      people: [p('mia', '🐭', '米娅', 'Mia'), p('noah', '🐮', '诺亚', 'Noah'), p('oli', '🦔', '奥利', 'Oli'), p('pia', '🐥', '皮娅', 'Pia')],
      dims: [dim('color', '🎨', '颜色', 'Color', [v('red', '🔴', '红色', 'Red'), v('blue', '🔵', '蓝色', 'Blue'), v('yellow', '🟡', '黄色', 'Yellow'), v('purple', '🟣', '紫色', 'Purple')]), dim('tool', '🧰', '工具', 'Tool', [v('brush', '🖌️', '画笔', 'Brush'), v('sponge', '🧽', '海绵', 'Sponge'), v('roller', '🧻', '滚筒', 'Roller'), v('stamp', '🔶', '印章', 'Stamp')])],
      solution: { mia: { color: 'purple', tool: 'stamp' }, noah: { color: 'red', tool: 'brush' }, oli: { color: 'yellow', tool: 'roller' }, pia: { color: 'blue', tool: 'sponge' } },
      clues: [clue(L('诺亚拿了红色。', 'Noah took red.'), is('noah', 'color', 'red')), clue(L('蓝色颜料配海绵。', 'Blue paint goes with the sponge.'), link('color', 'blue', 'tool', 'sponge')), clue(L('米娅没有画笔，也没有黄色。', 'Mia had neither brush nor yellow.'), not('mia', 'tool', 'brush'), not('mia', 'color', 'yellow')), clue(L('奥利用滚筒。', 'Oli used the roller.'), is('oli', 'tool', 'roller')), clue(L('印章不是红色颜料。', 'The stamp was not with red paint.'), notlink('tool', 'stamp', 'color', 'red'))],
      story: [L('诺亚用画笔刷红色，桌子像小火车。', 'Noah brushed red like a tiny train.'), L('皮娅的蓝色海绵印出云朵。', "Pia's blue sponge made clouds."), L('奥利用黄色滚筒，米娅用紫色印章收尾。', 'Oli rolled yellow; Mia stamped purple to finish.')],
    },
    {
      icon: '🗣️', size: 4, liar: true, falseClue: 2,
      title: L('说谎的证人', 'The Lying Witness'), brief: L('四张证词中有一张是假的。找出安排，还要指出假话。', 'One of four testimonies is false. Solve the board and name the lie.'),
      people: [p('rex', '🦖', '雷克斯', 'Rex'), p('sue', '🦄', '苏苏', 'Sue'), p('tim', '🐢', '提姆', 'Tim'), p('uma', '🐝', '优玛', 'Uma')],
      dims: [dim('snack', '🍪', '点心', 'Snack', [v('cake', '🍰', '蛋糕', 'Cake'), v('apple', '🍎', '苹果', 'Apple'), v('cookie', '🍪', '饼干', 'Cookie'), v('corn', '🌽', '玉米', 'Corn')])],
      solution: { rex: { snack: 'apple' }, sue: { snack: 'cake' }, tim: { snack: 'corn' }, uma: { snack: 'cookie' } },
      clues: [clue(L('苏苏拿了蛋糕。', 'Sue took the cake.'), is('sue', 'snack', 'cake')), clue(L('雷克斯没有拿饼干。', 'Rex did not take cookies.'), not('rex', 'snack', 'cookie')), clue(L('提姆拿了苹果。', 'Tim took the apple.'), is('tim', 'snack', 'apple'), true), clue(L('优玛没有拿玉米。', 'Uma did not take corn.'), not('uma', 'snack', 'corn'))],
      story: [L('假证词是“提姆拿了苹果”——提姆其实抱着玉米。', 'The lie was “Tim took the apple” — he held corn.'), L('雷克斯拿苹果，优玛拿饼干。', 'Rex took apple; Uma took cookies.'), L('苏苏的蛋糕没有冤枉别人，侦探团胜利！', "Sue's cake blamed nobody. Detective team wins!")],
    },
  ];

  function p(id, emoji, zh, en) { return { id, emoji, name: L(zh, en) }; }
  function dim(id, emoji, zh, en, values) { return { id, emoji, name: L(zh, en), values }; }
  function v(id, emoji, zh, en) { return { id, emoji, name: L(zh, en) }; }
  function is(person, dimId, val) { return { kind: 'is', person, dimId, val }; }
  function not(person, dimId, val) { return { kind: 'not', person, dimId, val }; }
  function link(dimA, valA, dimB, valB) { return { kind: 'link', dimA, valA, dimB, valB, neg: false }; }
  function notlink(dimA, valA, dimB, valB) { return { kind: 'link', dimA, valA, dimB, valB, neg: true }; }
  function clue(label, ...rules) {
    const falseRule = rules[rules.length - 1] === true;
    if (falseRule) rules.pop();
    return { label, rules, falseRule };
  }