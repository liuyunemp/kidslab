# warehouse-pusher 知识断言

## 适用范围
- 方格推箱游戏：四向行走、一次推一箱，不允许拉箱，不研究最短解。

## 知识断言
- [F1] 人物可进入相邻空格；箱子后方是空格时可把箱子推入该格，不能一次推动两箱或穿过墙。[S1]
- [F2] 将箱子推到没有目标的封闭角落，且无法站到可推出方向的相邻格时，会形成不能靠继续推箱解除的死局；可撤销恢复。[S1][S2]
- [F3] 从目标布局做合法反向拉动，并记录人物完整行走路径，再逆序执行相反的动作，可以构造一个有实际推箱解的初始局。[S2]

## 来源
- [S1] Math Is Fun：Sokoban 游戏规则，https://www.mathsisfun.com/games/sokoban.html 。
- [S2] 本目录 `warehouse-pusher-model.js` 的反向构造及正向 `apply`；`tests/unit/warehouse-pusher.test.mjs` 对全部构造解进行正向回放，并核查只能推一箱的规则。
