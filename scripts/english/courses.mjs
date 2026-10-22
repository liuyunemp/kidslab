// Authoring catalog. Sync creates self-contained runtime copies in each course.
const word = (id, zh, extra = {}) => ({ id, en: id.replaceAll('-', ' '), zh, visual: id, audio: id.replaceAll('-', ' '), ...extra });
const nouns = rows => rows.map(([id, zh]) => word(id, zh));
const definitions = [
  ['color','english-color-studio','彩色玩具屋','Color Toy Studio','🎨','颜色',[
    ['red','红色','#df3239'],['yellow','黄色','#ffcf32'],['blue','蓝色','#236ce2'],['green','绿色','#239e56'],['orange','橙色','#fa7e22'],['purple','紫色','#8340ce'],['black','黑色','#20232d'],['white','白色','#faf7f0'],['pink','粉色','#f28fba'],['brown','棕色','#8b502f'],['gray','灰色','#858993'],
  ].map(([id,zh,color])=>word(id,zh,{color,sentence:`It's ${id}.`}))],
  ['fruit','english-fruit-picnic','水果野餐篮','Fruit Picnic','🧺','水果',nouns([
    ['apple','苹果'],['banana','香蕉'],['orange','橙子'],['pear','梨'],['grape','葡萄'],['strawberry','草莓'],['watermelon','西瓜'],['pineapple','菠萝'],['peach','桃子'],['cherry','樱桃'],['lemon','柠檬'],['mango','芒果'],['kiwi','猕猴桃'],['coconut','椰子'],['plum','李子'],['blueberry','蓝莓'],
  ])],
  ['animal','english-animal-park','动物欢乐园','Animal Play Park','🐘','动物',nouns([
    ['cat','猫'],['dog','狗'],['rabbit','兔子'],['duck','鸭子'],['bird','鸟'],['fish','鱼'],['cow','奶牛'],['elephant','大象'],['lion','狮子'],['tiger','老虎'],['bear','熊'],['panda','大熊猫'],['monkey','猴子'],['giraffe','长颈鹿'],['zebra','斑马'],['horse','马'],['pig','猪'],['sheep','绵羊'],['goat','山羊'],['turtle','龟'],
  ])],
  ['number','english-number-train','数字小火车','Number Train','🚂','英语数字',
    'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ').map((id,value)=>word(id,String(value),{value,sentence:`${id[0].toUpperCase()+id.slice(1)} ${value===1?'block':'blocks'}.`}))],
  ['body','english-body-show','身体动作秀','Body Action Show','👋','人体',nouns([
    ['head','头'],['eye','眼睛'],['ear','耳朵'],['nose','鼻子'],['mouth','嘴巴'],['hand','手'],['arm','手臂'],['foot','脚'],['face','脸'],['hair','头发'],['neck','脖子'],['shoulder','肩膀'],['leg','腿'],['knee','膝盖'],['finger','手指'],['toe','脚趾'],
  ])],
  ['school','english-school-bag','我的小书包','My School Bag','🎒','学习用品',nouns([
    ['bag','书包'],['book','书'],['pen','钢笔'],['pencil','铅笔'],['ruler','尺子'],['eraser','橡皮'],['crayon','蜡笔'],['pencil-case','铅笔盒'],['notebook','笔记本'],['marker','记号笔'],['glue','胶水'],['scissors','剪刀'],['sharpener','卷笔刀'],['folder','文件夹'],['paper','纸'],['paintbrush','画笔'],
  ])],
];
const exclusions = [['bird','duck'],['bear','panda'],['head','face'],['head','hair'],['arm','hand'],['hand','finger'],['leg','knee'],['foot','toe'],['book','notebook']];
export const courses = definitions.map(([kind,id,zh,en,icon,tag,items],i) => ({
  id,kind,title:{zh,en},icon,category:'english',levels:['primary'],grades:['g1','g2','g3'],tags:['英语启蒙',tag,'3D'],order:240+i,badge:'new',
  description:{zh:`从 ${items.length} 个词中随机学 8 个，听音、认词、看图闯四关。`,en:`Learn eight of ${items.length} words through listening, pictures and four challenges.`},
  invitation:{zh:'听一听，找到它的朋友。',en:'Listen and find its match.'},
  hint:{zh:'先认识四个单词，再听音选图片。答错或超时会少一颗心。',en:'Meet four words, then listen and choose a picture. A wrong answer or timeout costs one heart.'},
  items:items.map(item=>({...item,
    sentence:item.sentence ?? (kind==='body'?`Touch your ${item.en}.`:kind==='school'?
      item.id==='scissors'?'I have a pair of scissors.':['glue','paper'].includes(item.id)?`I have some ${item.en}.`:`I have ${item.id==='eraser'?'an':'a'} ${item.en}.`:
      `It's ${['apple','orange','elephant'].includes(item.id)?'an':'a'} ${item.en}.`),
    excludes:exclusions.filter(pair=>pair.includes(item.id)).flat().filter(other=>other!==item.id && items.some(w=>w.id===other)),
  })),
}));

