# gear-playground 知识断言

## 适用范围
- 同模数的理想外啮合直齿轮，以及刚性同轴组合；忽略摩擦、弹性变形和齿隙。图形齿是节圆关系的示意，不是可加工齿形。

## 知识断言
- [F1] 一对外啮合齿轮转向相反。以带符号转速 n（rpm）和齿数 z（正整数）表示，n₁z₁ = −n₂z₂。[S1]
- [F2] 相同模数 m 下，节圆半径 r=mz/2；两外啮合轮的中心距为 r₁+r₂。本课显示的任意齿数若不满足轴距，不视为啮合。[S1]
- [F3] 刚性装在同一根轴上的轮角速度相同。单纯惰轮不改变首末齿轮的转速比绝对值，但可改变转向；复合齿轮组的总传动比要逐段相乘。[S1]

## 来源
- [S1] KHK《Gear Technical Reference》§2.1–2.2，公式(2.1)、(2.3)、(2.4)：https://khkgears.net/new/gear_knowledge/gear_technical_reference/gear-trains.html ；§4.1表4.1的中心距与基准直径：https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html 。2026-10-21已成功读取两篇正文，对照转向、同轴同速、惰轮比值及 a=(z₁+z₂)m/2、d=zm；数值边界见 `tests/unit/gear-playground.test.mjs`。真人逐项复核仍待验收。
