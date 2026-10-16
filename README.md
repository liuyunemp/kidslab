<p align="center">
  <img src="assets/logo.svg" width="96" alt="KidsLab logo" />
</p>

<h1 align="center">KidsLab</h1>

<p align="center">
  为小学到高中学生打造的互动课件学习乐园<br/>
  An interactive courseware playground for K12 students
</p>

<p align="center">
  <a href="https://talkincode.github.io/kidslab/"><b>🚀 GitHub Pages</b></a>
  ·
  <a href="https://kidslab.talkincode.net/"><b>🌏 Cloudflare Pages</b></a>
</p>

---

## ✨ 特性

- **纯静态网站** — 无后端、无框架运行时,GitHub Pages 与 Cloudflare Pages 双渠道托管
- **PWA 全屏壳** — 可"添加到主屏幕",平板/手机以全屏应用形态运行,无浏览器界面干扰
- **课件离线可玩** — 访问课件后自动后台补齐本课资源，通过完整性校验后显示「可离线」；下载失败保留上次完整版本，断网可重玩
- **左右分栏主界面** — 学段选择(小学 / 初中 / 高中)+ 年级过滤 + 学科分类(数学 / 物理 / 化学 / 编程 / 科学 / 逻辑,小学自动隐藏物理化学)。初高中入口保持开放：小学是游戏叙事，初高中是观测实验台，不标「建设中」
- **按教材单元探索** — 选择具体年级后，显示第一单元、第二单元等目录，单元内按教材知识顺序排列；有独立活动的课件可直接打开对应活动。教材版本与目录维护见 [单元映射说明](docs/courseware-plan/curriculum-units.md)；构建及浏览器验证结果见 [验收记录](docs/courseware-plan/verification-2026-10-16.md)。
- **课件完全独立** — 每个课件一个目录,自带 HTML/CSS/JS,互不依赖
- **中英双语** — 主站与全部课件共享语言偏好(`localStorage: kidslab.lang`)
- **深浅主题 + 4 种强调色** — 跟随系统,可手动切换
- **搜索过滤** — 标题 / 描述 / 标签双语实时搜索(按 `/` 聚焦)
- **侧栏收拢** — 桌面端窄轨模式,移动端抽屉
- **置顶课件** — Three.js 3D 欢迎页锁定第一位

## 📁 项目结构

```
kidslab/
├── index.html              # 主站入口
├── manifest.webmanifest    # PWA manifest(全屏壳 + 图标)
├── sw.js                   # Service Worker(构建产物,由 build 生成,勿手改)
├── assets/                 # 主站样式/脚本/字体/logo/PWA 图标
├── src/                    # 课件源码(开发目录)
│   └── <courseware-id>/
│       ├── course.json     # 课件元数据(必需)
│       ├── index.html      # 课件入口(必需)
│       └── *.css / *.js    # 课件资源
├── courseware/             # 构建产物(minify 后) + index.json 清单
├── scripts/
│   ├── build.mjs           # 构建:校验 + 压缩 + 生成清单与 sw.js
│   ├── sw.js               # Service Worker 源码模板
│   ├── icons.mjs           # PWA 图标生成(logo 变更后 npm run icons)
│   └── serve.mjs           # 本地预览服务器
└── .github/workflows/deploy.yml   # 推送 main 自动发布 GitHub Pages + Cloudflare Pages
```

## 🧩 添加一个新课件

1. 在 `src/` 下新建目录,如 `src/my-lesson/`
2. 编写 `index.html` + 样式脚本(**只用相对路径**,不依赖其他课件)
3. 添加 `course.json`:

```json
{
  "id": "my-lesson",
  "title":       { "zh": "我的课件", "en": "My Lesson" },
  "description": { "zh": "一句话介绍", "en": "One-line intro" },
  "category": "math",
  "levels": ["primary", "junior"],
  "grades": ["g4", "g5"],
  "tags": ["分数", "小数"],
  "icon": "🎓",
  "order": 80
}
```

| 字段 | 说明 |
|---|---|
| `id` | 与目录名一致 |
| `category` | `math` `physics` `chemistry` `programming` `science` `logic` `featured` 之一 |
| `levels` | `primary` `junior` `senior` 的子集 |
| `grades` | 明确教材归属的 `g1`–`g12` 数组；`a` 上册 / `b` 下册，如 `g1a`。整年级标记须确认全年适用；缺省或 `[]` 仅在“全部年级”显示，不从适龄标签推断 |
| `tags` | 必须使用 `src/taxonomy.json` 词表中的 canonical 标签 |
| `icon` | 卡片封面 emoji |
| `order` | 排序权重(小的在前,可选) |
| `pinned` | `true` 置顶(全站唯一,已被 welcome 使用,可选) |
| `badge` | `"new"` 显示新品角标(可选) |

