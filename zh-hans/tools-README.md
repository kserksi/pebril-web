# tools

本地工具链。仓库只需要它们来**重新生成**资源；站点本身没有构建步骤，`journal/`、`assets/fonts/*.woff2`、`assets/photos/{480,960}/` 都是生成后的产物并已入库。

## 目录

| 路径 | 内容 | 入库 |
| --- | --- | --- |
| `build-brand-kai-font.sh` | 首页品牌与相册标题的文楷子集 → `assets/fonts/wenkai.woff2` + `wenkai.css` | 是 |
| `build-kai-font.sh` | 手记标题的文楷子集 → `journal-src/static/fonts/pebril-kai.woff2` | 是 |
| `resize-photos.py` | 响应式照片变体 → `assets/photos/480/`、`960/` | 是 |
| `bin/hugo` | Hugo v0.169 静态二进制（构建 `journal/`） | 否（gitignored） |
| `fonts/LXGWWenKai-Regular.ttf` | 完整文楷 1.522（25.5MB），子集脚本的原料 | 否 |
| `venvs/fonts/` | fonttools + brotli | 否 |
| `venvs/img/` | Pillow | 否 |

## 一次性准备

```bash
cd /path/to/pebril-web

# Hugo（官方静态版，v0.169 linux/amd64）
mkdir -p tools/bin && tar -xzf hugo_0.169.0_linux-amd64.tar.gz -C tools/bin hugo

# 文楷完整字体（OFL-1.1）
mkdir -p tools/fonts && cp /path/to/LXGWWenKai-Regular.ttf tools/fonts/

# 两个 venv
python3 -m venv tools/venvs/fonts && tools/venvs/fonts/bin/pip install fonttools brotli
python3 -m venv tools/venvs/img   && tools/venvs/img/bin/pip install pillow
```

字体与图片的许可见 `assets/licenses/` 与 `assets/fonts/OFL.txt`。

## 常见命令

```bash
# 重新构建手记（写完或改完 journal-src 之后）
tools/bin/hugo --source journal-src --cleanDestinationDir

# 新增/改名手记标题后重建标题子集
tools/build-kai-font.sh

# 改了首页中文品牌/相册文案后重建品牌子集
tools/build-brand-kai-font.sh

# 换了示例照片后重建 480/960 变体
tools/venvs/img/bin/python tools/resize-photos.py
```

子集脚本会读取当前文案/标题的实际字符集；**重建后的产物要一起提交**，否则线上会退回系统楷体。
