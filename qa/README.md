# Pebril Web QA

测试、性能监控、截图产物与浏览器工具链都放在这里，与站点文件分开：站点根目录（`index.html`、`src/`、`assets/`、`journal/`）只放会被部署的东西，`qa/` 不发布。

## 目录

| 路径 | 内容 |
| --- | --- |
| `tests/` | 21 个 `node:test` 套件（Playwright 端到端 + 纯几何/画像断言） |
| `probes/` | 监控脚本：性能预算、手记审计、截图巡检、截帧对比 |
| `artifacts/` | 测试与探针写出的截图（产物，gitignored） |
| `node_modules/` | 固定版本 Playwright 1.64.1（只此一套，gitignored） |
| `browsers/` | chromium headless shell 1248（gitignored） |
| `libs/sysroot/` | WSL 下 Chromium 需要的系统库（`LD_LIBRARY_PATH` 指向它，gitignored） |

## 起本地预览

```bash
cd /path/to/pebril-web
python3 -m http.server 4173 --bind 127.0.0.1
```

需要每次刷新都取最新文件时，用带 `Cache-Control: no-store` 的小服务代替（任一静态服务器加该响应头即可）。

## 跑全量测试（串行，约 6–7 分钟）

```bash
cd /path/to/pebril-web
LD_LIBRARY_PATH=$PWD/qa/libs/sysroot/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=$PWD/qa/browsers \
node --test --test-concurrency=1 qa/tests/*.test.mjs
```

- **必须串行**：并行跑时 `elastic-ruler`、`motion`、`visible-gathering` 偶发时序失败（负载下的假阳性，单跑全绿）。
- 单独一个套件：把最后一行换成 `node qa/tests/river.test.mjs`。
- 截图默认写进 `qa/artifacts/`；套件里的相对路径按「从仓库根（`index.html` 所在目录）启动」解析。
- 所有套件都从**仓库根**启动，不要 `cd qa` 后再跑，否则相对路径与截图输出会错位。

## 保留的巡检脚本

`qa/probes/` 只留仍在用的六个，其余一次性调试脚本已删除（避免留下路径失效的死代码）：

| 脚本 | 用途 |
| --- | --- |
| `perf-probe.mjs` | 首屏/整段滚动的传输字节与请求数 |
| `audit-journal.mjs` | 手记四页的 lang、hreflang、字体与控制台 |
| `deploy-check.mjs` | 对发布副本逐页检查 200、控制台、外链与站内链接 |
| `vt-frames.mjs` | 跨页过渡截帧，用于和 `qa/artifacts/` 里的落地帧对比 |
| `check-glyphs.mjs` | 品牌子集是否覆盖当前中文文案（缺字时列出） |
| `check-spec-css.mjs` | 规范附录 A/B 的 CSS 是否能原样解析 |

## 性能与巡检

```bash
cd /path/to/pebril-web
LD_LIBRARY_PATH=$PWD/qa/libs/sysroot/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=$PWD/qa/browsers \
node qa/probes/perf-probe.mjs     # 首屏/滚动字节数与请求数
node qa/probes/audit-journal.mjs  # 手记四页的 lang/hreflang/字体/控制台
node qa/probes/vt-frames.mjs      # 跨页过渡截帧（配合 qa/artifacts/ 对比）
```

## 重新生成资源

资源脚本在仓库根 `tools/`（不在 `qa/`）：

- 响应式照片（`assets/photos/480/`、`960/`）：`tools/venvs/img/bin/python tools/resize-photos.py`（Pillow 13）。
- 品牌文楷子集（站点）：`tools/build-brand-kai-font.sh`。
- 手记文楷子集：`tools/build-kai-font.sh`（新增或改名标题后要重跑，否则标题退回 KaiTi）。

## 手记过渡的回归

`qa/tests/journal-transition.browser.test.mjs` 用 `pagereveal` + 动画名证明跨文档视图过渡发生——手记内部为 `journal-arrive`，回到官网为 `site-arrive`——并单独跑一遍 `prefers-reduced-motion`。首页的 `@view-transition` 内联在 `index.html`（CSP 哈希），改这段字节要同步重算哈希；改 `journal-src/static/journal.css` 后记得重建手记。

## 约定

- 这些文件不属于站点；部署时整个 `qa/` 可以不发布。
- 历史文档里的 `.qa/…`、`qa/pebril-web/…` 是 2026-11-01 迁移前的旧布局，现行布局以本文件为准。
