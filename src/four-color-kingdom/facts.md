# four-color-kingdom 知识断言

## 适用范围
- 随机地图由互不重叠的 Voronoi 多边形构成，邻接只从共享线段计算；保留 4／5／6／7 块领地、4／3／4／4 色预算和第三关固定领主色。第一关仍是四块领地两两相邻，仅有一种邻接题型；形状变化不单独计为新题。
- 经典入口保留原图形，并依据真实共享边界修正旧邻接清单；所有发布实例都带有经模型验证的预算内着色，但玩家可提交任意合法着色。

- 课件只讨论平面地图上的有限区域着色：共享正长度边界的区域视为相邻；仅在角点相接不算相邻。
- 玩法目标是用尽量少的颜色给区域上色，使任意两个相邻区域颜色不同；不讨论算法复杂度，也不把「五色一定够」或「三色有时不够」之外的图论定理写成可玩规则。
- 课件通过可上色地图让孩子体验「四色总够用」的手感，不要求学生证明四色定理。

## 知识断言

- [F1] 地图着色问题要求：若两个区域共享一段正长度的边界，则它们必须使用不同颜色；只在角点相接的区域可以同色。[S1]
- [F2] 任意一张平面地图都可以用至多四种颜色正确着色，使相邻区域颜色不同。这就是四色定理。[S2]
- [F3] 存在需要四种颜色的平面地图（例如由一个中心区域与环绕它且两两相邻的三个区域组成的地图，其邻接图是 \(K_4\)）。[S1][S2]
- [F4] 并非所有平面地图都能用三种颜色完成正确着色；例如外围为奇数圈且中心再与所有外圈区域相邻时，往往需要第四色。[S1]

## 来源

- [S1] Wolfram MathWorld, “Map Coloring” (adjacent regions share a boundary of positive length; coloring assigns different colors to adjacent regions), https://mathworld.wolfram.com/MapColoring.html
- [S2] Wolfram MathWorld, “Four-Color Theorem” (every planar map is four-colorable), https://mathworld.wolfram.com/Four-ColorTheorem.html
