# SEO 与内容可发现性

[Wiki 首页](README.md) · [上一页](13-Journal.md) · [下一页](15-响应式与可访问性.md)

> 来源：官网设计白皮书 v0.3 · 原白皮书第 12 章。保留原文的已确定、候选和待验证状态。

<a id="s-12"></a>

官网的关键信息必须能够通过 HTML 直接读取，不依赖完整动画执行后才能显示。

基础措施包括：

准确的页面标题和描述。

Canonical URL。

Open Graph 元数据。

XML Sitemap。

合理的结构化数据。

正确的文章时间与内部链接。

可访问的文本内容。

搜索引擎及适用 AI 搜索爬虫的抓取配置。

Journal 主要承担长期有价值内容的积累。

不虚构尚未发布的功能、用户评价或商业成果。


## Local implementation · 2026-10-25

The static homepage carries a descriptive English title/description, canonical `https://pebril.dev/`, Open Graph and X card metadata, a first-party 1200×630 PNG and minimal `WebSite` JSON-LD. English fallback HTML declares `lang="en"`; the existing Chinese copy pass switches the document language and head metadata together. Important project positioning, development status, public links and privacy information exist in HTML without waiting for animation. No alternate-language route or `hreflang` is invented.

The layout wrapper is a neutral `div`, keeping `main` out of sectioning ancestors. The homepage has one `h1`, meaningful section headings, a skip link, descriptive static photograph alternatives and an explicit site-footer landmark. The time explorer and local-photo controls remain progressive enhancements; their unavailable no-JavaScript state does not masquerade as working functionality. SEO changes preserve accepted scene geometry and local-photo privacy.

`robots.txt` allows general crawling, including the JavaScript, CSS, fonts and image assets needed to render the page, and advertises `sitemap.xml`. The sitemap lists the canonical homepage plus the Journal index and its article, with `hreflang` alternates for the Chinese and English editions. Since 2026-11-01 the Journal is a built part of the site (`journal-src/` → `journal/`), so it is no longer excluded from discovery. No fabricated `lastmod`, release dates, ratings, offers or search actions are emitted. Demo dates describe photos only.

`llms.txt` is the curated public overview and is discoverable through `rel="describedby"`; owner-requested `llm.txt` points to that single maintained overview. These text files use only public facts and destinations, not internal design notes or filesystem paths. The proposal supplements normal discoverability; it neither controls crawler access nor guarantees inclusion or ranking.

### Deployment acceptance still required

- Publish only the homepage, required runtime/assets and the four discovery files. Exclude private Wiki/source briefs, instructions, tests, QA/runtime caches, handoff notes and original private fixtures from the public deployment. `robots.txt` is not authentication or a private-file boundary.
- Serve the canonical HTTPS homepage with status 200 and actual HTML; redirect duplicate HTTP/host/index.html URLs to it at the hosting layer. Serve text discovery files as UTF-8 plain text, the sitemap as XML and the share image as PNG. Do not return homepage HTML with status 200 for missing routes.
- Keep public assets crawlable. Use compression and appropriate static caching; avoid changing semantic content based on crawler user agents. No deployment system was selected or changed in this local task.
- Send security headers from the host as well as the document meta tags: the same `Content-Security-Policy`, plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` and `Cross-Origin-Opener-Policy: same-origin`; add `Strict-Transport-Security` once HTTPS is confirmed. Meta tags cannot express `frame-ancestors`, `report-uri` or HSTS.
- Serve `/assets/` with long-lived immutable caching and HTML with a short revalidation window; enable Brotli or gzip for HTML, CSS, JS, JSON and SVG. The responsive photograph variants under `assets/photos/480|960/` must be published with the originals, because `srcset` references them.
- Check the deployed URL in Search Console, submit the sitemap, inspect rendered HTML and site-name structured data, and test real social previews. Do not claim indexing or a particular search appearance based on local checks.
- Measure deployed Core Web Vitals and responsive behavior with field data; local regression success is not a field-performance result. Revisit metadata, real article dates and the sitemap when Journal content actually exists.

Reference: [Google developer guidance](https://developers.google.com/search/docs/fundamentals/get-started-developers), [site names](https://developers.google.com/search/docs/appearance/site-names), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), and the [llms.txt proposal](https://llmstxt.org/).

---

[Wiki 首页](README.md) · [上一页](13-Journal.md) · [下一页](15-响应式与可访问性.md)