export function factsFor(course) {
  const n=course.items.length;
  const grammar=course.kind==='school'?'scissors 使用 a pair of scissors；paper、glue 在本课中为不可数名词，使用 some paper、some glue。':course.kind==='number'?'one block 用单数，zero blocks 与 two–twenty blocks 用复数；零个积木显示空车厢。':course.kind==='body'?'Touch your … 是指示动作的祈使句；部位高亮与指示圈指向同一部位。':course.kind==='color'?"颜色词用 It's … 指认；亮暗主题不改变标准色块本身。":"图片与例句均指一只动物或一件水果；grape 对应单颗葡萄，a/an 根据后续发音选择。";
  return `# ${course.id} 知识断言\n\n## 适用范围\n- 覆盖 ${n} 个词的声音、书面词形与实物/图片对应。每轮随机练习 8 词，四关通关不等同于掌握整个词库。\n- 不考拼写、语法、音标或教材单元顺序；词义以这里的日常语境为限。\n\n## 知识断言\n${course.items.map((item,i)=>`- [F${i+1}] ${item.en} 在本课语境中表示“${item.zh}”${course.kind==='number'?`，对应非负整数 ${item.value}`:''}。[S${i+1}]`).join('\n')}\n- [F${n+1}] ${grammar}[S${n+1}]\n\n## 来源\n${course.items.map((item,i)=>`- [S${i+1}] Cambridge Dictionary，“${item.en}”词条：https://dictionary.cambridge.org/dictionary/english/${item.id}`).join('\n')}\n- [S${n+1}] Cambridge Dictionary Grammar，Determiners、Nouns、Imperatives：https://dictionary.cambridge.org/grammar/british-grammar/ （不可数名词另见本课 paper、glue 词条，scissors 词条注明 plural noun）。\n`;
}

export const UI = {
 zh:{back:'返回平台',language:'切换语言',theme:'切换主题',tools:'设置与帮助',music:'背景音乐',effects:'操作音效',speech:'单词与引导朗读',mute:'关闭全部声音',unmute:'恢复声音',on:'开',off:'关',stages:['听听找找','单词找朋友','图片找名字','综合挑战'],listen:'听一听，选出图片',read:'找到这个单词的图片',picture:'给图片找到英文名字',learn:'先认识这个新朋友',hear:'再听一次',next:'继续',begin:'开始挑战',retry:'重试本关',newRound:'再学一组',resume:'继续挑战',fallback:'改为看词题',audioBlocked:'声音还没准备好，可以重试或改为看词。',loading:'正在准备单词声音…',paused:'已暂停，准备好再继续',correct:'找对啦！',wrong:'再找找，时间还在走哦。',timeout:'时间到了，记住这个朋友吧。',failed:'心用完啦，记住这些词再出发！',levelDone:'这一关完成啦！',roundDone:'本轮八个词，四关完成！',review:'错词再见面',learned:'已练过',batch:'本轮 8 词',round:'轮',stage:'关',hearts:'剩余生命',seconds:'秒',hint:'听听怎么玩',nogl:'暂时打不开 3D 舞台，请启用浏览器图形加速后重试。',help:'每题 20 秒，每关 3 颗心。选错可以重试，错词会再出现。',visualOnly:'本题改为看词练习',recovered:'这一组题出了点问题，已经换了一组，继续吧。',practice:'点一下，再听单词',done:'这一轮完成啦！',full:'这一轮完成啦！',empty:'开始认识新单词吧。',invalid:'请选一个选项。',nothing:'继续挑战吧。',same:'再找找。',bag:'这是书包。'},
 en:{back:'Back to KidsLab',language:'Switch language',theme:'Switch theme',tools:'Settings & help',music:'Music',effects:'Sound effects',speech:'Words and guidance',mute:'Mute all sounds',unmute:'Restore sounds',on:'On',off:'Off',stages:['Listen & find','Words & pictures','Name the picture','Mixed challenge'],listen:'Listen and choose a picture',read:'Find the picture for this word',picture:'Find the English name',learn:'Meet a new friend',hear:'Hear it again',next:'Continue',begin:'Start challenge',retry:'Retry this level',newRound:'Learn eight more',resume:'Continue challenge',fallback:'Use a written word',audioBlocked:'Sound is not ready. Retry or use a written word.',loading:'Getting the word ready…',paused:'Paused. Continue when you are ready.',correct:'You found it!',wrong:'Try another one. The clock is still ticking.',timeout:'Time is up. Meet this friend again.',failed:'No hearts left. Meet these words and try again!',levelDone:'Level complete!',roundDone:'Eight words, four levels complete!',review:'Meet this word again',learned:'Practised',batch:'8 words this round',round:'Round',stage:'Level',hearts:'Hearts left',seconds:'seconds',hint:'Hear how to play',nogl:'The 3D stage is unavailable. Enable browser graphics acceleration and try again.',help:'20 seconds per question, 3 hearts per level. Try again after a mistake. Missed words return.',visualOnly:'Written-word practice',recovered:'That set of words had a problem. A new set is ready — keep going.',practice:'Tap to hear the word',done:'This round is complete!',full:'This round is complete!',empty:'Meet some new words.',invalid:'Choose an option.',nothing:'Keep going.',same:'Try another one.',bag:'This is the bag.'},
};
