# stack-crane 知识断言

## 适用范围
- 字母货物的有限容量栈和队列；指令上限 64 条，执行上限 1024 步，不涉及真实起重机动力学。

## 知识断言
- [F1] 栈遵循后进先出（LIFO），从栈顶放入和取出；队列遵循先进先出（FIFO），从尾部加入，从头部取出。[S1]
- [F2] 本模型取空、放满或输出顺序不符合订单时，不提交货物移动和程序计数器变化；编辑指令后保留程序并重置运行现场，以便重新调试。[S2]

## 来源
- [S1] Python 官方教程，§5.1.1 Using Lists as Stacks、§5.1.2 Using Lists as Queues，https://docs.python.org/3/tutorial/datastructures.html 。本轮已读取正文核对 LIFO 与 FIFO。
- [S2] 本目录 `stack-crane-model.js` 的 `execute`、`apply`；非法动作不变性及恢复见 `tests/unit/stack-crane.test.mjs`。
