<?xml version="1.0" encoding="UTF-8"?>
<!--
  RSS 订阅源的样式表：浏览器直接打开 /index.xml 时，
  会把原始 XML 渲染成下方这个可读的订阅页面。
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="zh-cn">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> · RSS 订阅</title>
        <style>
          :root { --ink: #2c3e50; --red: #e74c3c; --soft: rgba(44,62,80,.6); }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 48px 20px 80px;
            font-family: "Noto Serif SC", "Source Han Serif SC", serif;
            color: var(--ink);
            background: linear-gradient(180deg, #dfeaf2 0%, #f4f6f8 100%);
            line-height: 2.0; letter-spacing: .5px;
          }
          .wrap { max-width: 640px; margin: 0 auto; }
          header { text-align: center; margin-bottom: 40px; }
          header h1 {
            font-family: "Noto Sans SC", sans-serif;
            font-size: 1.5rem; letter-spacing: 4px; margin: 0 0 8px;
          }
          header p { color: var(--soft); margin: 0; font-size: .85rem; }
          .badge {
            display: inline-block; margin-top: 14px; padding: 6px 18px;
            border: 1px solid var(--red); border-radius: 999px;
            color: var(--red); font-size: .78rem; letter-spacing: 2px;
            font-family: "Noto Sans SC", sans-serif; text-decoration: none;
          }
          article {
            background: rgba(255,255,255,.75);
            border: 1px solid rgba(255,255,255,.6);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(44,62,80,.08);
            padding: 22px 26px; margin-bottom: 18px;
          }
          article h2 { font-size: 1.05rem; margin: 0 0 6px; }
          article h2 a { color: var(--ink); text-decoration: none; }
          article h2 a:hover { color: var(--red); }
          time { font-size: .72rem; color: var(--soft); font-family: "Noto Sans SC", sans-serif; }
          .desc { margin: 10px 0 0; font-size: .85rem; color: var(--soft); }
          footer { text-align: center; margin-top: 40px; font-size: .72rem; color: var(--soft); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p><xsl:value-of select="/rss/channel/description"/></p>
            <a class="badge" href="/">← 回到博客</a>
          </header>

          <xsl:for-each select="/rss/channel/item">
            <article>
              <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
              <time><xsl:value-of select="pubDate"/></time>
              <!-- disable-output-escaping：description 里是转义过的 HTML（&lt;p&gt;…），
                   关闭输出转义让它按真实段落渲染，而不是显示一堆 &lt;p&gt; 字符 -->
              <p class="desc"><xsl:value-of select="description" disable-output-escaping="yes"/></p>
            </article>
          </xsl:for-each>

          <footer>订阅地址：/index.xml · 夏日将尽</footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