4. 构建并预览:

```bash
npm ci
npm run build     # src/ → courseware/(js/css 压缩 + 校验 + 生成 index.json)
npm run preview   # http://localhost:8080
```

构建会先严格校验元数据和课件入口，在独立临时目录生成并校验产物，再替换 `courseware/`、首页和 `sw.js`；替换失败会恢复旧产物。恢复失败时错误信息会给出保留备份的位置。仓库文本统一使用 LF，二进制资源不转换换行。

5. 提交前在本地跑一遍 `npm run test:e2e` 作为强制自检,再提交推送;workflow 自动重新构建并发布(不再运行 e2e)。

Windows 本地 E2E 为 Chromium 无头浏览器指定 D3D 渲染，避免有显卡时仍默认使用 SwiftShader 软件渲染；`npx playwright install chromium` 会安装所需浏览器。CI 保持原有浏览器配置。

## 🚀 部署

推送到 `main` 即触发 `.github/workflows/deploy.yml`:`npm ci` → `npm run test:unit` → `npm run build`(快速门禁)→ 按仓库变量重新构建发布产物 → 组装同一份 `_site/`(含 `manifest.webmanifest` 与 `sw.js`)→ 同步发布到 GitHub Pages 与 Cloudflare Pages。`npm run test:e2e`(Playwright 桌面+手机 smoke)改为提交前必须在本地跑过的强制自检项,不在 GitHub Actions 中运行。

| 渠道 | 入口 | 说明 |
|---|---|---|
| GitHub Pages | <https://talkincode.github.io/kidslab/> | 默认 GitHub Actions Pages 发布 |
| Cloudflare Pages | <https://kidslab.talkincode.net/> | 第二部署渠道，自定义域名绑定到 Cloudflare Pages；国内可达性以多地区实测记录为准 |

Cloudflare Pages 一次性配置：

```bash
# 1. 在 Cloudflare 创建 Pages 项目，项目名 kidslab-app（"kidslab" 已被他人占用），Production branch 设为 main
# 2. 配置 Cloudflare Pages 专用 API token；token 需具备 Account → Cloudflare Pages → Edit
gh secret set CLOUDFLARE_PAGES_API_TOKEN
# 3.（Cloudflare 账号下有多个 account 时才需要）
gh secret set CLOUDFLARE_ACCOUNT_ID
```

`cloudflare/analytics/` Worker 可继续使用 `CLOUDFLARE_API_TOKEN`；Pages 发布优先读取 `CLOUDFLARE_PAGES_API_TOKEN`，避免把 Worker token 扩权。

自定义域名绑定：

1. 在 Cloudflare Pages 项目 `kidslab-app` 的 Custom domains 添加 `kidslab.talkincode.net`。
2. 确认 `talkincode.net` DNS 里存在记录：`kidslab CNAME kidslab-app.pages.dev`（注意不是 `kidslab.pages.dev`，那是他人的同名项目）。如果域名与 Pages 项目在同一 Cloudflare 账号，Cloudflare 通常会自动创建；否则需要按 Custom domains 页面提示手动添加。
3. 等待 Custom domains 状态变为 Active，再用 `dig kidslab.talkincode.net CNAME` 和 `curl -I https://kidslab.talkincode.net/` 验证。

> 国内访问稳定性必须以实测为准。未完成多地区/多运营商验证前，不把任何入口表述为“国内稳定访问”。

### 📲 PWA 与离线

- 主站与课件可"添加到主屏幕",以全屏(fullscreen)应用形态运行
- 缓存策略：主站壳按内容 hash 预缓存；课件在线优先取网络内容，访问后依据每课 `offline.json` 后台补齐资源（最多两个并发请求）。所有资源获得完整响应且 SHA-256 校验通过后，才显示「可离线」。首次访问会增加本课资源下载流量。
- 更新失败、配额不足或中途断网不会覆盖上次完整版本；网络错误、超时及 HTTP 5xx 可回放完整缓存，404 保留错误语义。离线打开的页面固定使用同一课件版本，音频支持缓存 Range 播放。旧版部分缓存仅作尽力恢复，不显示完整离线角标。
- SW 更新保守:新版本等所有页面关闭后接管,不打断正在玩的孩子
- 本地验证:`npm run build && npm run preview`,等待该课出现「可离线」后停掉服务器，再打开该课并操作未曾使用的功能

> 首次启用:仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

## 📚 内置课件

