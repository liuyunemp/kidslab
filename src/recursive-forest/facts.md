# recursive-forest 知识断言

## 适用范围
- 有限图形规则解释器生成的平面几何树，不执行用户 JavaScript，不预测植物真实生长。最大递归层数 6，单次运行最多 1024 步。

## 知识断言
- [F1] 递归算法调用自身，并需要能到达的停止条件；本模型到达设定层数后不再添加子调用，关闭停止条件会被安全深度上限截停。[S1][S2]
- [F2] 树干记为第 1 层，每枝恰有两个子枝、画至第 d 层（整数 1≤d≤6）时，一棵树共有 1+2+…+2^(d−1)=2^d−1 条枝；每条子枝的长度是母枝的 q 倍，其中 0<q<1。[S2]

## 来源
- [S1] Brad Miller / David Ranum，《Problem Solving with Algorithms and Data Structures using Python》The Three Laws of Recursion，https://runestone.academy/ns/books/published/pythonds/Recursion/TheThreeLawsofRecursion.html 。本轮请求被站点拒绝，待人工复核。
- [S2] 本目录 `recursive-forest-model.js` 的显式调用栈；`tests/unit/recursive-forest.test.mjs` 独立验证几何级数、深度上限及修改停止条件后的恢复。
