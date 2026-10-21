# parallel-bots 知识断言

## 适用范围
- 两个有限指令解释器共享离散格和一把工具；指令上限每机器人 64 条、单局执行 1024 步，不模拟操作系统的真实线程调度和内存模型。

## 知识断言
- [F1] 多个执行者相互等待对方才能继续时，可能形成死锁；改变获得资源或发送信号的顺序可以消除本游戏中该等待环。[S1]
- [F2] 本模型同一步所有动作只读取旧状态，全部合法后一起提交；同格碰撞、交换位置和同时争用空闲工具均不提交任何一方的动作。[S2]
- [F3] 本模型信号最早在发送后的下一个时步可读取，等待不会消耗不存在的信号；工具在释放前只有一个持有者。[S2]

## 来源
- [S1] Oracle Java Tutorials，Essential Classes / Concurrency / Liveness / Deadlock，https://docs.oracle.com/javase/tutorial/essential/concurrency/deadlock.html 。本轮已读取对相互等待的定义。
- [S2] 本目录 `parallel-bots-model.js` 的 `apply`；冲突原子性、信号时步、工具互斥与死锁修复见 `tests/unit/parallel-bots.test.mjs`。
