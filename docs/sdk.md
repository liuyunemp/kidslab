# KidsLab 平台 SDK

`scripts/sdk/core.js` 在构建时内联到每个课件，不依赖 CDN 或运行时服务器。源码页通过下面的标记加载同一文件，`npm run build` 会移除该外链并替换为内联代码：

```html
<script src="../../scripts/sdk/core.js" data-kidslab-sdk></script>
```

## API

```js
window.cool.preferences.lang;
window.cool.preferences.theme;
window.cool.preferences.toggleLang();
window.cool.preferences.toggleTheme();
window.cool.preferences.subscribe(({ kind, value }) => {});

const i18n = window.cool.bindI18n(I18N, {
  onChange({ kind, lang, theme, t }) {
    document.title = t('doc');
    render();
  },
});

window.cool?.stage('level2');
window.cool?.complete?.();
window.cool?.track('flip', { value: 3 });

window.cool.speech.available;            // 浏览器是否提供本地音频或系统语音接口
window.cool.speech.enabled;              // 语音总开关，读 kidslab.speech，缺省为开
window.cool.speech.setEnabled(false);    // 关闭并立即停止正在播放的语音
window.cool.speech.toggle();
window.cool.speech.speak('把两批乘客合在一起');       // 按当前语言挑语音朗读
window.cool.speech.speak(text, { lang: 'en', interrupt: true, onEnd() {} });
window.cool.speech.stop();
window.cool.speech.unlock();             // 首次手势同步发起，不等待它再执行玩法
const playback = window.cool.speech.play(plan, {
  onStart() {}, onEnd() {}, onCancel() {}, onError(reason) {},
});
playback?.cancel();
const off = window.cool.speech.subscribe(({ enabled }) => {});
```

- `preferences` 负责校验、保存并应用 `kidslab.lang` / `kidslab.theme`。
- `bindI18n()` 自动更新 `[data-t]` 静态文案；动态文案通过返回的 `t()` 读取。
- 主题变化继续派发 `themechange`，Canvas 与 three.js 可沿用现有监听方式。
- `stage()` 始终存在并把本课件记为“玩过”；`complete()` 在最终通关或可无限复玩课件的首个完整成功闭环后，把本课件记为“已完成”。状态只保存在本机 `kidslab.progress.<id>`。
- `track()` 未配置 analytics 时为空操作；配置后由 `scripts/track.js` 扩展。analytics 会包装 `stage()`，不会替换本地进度写入。
- 现有 31 款朗读课件使用本地 MP3，通过 `speech.play()` 播放；手机无需系统中文语音引擎。固定题面使用整句，动态数字及规律队列使用经过审核的词片段。组句函数 `speechPlan()` 同时返回 `{text, lang, clips}`，每个 clip 包含同课件 `src`、对应 `text` 和 `pauseAfter` 秒数；不允许请求跨课件或外站音频。
- `play()` 返回带 `cancel()` 的句柄，静音或页面隐藏时返回 `null`。先在手势内创建并恢复 AudioContext，再以最多两个并发请求获取、解码音频；任何加载、解码、超时或启动失败都会进入 `onError`。状态另通过 `speechplayback` 事件提供，供验收使用，不上报服务器。
- 开始状态只在播放器启动后给出；新播报会取消旧请求。取消、结束和失败都是终态，调用方据此恢复背景音乐、移除朗读动画。所有回调都只能控制旁白 UI，不能推进玩法。
- 兼容接口 `speak()` 仍使用系统 `speechSynthesis`，接受 `zh`/`zh-CN`、`en`/`en-US`。它的可用性依赖设备音色，不能据接口存在就宣称可发音，也不能承诺系统音色离线可用。
- 总开关持久化在 `kidslab.speech`（与 `kidslab.lang`、`kidslab.theme` 同层，跨课件共享）；`setEnabled(false)` 会立即 `cancel()` 正在播放的语音。语言变化后 SDK 不会自动重放。
- `speak()` 返回 `SpeechSynthesisUtterance` 或 `null`；调用方可以挂 `onEnd`。**不要用 `onend` 决定游戏流程**——部分浏览器不触发，应把它当作纯旁白，并在调用方另设兜底计时。
- 课件朗读失败显示“暂时没能播放，点一下再试”，不影响当前操作。不会主动在首次手势前朗读，也不会在重载完成存档时自动夸奖。

## 本地语音资源维护

- `npm run speech:generate`：从题面纯函数、明确的提示白名单和反馈文案生成录音清单。新增录音在 Windows 使用 Huihui Desktop / Zira Desktop，英文句中的汉字使用中文音色，编码器由开发依赖 `@ffmpeg-installer/ffmpeg` 提供；普通 build 和 CI 不生成录音，也不调用在线 TTS。
- `scripts/speech/` 是共享播放器适配、组句和资源维护的编辑入口；生成器将资源及模块同步至 31 个独立目录。旧游戏逻辑维护在 `scripts/g1-games/`；17 款探索壳维护在 `src/g1b-character-lab/`。修改后运行生成命令，不能只改某个副本。
- `speech-manifest.js` 按内容、音色和编码方案索引录音，并保存 SHA-256。`.speech-cache/` 是可丢弃的本地中间缓存；已提交音频可复用，文案变化必须重新生成。
- `npm run speech:check` 检查文案覆盖、录音哈希和共享模块一致性；单测包含此检查。build 在发布前检查引用的音频文件和哈希，缺失或损坏时停止发布。
- 本次 31 款录音总量约 32.97 MiB（各课独立保存，包含重复通用短句）；随本课离线快照缓存。真实手机音量、发音和片段衔接需要人工试听，浏览器事件断言不能代替听感验收。

## 存量迁移

1. 在源码 `index.html` 的 `<head>` 加入带 `data-kidslab-sdk` 的脚本标记。
2. 用 `window.cool.preferences.lang` 替换直接读取 localStorage。
3. 用 `bindI18n()` 替换手写的 `[data-t]` 遍历与文档语言更新。
4. 语言/主题按钮调用 `toggleLang()` / `toggleTheme()`。
5. 保留课件自己的 `I18N` 字典、动态渲染和 CSS token；SDK 不接管玩法状态。
6. 运行 `npm run build` 与 `npm run test:e2e`，确认源码页和独立构建产物都可运行。