按[逐课分类核查表](docs/courseware-plan/classification-audit.md)校准：132 个可见课件中，58 个保留明确年级，74 个仅在“全部年级”显示。学段表示适用范围；年级表示已核准的教材归属。学段、年级、上下册、科目和搜索取交集，置顶只影响排序。构建已更新产物，完整 E2E 与筛选复测结果见 [验收记录](docs/courseware-plan/verification-2026-10-16.md)。

一年级下册按人教社2024年审定教材新增10款、升级7款，每款8个可任选探索活动和自由操作。语文为代表性主题探索，不表示掌握全部生字。[教材逐关覆盖表](docs/courseware-plan/g1b-textbook-coverage.md) · [验收记录](docs/courseware-plan/g1b-acceptance.md)。每课本地资源约1.5–2.2 MB，首次进入会补齐整课离线快照。

| 课件 | 分类 | 学段 · 教材年级 |
|---|---|---|
| 🚀 欢迎来到KidsLab · 从一盏灯到宇宙(Three.js) | 推荐 | 小学 / 初中 / 高中·全部年级 |
| 🍕 分数披萨店 | 数学 | 小学·全部年级 |
| ✨ 数字萤火虫 | 数学 | 小学·1年级下册 |
| 🚇 百数地铁 | 数学 | 小学·1年级下册 |
| 🕰️ 时钟小镇 | 数学 | 小学·2年级下册 |
| 🐊 比大小桥 | 数学 | 小学·1年级下册 |
| 🚂 加法车站 | 数学 | 小学·1年级下册 |
| 🚋 减法车站 | 数学 | 小学·1年级下册 |
| 🏃 加减接力 | 数学 | 小学·1年级下册 |
| ⚖️ 轻重天平 | 数学 | 小学·全部年级 |
| 🧭 方位小镇 | 科学 | 小学·1年级下册 |
| 🧺 分类洗衣坊 | 数学 | 小学·2年级上册 |
| 🔷 图形拼搭 | 数学 | 小学·1年级下册 |
| 🐛 规律毛毛虫 | 数学 | 小学·全部年级 |
| 🎭 七巧板皮影戏 | 数学 | 小学·全部年级 |
| 🥞 煎饼老板 | 数学 | 小学·全部年级 |
| ⛳ 角度高尔夫 | 数学 | 小学·4年级上册 |
| 🎨 墨迹怪物 | 数学 | 小学·4年级下册 |
| 🎵 分数节拍屋 | 数学 | 小学·5年级下册 |
| 📊 数据演播室 | 数学 | 小学·全部年级 |
| 🔺 三角形实验室 | 数学 | 小学·4年级下册 |
| 👽 外星农场 | 数学 | 小学·4年级下册 |
| 🎪 平衡马戏团 | 数学 | 小学·全部年级 |
| 💎 因数水晶洞 | 数学 | 小学·全部年级 |
| 🧪 魔药比例坊 | 数学 | 小学·全部年级 |
| 🎈 上下世界 | 数学 | 小学·全部年级 |
| 🕵️ 折扣侦探 | 数学 | 小学·6年级下册 |
| 🚁 无人机邮局 | 数学 | 小学·全部年级 |
| 🎠 游园会真相 | 数学 | 小学·全部年级 |
| 🏮 灯笼街 | 数学 | 小学·全部年级 |
| ✂️ 图形裁缝铺 | 数学 | 小学·5年级上册 |
| ⚙️ 进位工厂 | 数学 | 小学·2年级下册 |
| 🍎 果园订单 | 数学 | 小学·全部年级 |
| 👕 搭配衣橱 | 数学 | 小学·全部年级 |
| 🪙 找零售货机 | 数学 | 小学·1年级下册 |
| 🏗️ 格子大厦 | 数学 | 小学·全部年级 |
| 🐹 仓鼠围栏 | 数学 | 小学·3年级下册 |
| 🔭 数字宇宙(Three.js) | 数学 | 小学 / 初中·全部年级 |
| 🎡 滚轮乐园 | 数学 | 小学 / 初中·6年级上册 |
| 🔦 立体影子剧场(Three.js) | 数学 | 小学·全部年级 |
| 📷 方块摄影棚(Three.js) | 数学 | 小学·5年级上册 |
| 🐠 体积水族馆(Three.js) | 数学 | 小学 / 初中·5年级下册 |
| 🍦 冰淇淋几何(Three.js) | 数学 | 小学 / 初中·6年级下册 |
| 📈 函数变形记 | 数学 | 初中 / 高中·全部年级 |
| 📐 平方根建筑师 | 数学 | 初中 / 高中·全部年级 |
| 📊 抽样统计实验室(Three.js) | 数学 | 高中·全部年级 |
| 🟢 单摆实验室 | 物理 | 初中 / 高中·全部年级 |
| 🔬 光学实验室(Three.js) | 物理 | 初中 / 高中·8年级上册 |
| ⚖️ 密度侦探实验室 | 物理 | 初中·8年级上册 |
| 🎬 运动追踪实验室 | 物理 | 初中 / 高中·全部年级 |
| 🎯 抛体运动实验室(Three.js) | 物理 | 高中·全部年级 |
| ⚡ 欧姆定律实验室 | 物理 | 初中 / 高中·9年级 |
| ⚗️ 质量守恒实验室 | 化学 | 初中·9年级上册 |
| 🛰️ 圆周与卫星实验室(Three.js) | 物理 | 高中·全部年级 |
| 🧪 酸碱魔法水 | 化学 | 初中 / 高中·全部年级 |
| ⚛️ 有机分子工坊(Three.js) | 化学 | 高中·全部年级 |
| 🐢 海龟画室 | 编程 | 小学 / 初中·全部年级 |
| 🍳 机器人早餐 | 编程 | 小学·全部年级 |
| 🥁 循环乐队 | 编程 | 小学·全部年级 |
| 🦁 如果动物园 | 编程 | 小学·全部年级 |
| 🏥 虫虫医院 | 编程 | 小学·全部年级 |
| 🫙 巫师的罐子 | 编程 | 小学·全部年级 |
| 👻 惊喜鬼屋 | 编程 | 小学·全部年级 |
| 🧁 函数厨房 | 编程 | 小学·全部年级 |
| 🗼 二进制灯塔 | 编程 | 小学·全部年级 |
| 🖼️ 像素邮局 | 编程 | 小学·全部年级 |
| 🐧 排序运动会 | 编程 | 小学 / 初中·全部年级 |
| 🤖 扫地机器人研究所 | 编程 | 小学·全部年级 |
| 🔐 密码社 | 编程 | 小学·全部年级 |
| 🐶 机器宠物学校 | 编程 | 小学·全部年级 |
| 📦 数据包骑士 | 编程 | 小学·全部年级 |
| 🖥️ 电脑原理实验室 | 编程 | 小学 / 初中·全部年级 |
| 📦 神秘盒子 | 科学 | 小学·1年级上册 |
| 🌱 植物透视园 | 科学 | 小学·3年级下册 |
| 🌱 植物生长实验室(Three.js) | 科学 | 小学 / 初中·全部年级 |
| 🦎 造兽工坊 | 科学 | 小学·6年级下册 |
| 🦋 变形旅馆 | 科学 | 小学·全部年级 |
| 🪐 太阳系漫游 | 科学 | 小学 / 初中·全部年级 |
| ☁️ 云朵工厂 | 科学 | 小学·6年级上册 |
| 🪩 分子迪斯科 | 科学 | 小学·全部年级 |
| 🎸 声波乐团 | 科学 | 小学·4年级上册 |
| 🌈 彩虹舞台 | 科学 | 小学·全部年级 |
| ♻️ 垃圾变形记 | 科学 | 小学·6年级上册 |
| 🏝️ 荒岛净水师 | 科学 | 小学·全部年级 |
| 🎈 空气车库 | 科学 | 小学·全部年级 |
| 🦖 地层挖掘队 | 科学 | 小学·全部年级 |
| 🌿 生态小岛 | 科学 | 小学·6年级上册 |
| 🐭 电工鼠实验室 | 科学 | 小学 / 初中·全部年级 |
| 🌍 地球调度员(Three.js) | 科学 | 小学 / 初中·5年级下册 |
| 🌕 月相狼历(Three.js) | 科学 | 小学·4年级下册 |
| ⭐ 星海水手(Three.js) | 科学 | 小学 / 初中·全部年级 |
| 🚣 消化道漂流记(Three.js) | 科学 | 小学·3年级上册 |
| 🧬 DNA 复制实验室(Three.js) | 科学 | 高中·全部年级 |
| 🔬 显微细胞实验室(Three.js) | 科学 | 初中·7年级上册 |
| 🏒 磁力冰球 | 科学 | 小学·3年级上册 |
| ⛵ 小小港湾 | 科学 | 小学·2年级上册 |
| 🏗️ 小小金字塔 | 科学 | 小学·5年级下册 |
| 🧊 制冰实验室(Three.js) | 物理 | 小学 / 初中·全部年级 |
| 🗼 汉诺塔挑战 | 逻辑 | 小学 / 初中 / 高中·全部年级 |
| 🧊 魔方小达人(Three.js) | 逻辑 | 小学 / 初中 / 高中·全部年级 |
| 🀄 华容道 · 木关智局（Three.js + ScoreKit） | 逻辑 | 小学 / 初中 / 高中·全部年级 |
| 🔺 金属金字塔魔方(Three.js) | 逻辑 | 小学 / 初中 / 高中·全部年级 |
| 🧩 数独动物园 | 逻辑 | 小学 / 初中·全部年级 |
| 🛸 维恩太空港 · 轨道海关（Three.js + ScoreKit） | 逻辑 | 小学·全部年级 |
| ⛵ 摆渡奇遇 | 逻辑 | 小学·全部年级 |
| 🏝️ 真话岛 | 逻辑 | 小学·全部年级 |
| 📄 折纸打孔妙妙屋 | 逻辑 | 小学·全部年级 |
| 🔦 激光镜屋 | 逻辑 | 小学·全部年级 |
| ⛸️ 七桥滑冰 | 逻辑 | 小学·全部年级 |
| 🎨 四色王国 | 逻辑 | 小学·全部年级 |
| ⚖️ 海盗验金室 | 逻辑 | 小学 / 初中·全部年级 |
| 🎈 打赌派对 | 数学 | 小学 / 初中·6年级下册 |
| 🕵️ 侦探线索板 | 逻辑 | 小学 / 初中·全部年级 |
| 🦊 狐狸的石子 | 逻辑 | 小学 / 初中·全部年级 |
| 🌱 汉字寻宝 | 语文 | 小学·1年级上册 |
| 🚃 拼音轨道 | 语文 | 小学·1年级上册 |
| 🖌️ 笔画工坊 | 语文 | 小学·1年级上册 |
| 📮 词语邮局 | 语文 | 小学·全部年级 |
| 🥁 对韵小剧场 | 语文 | 小学·1年级上册 |
| 🚄 句子列车 | 语文 | 小学·全部年级 |
| 🖼️ 诗画猜猜台 | 语文 | 小学·全部年级 |
| 🚉 笔顺快车站 | 语文 | 小学·1年级上册 |
| 🏡 汉字变变屋 | 语文 | 小学·1年级下册 |
| 🖌️ 写字小工坊 | 语文 | 小学·1年级下册 |
| 🌿 词语生活馆 | 语文 | 小学·1年级下册 |
| 📖 音序小书屋 | 语文 | 小学·1年级下册 |
| 🎬 句子造景台 | 语文 | 小学·1年级下册 |
| 🌙 古诗小剧场 | 语文 | 小学·1年级下册 |
| 🎞️ 故事放映屋 | 语文 | 小学·1年级下册 |
| 🎭 表达小舞台 | 语文 | 小学·1年级下册 |
| 🏭 竖式搭建厂 | 数学 | 小学·1年级下册 |
| 🎪 数量故事台 | 数学 | 小学·1年级下册 |

