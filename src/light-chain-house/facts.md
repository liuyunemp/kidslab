# light-chain-house 知识断言

## 适用范围
- 以 0/1 表示灭/亮的布尔灯阵；每关规定开关作用范围，与实际家庭照明电路无关。

## 知识断言
- [F1] 对布尔状态 b∈{0,1}，翻转是 b XOR 1；连续翻转两次得到 b，操作顺序不改变同组翻转的最终结果。[S1]
- [F2] 同一盏灯受多个开关影响时，翻转奇数次改变状态，偶数次保持原状态。因此可以从目标灯阵用合法开关翻转构造可解初始状态。[S1][S2]

## 来源
- [S1] MDN Web Docs：Bitwise XOR，Description 的逐位真值表，https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR 。
- [S2] 本目录 `light-chain-house-model.js` 的 `affected`、逆向构造和 GF(2) 消元；恒等式见 `tests/unit/light-chain-house.test.mjs`。
