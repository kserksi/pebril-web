# Journal 设计

[Wiki 首页](Home.md) · [上一页](12-Design-System.md) · [下一页](14-SEO.md)

> 来源：官网设计白皮书 v0.3 · 原白皮书第 11 章；2026-11-01 按实际实现重写。

<a id="s-11"></a>

Journal 是 Pebril 的公开开发手记空间。

内容包括产品设计、开发过程、技术实现、交互探索、版本变化和重大设计决策。

## 已实现的形态（2026-11-01）

- **静态生成，独立源码**：`journal-src/` 是 Hugo 源码（`hugo.toml`、`layouts/`、`i18n/`、`assets`），生成到站点根的 `journal/`，与被静态托管的官网同域、同目录、无服务端依赖。
- **构建**：在仓库根运行 `tools/bin/hugo --source journal-src --cleanDestinationDir`（Hugo v0.169，二进制不入库，见 `tools/README.md`）。网站其余部分不需要 npm 或构建步骤。
- **双语，中文权威**：`content/zh/` 为源文，`content/en/` 为对照译文；两版互指 `hreflang`，`x-default` 指向中文页。默认语言中文不带语言前缀，英文在 `/journal/en/`。
- **路由**：索引 `/journal/`，文章 `/journal/<slug>/`，英文对应 `/journal/en/…`；RSS 为 `/journal/index.xml` 与 `/journal/en/index.xml`；另有 `/journal/sitemap.xml`。
- **发现链路**：根 `sitemap.xml` 收录 `/journal/` 与文章页并带 `hreflang` 交替；`llms.txt` 增补手记条目；`robots.txt` 不变。
- **中文导航**使用「手记」，栏目标题保留 Journal。

## 排版

共享品牌颜色与字体系统，但以长篇阅读为先：40rem 阅读栏、系统无衬线正文、霞鹜文楷标题、发丝分隔线。不引入首页的大规模滚动叙事动画。

标题字体是独立子集：`tools/build-kai-font.sh` 从「文章标题 + 各级 markdown 标题 + 模板固定串」收集字符，用完整霞鹜文楷 1.522 生成 `journal-src/static/fonts/pebril-kai.woff2`（约 12KB）。**新增或改名标题后必须重跑该脚本**，否则新字会退回 KaiTi。英文标识的 Manrope 复用站点自托管的 `/assets/fonts/manrope.css`。

## 文章口径

公开文章需明确区分**已经做成的**、**已经定下的**和**还在摸索的**。第一篇《为什么会有 Pebril》写项目缘起、名字与价值观，收尾声明「这里写的是意图，不是已经交付的功能」。

行文偏散文，少用术语与工程行话；技术细节留给之后的实现类手记。

## 页间过渡

手记的跳转是一段很轻的呼吸，而不是瞬切：`journal.css` 用纯 CSS 的跨文档视图过渡（`@view-transition { navigation: auto; }`），离页 160ms 收住并上移 4px，新页在 170ms 后从下方 10px 处用 180ms 淡入；两页快照刻意不重叠，文字不会重影，缓动与站点一致（`cubic-bezier(.2, .75, .2, 1)`）。品牌「Pebril」带 `view-transition-name: journal-brand`，在索引、文章与中英文之间保持位置连续，像同一张纸翻过去。`prefers-reduced-motion: reduce` 下过渡不播放，直接到达。

这套过渡不依赖任何脚本，继续满足手记的 `script-src 'none'`；不支持视图过渡的浏览器会安静地瞬时跳转，页面本身不受影响。

「返回官网」走同一条路：首页也加入了跨文档过渡，旧页 120ms 收住、新页 90ms 后 180ms 淡入，落地时 Prelude 仍从加载态开始自己的序列。首页的 `@view-transition` 规则内联在 `index.html` 里（CSP 用哈希放行），因为这条规则必须在首次样式解析时就位，否则快网络下偶尔会被跳过。

## 安全与部署

期刊页面无脚本（CSP `script-src 'none'`），只引用本域样式与字体，不请求任何第三方资源。部署时与首页同源发布，不要把 `journal-src/`（源码）和 `content/` 一起公开。

---

[Wiki 首页](Home.md) · [上一页](12-Design-System.md) · [下一页](14-SEO.md)
