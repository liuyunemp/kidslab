# 英语认词闯关

2026-10-21：六款既有课件由自由探索改为零基础认词挑战；不新增课程 ID、不改变适龄 g1–g3 或教材归属。

## 词库

| 课件 | 词条 | 扩充范围 |
| --- | ---: | --- |
| 彩色玩具屋 `english-color-studio` | 11 | 8 色 + pink、brown、gray |
| 水果野餐篮 `english-fruit-picnic` | 16 | 8 种 + peach、cherry、lemon、mango、kiwi、coconut、plum、blueberry |
| 动物欢乐园 `english-animal-park` | 20 | 8 种 + lion、tiger、bear、panda、monkey、giraffe、zebra、horse、pig、sheep、goat、turtle |
| 数字小火车 `english-number-train` | 21 | zero–twenty；数量图每五个一组 |
| 身体动作秀 `english-body-show` | 16 | 8 个 + face、hair、neck、shoulder、leg、knee、finger、toe |
| 我的小书包 `english-school-bag` | 16 | 8 件 + notebook、marker、glue、scissors、sharpener、folder、paper、paintbrush |
| 合计 | 100 | 每词均具备本地模型、近景图、英文录音、中文词义及来源 |

## 学习闭环

每轮随机 8 个不同词，贯穿听词选图（2 选 1）、看词选图（3 选 1）、看图选词（4 选 1）及综合（4 选 1）四关，每关基础题 8 题。综合按 3/3/2 分配题型，轮换短缺题型。第一关先分两组，每组 4 词，认识后再挑战。

新轮最多取 2 个待巩固词，其余优先尚未完成学习轮次的词，之后用较久没练的词补足。每关错词回炉，复习题首次选对才清除；本轮出错的词进入跨轮待巩固，后续一轮四关首次全对才清除。只记录“已练过”，不声称一次通关等同掌握词库。

每题 20 秒，每关 3 心。错选或超时扣 1 心，错选可重选但不重置时间；超时揭示词义后继续。反馈不计时。心用完只重试本关、保留词组、重新排列题目与选项。通关后再抽一组；不提供任意摆放通关入口。

## 技术与兼容

- 作者源 `scripts/english/`，`english:sync` 生成六套独立源码；新增词需配套模型、录音、语义排除关系和 facts.md。
- 纯模型注入随机种子及经过时间；题目编号隔离旧回调。状态先提交，再播放动画。存档 v2 保存题目、选项、生命、时间、复习队列和覆盖记录。
- 旧自由探索完成记录不兑换新关卡。刷新/后台恢复暂停，不补心、不换题。背景音乐解锁不阻塞玩法。
- 听词从录音开始时计时，加载/播放失败暂停，可重试或明确改为看词，记录实际题型。看图选词作答前不播目标词。音乐、音效、朗读独立控制，总静音全部关闭。
- 词义以 Cambridge Dictionary 所列日常语境为限。排除 bird/duck、bear/panda、head/face 等含义重叠的干扰项；单颗 grape 对应单数词，zero 对应零块；scissors 使用 a pair of，paper/glue 使用 some。

## 验收状态

见 [英语改造验收记录](english-verification-2026-10-21.md)。模型、资源及真实浏览器测试与人工试玩/试听分开记录；不以截图或 E2E 代替人耳听测和儿童实际体验。
