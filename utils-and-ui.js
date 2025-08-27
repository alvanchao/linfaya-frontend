/* utils-and-ui.js — 共用工具 + UI 注入（不依賴其他檔案） */
(function (w, d) {
  // 簡易選擇器
  w.$  = function (s) { return d.querySelector(s); };
  w.$$ = function (s) { return d.querySelectorAll(s); };
  w.fmt = function (n) { return 'NT$' + Number(n || 0).toLocaleString('zh-Hant-TW'); };

  // Toast
  w.toast = function (msg, ms) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg || '完成';
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, ms || 1200);
  };

  // fetch（含逾時 & 重試）
  w.fetchJSON = async function (url, fetchOpts, retryOpts) {
    var opts = retryOpts || {};
    var timeoutMs = opts.timeoutMs || 20000;
    var retries = typeof opts.retries === 'number' ? opts.retries : 2;
    var retryDelayBaseMs = opts.retryDelayBaseMs || 800;
    var lastErr;
    for (var attempt = 0; attempt <= retries; attempt++) {
      var ac = new AbortController();
      var t = setTimeout(function(){ ac.abort(new Error('Timeout')); }, timeoutMs);
      try {
        var r = await fetch(url, Object.assign({}, fetchOpts || {}, { signal: ac.signal }));
        clearTimeout(t);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) {
        clearTimeout(t);
        lastErr = e;
        if ((e && e.message || '').indexOf('HTTP 4') === 0) break; // 4xx 不重試
        if (attempt === retries) break;
        await new Promise(function(res){ setTimeout(res, retryDelayBaseMs * Math.pow(2, attempt)); });
      }
    }
    throw lastErr;
  };

  // 新視窗（Safari 安全）
  w.openNamedWindow = function (name, html) {
    var wdw = null;
    try { wdw = window.open('', name); } catch (_) {}
    if (!wdw || wdw.closed || typeof wdw.closed === 'undefined') return null;
    try {
      wdw.document.open();
      wdw.document.write('<!doctype html><meta charset="utf-8"><title>Loading</title><body style="font:14px/1.6 -apple-system,blinkmacsystemfont,Segoe UI,Roboto,Helvetica,Arial">'
        + (html || '載入中…') + '</body>');
      wdw.document.close();
    } catch (_) {}
    return wdw;
  };

  // 送 POST form
  w.postForm = function (endpoint, fields, target) {
    var form = d.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.target = target || '_self';
    Object.keys(fields || {}).forEach(function (k) {
      var i = d.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = fields[k];
      form.appendChild(i);
    });
    d.body.appendChild(form);
    form.submit();
    setTimeout(function(){ form.remove(); }, 3000);
  };

  // 預購交期工具
  w.addWorkingDays = function (fromDate, n) {
    var d0 = new Date(fromDate);
    var added = 0;
    while (added < n) {
      d0.setDate(d0.getDate() + 1);
      var day = d0.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
    return d0;
  };
  w.ymd = function (d1) {
    var y = d1.getFullYear(), m = String(d1.getMonth() + 1).padStart(2, '0'), dd = String(d1.getDate()).padStart(2, '0');
    return y + '/' + m + '/' + dd;
  };
  w.preorderRangeToday = function (min, max) {
    var now = new Date();
    return w.ymd(w.addWorkingDays(now, min)) + ' ～ ' + w.ymd(w.addWorkingDays(now, max));
  };

  // 注入 chips / cart / 抽屜表單 樣式（集中覆蓋）
  (function injectStyle() {
    var css = [
      /* ---- 通用 chip 與購物車卡片 ---- */
      '.chips{display:flex;gap:8px;flex-wrap:wrap}',
      '.chip{min-width:40px;padding:8px 10px;border:1px solid #2b3342;border-radius:10px;background:#0f1320;color:#c7cede;cursor:pointer;text-align:center;user-select:none}',
      '.chip:hover{transform:translateY(-1px);border-color:#3b4252}',
      '.chip.active{background:linear-gradient(135deg,#5eead4,#a78bfa);color:#0b0c10;border:none}',
      '.chip.small{min-width:32px;padding:6px 8px;border-radius:8px}',
      '.chip.disabled{opacity:.4;cursor:not-allowed;filter:grayscale(20%);text-decoration:line-through}',
      '.oos-note{color:#fca5a5;font-size:12px;margin-top:6px}',
      '.cart-card{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;border:1px solid #212736;border-radius:14px;background:#0e121b;padding:10px}',
      '.cart-right{text-align:right}',
      '.cart-attr{color:#8a94a7;font-size:12px}',
      '.cart-actions{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap}',
      '.link-danger{border:1px solid #3a2230;color:#fca5a5;background:transparent;border-radius:10px;padding:6px 10px;cursor:pointer}',

      /* ---- 購物車抽屜：標題與清單 ---- */
      '.drawer header.container{padding:12px 16px}',
      '.drawer .brand b{font-size:16px}',
      '.drawer .list{padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto}',

      /* ---- 金額小計區 ---- */
      '.summary{margin-top:auto;padding:16px;border-top:1px solid #1f2430;background:#0b0f17}',
      '.summary .row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:14px;color:#cfd3dc}',
      '.summary .row b{font-size:15px;color:#e6e9ef}',
      '.summary .row.total{border-top:1px dashed #283042;margin-top:6px;padding-top:10px;font-weight:700;color:#fff}',

      /* ---- 表單 ---- */
      '.form{display:grid;gap:12px;margin-top:12px}',
      '.field{display:grid;gap:6px}',
      '.field label{font-size:12px;color:#8a94a7}',
      '.input{width:100%;padding:10px 12px;border:1px solid #2b3342;border-radius:10px;background:#0f1320;color:#e6e9ef}',
      '.input::placeholder{color:#6b7280}',
      '.input:focus{outline:none;border-color:#5eead4;box-shadow:0 0 0 3px rgba(94,234,212,.12)}',

      /* ---- 配送方式單選、選店 ---- */
      '.qty{display:flex;gap:12px;align-items:center;flex-wrap:wrap}',
      '.qty label{display:inline-flex;align-items:center;gap:6px;color:#c7cede;font-size:13px}',
      '.summary #familyFields .btn, .summary #sevenFields .btn{padding:8px 12px;border-radius:10px}',

      /* ---- 結帳主按鈕 ---- */
      '#checkout{width:100%;padding:12px 16px;border-radius:12px;font-weight:700}',
      '#checkout:disabled{opacity:.5;cursor:not-allowed}',

      /* ---- 空車提示對齊 ---- */
      '#cartList p.muted{margin:4px 0 8px}'
    ].join('');
    var style = d.createElement('style');
    style.textContent = css;
    d.head.appendChild(style);
  })();

  // 頁首「小提醒」IIFE（與 LOGO 對齊：外層套 .container，內層直向排版＋eta chip）
  (function attachPreorderBanner(){
    if (!w.PREORDER_MODE && !w.REQUIRE_PREORDER_CHECKBOX) return; // 沒啟用就跳過

    // 外層：與 LOGO 一樣寬度對齊
    var wrap = d.createElement('div');
    wrap.className = 'container';

    // 內層：視覺面板
    var panel = d.createElement('section');
    panel.style.cssText = 'background:#141821;padding:14px 16px;border-radius:14px;margin:12px 0;color:#e6e9ef;line-height:1.6';

    var eta = w.PREORDER_MODE ? (w.preorderRangeToday(w.LEAD_DAYS_MIN, w.LEAD_DAYS_MAX)) : '';

    panel.innerHTML =
  '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<strong style="color:#fff;font-size:15px">小提醒</strong>' +
      (w.PREORDER_MODE ? '<span class="chip small active" style="pointer-events:none">預計出貨：' + eta + '</span>' : '') +
    '</div>' +
    // 三句話放在同一個直向容器，gap 控制間距 → 格式完全一致
    '<div style="font-size:13px;color:#cfd3dc;line-height:1.7;display:flex;flex-direction:column;gap:4px">' +
      (w.PREORDER_MODE
        ? '<div>※ 本官網採 <b style="color:#fff">預購</b> 模式，下單後約需 ' + w.LEAD_DAYS_MIN + '–' + w.LEAD_DAYS_MAX + ' 個<b style="color:#fff">工作天</b>出貨；若遇延遲將主動通知，並可退款或更換。</div>'
        : ''
      ) +
      '<div>※ 本店商品同步於多平台販售，庫存以實際出貨為準。</div>' +
      '<div>※ 完成付款後信件可能延遲，請檢查垃圾信或「促銷」分類。</div>' +
    '</div>' +
  '</div>';

    wrap.appendChild(panel);

    // 插入位置：緊接在 header 後面
    var header = d.querySelector('header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(wrap, header.nextSibling);
    } else {
      d.body.insertBefore(wrap, d.body.firstChild);
    }
  })();

  // 年份
  (function(){ var y = $('#year'); if (y) y.textContent = new Date().getFullYear(); })();

})(window, document);
