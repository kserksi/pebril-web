# 性能、响应式与可访问性

[Wiki 首页](Home.md) · [上一页](14-SEO.md) · [下一页](16-Footer.md)

> 来源：官网设计白皮书 v0.3 · 原白皮书第 13 章。保留原文的已确定、候选和待验证状态。

<a id="s-13"></a>

<a id="s-13-1"></a>

## 13.1 Responsive by Composition — 构图自适应（v0.3）

采用一套设计、一套滚动叙事、连续自适应构图，并在真实需要时做局部处理的策略。

首页保持中央轴线、品牌主次关系、大面积留白、底部半隐藏照片河流及六阶段 Memory in Motion 叙事。不以屏幕宽窄为理由改造为不同的品牌页面，也不把完整 1920 × 1080 画面等比缩放到其他视口。

自适应的主要手段依次是：

流式布局与容器最大/最小尺寸约束。

弹性字号、间距和安全留白。

基于容器的相对坐标、锚点及运动边界。

按可用空间及照片原始宽高比调整弹性卡片的视觉面积、最大宽高、可见密度、图片集分布和时间刻度密度。

当以上方式不足以解决真实问题时，采用少量基于内容失效点的局部断点。

不按设备名称设置产品级版本。 同一套组件和核心逻辑应能够在桌面、平板、手机、折叠屏和超宽屏持续工作。

<a id="s-13-2"></a>

## 13.2 非典型视口与局部例外（v0.3）

窄屏：文字保持可读；照片允许由视口边缘裁切，但不能遮挡主要文案；弹性卡片可降低尺寸和可见数量，时间轴刻度可降低密度，操作入口必须可用。

矮屏：优先减小非必要垂直间距和背景元素占用，避免标题、图片集及时间轴重叠。

超宽屏：正文内容保持舒适的最大宽度；照片河流可向两侧自然延伸，不强制将全部内容拉宽。

折叠屏与变化的视口：按实际容器、窗口宽高比和可用空间计算，不预先为具体型号制作专属页面。

第二屏的时间轴可以针对触控、键盘及鼠标输入提供适当的局部操作适配，但应保留同一套可信时间坐标和交互语义。网页纵向滚动与时间轴的探索操作不得互相争抢。

<a id="s-13-3"></a>

## 13.3 分镜策略与验证尺寸（v0.3）

分镜以六个主阶段为唯一叙事主线，不为桌面、平板和手机预制三套完整分镜。 首轮以 1920 × 1080 绘制六个主关键帧，再使用少量代表性视口测试自适应规则，例如：

验证视口（示例）

验证重点

390 × 844

窄屏文字、照片裁切与时间轴操作

1024 × 768

中等视口的层次与照片密度

1366 × 768

矮屏留白、图片集与时间轴遮挡

1920 × 1080

设计基准与叙事节奏

2560 × 1080

超宽屏内容宽度与照片河流延展

这些尺寸是测试样本，而非对应设备型号的硬性断点。若在其他宽高比发现真实问题，再针对该问题补充分镜、约束或验证测试。

<a id="s-13-4"></a>

## 13.4 性能原则

静态优先，按需加载客户端交互。

优化网站示例照片的响应式缩略资源；本地照片仅按展示需求进行浏览器内解码与预览，避免小卡片长期持有不必要的全尺寸渲染；延迟加载非首屏模块。

避免大量布局抖动；优先使用性能稳定的滚动动画属性及策略。

控制模糊、滤镜、长列表和持续运动造成的负载。

视口变化时平稳重新计算布局与动画锚点，避免突兀跳变。

监测真实设备上的交互流畅度，并将实际性能作为增加视觉复杂度的依据。

<a id="s-13-5"></a>

## 13.5 可访问性与减少动态效果

重要功能不得仅依赖鼠标 Hover；保证键盘焦点、触屏及鼠标等输入方式均能操作。

用户启用系统减少动态效果设置时，应提供简化或静态版本。核心产品信息、时间轴演示和 Journal 不应因为关闭动画而失去可访问性。

动画与适配的完整程度以真实测试和交互可用性为准，不以设备数量或视觉效果数量为绩效指标。

---

[Wiki 首页](Home.md) · [上一页](14-SEO.md) · [下一页](16-Footer.md)

## Local motion/focus correction · 2026-10-25

Pointer focus and mobile tap highlights no longer use a default black selection frame. Keyboard focus remains visible in the existing mineral-blue accent, including generic tabindex regions, and text selection uses a restrained mist tint. This changes focus appearance, not keyboard reachability or text selectability.

Viewer opening, changing and dismissal share a cancellable native motion lifecycle. Background blur follows opening/closing; reduced motion presents a static modal and immediate photo changes/dismissal. Floating cue content moves inside a stable hit area. The viewer preserves focus return, endpoint-keyboard browsing and immediate cleanup on fallback, page exit or source reset.
