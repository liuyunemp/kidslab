# laser-mirrors 知识断言

## 适用范围
- 随机布局保持四关的镜面数量、绕墙、分光及红蓝滤镜条件；先构造可达光路，再用离散追迹校验。晶体位置、提示和成功判定来自同一实例；不限制其他合法镜面布置。
- 课件使用水平、竖直光路和 45° 平面镜，帮助小学阶段学习者练习多步空间预测。
- 网格中的分光镜与彩色滤镜是玩法模型；不讨论真实器件的能量损耗、光谱透过率、偏振或波动光学。

## 知识断言
- [F1] 光在均匀介质中沿直线传播；课件以网格直线段表示这一近似。[S1]
- [F2] 平面镜反射遵循反射角等于入射角，两个角都相对镜面法线测量。[S1]
- [F3] 当水平或竖直光线射到与网格方向成 45° 的镜面时，反射后的网格方向转过 90°；课件的 `/` 与 `\` 镜面按这一几何关系转向。[S1]
- [F4] 本课件采用理想化的颜色筛选规则：白光通过红／蓝滤镜后只保留对应颜色；红蓝光遇到不匹配滤镜时被阻挡。彩色晶体需要对应色光，未经过滤的白光不能直接点亮彩色晶体，这是本游戏的目标规则。[S2]

## 来源
- [S1] OpenStax, *Physics*, “Reflection” (law of reflection and ray model), https://openstax.org/books/physics/pages/13-2-the-law-of-reflection
- [S2] The Physics Classroom, “Color Subtraction” （透射滤光与颜色分量的理想模型），https://www.physicsclassroom.com/class/light/Lesson-2/Color-Subtraction
