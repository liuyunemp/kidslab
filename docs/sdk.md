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

window.cool.speech.available;            // 浏览器是否支持语音合成
window.cool.speech.enabled;              // 语音总开关，读 kidslab.speech，缺省为开
window.cool.speech.setEnabled(false);    // 关闭并立即停止正在播放的语音
window.cool.speech.toggle();
window.cool.speech.speak('把两批乘客合在一起');       // 按当前语言挑语音朗读
window.cool.speech.speak(text, { lang: 'en', interrupt: true, onEnd() {} });
window.cool.speech.stop();
const off = window.cool.speech.subscribe(({ enabled }) => {});
```

- `preferences` 负责校验、保存并应用 `kidslab.lang` / `kidslab.theme`。
- `bindI18n()` 自动更新 `[data-t]` 静态文案；动态文案通过返回的 `t()` 读取。
- 主题变化继续派发 `themechange`，Canvas 与 three.js 可沿用现有监听方式。
- `stage()` 始终存在并把本课件记为“玩过”；`complete()` 在最终通关或可无限复玩课件的首个完整成功闭环后，把本课件记为“已完成”。状态只保存在本机 `kidslab.progress.<id>`。
- `track()` 未配置 analytics 时为空操作；配置后由 `scripts/track.js` 扩展。analytics 会包装 `stage()`，不会替换本地进度写入。
- `speech` 用浏览器内置 `speechSynthesis` 朗读，不引入任何音频文件，改文案即生效，离线可用。它按 `preferences.lang` 选 `zh-CN` / `en-US` 语音，找不到精确匹配时回退同语系，仍无则静默返回 `null`。
- `speech` 是惰性的：加载时只读一次 `kidslab.speech`，直到第一次 `speak()` 才读取语音列表、监听 `voiceschanged` 并挂上 `pagehide` / `visibilitychange` 清理。
- 总开关持久化在 `kidslab.speech`（与 `kidslab.lang`、`kidslab.theme` 同层，跨课件共享）；`setEnabled(false)` 会立即 `cancel()` 正在播放的语音。语言变化后 SDK 不会自动重放。
- `speak()` 返回 `SpeechSynthesisUtterance` 或 `null`；调用方可以挂 `onEnd`。**不要用 `onend` 决定游戏流程**——部分浏览器不触发，应把它当作纯旁白，并在调用方另设兜底计时。
- 语音被静音、设备缺中文音色或浏览器不支持时，`speak()` 一律静默降级，不产生控制台错误。SDK 不会在任何用户手势之前自动朗读。

## 存量迁移

1. 在源码 `index.html` 的 `<head>` 加入带 `data-kidslab-sdk` 的脚本标记。
2. 用 `window.cool.preferences.lang` 替换直接读取 localStorage。
3. 用 `bindI18n()` 替换手写的 `[data-t]` 遍历与文档语言更新。
4. 语言/主题按钮调用 `toggleLang()` / `toggleTheme()`。
5. 保留课件自己的 `I18N` 字典、动态渲染和 CSS token；SDK 不接管玩法状态。
6. 运行 `npm run build` 与 `npm run test:e2e`，确认源码页和独立构建产物都可运行。
