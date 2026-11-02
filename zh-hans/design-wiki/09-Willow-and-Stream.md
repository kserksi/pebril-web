# 7.4 Willow & Stream — 柳梢与溪流：退场余韵及分级反馈（v0.3 动效补充）

[Wiki 首页](Home.md) · [上一页](08-Spring-Rain-Gathering.md) · [下一页](10-Timeline-Exploration.md)

> 来源：官网设计白皮书 v0.3 · 原白皮书第 7.4 节。保留原文的已确定、候选和待验证状态。

<a id="s-7-4"></a>

**核心意象：**退场后保留的少量照片如春雨中柳树枝梢末端的嫩芽，下方由时间轴演化而来的波浪分隔线如柳树下的小河。照片并不被裁成柳叶，也不绘制鸟、柳树或雨滴；使用微小位移、角度变化与局部波纹表达自然的影响关系。上方微动可以引起下方响应，但并非一动必有波。

空间与状态

退场先解除图片集、恢复同向缓流，之后逐渐散开、轻微上扬并远去；各图片集前三张代表照片（不足三张时按实际）成为局部残留群组，具体可见密度按容器与视口调整。

残留照片保持真实矩形轮廓、轻微错落和松散关系，不形成机械弧形阵列；它们代表余韵，不是原图片集容量的缩减或永久删减。

波浪线由时间轴主轴连续演化而来，保留分隔页脚的结构职责。低振幅、长波长、较低对比度是默认状态，不把整条线做成持续同步的装饰水波。

主动滚动转场阶段优先由统一滚动进度决定空间状态；到达稳定页脚区后才允许环境微动接管，避免滚动逆向恢复时发生跳变或无法复现的布局状态。

三种动效强度

| 情境 | 上方照片：柳梢 | 下方波浪线：溪流 | 响应关系（原型建议，非冻结参数） |
| --- | --- | --- | --- |
| Spring Drizzle · 绵绵春雨（无操作） | 各群组大部分时间安静，偶发极轻微位移或角度摆动 | 局部很弱的细小波动；允许完全静默间隔 | 单个群组可先以平均约 2–4 秒一次微动作为验证起点，一次动作内部可含一两次更细小的变化；波纹可滞后数秒，也可以不响应该次微动 |
| Breeze · 清风拂过（鼠标轻掠／手指轻滑） | 接近的群组轻轻偏移、回稳，邻近组可有更弱的连带反应 | 对应位置产生小范围、低振幅波动 | 尝试约 0.2–0.8 秒的柔和差时；以克制、衰减的局部反馈为主 |
| Bird Pass · 小鸟掠枝（点击／触控明确激活／键盘激活） | 当前群组获得更清晰、短促但不夸张的位移或角度反馈，随即安静归位 | 对应局部几乎即时回应，随后仍有弱小尾波 | 尝试约 0–0.2 秒启动回应；波浪线的余韵可晚于照片完全停止而自然消退 |

差时、自然性与交互优先级

不做机械的一比一映射：照片微动是可能的扰动来源，不是每次都要同步驱动波浪；环境事件允许错峰、随机但受约束的间隔，也允许完全静默。

主动交互必须可感知：点击、触控明确激活及键盘激活应有及时反馈，不采用随机概率丢弃明确操作。波纹从当前群组下方的局部位置扩散，并在照片回稳后留下适度余韵。

轻交互不得争夺滚动：鼠标 Hover 或轻掠可作为清风触发；触屏上不得仅靠 Hover，轻滑识别不能截获用户正常纵向滚动或与时间轴的主要手势冲突。装饰反馈不能取代真实点击、选择或焦点行为。

波纹遵循局部与衰减：不同时刻、不同群组对应的波峰有差时和相位差；影响以邻近线段为主，向两侧轻微传递后衰减，不驱动整条横线一起抖动。

克制优于次数：平均 2–4 秒不是必须严格执行的节拍器；允许更长静默和因可见性、设备性能、用户设置而减少或停止自主动画。不使用持续每秒两三次的常态抖动。

