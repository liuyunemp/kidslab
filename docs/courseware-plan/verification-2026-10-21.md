# 统一 E2E 验收记录 · 2026-10-21

本次按用户“现在统一做一次 E2E”的要求执行。全量首轮发现的 7 个失败已修复，两个受影响测试文件的桌面、手机全部用例复测通过。按 Playwright 用例 ID 与项目去重合并，1220 个用例中 **1215 通过、5 个既有条件跳过、0 个未解决失败**。这不是一次退出码 0 的全量运行：首轮退出码 1，修复后受影响文件复测退出码 0。

## 执行证据

环境：Windows、本地 Chromium 无头浏览器、D3D11、4 workers、无自动重试；桌面 1280×800，手机 375×667。时间为北京时间。

| 检查 | 结果 | 退出码 | 记录 |
| --- | --- | ---: | --- |
| 全量 E2E，10:31 开始，约 26.7 分钟 | 1208 通过、7 失败、5 跳过 | 1 | `e2e-unified-2026-10-21.log`、`playwright-report/unified-2026-10-21.json` |
| 修复后 `npm run build` | 149 个完整课件、147 个可见入口；资源指纹和离线清单生成成功 | 0 | `build-unified-2026-10-21.log` |
| 两个受影响文件复测，11:02 开始，约 6.1 分钟 | 401 通过、0 失败、1 跳过，共 402 项 | 0 | `e2e-unified-retest-2026-10-21.log`、`playwright-report/unified-retest-2026-10-21.json` |

执行命令（PowerShell）：

```powershell
$env:PLAYWRIGHT_JSON_OUTPUT_FILE='playwright-report/unified-2026-10-21.json'
npm run test:e2e -- --reporter=list,json --output=test-results-unified-2026-10-21

npm run build

$env:PLAYWRIGHT_JSON_OUTPUT_FILE='playwright-report/unified-retest-2026-10-21.json'
npm run test:e2e -- tests/e2e/adventure-courses.spec.js tests/e2e/smoke.spec.js --reporter=list,json --output=test-results-unified-retest-2026-10-21
```

接续任务核对了原任务记录的退出码与两份 JSON 报告：均无运行器级错误、无 flaky；复测的 402 个用例全部属于首轮 1220 项，没有新增或遗漏的失败用例。按 `spec.id + projectName` 匹配复测结果后为 1215 通过、5 跳过。不能按短标题去重，部分不同测试组使用相同标题。报告、日志及失败截图为本地忽略文件，不随 Git 提交。

复测完成后，`src/`、`scripts/`、`tests/`、`courseware/`、`assets/` 没有更新文件；本次接续只补写验收文档，因此复用已完成的验证，没有重复启动全量 E2E。此前全量单测 635 项通过、标签修复后 10 项复测及共享副本/vendor 检查通过，详见[三科扩展验收](adventure-verification-2026-10-21.md)。

## 失败原因与修复

- `adventure-courses.spec.js` 的齿轮、河流、递归三款九关通关用例，桌面和手机各失败一次，共 6 项。辅助函数将数字字符串传给 `selectOption`，数字标签与另一个选项的 value 冲突时会选错参数。现改为 `selectOption({ value: String(option) })` 并断言最终 value。保持真实页面操作，没有用模型直接写入通关状态。
- `smoke.spec.js` 的桌面质量守恒课件偏好重载失败 1 项。首次手势启动 BGM 下载，测试紧接着重载页面，中止旧文档下载并记录 `net::ERR_ABORTED`。延迟音频响应的受控诊断复现了问题；等待响应体完成后重载则无错误。现于主题按钮点击时监听 BGM 响应，检查 HTTP 成功和 `response.finished()`，再继续重载；保留资源失败断言。
- 修复后，三科扩展文件 **54 项全部通过**，smoke 文件 **347 通过、1 跳过**。本轮修复仅涉及测试脚本，未修改课件玩法。

## 五项跳过的边界

均为已有的桌面/触屏职责分工，没有为消除失败新增跳过：

| 文件 | 项目 | 跳过用例及已有覆盖 |
| --- | --- | --- |
| `electric-mouse.spec.js` | desktop | 触屏接线与抽屉放元件、单指平移画布，共 2 项；由 mobile 覆盖 |
| `electric-mouse.spec.js` | mobile | 电路故障恢复与保存加载、长按菜单和多选编辑，共 2 项；由 desktop 覆盖 |
| `smoke.spec.js` | mobile | 奇数订单的矩形减一完整指针流程，共 1 项；由 desktop 覆盖 |

跳过项不计为通过，也不表示相同流程在另一种输入方式下已验证。

## 已覆盖与仍需人工验收

- 三科九款：通过页面控件完成各九关、逐关解锁、完成后刷新恢复；每款失败后重试、提示与一步演示、新局与经典入口、音频失败后的首步及撤销恢复；两档视口的页面尺寸和顶栏按钮检查。UI 共 54 项，8100 次随机解法回放另属模型验证。
- 英语六款：`english-framing.spec.js` 桌面/手机共 30 项通过，包含四关、错词回炉、新词组、100 词资源渲染、偏好恢复、倒计时与生命恢复、录音失败重试及完整离线快照播放。
- 全课件与主站：147 个可见课件加载及偏好重载、筛选、教材活动入口、PWA 更新与离线完整性；`curriculum.spec.js` 14 项通过。此前记录的 `venn-port.spec.js`、`random-venn.spec.js` 失败已在本轮分别取得 12 项、2 项通过。
- E2E 不等于真人试玩、真机听测、逐项对比度检查或知识来源人工复核；九款完整视觉质量、触屏手感及部分科学来源的缺口继续保留在各专题验收记录。

本次统一执行已结束；其他任务仍按根目录 `AGENTS.md` 的临时约定跳过 E2E，除非用户再次明确授权。
