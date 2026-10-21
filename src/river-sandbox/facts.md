# river-sandbox 知识断言

## 适用范围
- 固定时步、从左向右下降的 6×5 河格沙盘；只显示相对量。每步只向下一列相邻的开通河格分流，不模拟真实二维洪水、渗透、蒸发、灾害概率或工程设计。

## 知识断言
- [F1] 流水可侵蚀、搬运和沉积泥沙；流速降低时，部分悬移物能够沉降。颗粒大小也影响侵蚀和沉积，但本课只用单一示意泥沙组分。[S1]
- [F2] 本沙盘每步输入水量等于内部储水增量加边界流出量；输入泥沙加原有床沙，等于悬沙、剩余床沙、沉积物、流出泥沙和清淤移出泥沙的总和，数值误差容许 10⁻⁸ 相对单位。第八关初始淤堵从床沙库存转入沉积库存。[S2]
- [F3] 护岸在本模型中阻止所在河格床沙被冲走；沉沙池降低输送容量并把部分悬沙转入沉积库存。坡度档、容量和沉降比例是教学参数，不能用于预测真实洪水。[S2]

## 来源
- [S1] Steven Earle，《Physical Geology – 2nd Edition》§13.3 Stream Erosion and Deposition，https://opentextbc.ca/physicalgeology2ed/chapter/13-3-stream-erosion-and-deposition/ 。本轮正文请求被站点拒绝，待人工对照核验。
- [S2] 本目录 `river-sandbox-model.js` 的 `tick`、`waterBalance`、`sedimentBalance`；500 个时步的非负性和独立收支检验见 `tests/unit/river-sandbox.test.mjs`。
