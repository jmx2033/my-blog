/* 守叶的博客 —— 交互脚本：公告 / 搜索 / 设置球 / 留言墙 / 统一音乐播放器 */
(function () {
  'use strict';

  /* ================= 公告卡片：可关闭并记住状态 ================= */
  var announce = document.querySelector('.announce-card');
  if (announce && announce.dataset.closable === 'true') {
    var ANN_KEY = 'hb_announce_closed';
    if (localStorage.getItem(ANN_KEY) === '1') announce.style.display = 'none';
    var closeBtn = announce.querySelector('.announce-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        announce.style.display = 'none';
        localStorage.setItem(ANN_KEY, '1');
      });
    }
  }

  /* ================= 导航栏搜索 ================= */
  var searchBtn = document.getElementById('navSearchBtn');
  var searchPanel = document.getElementById('searchPanel');
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var posts = window.__POSTS__ || [];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderResults(query) {
    query = (query || '').trim().toLowerCase();
    var matched = query
      ? posts.filter(function (p) {
          return p.title.toLowerCase().indexOf(query) !== -1 ||
                 (p.summary && p.summary.toLowerCase().indexOf(query) !== -1);
        })
      : posts.slice(0, 5);
    if (!matched.length) {
      searchResults.innerHTML = '<li class="search-empty">何も見つからない。没有找到相关内容。</li>';
      return;
    }
    searchResults.innerHTML = matched.slice(0, 8).map(function (p) {
      return '<li><a href="' + p.url + '">' +
        '<span class="sr-title">' + escapeHtml(p.title) + '</span>' +
        '<span class="sr-date">' + p.date + '</span>' +
        (p.summary ? '<span class="sr-summary">' + escapeHtml(p.summary) + '</span>' : '') +
        '</a></li>';
    }).join('');
  }

  if (searchBtn && searchPanel) {
    searchBtn.addEventListener('click', function () {
      var open = searchPanel.hasAttribute('hidden');
      if (open) {
        searchPanel.removeAttribute('hidden');
        renderResults('');
        searchInput.focus();
      } else {
        searchPanel.setAttribute('hidden', '');
      }
    });
    searchInput.addEventListener('input', function () { renderResults(searchInput.value); });
    document.addEventListener('click', function (e) {
      if (!searchPanel.hasAttribute('hidden') &&
          !searchPanel.contains(e.target) && !searchBtn.contains(e.target)) {
        searchPanel.setAttribute('hidden', '');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') searchPanel.setAttribute('hidden', '');
    });
  }

  /* ================= 显示设置球（字体 / 字号 / 色相 / 卡片透明度） ================= */
  var DS_KEY = 'hb_display_settings';
  var DEFAULTS = { fontFamily: 'serif', fontSize: 20, hue: 6, glassAlpha: 0.5 };
  var ds = Object.assign({}, DEFAULTS);
  try { Object.assign(ds, JSON.parse(localStorage.getItem(DS_KEY) || '{}')); } catch (e) { }

  /* 字体映射：衬线（Noto Serif SC）/ 无衬线（Noto Sans SC）/ 楷体 / 黑体 */
  var FONT_MAP = {
    serif: "'Noto Serif SC', serif",
    sans:  "'Noto Sans SC', sans-serif",
    kai:   "'KaiTi', '楷体', STKaiti, serif",
    hei:   "'SimHei', '黑体', 'Microsoft YaHei', sans-serif"
  };
  function fontStack(key) { return FONT_MAP[key] || FONT_MAP.serif; }

  var ball = document.getElementById('displayBall');
  var panel = document.getElementById('displayPanel');
  var sizeRange = document.getElementById('fontSizeRange');
  var hueRange = document.getElementById('hueRange');
  var alphaRange = document.getElementById('alphaRange');
  var sizeVal = document.getElementById('fontSizeVal');
  var hueVal = document.getElementById('hueVal');
  var alphaVal = document.getElementById('alphaVal');
  var fontBtns = panel ? panel.querySelectorAll('.dp-btn[data-font]') : [];

  function applySettings() {
    var r = document.documentElement;
    r.style.fontSize = ds.fontSize + 'px';
    /* 色相同时驱动强调色与正文文字色：同一 hue，不同饱和度/明度 */
    r.style.setProperty('--hue', ds.hue);
    r.style.setProperty('--pain-red', 'hsl(' + ds.hue + ' 68% 55%)');
    r.style.setProperty('--ink', 'hsl(' + ds.hue + ' 42% 23%)');
    r.style.setProperty('--ink-soft', 'hsl(' + ds.hue + ' 28% 32% / 0.62)');
    r.style.setProperty('--glass-alpha', ds.glassAlpha);
    r.style.setProperty('--body-font', fontStack(ds.fontFamily));
    if (sizeVal) sizeVal.textContent = ds.fontSize;
    if (hueVal) hueVal.textContent = ds.hue;
    if (alphaVal) alphaVal.textContent = Math.round(ds.glassAlpha * 100);
    if (sizeRange) sizeRange.value = ds.fontSize;
    if (hueRange) hueRange.value = ds.hue;
    if (alphaRange) alphaRange.value = ds.glassAlpha * 100;
    fontBtns.forEach(function (b) {
      b.classList.toggle('dp-active', b.dataset.font === ds.fontFamily);
    });
  }

  function saveSettings() {
    localStorage.setItem(DS_KEY, JSON.stringify(ds));
  }

  if (ball && panel) {
    applySettings(); /* 与 head 内联脚本一致，同步 UI 状态 */
    ball.addEventListener('click', function () {
      if (dragMoved) { dragMoved = false; return; } /* 拖动结束不触发面板 */
      var open = panel.hasAttribute('hidden');
      if (open) {
        panel.removeAttribute('hidden');
        if (typeof clampDisplayPanel === 'function') clampDisplayPanel();
      } else {
        panel.setAttribute('hidden', '');
      }
    });
    var panelClose = document.getElementById('displayPanelClose');
    if (panelClose) panelClose.addEventListener('click', function () { panel.setAttribute('hidden', ''); });
    document.addEventListener('click', function (e) {
      if (!panel.hasAttribute('hidden') &&
          !panel.contains(e.target) && !ball.contains(e.target)) {
        panel.setAttribute('hidden', '');
      }
    });
    fontBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        ds.fontFamily = b.dataset.font;
        applySettings(); saveSettings();
      });
    });
    sizeRange.addEventListener('input', function () {
      ds.fontSize = parseFloat(sizeRange.value); applySettings(); saveSettings();
    });
    hueRange.addEventListener('input', function () {
      ds.hue = parseInt(hueRange.value, 10); applySettings(); saveSettings();
    });
    alphaRange.addEventListener('input', function () {
      ds.glassAlpha = parseInt(alphaRange.value, 10) / 100; applySettings(); saveSettings();
    });
    var reset = document.getElementById('displayReset');
    if (reset) reset.addEventListener('click', function () {
      ds = Object.assign({}, DEFAULTS);
      applySettings(); saveSettings();
    });
  }

  /* ================= 留言板：直接寄到站长邮箱 ================= */
  var gbForm = document.getElementById('guestbookForm');
  if (gbForm) {
    var gbName = document.getElementById('gbName');
    var gbMessage = document.getElementById('gbMessage');
    var gbSubmit = document.getElementById('gbSubmit');
    var gbHint = document.getElementById('gbHint');
    var gbBot = document.getElementById('gbBot');
    var gbKey = (gbForm.getAttribute('data-key') || '').trim();
    var gbMail = (gbForm.getAttribute('data-email') || '').trim();

    function gbSay(text, ok) {
      if (!gbHint) return;
      gbHint.textContent = text;
      gbHint.classList.toggle('gb-hint-ok', !!ok);
    }

    function gbBusy(on) {
      if (!gbSubmit) return;
      gbSubmit.disabled = on;
      gbSubmit.textContent = on ? '寄出中…' : '留言';
    }

    gbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = gbMessage ? gbMessage.value.trim() : '';
      if (!msg) return;
      if (gbBot && gbBot.value) return;          /* 蜜罐：被填了就是机器人 */
      var name = (gbName && gbName.value.trim()) || '旅人';

      /* 没配 access key：退化成唤起访客的邮件客户端 */
      if (!gbKey) {
        if (!gbMail) { gbSay('站长还没配置收件方式'); return; }
        var subject = '博客留言 · ' + name;
        var body = msg + '\n\n—— ' + name;
        window.location.href = 'mailto:' + gbMail +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        gbSay('已打开邮件客户端，点发送就好');
        return;
      }

      gbBusy(true);
      gbSay('寄出中…');
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: gbKey,
          subject: '博客留言 · ' + name,
          from_name: '守叶的博客',
          name: name,
          message: msg,
          page: location.href
        })
      }).then(function (r) {
        return r.json();
      }).then(function (res) {
        if (res && res.success) {
          gbForm.reset();
          gbSay('收到了，谢谢。', true);
        } else {
          gbSay('没寄出去，稍后再试' + (gbMail ? '，或直接发邮件到 ' + gbMail : ''));
        }
      }).catch(function () {
        gbSay('网络不通' + (gbMail ? '，可以直接发邮件到 ' + gbMail : ''));
      }).then(function () {
        gbBusy(false);
      });
    });
  }

  /* ================= 悬浮组件拖拽：设置球 + 唱片（位置记忆） ================= */
  var POS_KEY = 'hb_widget_pos';
  var widgetPos = {};
  try { widgetPos = JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch (e) { }

  /* 上次拖动过的位置在页面加载时恢复 */
  function restorePos(el, key) {
    var p = widgetPos[key];
    if (!p) return;
    el.style.left = p.l + 'px';
    el.style.top = p.t + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  var dragMoved = false; /* 本次按下是否产生了拖动（用于区分点击） */

  function makeDraggable(el, key, handleSelector) {
    if (!el) return;
    el.style.touchAction = 'none';
    restorePos(el, key);
    var startX = 0, startY = 0, origL = 0, origT = 0;
    var pressing = false, holdReady = false, dragging = false;
    var pressTimer = null;

    /* 禁止浏览器原生图片拖拽（拖出半透明残影的元凶） */
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(el.querySelectorAll('img'), function (img) {
      img.setAttribute('draggable', 'false');
    });

    el.addEventListener('pointerdown', function (e) {
      /* 只响应主键/单指；指定 handle 时仅把手区域可拖（避免面板内控件误触） */
      if (e.button !== undefined && e.button !== 0) return;
      if (handleSelector && !e.target.closest(handleSelector)) return;
      pressing = true; holdReady = false; dragging = false;
      startX = e.clientX; startY = e.clientY;
      /* 长按 80ms 后获得拖动资格：单击仍是单击，按住拖动才是搬家 */
      pressTimer = setTimeout(function () { holdReady = true; }, 80);
    });

    el.addEventListener('pointermove', function (e) {
      if (!pressing) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) < 6) return; /* 6px 内是抖动 */
      if (!holdReady) {
        /* 未长按就移动 = 滑动/甩动，不是拖拽，直接放弃本次按压 */
        cancelPress();
        return;
      }
      if (!dragging) {
        /* 拖动正式开始：此刻才转 left/top 定位并捕获指针 */
        dragging = true; dragMoved = true;
        var rect = el.getBoundingClientRect();
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        origL = rect.left; origT = rect.top;
        try { el.setPointerCapture(e.pointerId); } catch (err) { }
      }
      var L = origL + dx, T = origT + dy;
      L = Math.max(0, Math.min(L, window.innerWidth - el.offsetWidth));
      T = Math.max(0, Math.min(T, window.innerHeight - el.offsetHeight));
      el.style.left = L + 'px';
      el.style.top = T + 'px';
      syncLinked(el, key, L, T);
    });

    function cancelPress() {
      pressing = false; holdReady = false; dragging = false;
      clearTimeout(pressTimer);
    }

    function endDrag() {
      clearTimeout(pressTimer);
      if (dragging) {
        var rect = el.getBoundingClientRect();
        widgetPos[key] = { l: Math.round(rect.left), t: Math.round(rect.top) };
        try { localStorage.setItem(POS_KEY, JSON.stringify(widgetPos)); } catch (e) { }
      }
      /* 未拖动时正常放行 click（切换面板） */
      pressing = false; holdReady = false; dragging = false;
    }
    /* 抬手监听绑在 document 上：在元素外松开也能复位状态，
       否则"按下后滑出元素再松手"会让 pressing 永久卡死，
       之后任何鼠标移动都会被当成拖拽 */
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
  }

  /* 设置球与它的面板是兄弟节点：拖动球时面板跟随保持相对位置 */
  var displayBall = document.getElementById('displayBall');
  var displayPanelEl = document.getElementById('displayPanel');
  var panelDelta = 0; /* 面板顶部相对球顶部的固定偏移 */

  function syncLinked(el, key, L, T) {
    if (key === 'ball' && displayPanelEl) {
      displayPanelEl.style.left = L + 'px';
      displayPanelEl.style.top = (T + panelDelta) + 'px';
      displayPanelEl.style.right = 'auto';
    }
  }

  if (displayBall) {
    /* 记录初始相对偏移，供拖动时面板跟随 */
    var bRect = displayBall.getBoundingClientRect();
    var pRect = displayPanelEl ? displayPanelEl.getBoundingClientRect() : null;
    panelDelta = pRect ? (pRect.top - bRect.top) : 56;
    /* 若球有记忆位置，面板同步偏移 */
    if (widgetPos.ball && displayPanelEl) {
      displayPanelEl.style.left = widgetPos.ball.l + 'px';
      displayPanelEl.style.top = (widgetPos.ball.t + panelDelta) + 'px';
      displayPanelEl.style.right = 'auto';
    }
  }
  makeDraggable(displayBall, 'ball');
  /* 唱片组件只有碟片本身可拖，展开面板内的控件不受影响 */
  makeDraggable(document.getElementById('vinylWidget'), 'vinyl', '#vinylDisc');

  /* 展开面板后组件整体尺寸变化，可能越过屏幕边缘——统一钳制回可视区 */
  function clampInViewport(el, pad) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var maxL = window.innerWidth - r.width - pad;
    var maxT = window.innerHeight - r.height - pad;
    var L = Math.max(pad, Math.min(r.left, maxL));
    var T = Math.max(pad, Math.min(r.top, maxT));
    if (L !== r.left || T !== r.top) {
      el.style.left = L + 'px';
      el.style.top = T + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      return { l: Math.round(L), t: Math.round(T) };
    }
    return null;
  }

  var vinylWidget = document.getElementById('vinylWidget');
  function clampVinyl() {
    var fixed = clampInViewport(vinylWidget, 8);
    if (fixed) {
      widgetPos.vinyl = fixed;
      try { localStorage.setItem(POS_KEY, JSON.stringify(widgetPos)); } catch (e) { }
    }
  }
  function clampDisplayPanel() {
    if (displayPanelEl && !displayPanelEl.hasAttribute('hidden')) {
      clampInViewport(displayPanelEl, 8);
    }
  }
  /* 页面加载与窗口尺寸变化时兜底（记忆位置可能是在更大的窗口下保存的） */
  clampVinyl();
  window.addEventListener('resize', function () { clampVinyl(); clampDisplayPanel(); });

  /* ================= 首页入口：品牌回信笺封面 / 首页跳正文 / 下拉提示 =================
     以前的毛病：品牌和「首页」都指向 /，点了没区别，而且已经在首页往下滑之后
     点它们没有任何反应（同 URL 导航不会重置滚动位置）。现在分工：
       · 品牌「守叶的博客」→ 平滑滚回信笺封面（第 0 屏）
       · 「首页」→ 跳过封面，直接落到 #hero 大标题
       · 封面上的下拉提示 → 同「首页」，落到正文
     不在首页时一律不拦截，交给浏览器正常跳转（首页链接带 #hero，
     从其它页面点过来会直接落到正文）。 */
  var heroEl = document.getElementById('hero');
  var isHome = !!document.getElementById('siteCover');

  function smoothScrollY(top) {
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  if (isHome) {
    var brandEl = document.querySelector('.nav-brand');
    if (brandEl) {
      brandEl.addEventListener('click', function (e) {
        e.preventDefault();
        smoothScrollY(0);
      });
    }

    var homeJump = document.querySelector('[data-home-jump]');
    if (homeJump) {
      homeJump.addEventListener('click', function (e) {
        if (!heroEl) return;
        e.preventDefault();
        heroEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    var coverHint = document.getElementById('coverHint');
    if (coverHint) {
      coverHint.addEventListener('click', function () {
        /* 封面之后直接就是正文（空白占位区已移除），落到 hero 比滚「一屏」准 */
        if (heroEl) { heroEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        else { smoothScrollY(window.innerHeight); }
      });
    }
  }

  /* ================= 首页 hero：滑动浮现（读滚动位置算进度，不接管滚动） =================
     封面之后紧跟正文（没有空白占位区），hero 就是从屏幕底部升上来的。
     这里读 hero 顶边在视口中的位置，算一个 0~1 的总进度，写成 CSS 变量，
     由 CSS 拿去做透明度与上浮。到进度 1 时完全清晰落定。

     关键：只是「读」滚动位置去算透明度，不监听手势做判断、不吸附、不改速度，
     所以滚动手感和原生完全一致（和之前被否掉的 scroll-snap 是两回事）。

     ★ HERO_SPLIT：一个开关决定观感
         false（默认）= 整块丝滑——透明度与上浮连续变化，中途没有卡点，
                        观感和之前那版 animation-timeline: view() 一致
         true          = 分层浮现——标题 → 引言 → 副题依次上来，
                        层次更清楚，但中途会「标题清楚了、引言还虚着」

     ★ 另外两个旋钮：
       from / to  → 总进度 0 和 1 对应的 hero 顶边高度（占屏幕高度的比例） */
  if (isHome && heroEl) {
    var reduceMotion = !!(window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    if (!reduceMotion) {
      /* ★ 观感开关：false = 整块丝滑（推荐）；true = 三段分层 */
      var HERO_SPLIT = false;

      /* [写入 hero 的 CSS 变量, 该段起点, 该段终点]（都是总进度 0~1）
         丝滑模式只写一条、覆盖 0→1，等于「整块一起走」；
         分层模式三条各自错开，段与段之间刻意留重叠，读起来才连贯。
         注意：分层模式的变量名要和 CSS 里 .hero-split 那几条对上。 */
      var HERO_STAGES = HERO_SPLIT
        ? [['--hp-title', 0.00, 0.50],
           ['--hp-quote', 0.18, 0.70],
           ['--hp-sub',   0.38, 0.92]]
        : [['--hp-title', 0.00, 1.00]];

      var heroTicking = false;
      var heroSettled = false;
      var heroFallbackTimer = null;

      var clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
      /* smoothstep：两头慢、中间匀，避免「唰一下窜出来」。
         之前用过 easeOut 三次方，实测标题段在 80px 滚动内就从 0.03 冲到 0.92，
         太急；换成这条后同样的滚动距离只走到一半，节奏才跟得上视线。 */
      var smoothstep = function (t) { return t * t * (3 - 2 * t); };

      var paintHero = function () {
        heroTicking = false;
        if (heroFallbackTimer) { clearTimeout(heroFallbackTimer); heroFallbackTimer = null; }
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var top = heroEl.getBoundingClientRect().top;
        /* ★ 起点 / 终点：区间越宽，浮现过程越长越绵。
           注意这里的数字和上面「封面淡出」是配套的：
           封面在 COVER_FADE_END（0.65 屏）处淡透，hero 就紧接着从 0.62 屏高处起步，
           两条曲线刚好首尾相接——信笺先溶进天空，字再浮上来，中间不重叠。 */
        var from = vh * 0.62;   /* hero 顶边升到屏幕 62% 高处时，开始浮 */
        var to   = vh * 0.18;   /* 升到 18% 高处时，完全清晰（正好落在导航条下方） */
        var p = clamp01((from - top) / (from - to));

        for (var i = 0; i < HERO_STAGES.length; i++) {
          var st = HERO_STAGES[i];
          var v = smoothstep(clamp01((p - st[1]) / (st[2] - st[1])));
          heroEl.style.setProperty(st[0], v.toFixed(4));
        }

        /* 全部落定后收掉 will-change，避免长期占着合成层；回滚时再加回来 */
        if (p >= 1) {
          if (!heroSettled) { heroSettled = true; heroEl.classList.add('hero-reveal-done'); }
        } else if (heroSettled) {
          heroSettled = false;
          heroEl.classList.remove('hero-reveal-done');
        }
      };

      var requestHeroPaint = function () {
        if (!heroTicking) {
          heroTicking = true;
          window.requestAnimationFrame(paintHero);
        }
        /* 兜底：标签页在后台、系统省电模式、或被嵌入 iframe 时，
           rAF 可能长时间甚至完全不回调。一旦不回调，heroTicking 会永久卡在 true，
           之后再怎么滚都不会重算，文案就永远停在透明——所以用短定时器保一次。
           正常环境下 rAF 先到，这个定时器在 paintHero 里会被清掉，不会重复算。 */
        if (heroFallbackTimer) { clearTimeout(heroFallbackTimer); }
        heroFallbackTimer = setTimeout(function () {
          heroFallbackTimer = null;
          if (heroTicking) { paintHero(); }
        }, 120);
      };

      /* 先加 class 再同步算一次，两步都在首帧绘制之前完成，不会闪一下白字 */
      heroEl.classList.add('hero-reveal');
      if (HERO_SPLIT) { heroEl.classList.add('hero-split'); }
      paintHero();

      try {
        window.addEventListener('scroll', requestHeroPaint, { passive: true });
      } catch (err) {
        window.addEventListener('scroll', requestHeroPaint);
      }
      window.addEventListener('resize', requestHeroPaint);
      window.addEventListener('load', requestHeroPaint);
    }
  }

  /* ================= 首页封面：随滚动整块淡出（底部保持不透明） =================
     只把「滚过多少」映射成 opacity，不接管滚动、不吸附、不改速度。

     为什么不用 CSS 的 mask 羽化：那只让底边一条带子变透明，而这台机器上首页背景是
     动态下雪，底部那条带子会一直透出流动的雪，跟静止的信笺拼在一起非常突兀。
     现在整个封面同进同退——底色、文字、按钮一起淡走，没有「一半实一半虚」的割裂。

     ★ 微调入口：COVER_FADE_END（滚过多少屏时完全透明）
       0.65（默认）= 滚过 0.65 屏就全透明；1.0 = 滚满一屏才淡透；
       想更缠绵 → 调大（如 0.9）；想更干脆 → 调小（如 0.45）。
       调完记得看一眼「首页 hero」里的 from：那是文案起步的高度，
       两组数字要首尾相接（封面淡透时文案刚好开始浮），不要叠在一起。 */
  if (isHome) {
    var coverEl = document.getElementById('siteCover');

    if (coverEl) {
      var COVER_FADE_END = 0.65;
      /* 导航条淡入的跨度（占一屏的比例）：从封面淡透那一刻起算，
         0.28 屏之后完全显形，正好赶上它吸顶 */
      var NAV_FADE_SPAN = 0.28;
      var coverFaded = false;
      var navEl = document.querySelector('.navbar');

      var paintCover = function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        var op = 1 - y / (vh * COVER_FADE_END);
        if (op < 0) { op = 0; } else if (op > 1) { op = 1; }
        coverEl.style.opacity = op.toFixed(3);

        /* 淡透后摘掉鼠标命中，否则这块 100vh 的透明区域会压住底下滚上来的内容 */
        var faded = op <= 0.01;
        if (faded !== coverFaded) {
          coverFaded = faded;
          if (faded) { coverEl.classList.add('cover-faded'); }
          else { coverEl.classList.remove('cover-faded'); }
        }

        /* 导航条反向淡入：封面还在的时候它必须让路（否则会有一条半透明的
           白带横穿信笺，很脏），等封面淡透之后再由下往上自然显形、吸顶。 */
        if (navEl) {
          var navStart = vh * COVER_FADE_END;
          var navOp = (y - navStart) / (vh * NAV_FADE_SPAN);
          if (navOp < 0) { navOp = 0; } else if (navOp > 1) { navOp = 1; }
          navEl.style.opacity = navOp.toFixed(3);
          /* 还看不见的时候不要拦点击 */
          navEl.style.pointerEvents = navOp < 0.05 ? 'none' : '';
        }
      };

      /* 这里只读 scrollY（不读布局），开销极低，直接同步写即可，无需 rAF 合并。
         好处顺带避开了 rAF 在后台标签页停摆导致的「标志位永久卡住」问题。 */
      paintCover();
      try {
        window.addEventListener('scroll', paintCover, { passive: true });
      } catch (err) {
        window.addEventListener('scroll', paintCover);
      }
      window.addEventListener('resize', paintCover);
    }
  }

  /* ================= 邮箱卡片：点击复制地址（mailto 无默认客户端时静默失败） ================= */
  var copyToast = document.getElementById('copyToast');
  var toastTimer = null;
  function showCopyToast(text) {
    if (!copyToast) return;
    if (text) copyToast.textContent = text;
    copyToast.removeAttribute('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { copyToast.setAttribute('hidden', ''); }, 2200);
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
  }
  $$('[data-mail]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var mail = el.getAttribute('data-mail');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mail).then(showCopyToast, function () { legacyCopy(mail); showCopyToast(); });
      } else {
        legacyCopy(mail);
        showCopyToast();
      }
      /* 若系统装有邮件客户端，同时尝试唤起；没有则静默 */
      window.location.href = 'mailto:' + mail;
    });
  });

  /* data-copy 链接（如 RSS 图标）：左键点击复制链接地址（el.href 为绝对地址），右键菜单不受影响 */
  $$('[data-copy]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var link = el.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () { showCopyToast('链接地址已复制到剪贴板'); }, function () { legacyCopy(link); showCopyToast('链接地址已复制到剪贴板'); });
      } else {
        legacyCopy(link);
        showCopyToast('链接地址已复制到剪贴板');
      }
    });
  });

  /* ================= 统一音乐播放器（侧栏卡片 + 唱片 + 导航按钮） ================= */
  var playlist = window.__PLAYLIST__ || [];
  var hasPlaylist = playlist.length > 0;
  var audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.7;
  var current = -1;
  var isPlaying = false;
  var shuffleBag = [];   /* 随机播放的「牌堆」：洗好一轮按顺序发，发完再洗 */

  /* 抽下一首的随机索引。
     不是每次都 Math.random 硬掷——那样几首歌很容易来回重复。
     这里用洗牌袋：把整张列表洗一遍依次发放，一轮之内每首都会轮到，
     并且新的一轮第一首不会刚好是刚播完的那首（否则听着像没切歌）。 */
  function drawRandomIndex() {
    var n = playlist.length;
    if (n <= 1) return 0;
    if (!shuffleBag.length) {
      shuffleBag = playlist.map(function (_, i) { return i; });
      /* Fisher-Yates 洗牌 */
      for (var i = shuffleBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffleBag[i]; shuffleBag[i] = shuffleBag[j]; shuffleBag[j] = tmp;
      }
      if (shuffleBag[0] === current && shuffleBag.length > 1) {
        var k = 1 + Math.floor(Math.random() * (shuffleBag.length - 1));
        var swap = shuffleBag[0]; shuffleBag[0] = shuffleBag[k]; shuffleBag[k] = swap;
      }
    }
    return shuffleBag.shift();
  }

  /* 三处 UI 的共同角色选择器 */
  function $$(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function updateAll() {
    var playingIcon = isPlaying ? 'pause' : 'play';
    $$('[data-role="play"]').forEach(function (btn) {
      var iPlay = btn.querySelector('.i-play');
      var iPause = btn.querySelector('.i-pause');
      if (iPlay) iPlay.toggleAttribute('hidden', isPlaying);
      if (iPause) iPause.toggleAttribute('hidden', !isPlaying);
      btn.setAttribute('aria-label', playingIcon);
    });
    var navBtn = document.getElementById('navMusicBtn');
    if (navBtn) navBtn.classList.toggle('playing', isPlaying);
    var disc = document.getElementById('vinylDisc');
    if (disc) {
      /* 动画常挂、用 play-state 控制：暂停 = 冻结在当前角度（不重置回 0°），
         继续播放 = 从定格处接着转 */
      disc.classList.add('spinning');
      disc.style.animationPlayState = isPlaying ? 'running' : 'paused';
    }
  }

  function updateTrackUI() {
    if (!hasPlaylist || current < 0) return;
    var t = playlist[current];
    $$('[data-role="name"]').forEach(function (el) { el.textContent = t.name || '未命名'; });
    $$('[data-role="artist"]').forEach(function (el) { el.textContent = t.artist || ''; });

    /* 封面：侧栏 / 唱片 / 面板全部从图池随机挑（每首切歌都重掷），图池为空才回退到歌曲配置封面 */
    var coverUrl = t.cover || '';
    var pool = window.__IMAGES__ || [];
    var vinylCover = pool.length
      ? pool[Math.floor(Math.random() * pool.length)]
      : coverUrl;
    $$('[data-role="cover"]').forEach(function (el) {
      if (el.tagName === 'IMG') {
        if (vinylCover) {
          el.onerror = function () {
            /* 封面 404 时隐藏裂图，回退到唱片标签样式 */
            el.setAttribute('hidden', '');
            var label = document.querySelector('.vinyl-label');
            if (label) label.style.display = 'flex';
          };
          el.src = vinylCover;
          el.removeAttribute('hidden');
        }
      } else if (el.classList.contains('vinyl-cover')) {
        el.innerHTML = vinylCover
          ? '<img src="' + vinylCover + '" alt="">'
          : '<svg class="nav-icon"><use href="#i-music"/></svg>';
      } else if (el.classList.contains('music-cover')) {
        el.innerHTML = vinylCover
          ? '<img src="' + vinylCover + '" alt="">'
          : '<svg class="nav-icon"><use href="#i-music"/></svg>';
      }
    });
    var fallback = document.querySelector('.vinyl-label');
    var discImg = document.querySelector('#vinylDisc img');
    if (fallback && discImg) fallback.style.display = vinylCover ? 'none' : 'flex';
  }

  function loadTrack(index, autoplay) {
    if (!hasPlaylist) return;
    current = ((index % playlist.length) + playlist.length) % playlist.length;
    var t = playlist[current];
    audio.src = t.url;
    updateTrackUI();
    if (autoplay) play();
  }

  function play() {
    if (!hasPlaylist) return hintMusicCard();
    if (current === -1) { loadTrack(0, true); return; }
    var p = audio.play();
    if (p) p.then(function () { isPlaying = true; updateAll(); })
         .catch(function () { isPlaying = false; updateAll(); });
  }

  function pause() { audio.pause(); isPlaying = false; updateAll(); }

  function togglePlay() {
    if (!hasPlaylist) return hintMusicCard();
    if (audio.paused) play(); else pause();
  }

  function hintMusicCard() {
    var card = document.getElementById('musicCard');
    if (card) {
      card.classList.remove('music-hint');
      void card.offsetWidth;
      card.classList.add('music-hint');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* 播放 / 上一首 / 下一首（三处 UI 均绑定） */
  $$('[data-role="play"]').forEach(function (b) { b.addEventListener('click', togglePlay); });
  $$('[data-role="prev"]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!hasPlaylist) return;
      shuffleBag = [];   /* 手动切歌后重新洗牌，避免随机时又撞回刚换掉的那首 */
      loadTrack(current - 1, true);
    });
  });
  $$('[data-role="next"]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!hasPlaylist) return;
      shuffleBag = [];
      loadTrack(current + 1, true);
    });
  });

  /* 进度条（侧栏 + 唱片面板） */
  audio.addEventListener('timeupdate', function () {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration * 100) + '%';
    $$('[data-role="fill"]').forEach(function (el) { el.style.width = pct; });
  });
  /* 一首播完自动接下一首：随机（洗牌袋），单曲时原地循环 */
  audio.addEventListener('ended', function () {
    if (!hasPlaylist) return;
    loadTrack(drawRandomIndex(), true);
  });
  $$('[data-role="progress"]').forEach(function (bar) {
    bar.addEventListener('click', function (e) {
      if (!hasPlaylist || !audio.duration) return;
      var rect = bar.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
  });

  /* 唱片：点击碟片展开/收起控制面板，双击播放 */
  var disc = document.getElementById('vinylDisc');
  var vinylPanel = document.getElementById('vinylPanel');
  if (disc) {
    disc.addEventListener('click', function () {
      if (dragMoved) { dragMoved = false; return; } /* 拖动结束不触发面板 */
      if (vinylPanel) {
        var open = vinylPanel.hasAttribute('hidden');
        /* 面板绝对定位悬浮于碟片上方，开/关不改变 widget 尺寸，无需钳制 */
        if (open) vinylPanel.removeAttribute('hidden');
        else vinylPanel.setAttribute('hidden', '');
      }
    });
  }

  /* 音量 */
  var volumeRange = document.getElementById('vinylVolume');
  if (volumeRange) {
    volumeRange.value = audio.volume;
    volumeRange.addEventListener('input', function () {
      audio.volume = parseFloat(volumeRange.value);
    });
  }

  /* 导航栏音符按钮：点击静音 / 再点恢复（图标上加一条 \ 斜杠，localStorage 记忆） */
  var MUTE_KEY = 'hb_muted';
  var navMusicBtn = document.getElementById('navMusicBtn');
  function applyMute(muted) {
    audio.muted = muted;
    if (navMusicBtn) {
      navMusicBtn.classList.toggle('muted', muted);
      navMusicBtn.title = muted ? '取消静音' : '静音';
      navMusicBtn.setAttribute('aria-label', muted ? '取消静音' : '静音');
    }
  }
  var savedMute = false;
  try { savedMute = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
  applyMute(savedMute);
  if (navMusicBtn) {
    navMusicBtn.addEventListener('click', function () {
      var muted = !audio.muted;
      applyMute(muted);
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    });
  }

  /* 初始：无歌单时给侧栏卡片加禁用态提示 */
  if (!hasPlaylist) {
    var card = document.getElementById('musicCard');
    if (card) card.classList.add('music-disabled');
  } else {
    /* 打开网站自动播放：
       - 首次进入（本次会话第一次）：固定播放 evening [corn wave]
       - 站内切换页面（同一会话再次加载）：随机挑一首歌
       sessionStorage 在标签页关闭后清除，下次开浏览器又会回到 evening。 */
    var START_KEY = 'hb_music_started';
    var fixedIndex = -1;
    playlist.forEach(function (t, i) {
      if (t.name === 'evening' && t.artist === 'corn wave') fixedIndex = i;
    });
    var startIndex;
    try {
      if (!sessionStorage.getItem(START_KEY)) {
        startIndex = fixedIndex !== -1 ? fixedIndex : 0;
        sessionStorage.setItem(START_KEY, '1');
      } else {
        startIndex = Math.floor(Math.random() * playlist.length);
      }
    } catch (e) {
      startIndex = fixedIndex !== -1 ? fixedIndex : 0;
    }
    loadTrack(startIndex, false);
    var ap = audio.play();
    if (ap) {
      ap.then(function () { isPlaying = true; updateAll(); })
        .catch(function () {
          /* 浏览器拦截了首次有声自动播放（安全策略，无法绕过）。
             挂起持续监听，任一手势都尝试播放，直到成功。
             ⚠️ 真实情况：只有「点击 / 按键 / 手指触摸」算浏览器认可的用户手势（transient activation）。
             滚轮事件 wheel 与 scroll 都【不算】——桌面端纯滚轮不可能启动有声播放，
             这是 Chromium 的硬规则，任何网站都一样；因此 hint 文案引导用户点一下页面。 */
          isPlaying = false; updateAll();
          var navBtn = document.getElementById('navMusicBtn');
          var hint = document.getElementById('vinylHint');
          if (navBtn) navBtn.classList.add('wants-play');
          if (hint) hint.removeAttribute('hidden');
          var GESTURES = ['pointerdown', 'click', 'mousedown', 'keydown', 'wheel', 'touchstart', 'touchend'];
          var startOnce = function () {
            var p2 = audio.play();
            if (!p2) return;
            p2.then(function () {
              isPlaying = true; updateAll();
              GESTURES.forEach(function (g) { document.removeEventListener(g, startOnce); });
              if (navBtn) navBtn.classList.remove('wants-play');
              if (hint) hint.setAttribute('hidden', '');
            }).catch(function () { /* 仍未允许，保持监听等待下次交互 */ });
          };
          GESTURES.forEach(function (g) { document.addEventListener(g, startOnce, { passive: true }); });
        });
    }
  }
})();
