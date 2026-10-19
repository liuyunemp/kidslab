# detective-board 知识断言

## 适用范围
- 三或四个人，每个属性与人一一对应；包含肯定、否定、跨属性关联，以及恰好一条假证词的有限推理案例。
- 随机实例改变人物的属性分配；经典示例保留原分配，并为原先有多解的案例补齐证据。结案故事由实例生成。

## 知识断言
- [F1] 一一对应的匹配中，确定一个人的某个属性值后，同一人不能再取其他值，其他人也不能再取这个值。[S1]
- [F2] 有限逻辑谜题可以枚举所有满足一一对应的分配，并排除与证据矛盾的分配；只剩一个分配时，该实例有唯一解。[S1]
- [F3] 两个属性属于同一个人是一条关联约束；若已确定其中一个属性的主人，可以把另一个属性归给同一人。[S1]
- [F4] “恰好一条假证词”要求每个候选分配使一条完整证词为假，其余为真；包含多个同时成立条件的证词，在任一条件为假时为假。[S1][S2]

## 来源
- [S1] Russell & Norvig, *Artificial Intelligence: A Modern Approach*, 4th US edition, Chapter 6 “Constraint Satisfaction Problems”, sections 6.1–6.3（变量、取值域、一致性和约束求解）。
- [S2] OpenStax, *Contemporary Mathematics*, Chapter 2 “Logic”, conjunction and negation: https://openstax.org/books/contemporary-mathematics/pages/2-introduction
