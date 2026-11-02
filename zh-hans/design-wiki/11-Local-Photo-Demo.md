# 本地照片演示

[Wiki 首页](Home.md) · [上一页](10-Timeline-Exploration.md) · [下一页](12-Design-System.md)

> 来源：官网设计白皮书 v0.3 · 原白皮书第 9 章。保留原文的已确定、候选和待验证状态。

<a id="s-9"></a>

预发布首页提供以浏览器本地处理为原则的照片演示能力。用户通过文件选择或拖入方式，临时使用自己的照片体验 Pebril 的照片河流、汇聚整序与时间轴；这里的“上传”是界面上的选取动作，不表示照片被发送到服务器。

<a id="s-9-1"></a>

## 9.1 Photo Source Independence — 图片来源与展示、运动解耦

默认显示项目方预选的 1920 × 1080（16:9）网站示例素材；用户选择本地照片后，将当前展示数据源切换为用户照片，并可随时恢复默认素材。

Owner update (2026-10-25), superseding the whole-source replacement described above: each valid local photo replaces one remaining sample photograph, prioritizing occupied river slots. Untouched samples and previously selected local photos remain available. Additional batches accumulate; after all 25 samples are replaced, further valid photos are appended without a 25-photo limit. All scenes still share one photo source and motion system.

替换的是照片数据，不是运动系统：默认示例图与本地图片共用[第 6.3 节](06-First-Screen-and-Photo-Layout.md#s-6-3)的弹性卡片、空间约束和同一套六阶段 Memory in Motion 叙事，不创建示例图与上传图各自独立的页面和动画版本。

同一份当前照片集合供首屏河流与第二屏时间轴使用。照片数据至少应包含临时身份标识、图像来源、可用尺寸与宽高比、可信时间信息（如有）；切换数据源时，时间轴和图片集位置随对应时间数据一起更新，不允许仅替换像素、继续沿用示例图片的虚构时间坐标。

本地照片同样保留原始宽高比，并受统一的视觉面积与最大宽高约束；不使用可见的固定比例外框来制造留白。

数据源切换应在图片准备可用后进行，尽量采用克制的过渡或平稳重排，避免正在浏览或操作时间轴时出现清空、闪烁和突兀跳变；具体交互时机仍待原型验证。

<a id="s-9-2"></a>

## 9.2 本地处理与生命周期

用户图片只在浏览器本地读取、解析和展示，不上传服务器，不要求注册，不建立云端存储，也不修改原始照片文件。

当前默认采用页面会话内存态：本次页面打开期间保留用户选择的照片；刷新、关闭后可恢复网站默认示例集，不承诺跨访问持久化，也不主动保存到 localStorage、IndexedDB 或后台。

提供“恢复默认示例图”与“清除当前本地照片”能力，并及时释放不再使用的临时预览资源。

界面必须明确提示照片仅在本地处理、不会上传，以及何时会清除；不将浏览器临时预览描述成持久安全存储。

照片拍摄时间优先来自可可靠解析的本地元数据；未知时间需明确标记或单独处理，不得为了视觉效果虚构时间，也不修改照片原始时间信息。

Implemented local prototype (2026-10-25): selection and drop share one temporary photo source with the river, gathering, tuner and closure. Images are prepared before merging them into the current source. Unchanged river and collection image nodes are retained. Remaining samples keep explicitly fictional dates; local collections use their own capture dates or an explicit unknown-time group. Mixed-source labels distinguish both kinds. The native browser decoder supplies the original dimensions; equal-area sizing with maximum width/height limits preserves aspect ratios. Unsupported or corrupt images are skipped with an explicit status, and a completely unsuccessful selection retains the previous source. No image is uploaded, transcoded, edited or persisted. Later selections keep earlier local preview URLs alive. Reset and page exit revoke all accumulated object URLs; a restored cached page returns to the supplied examples.

Owner entrance correction (2026-10-25): the local-photo title, actions and hint also enter through restrained opacity and upward motion during late gathering (75–100% in this prototype), using raw scroll progress so settlement tolerance does not cause a sudden visual jump. The existing stable interaction interval still governs input availability. Reduced motion retains static positioning.

The local experience now shares the timeline text exit: it remains visible while the parent fades through exit progress 8–30%, rather than disappearing when interaction stops at 8%. The inert scene releases input as the fade begins; reversing restores the same continuous state.

The local-photo chooser and restore action now use rounded corners and small inline SVG controls. The browser-only privacy explanation is a floating hint on chooser hover or keyboard focus, associated with the native input through aria-describedby, instead of permanent inline prose. The footer privacy disclosure remains available. The tooltip does not change layout or intercept the file chooser.

The owner explicitly allowed browser-local capture-date reading. A small read-only parser reads EXIF DateTimeOriginal from JPEG APP1, PNG eXIf and WebP EXIF containers, accepting a validated camera calendar day without inventing a timezone or using file-modification time. Parsing inspects at most 512 container chunks and EXIF payloads up to 1 MiB; other metadata representations remain unknown. Truncated, invalid or missing dates become the explicit unknown-time group. This narrow native implementation avoids adding an entire metadata dependency for a single field; it is not a general EXIF implementation.

The supplied 25 WebP images remain the complete default sample pool, with the five separately labeled fictional sample dates. The owner did not approve arbitrary local-file count or size caps; none are imposed by this prototype. Browser decoding capacity, extreme aspect ratios, broader metadata compatibility and the visual quality of source replacement still require production validation.

---

[Wiki 首页](Home.md) · [上一页](10-Timeline-Exploration.md) · [下一页](12-Design-System.md)