可访问性优先：支持 prefers-reduced-motion 的静态或大幅简化替代；键盘、触控、鼠标均可获得必要交互反馈，波纹本身不是唯一的信息传递方式，页脚文字与链接始终稳定可读。

待验证的量化参数

微动平均间隔与内部节奏、不同互动等级的位移/旋转幅度、Breeze 与 Bird Pass 的响应延迟、波纹振幅与波长、局部影响范围、传播与余韵衰减时长、多个群组同时交互时的叠加上限，以及低性能设备和减少动态效果场景下的回退规则，均通过原型与实机测试确定。不提前把诗意隐喻转化为具象的特效或复杂物理模拟。

## Owner-confirmed closure prototype · 2026-10-25

After the existing half-screen reveal and three-screen gathering, one additional viewport height drives the reversible closure. Stacks loosen toward the same leftward direction, rise slightly and shed rear members. The first three available members per collection remain as loose residual groups; this is a visual preview, not a reduction of collection membership. The time axis fades into the divider at the same height before the divider settles lower, avoiding two separated replacement lines.

Only stable closure permits ambient motion: each group's first disturbance and subsequent intervals are staggered within 2–4 seconds, with quiet intervals and optional weak delayed wave responses. Hover/touch movement uses approximately 0.4-second wave delay; explicit click/tap/keyboard activation responds immediately. Wave packets remain local, damped and capped at four. Reverse scrolling clears ambient state and restores the deterministic transitional pose. Reduced motion keeps the divider and photographs static while preserving readable activation feedback. These are confirmed first-prototype settings; visual acceptance and physical-device tuning remain pending.

Latest owner correction (2026-10-25): the third scene must recover the independent river-style photographs of the first scene, above the brand, instead of the previously implemented bottom groups. The controller now releases selected real representatives into the same shared right-to-left flow and bob/sway behavior; other members depart. The upper placement supersedes the second-review bottom-row composition without changing source membership. The stable legal band and low-amplitude wave divider remain at the end of the scene, with localized photo-triggered wave feedback. Reverse scrolling restores the scroll-driven release pose rather than preserving autonomous elapsed motion.

Interaction correction (2026-10-25): the closure photographs, continuous leftward flow and local wave responses activate over the same final visible/usable interval as the footer, starting at exit progress 90%, rather than requiring an exact 100% endpoint. This removes the visible-but-inactive interval. Reversing below that interval clears autonomous motion and wave packets, restoring the scroll-driven geometry. The timeline overlay relinquishes pointer hits once inert. At the absolute endpoint the existing upper river and wave divider were reproduced as visible; the report of total absence was not reproduced there in Chromium. Actual pointer-hit and decoded-image checks now cover both the near-end interval and the endpoint, including local-photo sources. No increase in wave intensity or change to accepted scene travel distances is implied.

A genuine exploration interval now precedes the one-height exit. The accepted gathering and exit travel distances are preserved. New body positions and the exploration interval are prototype corrections, not changes to the original six-phase narrative or claims of final visual approval.

---

[Wiki 首页](Home.md) · [上一页](08-Spring-Rain-Gathering.md) · [下一页](10-Timeline-Exploration.md)

## Owner single-photo interaction correction · 2026-10-25

The latest owner requirement makes an individual displayed photograph the unit of pointer, touch and keyboard feedback. Activating or brushing one photograph perturbs only that photograph; membership in the same collection must not move its peers. Other photos continue their existing river motion. The earlier collection-wide prototype disturbance is superseded.

Environmental timing and active disturbances are now keyed per card, without retaining removed cards. A photo still generates a bounded local wave packet at its own horizontal location, and the existing local propagation/decay rules remain. Reverse scrolling clears autonomous state. The browser regression compares an actual single-photo click against an untouched trajectory and includes other members of the same collection, distinguishing intended river flow from accidental shared activation.
