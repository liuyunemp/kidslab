# 年级与科目归属核查（2026-10-16）

覆盖当前147个可见课件；另两张旧导航页保持 listed:false。逐课结论以核查时源码为准，不是玩法质量或知识正确性的完整认证。

## 采用的口径

- grades 表示完整核心教学目标的教材归属，不表示推荐年龄。前置知识和明确可选的通关彩蛋不单独增加年级；多个独立核心主题未拆入口时，不能按局部内容给整课贴年级。
- 无足够具体证据、通用拓展、跨年级/跨册综合入口使用 []，在当前学段的“全部年级”下保留，并继续受科目和搜索筛选。待核准不是下线或断言该知识永远不属于某年级。
- 严格区分上/下册；全一册教材使用整年级标记，不把教材未规定的学期进度当事实。高中模块也不直接换算成年级。
- 侧栏数字表示点击该选项后的结果数，统一计入搜索和符合条件的置顶课件。选择年级会按既有交互重置学期，因此年级数字统计该年级全部学期；科目与学期数字保留其他当前条件。
- 官方来源为[人教社教材电子版目录](https://jc.pep.com.cn/)，核查日在线公开的六三学制版本。下表以官方书号固定版本；新旧版本处于过渡期，不把目录URL中的年份数字自行解释为审定年份。一年级下册沿用已有[2024年审定教材逐关覆盖表](./g1b-textbook-coverage.md)。
- 阅读实际入口、配置/活动库及已有 facts.md，结合官方目录和相应章节定位核心范围；待核准项明确保留证据缺口，不将国外 Grade 或宽泛学段课标当作国内具体年级证据。官方页面图像仅用于临时核查，不复制入仓库。

## 结果

58个课件有明确年级归属，80个仅在全部年级显示。方位小镇按当前科学教材归为 science，打赌派对按鸽巢问题归为 math；其余科目保持，六款英语启蒙课件按适龄 g1–g3 保留、暂无教材册次锚点。课程ID和玩法不变，规划完成数不变。

源码数据已调整；**本轮按用户要求不构建、不执行E2E、不更新 courseware/、index.html、sw.js**。因此现有构建清单在用户统一构建前仍是旧数据，不能以其判断本次源码是否生效。

## 2026-10-16 解耦修订（用户决定）

上表口径中"grades = 教材归属"与"无映射即空年级"执行后，主站「一年级·上册」等筛选几乎清空，用户要求恢复。经确认采用**两套语义解耦**：

- **grades = 适龄年级筛选**：表示该课核心内容适龄的年级/学期，供主站年级与学期筛选使用；
- **教材映射（curriculum.json）= 教材单元入口**：表示与官方电子教材页码的精确锚点，供"按单元浏览"分组使用。

据此修订：

- 恢复了 68 款课件的适龄年级（含语文一年级上册 3 款、数学一年级上册 4 款及全部跨年级综合课件），`number-fireflies` 由冗余的整年级+单册改为规范双册 `["g1a","g1b"]`；恢复值取自重构前提交 `5d9c0909` 的源码。
- `g1-direction-town`（科学一下）、`g1-sort-laundry`（数学二上）、`clock-town`（数学二下）三款**保留**本表按 2024 新教材核准的归属，未回改。
- 本表"核准年级"列的精确教材锚点结论继续有效，并作为后续补建映射（如 `m1a` 书册）的工作清单；"待核准"课件的映射补齐后即可获得单元入口，不再影响年级筛选。
- 锁定测试（`tests/unit/catalog-filter.test.mjs`、`tests/unit/curriculum.test.mjs`）已同步为解耦语义：映射必须是年级标注的子集，但允许适龄课件暂无教材锚点。

## 逐课核查

“依据”中的原文链接指向本课活动配置或主入口；facts.md 中旧的“面向某年级”只作历史适龄描述，当前筛选以本表和 course.json 为准。

| 课件 | 原科目 → 当前科目 | 原年级 | 核准年级 | 结论与依据 |
| --- | --- | --- | --- | --- |
| 质量守恒实验室（mass-conservation-lab） | chemistry → chemistry | g9 | g9a | 敞口与密闭反应前后称量，对应第五单元“质量守恒定律”110–116页。 [源码](../../src/mass-conservation-lab/main.js) · [断言](../../src/mass-conservation-lab/facts.md) · [h9a](https://book.pep.com.cn/1342001301241/mobile/index.html) |
| 有机分子工坊（organic-builder-lab） | chemistry → chemistry | g10, g12 | [] | 同入口含有机物拼装、键角、反应矩阵与同分异构体，属于跨模块综合实验，删除高一/高三泛标签。 [源码](../../src/organic-builder-lab/main.js) · [断言](../../src/organic-builder-lab/facts.md) |
| 酸碱魔法水（ph-lab） | chemistry → chemistry | g8, g9, g10 | [] | pH与指示剂之外同步展示氢离子浓度估算；九下“溶液的酸碱性”不足以覆盖此跨初高中面板。 [源码](../../src/ph-lab/main.js) · [断言](../../src/ph-lab/facts.md) · [h9b](https://book.pep.com.cn/1342001302241/mobile/index.html) |
| 汉字寻宝（g1-character-garden） | chinese → chinese | g1a | g1a | 十个核心汉字天、地、人、日、月、水、火、口、耳、山对应第一单元识字8–14页。 [源码](../../src/g1-character-garden/config.js) · [断言](../../src/g1-character-garden/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 拼音轨道（g1-pinyin-tracks） | chinese → chinese | g1a | g1a | 声母、韵母与声调拼合，对应第二至第四单元汉语拼音20–59页。 [源码](../../src/g1-pinyin-tracks/config.js) · [断言](../../src/g1-pinyin-tracks/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 诗画猜猜台（g1-poem-stage） | chinese → chinese | g1a | [] | 固定诗库含《静夜思》等跨册选篇，未区分册次；原“一上”泛称不能证明整套诗库属于当前上册。 [源码](../../src/g1-poem-stage/config.js) · [断言](../../src/g1-poem-stage/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 对韵小剧场（g1-rhyme-stage） | chinese → chinese | g1a | g1a | 云雨、雪风、花树、鸟虫、山清水秀、柳绿桃红均来自第六单元《对韵歌》73页。 [源码](../../src/g1-rhyme-stage/config.js) · [断言](../../src/g1-rhyme-stage/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 句子列车（g1-sentence-train） | chinese → chinese | g1a | [] | 使用自制“主角—地点—动作”十组句子；现有来源仅笼统指第一学段，没有核准到当前教材具体课次。 [源码](../../src/g1-sentence-train/config.js) · [断言](../../src/g1-sentence-train/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 笔顺快车站（g1-stroke-order） | chinese → chinese | g1a | g1a | 通过十、人、八、三等示例学习基本笔顺，锚定第一单元识字写字及写字表、笔画名称表108–109页；示例字不声称均为本册生字。 [源码](../../src/g1-stroke-order/config.js) · [断言](../../src/g1-stroke-order/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 笔画工坊（g1-stroke-workshop） | chinese → chinese | g1a | g1a | 十种基本笔画描写，对应本册识字写字活动和“笔画名称表”109页。 [源码](../../src/g1-stroke-workshop/config.js) · [断言](../../src/g1-stroke-workshop/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 词语邮局（g1-word-post） | chinese → chinese | g1a | [] | 固定词库按图片识词，原来源仅第一学段及“相应单元”，未能为整套词库确定当前册次。 [源码](../../src/g1-word-post/config.js) · [断言](../../src/g1-word-post/facts.md) · [c1a](https://book.pep.com.cn/1211001101241/mobile/index.html) |
| 汉字变变屋（g1b-character-lab） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：小青蛙（6–7页）；语文园地五（56页）；操场上（52–53页）；语文园地七（93页）；吃水不忘挖井人（吃）／动物王国开大会（听）（18–19，84–89页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-character-lab/content.js) · [断言](../../src/g1b-character-lab/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 音序小书屋（g1b-dictionary-house） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：语文园地一字母表／语文园地三音序查字法（11，34–35页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-dictionary-house/content.js) · [断言](../../src/g1b-dictionary-house/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 古诗小剧场（g1b-poetry-theater） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：语文园地一（12页）；语文园地三（35页）；静夜思（39页）；语文园地二（23页）；古诗二首（61页）；古诗二首（62页）；语文园地八（110页）；静夜思（换视角重读）（39页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-poetry-theater/content.js) · [断言](../../src/g1b-poetry-theater/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 句子造景台（g1b-sentence-studio） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：我多想去看看（20–21页）；小公鸡和小鸭子（26–28页）；怎么都快乐（31–33页）；夜色（40–41页）；古对今／语文园地五（50–51，56–58页）；荷叶圆圆（66–68页）；语文园地六（74页）；一分钟（81–83页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-sentence-studio/content.js) · [断言](../../src/g1b-sentence-studio/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 表达小舞台（g1b-speaking-stage） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：姓氏歌（4–5页）；我多想去看看（20–21页）；语文园地一·请你帮个忙（13页）；端午粽／语文园地四（42–47页）；语文园地五·一起做游戏（58页）；荷叶圆圆／语文园地六（66–68，73–76页）；动物王国开大会（84–89页）；语文园地八（110页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-speaking-stage/content.js) · [断言](../../src/g1b-speaking-stage/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 故事放映屋（g1b-story-studio） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：吃水不忘挖井人（18–19页）；小公鸡和小鸭子（26–28页）；树和喜鹊（29–30页）；端午粽（42–43页）；要下雨了（69–72页）；语文园地七·听故事，讲故事（95页）；动物王国开大会（84–89页）；咕咚（102–104页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-story-studio/content.js) · [断言](../../src/g1b-story-studio/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 词语生活馆（g1b-word-world） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：春夏秋冬／语文园地一（2–3，10–14页）；怎么都快乐（31–33页）；语文园地四（44页）；端午粽（42–43页）；古对今（50–51页）；动物儿歌（48–49页）；荷叶圆圆（66–68页）；语文园地七（93页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-word-world/content.js) · [断言](../../src/g1b-word-world/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 写字小工坊（g1b-writing-workshop） | chinese → chinese | g1b | g1b | 2024年审定《语文 一年级下册》：棉花姑娘／写字表（101，119页）；语文园地三（35页）；姓氏歌／写字表（5，117页）；动物王国开大会／写字表（89，119页）；树和喜鹊／写字表（30，117页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-writing-workshop/content.js) · [断言](../../src/g1b-writing-workshop/facts.md) · [教材](https://book.pep.com.cn/1211001102241/mobile/index.html) |
| 彩色玩具屋（english-color-studio） | english → english | g1, g2, g3 | [] | 英语启蒙：11 色词库随机抽 8 词，听词选图、看词选图、看图选词及综合四关；认词后玩具登台。人教版英语为三年级起点，本课按适龄 g1–g3 保留，具体册次待逐课核准，暂不锚定。 [源码](../../src/english-color-studio/engine.js) · [断言](../../src/english-color-studio/facts.md) |
| 水果野餐篮（english-fruit-picnic） | english → english | g1, g2, g3 | [] | 英语启蒙：16 种水果随机抽 8 词闯四关，认词后水果入篮；单颗葡萄对应 grape。人教版英语为三年级起点，本课按适龄 g1–g3 保留，具体册次待逐课核准，暂不锚定。 [源码](../../src/english-fruit-picnic/engine.js) · [断言](../../src/english-fruit-picnic/facts.md) |
| 动物欢乐园（english-animal-park） | english → english | g1, g2, g3 | [] | 英语启蒙：20 种动物随机抽 8 词闯四关，认词后动物入园；过滤 bird/duck 等歧义干扰项。人教版英语为三年级起点，本课按适龄 g1–g3 保留，具体册次待逐课核准，暂不锚定。 [源码](../../src/english-animal-park/engine.js) · [断言](../../src/english-animal-park/facts.md) |
| 数字小火车（english-number-train） | english → english | g1, g2, g3 | [] | 英语启蒙：zero–twenty 共 21 词随机抽 8 词闯四关，数量图每五个一组，zero 表示零块；答对后火车前进。人教版英语为三年级起点，本课按适龄 g1–g3 保留，具体册次待逐课核准，暂不锚定。 [源码](../../src/english-number-train/engine.js) · [断言](../../src/english-number-train/facts.md) |
| 身体动作秀（english-body-show） | english → english | g1, g2, g3 | [] | 英语启蒙：16 个身体部位随机抽 8 词闯四关，近景明确标记部位，认词后小人做动作。人教版英语为三年级起点，本课按适龄 g1–g3 保留，具体册次待逐课核准，暂不锚定。 [源码](../../src/english-body-show/engine.js) · [断言](../../src/english-body-show/facts.md) |
| 我的小书包（english-school-bag） | english → english | g1, g2, g3 | [] | 英语启蒙：16 种学习用品随机抽 8 词闯四关，认词后用品装包；bag 辨认书包本身。人教版英语为三年级起点，本课按适龄 g1–g3 保留，具体册次待逐课核准，暂不锚定。 [源码](../../src/english-school-bag/engine.js) · [断言](../../src/english-school-bag/facts.md) |
| 欢迎来到KidsLab · 从一盏灯到宇宙（welcome） | featured → featured | [] | [] | 平台欢迎与宇宙拉远展示没有具体教材年级，保持空年级；置顶只用于排序。 [源码](../../src/welcome/main.js) |
| 打赌派对（bet-party） | logic → math | g5, g6 | g6b | 生日月份、袜子等离散分类保证性推理，对应“数学广角——鸽巢问题”67–70页；改归数学。 [源码](../../src/bet-party/main.js) · [断言](../../src/bet-party/facts.md) · [m6b](https://book.pep.com.cn/1221001602141/mobile/index.html) |
| 侦探线索板（detective-board） | logic → logic | g4, g5, g6 | [] | 逻辑拓展：谁偷吃了蛋糕？读线索、在网格上钉下 ❌ 和 ✅，看排除法像多米诺一样连锁倒下，红线在软木板上织出真相之网——经典逻辑网格谜题的侦探社版本。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/detective-board/main.js) |
| 摆渡奇遇（ferry-tales） | logic → logic | g2, g3, g4 | [] | 逻辑拓展：狼、羊、白菜都想过河，可有些乘客不能被单独留下。挑选船客、规划往返，让每一座河岸始终安全；走错时，小剧场会替你把时间倒回来。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/ferry-tales/main.js) · [断言](../../src/ferry-tales/facts.md) |
| 四色王国（four-color-kingdom） | logic → logic | g5, g6 | [] | 逻辑拓展：给王国地图上色：相邻领地不能同色，颜料按桶收钱。从挥霍五色到紧预算、领主点名，直到亲手发现——四色永远够用。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/four-color-kingdom/main.js) · [断言](../../src/four-color-kingdom/facts.md) |
| 狐狸的石子（fox-stones） | logic → logic | g4, g5, g6 | [] | 逻辑拓展：和狡猾的狐狸轮流拿石子，每次 1–3 颗，拿到最后一颗就赢。狐狸开始总赢——直到你在复盘板上盯出「4 的倍数」的秘密，从结局倒着算出必胜策略！ 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/fox-stones/main.js) |
| 汉诺塔挑战（hanoi-tower） | logic → logic | [] | [] | 逻辑拓展：把整座彩虹塔搬到另一根柱子上，大盘子不能压小盘子。你能用最少的步数完成吗？ 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/hanoi-tower/main.js) |
| 华容道 · 木关智局（huarong-dao） | logic → logic | g3, g4, g5, g6, g7, g8, g9 | [] | 逻辑拓展：在逼真的 3D 木制华容道里传递两格空位，让曹操从南门离开；可自由闯关、分步提示，也能暂停回看完整解法演示。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/huarong-dao/main.js) · [断言](../../src/huarong-dao/facts.md) |
| 七桥滑冰（ice-bridges） | logic → logic | g5, g6 | [] | 逻辑拓展：在会碎的冰桥上规划一笔滑行：先用奇偶眼镜看穿七桥为何无解，再滑完一条欧拉回路，最后亲手改桥救活冰雪小镇。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/ice-bridges/main.js) · [断言](../../src/ice-bridges/facts.md) |
| 激光镜屋（laser-mirrors） | logic → logic | g3, g4, g5 | [] | 逻辑拓展：先在脑中预测光路，再摆放和旋转斜镜。让激光绕过障碍、穿过分光镜和彩色滤镜，依次点亮整座镜屋的水晶。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/laser-mirrors/main.js) · [断言](../../src/laser-mirrors/facts.md) |
| 魔方小达人（magic-cube） | logic → logic | [] | [] | 逻辑拓展：亲手转动一颗金属镜面 3D 魔方！2×2、3×3、4×4 三种阶数，镜面/经典/马卡龙/霓虹四套皮肤，三档打乱难度，卡住了还有提示和自动还原演示。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/magic-cube/main.js) |
| 海盗验金室（pirate-scales） | logic → logic | g4, g5, g6 | [] | 逻辑拓展：一箱金币里混着一枚轻一点的假币。用天平称，每称一次付一枚佣金。发现天平会说三种话，一次就能把嫌疑砍成三分之一！ 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/pirate-scales/main.js) · [断言](../../src/pirate-scales/facts.md) |
| 折纸打孔妙妙屋（punch-origami） | logic → logic | g4, g5, g6 | [] | 逻辑拓展：把纸折成小方块、打下一孔，再在展开图上预测所有孔位。沿折痕拖开纸张，看一个孔怎样连续镜像成二、四、八，最后绽放成十六孔纸花。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/punch-origami/main.js) · [断言](../../src/punch-origami/facts.md) |
| 金属金字塔魔方（pyramid-cube） | logic → logic | g3, g4, g5, g6, g7, g8, g9 | [] | 逻辑拓展：亲手转动一颗金属三阶金字塔魔方！四面蓝红黄绿，轻松/进阶/大师三档打乱，卡住了有「帮我一步」和还原演示，还有玩法小课堂。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/pyramid-cube/main.js) · [断言](../../src/pyramid-cube/facts.md) |
| 数独动物园（sudoku-zoo） | logic → logic | [] | [] | 逻辑拓展：帮小动物们住进笼舍！每行、每列、每个园区都不能有重复的动物。从 4×4 新手村一路闯到 9×9 传奇峰，5 级难度等你挑战！ 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/sudoku-zoo/main.js) |
| 真话岛（truth-island） | logic → logic | g3, g4, g5 | [] | 逻辑拓展：给真假村民贴身份徽章，拆开“与、或、非”的线索，最后问出让两位守卫都指向错误道路的神问题。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/truth-island/main.js) · [断言](../../src/truth-island/facts.md) |
| 维恩太空港（venn-port） | logic → logic | g1, g2, g3 | [] | 逻辑拓展：在逼真的 3D 轨道海关扫描两条规则，把飞船停进左集、交集、右集或集合外；支持分步提示与可暂停的完整任务演示。 现有依据不能把完整规则/策略归入具体教材年级，保留逻辑分类。 [源码](../../src/venn-port/main.js) · [断言](../../src/venn-port/facts.md) |
| 外星农场（alien-farm） | math → math | g4, g5, g6 | g4b | 列表试调与假设法解决两类动物数量问题，对应“数学广角——鸡兔同笼”99–102页；不再泛标五、六年级。 [源码](../../src/alien-farm/main.js) · [断言](../../src/alien-farm/facts.md) · [m4b](https://book.pep.com.cn/1221001402131/mobile/index.html) |
| 角度高尔夫（angle-golf） | math → math | g4 | g4a | 核心是0°–180°的角度读数与报角，对应“角的度量”28–38页；反弹为游戏场景。 [源码](../../src/angle-golf/main.js) · [断言](../../src/angle-golf/facts.md) · [m4a](https://book.pep.com.cn/1221001401261/mobile/index.html) |
| 平衡马戏团（balance-circus） | math → math | g5, g6 | [] | 同一流程包含消去两边含未知数的量并解方程；当前五上“用字母表示数和数量关系”不足以证明完整解方程流程归属。 [源码](../../src/balance-circus/main.js) · [断言](../../src/balance-circus/facts.md) · [m5a](https://book.pep.com.cn/1221001501261/mobile/index.html) |
| 游园会真相（carnival-truth） | math → math | g5 | [] | 玩法要求计算等可能事件概率并用千次模拟辨别频率；不能仅凭五上定性的“可能性”归入五年级。 [源码](../../src/carnival-truth/main.js) · [断言](../../src/carnival-truth/facts.md) · [m5a](https://book.pep.com.cn/1221001501261/mobile/index.html) |
| 进位工厂（carry-factory） | math → math | g2, g3 | g2b | 订单47+38至999+1及302−178均在当前二下“万以内的加法和减法”63–82页范围；旧二、三年级标签收窄。 [源码](../../src/carry-factory/main.js) · [断言](../../src/carry-factory/facts.md) · [m2b](https://book.pep.com.cn/1221001202251/mobile/index.html) |
| 找零售货机（change-vending） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：欢乐购物街（77–82页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/change-vending/content.js) · [断言](../../src/change-vending/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 时钟小镇（clock-town） | math → math | g1a | g2b | 含12:30、3:15、6:45的读钟任务，对应“时间在哪里”1–9页，不属于当前一上目录。 [源码](../../src/clock-town/main.js) · [断言](../../src/clock-town/facts.md) · [m2b](https://book.pep.com.cn/1221001202251/mobile/index.html) · [m1a](https://book.pep.com.cn/1221001101241/mobile/index.html) |
| 搭配衣橱（combo-closet） | math → math | g2, g3 | [] | 搭配计数与反向设计12套进货单是完整组合探究；当前二、三年级目录不能确定这一完整流程的教材归属。 [源码](../../src/combo-closet/main.js) · [断言](../../src/combo-closet/facts.md) · [m2a](https://book.pep.com.cn/1221001201251/mobile/index.html) · [m2b](https://book.pep.com.cn/1221001202251/mobile/index.html) · [m3a](https://book.pep.com.cn/1221001301251/mobile/index.html) · [m3b](https://book.pep.com.cn/1221001302251/mobile/index.html) |
| 因数水晶洞（crystal-cave） | math → math | g5, g6 | [] | 质数合数与倍数有五下锚点，但核心连续质因数分解超出目录能够证明的范围，保留为拓展待核准。 [源码](../../src/crystal-cave/main.js) · [断言](../../src/crystal-cave/facts.md) · [m5b](https://book.pep.com.cn/1221001502141/mobile/index.html) |
| 数据演播室（data-studio） | math → math | g3, g4, g5, g6 | [] | 固定流程混合计数、条形图、折线图、扇形图与平均数，没有分年级入口；不得把三至六年级全部勾上。 [源码](../../src/data-studio/main.js) · [断言](../../src/data-studio/facts.md) · [m3b](https://book.pep.com.cn/1221001302251/mobile/index.html) · [m4b](https://book.pep.com.cn/1221001402131/mobile/index.html) · [m5b](https://book.pep.com.cn/1221001502141/mobile/index.html) · [m6a](https://book.pep.com.cn/1221001601261/mobile/index.html) |
| 无人机邮局（drone-post） | math → math | g6 | [] | 数对、坐标位移、比例尺在同一配送流程内；六上“确定位置”与六下“比例”不是一个册次的独立入口。 [源码](../../src/drone-post/main.js) · [断言](../../src/drone-post/facts.md) · [m6a](https://book.pep.com.cn/1221001601261/mobile/index.html) · [m6b](https://book.pep.com.cn/1221001602141/mobile/index.html) |
| 分数节拍屋（fraction-beats） | math → math | g3, g4 | g5b | 分母2、4、8的等值分数与合并对应“分数的意义和性质”及“分数的加法和减法”，不以三年级初识分数代替完整范围。 [源码](../../src/fraction-beats/main.js) · [断言](../../src/fraction-beats/facts.md) · [m5b](https://book.pep.com.cn/1221001502141/mobile/index.html) |
| 分数披萨店（fraction-lab） | math → math | g3a, g5, g6a | [] | 同一面板同步展示分数、小数、百分数和等值分数，未按年级隔离。 [源码](../../src/fraction-lab/main.js) · [断言](../../src/fraction-lab/facts.md) · [m3a](https://book.pep.com.cn/1221001301251/mobile/index.html) · [m5b](https://book.pep.com.cn/1221001502141/mobile/index.html) · [m6a](https://book.pep.com.cn/1221001601261/mobile/index.html) |
| 函数变形记（function-grapher） | math → math | g8, g9, g10, g11 | [] | 一次、二次、反比例和正弦函数共用入口，是跨初高中综合观察台；不按某一个函数给整课标年级。 [源码](../../src/function-grapher/main.js) · [断言](../../src/function-grapher/facts.md) |
| 加法车站（g1-addition-depot） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：100以内的口算加、减法（43–55页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1-addition-depot/content.js) · [断言](../../src/g1-addition-depot/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 比大小桥（g1-compare-bridge） | math → math | g1a, g1b | g1b | 2024年审定《数学 一年级下册》：100以内数的认识：数的大小（23–42页）。8个代表性探索及自由操作与既有逐关覆盖表一致。已覆盖100以内比较，移除旧上册标签。 [源码](../../src/g1-compare-bridge/content.js) · [断言](../../src/g1-compare-bridge/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 方位小镇（g1-direction-town） | math → science | g1a | g1b | 固定参照物判断前后左右上下，对应科学一下第一单元“位置和方向”1–13页；按当前教材改归科学。 [源码](../../src/g1-direction-town/config.js) · [断言](../../src/g1-direction-town/facts.md) · [s1b](https://book.pep.com.cn/1244001102241/mobile/index.html) |
| 图形拼搭（g1-flat-shapes） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：认识平面图形（1–7页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1-flat-shapes/content.js) · [断言](../../src/g1-flat-shapes/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 加减接力（g1-mixed-relay） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：复习与关联（83–90页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1-mixed-relay/content.js) · [断言](../../src/g1-mixed-relay/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 分类洗衣坊（g1-sort-laundry） | math → math | g1a | g2a | 按颜色、形状、用途换标准分类并整理数量，对应当前二上“分类与整理”1–9页，移除一上标签。 [源码](../../src/g1-sort-laundry/config.js) · [断言](../../src/g1-sort-laundry/facts.md) · [m2a](https://book.pep.com.cn/1221001201251/mobile/index.html) |
| 减法车站（g1-subtraction-depot） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：20以内的退位减法（8–22页）；100以内的口算加、减法（43–55页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1-subtraction-depot/content.js) · [断言](../../src/g1-subtraction-depot/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 轻重天平（g1-weight-lab） | math → math | g1a | [] | 只有天平轻重比较，没有核准当前一上数学中的对应教材课次；保留数学启蒙分类，移除适龄年级。 [源码](../../src/g1-weight-lab/config.js) · [断言](../../src/g1-weight-lab/facts.md) · [m1a](https://book.pep.com.cn/1221001101241/mobile/index.html) |
| 竖式搭建厂（g1b-column-workshop） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：100以内的笔算加、减法（57–58页）；100以内的笔算加、减法（62页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-column-workshop/content.js) · [断言](../../src/g1b-column-workshop/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 数量故事台（g1b-quantity-theater） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：数量间的加减关系（69页）；数量间的加减关系（70–71页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/g1b-quantity-theater/content.js) · [断言](../../src/g1b-quantity-theater/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 格子大厦（grid-tower） | math → math | g3, g4 | [] | 同一课同时有多位乘法面积分解和除法拆楼；未拆分三下除法与四上多位乘两位数入口。 [源码](../../src/grid-tower/main.js) · [断言](../../src/grid-tower/facts.md) · [m3b](https://book.pep.com.cn/1221001302251/mobile/index.html) · [m4a](https://book.pep.com.cn/1221001401261/mobile/index.html) |
| 仓鼠围栏（hamster-fence） | math → math | g3 | g3b | 长方形周长、面积与围栏变化，对应“长方形和正方形”“图形的面积”39–64页；L形以同一单位格计数延伸。 [源码](../../src/hamster-fence/main.js) · [断言](../../src/hamster-fence/facts.md) · [m3b](https://book.pep.com.cn/1221001302251/mobile/index.html) |
| 百数地铁（hundred-metro） | math → math | g1b | g1b | 2024年审定《数学 一年级下册》：100以内数的认识（23–42页）。8个代表性探索及自由操作与既有逐关覆盖表一致。 [源码](../../src/hundred-metro/content.js) · [断言](../../src/hundred-metro/facts.md) · [教材](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 冰淇淋几何（icecream-geometry） | math → math | g6 | g6b | 核心实验为等底等高圆柱圆锥容积关系，对应“圆柱与圆锥”16–37页；球、圆台仅为明确标注的可选展示，不据此增加年级。 [源码](../../src/icecream-geometry/main.js) · [断言](../../src/icecream-geometry/facts.md) · [m6b](https://book.pep.com.cn/1221001602141/mobile/index.html) |
| 墨迹怪物（inkblot-monsters） | math → math | g3, g4 | g4b | 单轴对称、补全镜像是核心，对应“图形的运动（一）”79–86页；六重对称为通关彩蛋。 [源码](../../src/inkblot-monsters/main.js) · [断言](../../src/inkblot-monsters/facts.md) · [m4b](https://book.pep.com.cn/1221001402131/mobile/index.html) |
| 灯笼街（lantern-lane） | math → math | g5 | [] | 间隔与植树问题模型；现有来源引用旧规划和后续练习，当前五上目录不再提供所称单元，等待对应版本核准。 [源码](../../src/lantern-lane/main.js) · [断言](../../src/lantern-lane/facts.md) · [m5a](https://book.pep.com.cn/1221001501261/mobile/index.html) |
| 数字萤火虫（number-fireflies） | math → math | g1, g1a | g1b | 核心为20以内加减，包含12−?=8；按一下退位减法8–22页及复习83–90页归属，不能用g1覆盖上册。 [源码](../../src/number-fireflies/main.js) · [断言](../../src/number-fireflies/facts.md) · [m1a](https://book.pep.com.cn/1221001101241/mobile/index.html) · [m1b](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 果园订单（orchard-orders） | math → math | g2 | [] | 乘法阵列之外还要求23个苹果补缺与两块田拼单，且有超过表内范围的因子；完整路线未核准到二上单一目标，暂作综合拓展。 [源码](../../src/orchard-orders/main.js) · [断言](../../src/orchard-orders/facts.md) · [m2a](https://book.pep.com.cn/1221001201251/mobile/index.html) |
| 煎饼老板（pancake-boss） | math → math | g3, g4 | [] | 两面煎饼排程与并行做饮料属于统筹拓展；当前三、四年级目录未核准完整目标，不沿用旧推荐年龄。 [源码](../../src/pancake-boss/main.js) · [断言](../../src/pancake-boss/facts.md) · [m3a](https://book.pep.com.cn/1221001301251/mobile/index.html) · [m3b](https://book.pep.com.cn/1221001302251/mobile/index.html) · [m4a](https://book.pep.com.cn/1221001401261/mobile/index.html) · [m4b](https://book.pep.com.cn/1221001402131/mobile/index.html) |
| 规律毛毛虫（pattern-caterpillar） | math → math | g1b | [] | 颜色、声音、动作规律拓展；仓库的一下教材覆盖表已说明本版不把它计为独立教材单元。 [源码](../../src/pattern-caterpillar/main.js) · [m1b](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 魔药比例坊（potion-ratio） | math → math | g6 | [] | 配方缩放、两项及三项按比分配混合，当前册次完整对应依据不足；不把比与比例相关就视作整年级适用。 [源码](../../src/potion-ratio/main.js) · [断言](../../src/potion-ratio/facts.md) · [m6a](https://book.pep.com.cn/1221001601261/mobile/index.html) · [m6b](https://book.pep.com.cn/1221001602141/mobile/index.html) |
| 滚轮乐园（rolling-park） | math → math | g6 | g6a | 测圆周、圆周率和圆面积，对应“圆”48–73页。 [源码](../../src/rolling-park/main.js) · [断言](../../src/rolling-park/facts.md) · [m6a](https://book.pep.com.cn/1221001601261/mobile/index.html) |
| 折扣侦探（sale-detective） | math → math | g6 | g6b | 折扣与促销实际价格比较，对应“百分数（二）”8–14页；百分数小数互化是所需前置知识。 [源码](../../src/sale-detective/main.js) · [断言](../../src/sale-detective/facts.md) · [m6b](https://book.pep.com.cn/1221001602141/mobile/index.html) |
| 立体影子剧场（shadow-theater） | math → math | g1a | [] | 同时辨认立体、平面剪影并旋转匹配多视角；超出一上“认识立体图形”能够支持的完整核心范围。 [源码](../../src/shadow-theater/main.js) · [断言](../../src/shadow-theater/facts.md) · [m1a](https://book.pep.com.cn/1221001101241/mobile/index.html) · [m1b](https://book.pep.com.cn/1221001102241/mobile/index.html) · [m3a](https://book.pep.com.cn/1221001301251/mobile/index.html) |
| 图形裁缝铺（shape-tailor） | math → math | g5 | g5a | 割补推导平行四边形、三角形、梯形面积，对应当前“多边形的面积”72–94页。 [源码](../../src/shape-tailor/main.js) · [断言](../../src/shape-tailor/facts.md) · [m5a](https://book.pep.com.cn/1221001501261/mobile/index.html) |
| 平方根建筑师（square-root-lab） | math → math | g7, g8, g9 | [] | 平方根、夹逼和根式化简合在同一面板；原七至九年级只引用学段课标，缺少完整单年级入口。 [源码](../../src/square-root-lab/main.js) · [断言](../../src/square-root-lab/facts.md) |
| 抽样统计实验室（statistics-sampling-lab） | math → math | g10, g11, g12 | [] | 同课含简单随机、分层、整群、便利抽样及标准误；已有来源不足以确定整个内容的固定高中年级，保留数学综合实验。 [源码](../../src/statistics-sampling-lab/main.js) · [断言](../../src/statistics-sampling-lab/facts.md) |
| 七巧板皮影戏（tangram-theater） | math → math | g1b | [] | 七巧板拼搭为拓展；仓库已锁定的一下教材覆盖表明确不计作该版独立单元。 [源码](../../src/tangram-theater/main.js) · [断言](../../src/tangram-theater/facts.md) · [m1b](https://book.pep.com.cn/1221001102241/mobile/index.html) |
| 三角形实验室（triangle-lab） | math → math | g4 | g4b | 三角形稳定性、内角和及三边关系，对应“三角形”57–68页。 [源码](../../src/triangle-lab/main.js) · [断言](../../src/triangle-lab/facts.md) · [m4b](https://book.pep.com.cn/1221001402131/mobile/index.html) |
| 上下世界（updown-world） | math → math | g6 | [] | 除负数认识外强制进行整数加减，不能只凭六下“负数”认识单元标为六年级。 [源码](../../src/updown-world/main.js) · [断言](../../src/updown-world/facts.md) · [m6b](https://book.pep.com.cn/1221001602141/mobile/index.html) |
| 体积水族馆（volume-aquarium） | math → math | g5 | g5b | 单位小方块、长方体体积、容积与排水测物体积，对应“长方体和正方体”18–43页。 [源码](../../src/volume-aquarium/main.js) · [断言](../../src/volume-aquarium/facts.md) · [m5b](https://book.pep.com.cn/1221001502141/mobile/index.html) |
| 方块摄影棚（voxel-studio） | math → math | g2, g3, g4 | g5a | 正面、上面、侧面观察组合体及反向搭建，对应当前“观察简单组合体”1–6页；不再挂二至四年级适龄范围。 [源码](../../src/voxel-studio/main.js) · [断言](../../src/voxel-studio/facts.md) · [m5a](https://book.pep.com.cn/1221001501261/mobile/index.html) |
| 数字宇宙（zoom-ten） | math → math | g4, g5 | [] | 同课混合大数、小数、长度换算与极大极小数量级，没有按册拆开的入口。 [源码](../../src/zoom-ten/main.js) · [断言](../../src/zoom-ten/facts.md) · [m4a](https://book.pep.com.cn/1221001401261/mobile/index.html) · [m4b](https://book.pep.com.cn/1221001402131/mobile/index.html) |
| 圆周与卫星实验室（circular-orbit-lab） | physics → physics | g11 | [] | 二体轨道、圆轨、椭圆、逃逸及同步卫星共用入口；只确定高中物理主题，未核准固定年级/册次。 [源码](../../src/circular-orbit-lab/main.js) · [断言](../../src/circular-orbit-lab/facts.md) |
| 密度侦探实验室（density-detective-lab） | physics → physics | g8 | g8a | 称质量、测体积并用密度辨材，对应第六章“质量与密度”138–158页。 [源码](../../src/density-detective-lab/main.js) · [断言](../../src/density-detective-lab/facts.md) · [p8a](https://book.pep.com.cn/1341001201241/mobile/index.html) |
| 制冰实验室（ice-maker-lab） | physics → physics | g5, g6, g7 | [] | 制冷回路、压缩机功和热量账本不是小学或七年级单一教材目标，保留物理工程拓展。 [源码](../../src/ice-maker-lab/main.js) · [断言](../../src/ice-maker-lab/facts.md) |
| 运动追踪实验室（motion-tracker-lab） | physics → physics | g8, g10 | [] | 匀速与匀加速、s-t和v-t图同入口，跨初高中内容；八上速度测量不足以覆盖整课。 [源码](../../src/motion-tracker-lab/main.js) · [断言](../../src/motion-tracker-lab/facts.md) · [p8a](https://book.pep.com.cn/1341001201241/mobile/index.html) |
| 欧姆定律实验室（ohms-law-lab） | physics → physics | g9, g11 | g9 | 恒温电阻的U-I-R关系和伏安法，对应九年级全一册第十七章92–109页；教材未分上/下册，不自行推算学期，删除高中适龄标签。 [源码](../../src/ohms-law-lab/main.js) · [断言](../../src/ohms-law-lab/facts.md) · [p9](https://book.pep.com.cn/1341001303251/mobile/index.html) |
| 光学实验室（optics-lab） | physics → physics | g8, g9, g10, g11 | g8a | 核心调物距、焦距和光屏观察实虚像与大小正倒，对应第五章“透镜及其应用”113–137页；薄透镜计算为模型内部，不要求公式推导。 [源码](../../src/optics-lab/main.js) · [断言](../../src/optics-lab/facts.md) · [p8a](https://book.pep.com.cn/1341001201241/mobile/index.html) |
| 单摆实验室（pendulum-lab） | physics → physics | g8, g11 | [] | 周期公式、非线性大摆角、阻尼和能量并存，不属于八年级简单测量；高中具体册次仍待核准。 [源码](../../src/pendulum-lab/main.js) · [断言](../../src/pendulum-lab/facts.md) |
| 抛体运动实验室（projectile-motion-lab） | physics → physics | g10 | [] | 二维抛体分解、平抛与斜抛统一面板；可确定高中物理主题，但本轮无足够依据把必修模块等同固定高一年级。 [源码](../../src/projectile-motion-lab/main.js) · [断言](../../src/projectile-motion-lab/facts.md) |
| 二进制灯塔（binary-lighthouse） | programming → programming | g4, g5, g6 | [] | 编程拓展：值守五盏只有亮与灭的海岛信号灯，用 16、8、4、2、1 的位值发送数字、解读来船灯语，再把 SOS 编成秘密信号。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/binary-lighthouse/main.js) · [断言](../../src/binary-lighthouse/facts.md) |
| 虫虫医院（bug-hospital） | programming → programming | g3, g4, g5 | [] | 编程拓展：给生病的小程序做听诊：先预测病灶，再逐行执行、观察变量，只改一行让计数器、机器人和循环恢复健康。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/bug-hospital/main.js) |
| 密码社（cipher-club） | programming → programming | g5, g6 | [] | 编程拓展：加入藏在课桌后的秘密社团，旋转凯撒密码盘加密纸条、倒转钥匙解密暗号，再用字母频率在没有钥匙时破译密文。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/cipher-club/main.js) · [断言](../../src/cipher-club/facts.md) |
| 电脑原理实验室（cpu-lab） | programming → programming | g4, g5, g6, g7 | [] | 编程拓展：少文字、强动画：点零件认识电脑，看数据在 CPU 与内存之间飞来飞去，最后自己当 CPU 算出 7+5。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/cpu-lab/main.js) · [断言](../../src/cpu-lab/facts.md) |
| 函数厨房（function-kitchen） | programming → programming | g5, g6 | [] | 编程拓展：在爆单甜品店里把重复步骤封装成配方函数，再传入口味和大小参数，用短短几行调用完成整队订单。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/function-kitchen/main.js) · [断言](../../src/function-kitchen/facts.md) |
| 惊喜鬼屋（haunted-events） | programming → programming | g4, g5 | [] | 编程拓展：给可爱鬼屋接上“当…就…”事件导线，让游客开门、踩地板和碰机关时触发惊喜，最后搭出一整条连锁反应。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/haunted-events/main.js) · [断言](../../src/haunted-events/facts.md) |
| 如果动物园（iffy-zoo） | programming → programming | g3, g4 | [] | 编程拓展：给动物园的自动喂食机编规则：如果是食草动物就投青草，否则投肉——直到熊猫出现！加特例、调顺序、组合与和或，看你的规则机一只不错地喂饱 30 只动物。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/iffy-zoo/main.js) |
| 循环乐队（loop-band） | programming → programming | g2, g3 | [] | 编程拓展：组建动物乐队，乐谱只能用循环块写：重复 4 次[咚 哒]！把循环套进循环做出整首歌，用越少的块写出同样的音乐，乐队评分越高。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/loop-band/main.js) |
| 数据包骑士（packet-knights） | programming → programming | g5, g6 | [] | 编程拓展：把王国信件拆成编号数据包，规划最短驿道，并在桥梁坍塌后为未送达的骑士实时改道。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/packet-knights/main.js) · [断言](../../src/packet-knights/facts.md) |
| 像素邮局（pixel-post） | programming → programming | g3, g4, g5 | [] | 编程拓展：在只能发送数字的像素邮局里复制 8×8 邮票、把 0 和 1 还原成图，再用行程长度编码压缩电报。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/pixel-post/main.js) · [断言](../../src/pixel-post/facts.md) |
| 机器宠物学校（robo-pet-school） | programming → programming | g5, g6 | [] | 编程拓展：用“是球 / 不是球”的例子训练机器狗，亲眼发现样本太少造成的误判，再补充多样例和反例，让它在公园认出从没见过的新球。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/robo-pet-school/main.js) · [断言](../../src/robo-pet-school/facts.md) |
| 机器人早餐（robot-breakfast） | programming → programming | g1, g2 | [] | 编程拓展：机器人管家完全按字面执行命令：顺序排错不报错，而是忠实演出一场厨房灾难——先涂黄油再进烤箱？糊啦！排对指令卡，让挑剔的小主人吃上完整早餐。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/robot-breakfast/main.js) |
| 排序运动会（sort-olympics） | programming → programming | g5, g6 | [] | 编程拓展：企鹅按个头排队只能两两比较、相邻交换。先徒手排，再雇冒泡、选择、插入三位算法教练同场赛跑——比较次数实时对决，亲眼看出算法的性格！ 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/sort-olympics/main.js) |
| 海龟画室（turtle-studio） | programming → programming | [] | [] | 编程拓展：用「前进、右转、重复」指挥小海龟画出正方形、五角星和彩虹螺旋 —— 你的第一门编程语言！ 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/turtle-studio/main.js) |
| 扫地机器人研究所（vacuum-lab） | programming → programming | g3, g4 | [] | 编程拓展：给扫地机器人装上随机转向、弓字清扫或沿墙行走策略芯片，在三种户型里实测覆盖率、用时和碰撞，找出每间房的算法冠军。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/vacuum-lab/main.js) · [断言](../../src/vacuum-lab/facts.md) |
| 巫师的罐子（wizard-jars） | programming → programming | g4, g5 | [] | 编程拓展：把金币、龙的怒气和颜色装进会变化的魔法罐，用赋值咒语让数值增长、翻倍，再借一个空罐完成经典交换谜题。 现有依据仅为适龄推荐或计算机知识来源，未核准到人教教材具体年级，保留编程分类。 [源码](../../src/wizard-jars/main.js) · [断言](../../src/wizard-jars/facts.md) |
| 空气车库（air-garage） | science → science | g3, g4 | [] | 杯子潜水、空气称重、喷气赛车是同一完整路线，跨越三上空气性质与三下动力小车；不能只按空气一节标整课。 [源码](../../src/air-garage/main.js) · [断言](../../src/air-garage/facts.md) · [s3a](https://book.pep.com.cn/1244001301251/mobile/index.html) · [s3b](https://book.pep.com.cn/1244001302251/mobile/index.html) |
| 消化道漂流记（body-rafting） | science → science | g3, g4, g5 | g3a | 消化器官顺序及食物在体内的变化，对应“消化与呼吸”中食物的营养、消化器官58–66页。 [源码](../../src/body-rafting/main.js) · [断言](../../src/body-rafting/facts.md) · [s3a](https://book.pep.com.cn/1244001301251/mobile/index.html) |
| 云朵工厂（cloud-factory） | science → science | g3, g4 | g6a | 水循环与云雨雪雾的相变观察，对应“水和天气”41–58页；二年级认识天气现象不涵盖整课解释层次。 [源码](../../src/cloud-factory/main.js) · [s6a](https://book.pep.com.cn/1244001601261/mobile/index.html) |
| 造兽工坊（creature-workshop） | science → science | g2, g3, g4 | g6b | 为不同环境选择动物身体结构，对应“生物与环境”中动物对环境的适应6–9页，移除二至四年级适龄范围。 [源码](../../src/creature-workshop/main.js) · [断言](../../src/creature-workshop/facts.md) · [s6b](https://book.pep.com.cn/1244001602201/mobile/index.html) |
| DNA 复制实验室（dna-replication-lab） | science → science | g12 | [] | DNA复制与基因表达、突变追踪在同一面板；原高三标签没有对应固定年级教材证据。 [源码](../../src/dna-replication-lab/main.js) · [断言](../../src/dna-replication-lab/facts.md) |
| 地球调度员（earth-dj） | science → science | g4, g5, g6 | g5b | 自转、公转及地轴倾斜与昼夜四季，对应“昼夜与四季”2–10页。 [源码](../../src/earth-dj/main.js) · [s5b](https://book.pep.com.cn/1244001502201/mobile/index.html) |
| 生态小岛（eco-island） | science → science | g3, g4, g5 | g6a | 生产者、消费者、分解者和食物网的相互依存，对应“相互依存的生命世界”1–20页；种群曲线为定性模型。 [源码](../../src/eco-island/main.js) · [断言](../../src/eco-island/facts.md) · [s6a](https://book.pep.com.cn/1244001601261/mobile/index.html) |
| 电工鼠实验室（electric-mouse） | science → science | g4, g5, g6 | [] | 开放电路含电压、电流、功率、串并联和保护器件，超出小学简单亮灯；保持科学实验分类，完整内容只放全部年级。 [源码](../../src/electric-mouse/main.js) · [断言](../../src/electric-mouse/facts.md) · [s3a](https://book.pep.com.cn/1244001301251/mobile/index.html) |
| 荒岛净水师（island-water） | science → science | g3, g4 | [] | 强制串联沉淀、过滤与蒸馏；三下“溶解与分离”不足以证明完整蒸馏路线归属，保留综合实验。 [源码](../../src/island-water/main.js) · [断言](../../src/island-water/facts.md) · [s3b](https://book.pep.com.cn/1244001302251/mobile/index.html) |
| 磁力冰球（magnet-hockey） | science → science | g2, g3 | g3a | 磁极、同极相斥异极相吸与磁力隔物作用，对应“有趣的磁铁”1–15页；不把二年级仅认识磁力作为整课依据。 [源码](../../src/magnet-hockey/main.js) · [s3a](https://book.pep.com.cn/1244001301251/mobile/index.html) · [s2a](https://book.pep.com.cn/1244001201251/mobile/index.html) |
| 变形旅馆（metamorph-hotel） | science → science | g2, g3 | [] | 蝴蝶、青蛙、蝗虫多种发育过程混合，不能凭四下养蚕单元或低年级观察动物给整课确定归属。 [源码](../../src/metamorph-hotel/main.js) · [断言](../../src/metamorph-hotel/facts.md) · [s4a](https://book.pep.com.cn/1244001401261/mobile/index.html) · [s4b](https://book.pep.com.cn/1244001402201/mobile/index.html) |
| 显微细胞实验室（microscope-cell-lab） | science → science | g7 | g7a | 显微镜操作、植物与动物细胞比较，对应第一单元第二章“认识细胞”12–32页。 [源码](../../src/microscope-cell-lab/main.js) · [断言](../../src/microscope-cell-lab/facts.md) · [b7a](https://book.pep.com.cn/1343001101241/mobile/index.html) |
| 小小金字塔（mini-pyramid） | science → science | g5, g6 | g5b | 斜面、杠杆、滑轮与省力装置，对应“简单机械”“制作省力装置”41–60页。 [源码](../../src/mini-pyramid/main.js) · [断言](../../src/mini-pyramid/facts.md) · [s5b](https://book.pep.com.cn/1244001502201/mobile/index.html) |
| 分子迪斯科（molecule-disco） | science → science | g3, g4, g5 | [] | 用分子微观模型解释三态与温度，不能凭小学宏观固液气认识分配三至五年级。 [源码](../../src/molecule-disco/main.js) · [s3a](https://book.pep.com.cn/1244001301251/mobile/index.html) · [s4a](https://book.pep.com.cn/1244001401261/mobile/index.html) |
| 神秘盒子（mystery-box） | science → science | g1, g2 | g1a | 五感观察并依证据识物，对应“我们的感觉器官”16–33页。 [源码](../../src/mystery-box/main.js) · [s1a](https://book.pep.com.cn/1244001101241/mobile/index.html) |
| 植物生长实验室（plant-lab） | science → science | [] | [] | 光照、温度、水分、养分综合生长模拟；原无年级，仍保留为通用科学实验。 [源码](../../src/plant-lab/main.js) |
| 植物透视园（plant-xray） | science → science | g1, g2, g3 | g3b | 种子萌发、根茎叶花果与生长条件对照，对应“从种子到种子”15–36页；一年级校园植物观察不涵盖完整路线。 [源码](../../src/plant-xray/main.js) · [断言](../../src/plant-xray/facts.md) · [s3b](https://book.pep.com.cn/1244001302251/mobile/index.html) · [s1b](https://book.pep.com.cn/1244001102241/mobile/index.html) |
| 彩虹舞台（rainbow-stage） | science → science | g4, g5 | [] | 色光加色、颜料减色和棱镜色散同时出现；五上“太阳光”不能单独证明整套色彩模型的年级归属。 [源码](../../src/rainbow-stage/main.js) · [断言](../../src/rainbow-stage/facts.md) · [s5a](https://book.pep.com.cn/1244001501261/mobile/index.html) |
| 太阳系漫游（solar-explorer） | science → science | [] | [] | JPL轨道、参考系与太阳系三维观察为通用天文拓展；原无年级，保持。 [源码](../../src/solar-explorer/main.js) · [断言](../../src/solar-explorer/facts.md) |
| 星海水手（star-sailor） | science → science | g5, g6 | [] | 北极星定位、五倍延伸及星轨观察是组合导航路线；六下“认识星空”目录只能证明主题相关，完整目标待核准。 [源码](../../src/star-sailor/main.js) · [s6b](https://book.pep.com.cn/1244001602201/mobile/index.html) |
| 地层挖掘队（strata-dig） | science → science | g3, g4 | [] | 地层叠加、化石年代与断层拼合为地质拓展；六下地表变化主题不足以证明完整考古路线归属。 [源码](../../src/strata-dig/main.js) · [断言](../../src/strata-dig/facts.md) · [s6b](https://book.pep.com.cn/1244001602201/mobile/index.html) |
| 小小港湾（tiny-harbor） | science → science | g1, g2, g3, g5 | g2a | 材料沉浮、橡皮泥造船及装载测试，对应“把它们放入水中”23–26页及“制作小船”48–62页。 [源码](../../src/tiny-harbor/main.js) · [断言](../../src/tiny-harbor/facts.md) · [s2a](https://book.pep.com.cn/1244001201251/mobile/index.html) |
| 垃圾变形记（trash-transform） | science → science | g1, g2, g3 | g6a | 核心是按材料分类后的资源再生链，对应“资源的循环利用”75–79页；一年级材料辨认仅是前置概念。 [源码](../../src/trash-transform/main.js) · [断言](../../src/trash-transform/facts.md) · [s6a](https://book.pep.com.cn/1244001601261/mobile/index.html) · [s1b](https://book.pep.com.cn/1244001102241/mobile/index.html) |
| 声波乐团（wave-band） | science → science | g3, g4 | g4a | 声音产生、传播、音高响度变化与乐器实验，对应“声音”“制作简易乐器”68–102页。 [源码](../../src/wave-band/main.js) · [断言](../../src/wave-band/facts.md) · [s4a](https://book.pep.com.cn/1244001401261/mobile/index.html) |
| 月相狼历（wolf-calendar） | science → science | g3, g4, g5, g6 | g4b | 持续观察月相并用日地月位置解释圆缺，对应“月相的变化”45–48页；移除三至六年级泛范围。 [源码](../../src/wolf-calendar/main.js) · [s4b](https://book.pep.com.cn/1244001402201/mobile/index.html) |

## 后续复核

2026-10-21 新增三科闯关拓展：按用户确认使用 g3–g6 适龄筛选，教材页码映射尚未建立，不计入58个明确教材归属课件。

| 课件 | 科目 | 适龄年级 | 教材核准 | 依据 |
| --- | --- | --- | --- | --- |
| 铁道调度站（railway-dispatch） | logic → logic | g3, g4, g5, g6 | [] | 离散轨道占用、道岔与发车顺序；用户确认的8–12岁逻辑拓展。[源码](../../src/railway-dispatch/railway-dispatch-model.js) · [断言](../../src/railway-dispatch/facts.md) |
| 仓库推箱员（warehouse-pusher） | logic → logic | g3, g4, g5, g6 | [] | 只能推不能拉的空间规划；适龄标记不构成教材映射。[源码](../../src/warehouse-pusher/warehouse-pusher-model.js) · [断言](../../src/warehouse-pusher/facts.md) |
| 灯光连锁屋（light-chain-house） | logic → logic | g3, g4, g5, g6 | [] | 布尔翻转、重叠与抵消；逻辑拓展。[源码](../../src/light-chain-house/light-chain-house-model.js) · [断言](../../src/light-chain-house/facts.md) |
| 齿轮游乐场（gear-playground） | science → science | g3, g4, g5, g6 | [] | 理想齿轮啮合、转速比与同轴传动；工程拓展。[源码](../../src/gear-playground/gear-playground-model.js) · [断言](../../src/gear-playground/facts.md) |
| 河流造景沙盘（river-sandbox） | science → science | g3, g4, g5, g6 | [] | 简化流水侵蚀、沉积和清淤；相对量模型，不预测洪水。[源码](../../src/river-sandbox/river-sandbox-model.js) · [断言](../../src/river-sandbox/facts.md) |
| 蜜蜂传粉花园（pollination-garden） | science → science | g3, g4, g5, g6 | [] | 南瓜传粉、受精与幼果阶段；不外推到所有植物。[源码](../../src/pollination-garden/pollination-garden-model.js) · [断言](../../src/pollination-garden/facts.md) |
| 递归森林（recursive-forest） | programming → programming | g3, g4, g5, g6 | [] | 几何树的自调用、缩放与停止条件；有限解释器拓展。[源码](../../src/recursive-forest/recursive-forest-model.js) · [断言](../../src/recursive-forest/facts.md) |
| 双机搬运队（parallel-bots） | programming → programming | g3, g4, g5, g6 | [] | 并行计划、信号、工具互斥与死锁；不模拟真实线程内存模型。[源码](../../src/parallel-bots/parallel-bots-model.js) · [断言](../../src/parallel-bots/facts.md) |
| 积木调度站（stack-crane） | programming → programming | g3, g4, g5, g6 | [] | 有限容量栈、队列及指令调试。[源码](../../src/stack-crane/stack-crane-model.js) · [断言](../../src/stack-crane/facts.md) |

- 教材单元细分已另行补充：具体年级下按单元、章节与教材页码排列，支持已有活动直达。详见 [单元映射与验收说明](curriculum-units.md)，不改变本表核准的年级与科目。
- 为待核准项找到完整内容对应的官方版本和章节后，再补 grades；不通过扩大适龄范围填满年级入口。若需要保留多个年级，应先做真正独立的内容入口。
- 分类规则与数据回归见 tests/unit/catalog-filter.test.mjs；浏览器回归见 tests/e2e/catalog-filters.spec.js，桌面/手机共12项已复测通过，详见 [构建与 E2E 记录](verification-2026-10-16.md)。

## 本轮验证记录

- 已执行 `node --test tests/unit/catalog-filter.test.mjs tests/unit/grades.test.mjs tests/unit/g1-independent-games.test.mjs tests/unit/g1b-explorations.test.mjs`：70 项通过、0 失败，退出码 0。覆盖分类纯函数、元数据/配置/生成器一致性及已有玩法边界。
- 对修改的主站脚本、生成器与三份 E2E 文件执行 `node --check`，语法检查通过；这不代表浏览器交互通过。
- 源码交付阶段与修改前快照对比：1045 个现有构建文件 SHA-256 全部相同，无新增或删除；104 份 `course.json` 有实质变化，字段仅涉及 `grades` / `category`。README 已逐课对应 132 个可见课件。
- **2026-10-16 后续验证已执行**：构建通过，产物已包含新分类与单元映射。全量 E2E 为884通过、5跳过、3失败；失败源于手机筛选辅助函数误开侧栏，修复后该文件桌面/手机共12项复测全通过。`smoke.spec.js`、`g1-math.spec.js` 和单元浏览用例已在全量运行中通过（既有视口跳过项除外）。详情见 [构建与 E2E 记录](verification-2026-10-16.md)。