旧入口 `courseware/g1-math/`、`courseware/g1-chinese/` 保留为游戏导航页，不再显示为主站课程卡片。上述一年级主题每局需完成八道不同任务才记为整课完成。

> 新课件请从 [`docs/courseware-template/`](docs/courseware-template/) 双语/主题模板起步;课件规划清单见 [`docs/courseware-plan/`](docs/courseware-plan/)。

## 🧭 计划状态与验收

- 学段战略已选定 **方案 B（差异化）**：记录在 [`docs/courseware-plan/README.md`](docs/courseware-plan/README.md)；初中物理产品语言与试点路径见 [`docs/courseware-plan/junior-physics.md`](docs/courseware-plan/junior-physics.md)。
- 小学课件计划的已完成/未实现状态集中维护在 [`docs/courseware-plan/status.md`](docs/courseware-plan/status.md)。
- 每次完成规划课件后,必须同步更新状态清单、必要的学科规划文档和本 README 的内置课件列表;Agent 规约见 [`AGENTS.md`](AGENTS.md)。
- 当前最低自动校验是 `npm run build`;更完整的交互验收缺口记录在状态清单的验收矩阵中。

## License

双许可结构：

- **代码**（构建脚本、主站框架、课件程序逻辑）：[MIT](LICENSE)
- **课件内容**（教学设计、文案、图形等创作素材）：[CC BY 4.0](LICENSE-CONTENT.md) — 自由使用与传播，惟须署名

> Code is [MIT](LICENSE) licensed. Courseware content (lesson designs, copy, artwork) is licensed under [CC BY 4.0](LICENSE-CONTENT.md) — free to use and share with attribution.
