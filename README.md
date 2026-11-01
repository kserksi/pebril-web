# Pebril 溪石 · 官网与手记

Pebril 项目在正式版之前的宣发站点：一个安静、自由、可自托管的开源图片管理项目。

**Pebril Website and Journal.** A zero-build static site for the Pebril project: a quiet, self-hostable photo library. This repository is independent from the product repository; it shares the project's design language through [`docs/24-通用设计规范.md`](docs/24-通用设计规范.md).

- 仓库：<https://github.com/kserksi/pebril-web>（`dev` 开发，`main` 基线）
- 站点：<https://pebril.dev>（未上线前的本地预览见下文）

---

## 这里有什么

| 路径 | 内容 |
|---|---|
| `index.html` | 首页：Prelude 品牌序章 → 相册与照片河流 → 春雨归集 → 时间轴 → 本地照片 → 收尾 |
| `404.html` | 找不到页面时的落点：同一张纸，两条去路（回到首页 / 看一看手记） |
| `src/` | 手写 ES module（无框架、无打包）；`photo-media.mjs` 管响应式图源，`boot.mjs` 管首帧启动 |
| `assets/` | 示例照片（1920 原图 + 480/960 变体）、自托管字体、社交分享图、字体许可 |
| `journal-src/` | 手记的 Hugo 源码（布局、i18n、中文/英文章节、文楷子集脚本入口） |
| `journal/` | 手记的构建产物（静态 HTML/CSS/字体/RSS/sitemap），随仓库一起发布 |
| `docs/` | 设计 Wiki：01–23 站内设计文档，**24 是跨官网与产品前端的通用设计规范** |
| `qa/` | 测试与监控：Playwright 套件、性能/审计探针、截图产物（依赖与产物不入库） |
| `tools/` | 本地工具链：字体子集、响应式照片变体脚本（二进制与 venv 不入库） |
| `scripts/` | `check-site.py`：静态检查（本地引用、外链、CSP 哈希、sitemap、robots、图标），CI 的第一道门 |
| `.github/` | CI 与 issue/PR 模板 |
| `loning.md` | 首屏加载与品牌序章的动效规范 PEB-DES-MOTION-001 |
| `AGENTS.md` | 本仓库的维护约定（给自动化代理与人看的同一份规则） |

站点不打 bundle：直接以原生 ES module + 手写 CSS 发布，唯一需要构建的是手记。

## 本地预览

```bash
cd /path/to/pebril-web
python3 -m http.server 4173 --bind 127.0.0.1
# http://127.0.0.1:4173/
```

站点内全部使用绝对路径（`/assets/…`、`/src/…`），因此必须从仓库根启动，并部署在域名根路径下。

## 手记

```bash
tools/bin/hugo --source journal-src --cleanDestinationDir
```

Hugo v0.169（二进制放在 `tools/bin/`，不入库）。产物写入 `journal/`；中英文、RSS、`sitemap.xml` 与 `hreflang` 都由 Hugo 生成。手记页面零脚本，跨页过渡由 CSS View Transitions 完成。

新增或改动手记标题后，需要重建文楷标题子集，否则标题会退回系统楷体：

```bash
tools/build-kai-font.sh          # → journal-src/static/fonts/pebril-kai.woff2（当前 76 字 / 12KB）
tools/build-brand-kai-font.sh    # → assets/fonts/wenkai.woff2（首页品牌与相册标题，200 字 / 45KB）
```

## 检查与测试

最快的门（纯标准库，不用起服务）：

```bash
python3 scripts/check-site.py
```

它会核对页面里的本地引用是否都存在、有没有第三方资源、内联 `<style>` 的 CSP 哈希是否仍然匹配、`sitemap.xml` 是否与 canonical 一致、`robots.txt` 与 `llms.txt` 是否指对了地方、图标文件是否齐。手记有改动时再跑一次 `tools/bin/hugo --source journal-src --cleanDestinationDir` 并确认 `git diff --exit-code -- journal` 为空。

完整回归（Playwright）：

```bash
cd /path/to/pebril-web
LD_LIBRARY_PATH=$PWD/qa/libs/sysroot/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=$PWD/qa/browsers \
node --test --test-concurrency=1 qa/tests/*.test.mjs
```

- 必须**串行**：并行运行会让两三个依赖时序的浏览器套件出现假失败。
- 手动跑单一套件：`node qa/tests/river.test.mjs`。
- 部分套件由 `page.clock` 假时钟驱动，懒加载图片需要推进帧才会发请求——改测试时先看这一点。
- 测试与探针的详细说明见 [`qa/README.md`](qa/README.md)。
- 截图默认写入 `qa/artifacts/`（不入库）。

## 重新生成资源

```bash
tools/venvs/img/bin/python tools/resize-photos.py   # assets/photos/{480,960}/，Pillow 13
```

字体子集需要完整文楷字体与 fonttools：把 `LXGWWenKai-Regular.ttf` 放到 `tools/fonts/`，venv 见 `tools/README.md`；两者的许可说明在 `assets/licenses/`。

## 发布

静态文件整目录上传即可（不需要 Node、不需要数据库、不需要服务端语言）。前提：

- **域名根路径**：站内路径是绝对的，放在子目录会 404。
- **MIME**：`text/html`、`text/css`、`text/javascript`（`.mjs`）、`image/webp`、`font/woff2`、`application/xml`。
- **目录索引与尾斜杠**：`/journal` 要 301 到 `/journal/`。
- **HTTPS**：字体与 View Transitions 都要求安全上下文（local 与 127.0.0.1 除外）。
- **响应头建议**：`Strict-Transport-Security`、`X-Content-Type-Options: nosniff`、`Content-Security-Policy: frame-ancestors 'none'`（页面内的 CSP 由 `<meta>` 提供，`frame-ancestors` 必须由响应头给）、HTML `no-cache`、`/assets/` 长缓存。
- 不要发布 `docs/`、`journal-src/`、`qa/`、`tools/`、`scripts/`、`.github/`、`AGENTS.md`、`CONTRIBUTING.md`、`SECURITY.md`、`loning.md`，只发布站点文件。

## 参与

开发约定、检查清单与资产再生成步骤见 [`CONTRIBUTING.md`](CONTRIBUTING.md)；安全问题走私报通道（[`SECURITY.md`](SECURITY.md)）。提交信息用英文 conventional 前缀，正常开发走 `dev` 分支。

## 与父项目的关系

Pebril 产品本体（Go 服务、存储、API）在另一个仓库。这里是它的宣发站点与手记；两边共享同一套设计语言，权威定义在 [`docs/24-通用设计规范.md`](docs/24-通用设计规范.md)——颜色、字体、间距、组件与动效的具体取值都在那里，产品前端按它实现界面。

## 许可

[MIT](LICENSE) © 2026 kserksi。示例照片与字体的许可见 `assets/licenses/`。
