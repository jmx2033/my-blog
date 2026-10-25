# 守叶的博客

> 夏日将尽，而文章长存。

一个日系极简风格的静态博客。Hugo 生成，Cloudflare Pages 托管，写文章就是写 Markdown 然后 `git push`。

**在线地址：[shouye-blog.pages.dev](https://shouye-blog.pages.dev)**

---

## 技术栈

| | |
|---|---|
| 生成器 | [Hugo](https://gohugo.io/) `0.168.0 extended` |
| 样式与交互 | 原生 CSS + 原生 JS（无框架、无打包工具、无 npm 依赖） |
| 托管 | Cloudflare Pages（免费额度，自动 HTTPS） |
| 自动发布 | GitHub Actions |

主题是自己写的，没有套用现成模板。

## 站点特性

- **信笺封面**：首页整屏海报，向下滚动时整块淡出（底图、暗色层、文字、按钮同步），导航条随后由下往上淡入
- **动态背景**：循环播放的降雪视频，每个页面可独立配色与背景图（`hugo.toml` 的 `params.bg`）
- **黑胶唱片**：右下角悬浮唱片，展开后可在进度条、上一首、下一首和音量之间操作；一首播完会**自动随机**换下一首。
  随机采用洗牌袋算法，一轮内每首歌都轮到，且绝不连续重复同一首
- **设置悬浮球**：可切换字体、字号、全站色相、卡片透明度；长按可拖到任意位置并记住位置
- **留言板**：提交后直接寄到站长邮箱（Web3Forms，未配置时退化为 `mailto:`），站上不保存任何留言数据；展示的留言由 `content/guestbook.md` 手动维护
- **其它**：站内搜索、标签云、自定义 404 页、RSS

## 目录结构

```
.
├── content/                 # 文章与独立页面（Markdown）
│   ├── posts/               #   文章
│   └── {about,friends,...}.md
├── layouts/                 # Hugo 模板（HTML）
├── assets/                  # 参与构建并做内容指纹的 CSS / JS
│   ├── css/main.css
│   └── js/main.js
├── static/                  # 原样复制进产物（图片、音频、视频）
├── _originals/              # 未压缩的原始素材，不入库、不参与构建
├── hugo.toml                # 站点配置（背景图登记、歌单、导航、社交链接）
├── archetypes/              # 新建文章的模板
├── 操作指南.md              # 面向写作者的说明
└── 技术文档.md              # 面向维护者的实现说明
```

## 本地开发

需要 Hugo extended ≥ 0.168.0。

```bash
hugo server -p 1414 --disableFastRender
```

打开 <http://localhost:1414>。Windows 上也可以直接双击 `启动博客.bat`。

> 端口固定 1414 而不是默认的 1313，是为了避开某个缓存中间层导致的「浏览器渲染旧页面」问题。

## 写文章

新建 `content/posts/你的标题.md`：

```toml
+++
title = '文章标题'
subtitle = '可选副标题'
date = '2026-10-25T09:00:00+08:00'
tags = ['随笔']
+++

正文用 Markdown 写。
```

几个坑：

- `date` **不能写未来时间**——Hugo 默认不渲染未来内容，而且不会报错，只会「构建成功但页面不存在」
- 文件名以 `_` 开头会被当成草稿
- 想给单篇文章换背景，在 front matter 里加 `bg = "bg8.png"`

## 发布

推送到 `main` 分支即可，GitHub Actions 会构建并部署：

```bash
git add .
git commit -m "文章与文档更新"
git push
```

一两分钟后访问线上地址（`Ctrl+F5` 强刷）。进度看 [Actions](https://github.com/jmx2033/my-blog/actions)。

GitHub 不通时，双击 `发布到线上.bat` 从本地直接上传，效果一样。

## 关于这个仓库

- 仓库只存**源码**。`public/`（构建产物）、`_originals/`（几百 MB 的视频原片）和部署令牌都在 `.gitignore` 里
- 部署令牌另存为仓库 Secret `CLOUDFLARE_API_TOKEN`，不出现在代码中
- 推送请用 SSH（`git@github.com:jmx2033/my-blog.git`）。本机有 TLS 拦截软件时，HTTPS 会因为证书吊销检查失败而推不上去

更细的说明见 [操作指南.md](操作指南.md)（怎么写字、怎么调参）和 [技术文档.md](技术文档.md)（模板结构、CSS 体系、JS 模块、踩过的坑）。

## 版权

文章内容版权归作者所有，未经许可请勿转载。主题代码可自由参考。

---

<sub>构建于 2026 年 10 月。封面上那句话出自《三日间的幸福》：「如果把余生的日子，标上价格出售」。</sub>
