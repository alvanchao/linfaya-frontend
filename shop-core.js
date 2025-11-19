// shop-core.js — LINFAYA
// - 分類含 customerize（客製化）；FLOW 只在該分頁顯示（由 #customFlow 控制）
// - 一般商品：顏色/尺寸/數量 chips；缺貨規格（disabled）；同規格加入時合併
// - CUSTOM01：需輸入認證碼(LFY###) + 份數；不一致不得加入；即時驗證＋紅字提示＋鎖定按鈕
// - 購物車內若改到不一致，結帳按鈕會被禁用；checkout 再次把關
// - 運費：宅配 80、超取 60、滿額免運（與 checkout-and-shipping.js 一致）
// - 不自動開購物車，只有按右上角才開
// - 影片縮圖：若商品有 youtubeId，會在縮圖列最後多一顆；點擊後主圖切成 iframe 播放

document.addEventListener('DOMContentLoaded', function () {
  var w = window;

  // 安全的格式化與提示
  var fmt   = w.fmt   ? w.fmt   : function(n){ return 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW'); };
  var toast = w.toast ? w.toast : function(msg){ try{console.log('[toast]',msg);}catch(_){ alert(msg); } };

  // ===== DOM 參照 =====
  var cats       = document.getElementById('cats');
  var grid       = document.getElementById('grid');
  var pager      = document.getElementById('pager');
  var infoText   = document.getElementById('infoText');
  var cartList   = document.getElementById('cartList');
  var cartCount  = document.getElementById('cartCount');
  var subtotalEl = document.getElementById('subtotal');
  var shippingEl = document.getElementById('shipping');
  var grandEl    = document.getElementById('grand');
  var drawer     = document.getElementById('drawer');
  var flowBox    = document.getElementById('customFlow');
  if (!grid) return;

  // ===== 設定 =====
  var PAGE_SIZE = w.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = w.FREE_SHIP_THRESHOLD || 1000;
  var MAX_QTY_PER_ITEM = w.MAX_QTY_PER_ITEM || 5;

  // 兼容 window.PRODUCTS 或檔案內宣告的 PRODUCTS
  var products = (function () {
    try {
      if (Array.isArray(window.PRODUCTS)) return window.PRODUCTS;
      if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) return PRODUCTS;
    } catch (_) {}
    return [];
  })();

  var CAT_ORDER = ['new','all','tops','bottoms','accessories','shoes','customerize'];

  // 狀態
  var currentCat = 'all';
  var currentPage = 1;
  var cart = (function(){
    try{
      var saved = sessionStorage.getItem('cart');
      if (saved) return JSON.parse(saved);
    }catch(_){}
    return [];
  })();

  // ===== 工具：custom 認證碼處理 =====
  function isCustomId(id){ return String(id||'').toLowerCase() === 'custom01'; }

  function parseCustomCode(code){
    var s = String(code||'').trim().toUpperCase();
    var m = s.match(/^LFY(\d{2,})$/);
    if (!m) return null;
    var amount = Number(m[1]||0);
    if (!amount || isNaN(amount)) return null;
    var unitsExpected = Math.round(amount / 10);
    if (unitsExpected <= 0) return null;
    return { code: 'LFY' + m[1], amount: amount, unitsExpected: unitsExpected };
  }

  function hasCustomMismatch(list){
    for (var i=0;i<list.length;i++){
      var it = list[i];
      if (isCustomId(it.id) && it.customCode){
        var p = parseCustomCode(it.customCode);
        if (!p || Number(it.qty||0) !== Number(p.unitsExpected||0)) return true;
      }
    }
    return false;
  }

  function updateBadge(){ if (cartCount) cartCount.textContent = String(cart.length); }

  function saveCart(){
    try{ sessionStorage.setItem('cart', JSON.stringify(cart)); }catch(_){}
    updateBadge();
    updateSummary();
    w.updatePayButtonState && w.updatePayButtonState();
  }

  function getShipOpt(){
    try{
      var home = document.getElementById('shipHome');
      var cvs  = document.getElementById('shipCVS');
      if (home && home.checked) return 'home';
      if (cvs  && cvs.checked)  return 'cvs';
    }catch(_){}
    return 'home';
  }

  function computeShipFee(subtotal){
    if (subtotal <= 0) return 0;
    if (subtotal >= FREE_SHIP_THRESHOLD) return 0;
    var opt = getShipOpt();
    return (opt === 'home') ? 80 : 60; // 與 checkout-and-shipping.js 一致
  }

  function capFor(p, color, size){
    var cap = MAX_QTY_PER_ITEM;
    var key = (color||'')+'-'+(size||'');
    if (p.stockMap && (key in p.stockMap)) cap = Math.min(cap, Number(p.stockMap[key]||0));
    return cap;
  }

  // 讓結帳按鈕在客製化不符時自動禁用（給結帳頁也可共用）
  w.updatePayButtonState = function(){
    var list = [];
    try{ list = JSON.parse(sessionStorage.getItem('cart')||'[]'); }catch(_){}
    var blocked = hasCustomMismatch(list);
    var btn = document.getElementById('checkout');
    if (btn){
      btn.disabled = !!blocked;
      btn.style.opacity = blocked ? '0.6' : '';
      btn.title = blocked ? '客製化認證碼與份數不一致，請修正後才能結帳。' : '';
    }
    var noteId = 'custom-mismatch-note';
    var wrap = document.querySelector('.summary');
    var exist = document.getElementById(noteId);
    if (blocked){
      if (!exist && wrap){
        var div = document.createElement('div');
        div.id = noteId;
        div.style.cssText = 'color:#f87171;font-size:12px;margin:8px 0';
        div.textContent = '⚠ 客製化認證碼與份數不一致，請修正後才能結帳。';
        wrap.insertBefore(div, document.getElementById('checkout'));
      }
    }else{
      if (exist) exist.remove();
    }
  };

  function updateSummary(){
    var subtotal = 0;
    for (var i=0;i<cart.length;i++){
      subtotal += Number(cart[i].price||0) * Number(cart[i].qty||0);
    }
    var shipFee = computeShipFee(subtotal);
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (shippingEl) shippingEl.textContent = fmt(shipFee);
    if (grandEl) grandEl.textContent = fmt(subtotal + shipFee);
    w.updatePayButtonState && w.updatePayButtonState();
  }

  // ===== NEW 判斷 =====
  function isNew(p){
    if (!p) return false;
    if (p.isNew) return true;
    if (p.newUntil){
      var today = new Date();
      var y = today.getFullYear();
      var m = String(today.getMonth()+1).padStart(2,'0');
      var d = String(today.getDate()).padStart(2,'0');
      var todayStr = y + '-' + m + '-' + d;
      return String(p.newUntil) >= todayStr;
    }
    return false;
  }

  function updateCustomFlowVisibility(show){
    if (!flowBox) return;
    flowBox.style.display = show ? 'block' : 'none';
  }

  // ===== chips 依選項刷新 =====
  function refreshQtyChips(card, p){
    var colorBtn = card.querySelector('.color-group .chip.active');
    var sizeBtn  = card.querySelector('.size-group  .chip.active');
    var color = colorBtn ? colorBtn.dataset.val : ((p.colors&&p.colors[0])||'');
    var size  = sizeBtn  ? sizeBtn.dataset.val  : ((p.sizes &&p.sizes[0]) ||'');
    var cap   = capFor(p, color, size);
    var wrap  = card.querySelector('.qty-group');
    if (!wrap) return;

    var act = wrap.querySelector('.chip.active');
    var cur = act ? Number(act.dataset.val||1) : 1;
    if (cur > cap) cur = cap || 1;

    var html = '';
    if (cap <= 0){
      html = '<span class="muted oos-note">此規格暫時缺貨</span>';
    }else{
      html = '<div class="chips">' +
        Array.from({length:cap}, function(_,i){
          var v = i+1;
          var cls = 'chip small' + (v===cur?' active':'');
          return '<button class="'+cls+'" data-type="qty" data-val="'+v+'">'+v+'</button>';
        }).join('') +
      '</div>';
    }
    wrap.innerHTML = html;
  }

  function refreshSizeChips(card, p){
    var colorBtn = card.querySelector('.color-group .chip.active');
    var color = colorBtn ? colorBtn.dataset.val : ((p.colors&&p.colors[0])||'');
    var sizeBtns = card.querySelectorAll('.size-group .chip');
    for (var i=0;i<sizeBtns.length;i++){
      var btn = sizeBtns[i];
      var s = btn.dataset.val;
      var cap = capFor(p, color, s);
      if (cap <= 0){
        btn.classList.add('disabled');
        btn.setAttribute('disabled','disabled');
      }else{
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
      }
    }
    var act = card.querySelector('.size-group .chip.active');
    if (act && act.classList.contains('disabled')){
      act.classList.remove('active');
      var firstOk = card.querySelector('.size-group .chip:not(.disabled)');
      if (firstOk) firstOk.classList.add('active');
    }
    refreshQtyChips(card, p);
  }

  // ===== custom 即時驗證 =====
  function validateCustomCard(card){
    if (!card) return { ok:false, message:'請輸入認證碼與份數' };
    var codeInput  = card.querySelector('.code-input');
    var unitsInput = card.querySelector('.units-input');
    var help       = card.querySelector('[data-role="custom-help"]');
    var btnAdd     = card.querySelector('.btn.pri.add');

    var code  = codeInput  ? String(codeInput.value||'').toUpperCase().trim() : '';
    var units = unitsInput ? Number(unitsInput.value||0) : 0;

    var p = parseCustomCode(code);
    var ok = !!(p && units>0 && units === p.unitsExpected);

    if (help){
      if (!code && !units){
        help.style.display = 'none';
        help.textContent = '';
      }else if (!p){
        help.style.display = 'block';
        help.textContent = '認證碼格式需為 LFY+金額（例如：LFY550）';
      }else if (!units){
        help.style.display = 'block';
        help.textContent = '請輸入份數（1份=10元）';
      }else if (units !== p.unitsExpected){
        help.style.display = 'block';
        help.textContent = '份數需為金額 ÷ 10，例如金額為 ' + p.amount + '，份數需為 ' + p.unitsExpected + ' 份。';
      }else{
        help.style.display = 'none';
        help.textContent = '';
      }
    }

    if (btnAdd){
      btnAdd.disabled = !ok;
      btnAdd.style.opacity = ok ? '' : '0.6';
    }

    return {
      ok: ok,
      code: p ? p.code : '',
      units: units,
      expected: p ? p.unitsExpected : 0,
      message: (!ok && help && help.textContent) ? help.textContent : '請確認認證碼與份數'
    };
  }

  // ===== 商品渲染（主圖 3/4；縮圖 1/1；影片縮圖可切換成 iframe）=====
  function renderProducts(cat, page){
    grid.innerHTML = '';

    var list;
    if (cat === 'all'){
      list = products;
    } else if (cat === 'new'){
      list = products.filter(isNew);
    } else {
      list = products.filter(function(p){ return p.cat === cat; });
    }

    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    // 只在 customerize 分頁顯示 FLOW
    updateCustomFlowVisibility(cat === 'customerize');

    slice.forEach(function(p){
      var isCustom = isCustomId(p.id);
      var html = '';

      if (!isCustom) {
        var firstColor = (p.colors && p.colors[0]) || '';

        // 1) 主圖：預設第一張圖片（之後會被縮圖點擊覆蓋為 <img> 或 <iframe>）
        var mainImgHTML =
          '<div class="main-img">' +
            '<img src="' + (p.imgs && p.imgs[0] ? p.imgs[0] : '') + '" alt="' + (p.name||'') + '">' +
          '</div>';

        // 2) 縮圖列：所有商品圖 +（可選）影片縮圖
        var thumbsHTML =
          '<div class="thumbs">' +
            (p.imgs||[]).map(function(img,i){
              return '<img src="' + img + '" data-type="img" data-main="' + img + '" ' +
                       (i===0?'class="active"':'') + ' />';
            }).join('') +
            (p.youtubeId
              ? '<img src="https://img.youtube.com/vi/' + p.youtubeId + '/hqdefault.jpg" ' +
                  'data-type="youtube" data-main="' + p.youtubeId + '" alt="video-thumb" />'
              : ''
            ) +
          '</div>';

        // 3) 決定按鈕（一般購買 vs 僅展示）
        var btnHTML;
        if (p.noOnlineOrder){
          btnHTML =
            '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
              '<button class="btn" disabled ' +
                'style="opacity:.6;cursor:not-allowed;flex:1">此商品僅展示，請私訊或現場討論後下單</button>' +
            '</div>';
        } else {
          btnHTML =
            '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
              '<button class="btn pri add">加入購物車</button>' +
            '</div>';
        }

        // 4) 主體卡片 HTML
        html =
          '<div class="product" data-id="' + p.id + '">' +
            '<div class="imgbox">' + (isNew(p) ? '<span class="badge-new">NEW</span>' : '') +
              mainImgHTML +
              thumbsHTML +
            '</div>' +
            '<div class="body">' +
              '<div><b>' + p.name + '</b></div>' +
              '<div class="muted">分類：' + p.cat + ' | 價格：' + fmt(p.price) + '</div>' +

              '<div style="margin-top:6px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
                '<div class="chips color-group">' +
                  (p.colors||[]).map(function(c,i){
                    return '<button class="chip' + (i===0?' active':'') +
                           '" data-type="color" data-val="' + c + '">' + c + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +

              '<div style="margin-top:8px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
                '<div class="chips size-group"></div>' +
              '</div>' +

              '<div style="margin-top:8px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">數量</div>' +
                '<div class="chips qty-group"></div>' +
              '</div>' +

              btnHTML +
            '</div>' +
          '</div>';

        // 尺寸 chips（依 cap）
        html = html.replace(
          '<div class="chips size-group"></div>',
          '<div class="chips size-group">' +
            (p.sizes||[]).map(function(s,i){
              var cap = capFor(p, firstColor, s);
              var enabled = cap > 0;
              var cls = enabled ? ('class="chip' + (i===0?' active':'') + '"') : 'class="chip disabled" disabled';
              return '<button ' + cls + ' data-type="size" data-val="' + s + '">' + s + '</button>';
            }).join('') +
          '</div>'
        );

      } else {
        // 客製化卡片（無影片縮圖）
        var priceText = '每份 ' + fmt(p.price || 10);
        html =
          '<div class="product" data-id="' + p.id + '">' +
            '<div class="imgbox">' + (isNew(p) ? '<span class="badge-new">NEW</span>' : '') +
              '<div class="main-img"><img src="' + p.imgs[0] + '" alt="' + (p.name||'客製化') + '"></div>' +
              '<div class="thumbs">' +
                (p.imgs||[]).map(function(img,i){
                  return '<img src="' + img + '" data-type="img" data-main="' + img + '" ' +
                           (i===0?'class="active"':'') + ' />';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="body">' +
              '<div><b>' + (p.name || '客製化修改（每份10元）') + '</b></div>' +
              '<div class="muted">分類：' + (p.cat || 'customerize') + ' | 價格：' + priceText + '</div>' +

              '<div style="margin-top:8px;display:grid;gap:8px">' +
                '<div>' +
                  '<div class="muted" style="font-size:12px;margin-bottom:6px">認證碼</div>' +
                  '<input class="input code-input" placeholder="請輸入認證碼（例：LFY550）" autocomplete="off">' +
                '</div>' +
                '<div>' +
                  '<div class="muted" style="font-size:12px;margin-bottom:6px">份數（每份 NT$' + (p.price||10) + '）</div>' +
                  '<input class="input units-input" type="number" min="1" step="1" placeholder="請輸入份數" inputmode="numeric" pattern="\\d*">' +
                '</div>' +
                '<div class="muted" data-role="custom-help" style="display:none;color:#f87171;font-size:12px"></div>' +
              '</div>' +

              '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
                '<button class="btn pri add" disabled style="opacity:.6">加入購物車</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      grid.insertAdjacentHTML('beforeend', html);
    });

    infoText && (infoText.textContent = '共 ' + list.length + ' 件');
    renderPager(pager, list.length, page);

    // 渲染後：縮圖預設第一張、chips 初始化、客製化驗證
    var cards = grid.querySelectorAll('.product');
    for (var i=0;i<cards.length;i++){
      var card = cards[i];
      var id = card.dataset.id;
      var p = products.find(function(x){return x.id===id;});

      // 主圖對齊第一張圖片
      var thumbs = card.querySelectorAll('.thumbs img[data-type="img"]');
      if (thumbs && thumbs[0]){
        var mainBox = card.querySelector('.main-img');
        mainBox.innerHTML = '<img src="' + (thumbs[0].dataset.main || thumbs[0].src) + '">';
        var allThumbs = card.querySelectorAll('.thumbs img');
        for (var j=0;j<allThumbs.length;j++) allThumbs[j].classList.remove('active');
        thumbs[0].classList.add('active');
      }

      if (p && !isCustomId(p.id)) {
        // 一般商品：補上尺寸／數量 chips
        refreshSizeChips(card, p); // 內部會呼叫 refreshQtyChips
      } else {
        // 客製化：掛上即時驗證
        var codeInput  = card.querySelector('.code-input');
        var unitsInput = card.querySelector('.units-input');
        var handler = function(){ validateCustomCard(card); };
        if (codeInput)  codeInput.addEventListener('input', handler);
        if (unitsInput) unitsInput.addEventListener('input', handler);
        validateCustomCard(card);
      }
    }
  }

  function renderPager(mount, total, page){
    if (!mount) return;
    mount.innerHTML = '';
    var pages = Math.ceil(total / PAGE_SIZE) || 1;
    for (var i=1;i<=pages;i++){
      var btn = document.createElement('button');
      btn.className = 'page-btn' + (i===page?' active':'');
      btn.textContent = i;
      (function(i0){
        btn.addEventListener('click', function(){
          currentPage = i0;
          renderProducts(currentCat, currentPage);
          try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){ }
        });
      })(i);
      mount.appendChild(btn);
    }
  }

  // ===== 分類 chip 事件 =====
  if (cats){
    cats.addEventListener('click', function(e){
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      var btn = t.closest('button[data-cat]');
      if (!btn) return;
      var c = btn.dataset.cat || 'all';
      currentCat = c;
      currentPage = 1;

      var all = cats.querySelectorAll('button[data-cat]');
      for (var i=0;i<all.length;i++){
        all[i].classList.remove('active');
      }
      btn.classList.add('active');

      renderProducts(currentCat, currentPage);
      try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){ }
    });

    // 預設：new -> all -> 第一個有資料的
    (function initCatButtons(){
      var firstCat = 'new';
      var haveNew = products.some(isNew);
      if (!haveNew) firstCat = 'all';
      if (!products.length) firstCat = 'all';

      var btns = cats.querySelectorAll('button[data-cat]');
      var found = false;
      for (var i=0;i<btns.length;i++){
        var b = btns[i];
        if (b.dataset.cat === firstCat){
          b.classList.add('active');
          found = true;
        }else{
          b.classList.remove('active');
        }
      }
      if (!found && btns[0]) btns[0].classList.add('active');

      currentCat = firstCat;
      currentPage = 1;
      renderProducts(currentCat, currentPage);
    })();
  }else{
    renderProducts(currentCat, currentPage);
  }

  // ===== 縮圖 / chips / 加入購物車 =====
  grid.addEventListener('click', function(e){
    var t = e.target;
    if (!(t instanceof HTMLElement)) return;

    // 縮圖切換（含影片縮圖）
    if (t.matches('.thumbs img')){
      var imgbox  = t.closest('.imgbox');
      var mainBox = imgbox.querySelector('.main-img');
      var all     = t.parentElement.querySelectorAll('img');
      for (var i=0;i<all.length;i++) all[i].classList.remove('active');
      t.classList.add('active');

      var type = t.dataset.type || 'img';
      var main = t.dataset.main || t.src;

      if (type === 'youtube'){
        // 直接自動播放（為相容自動播放，預設靜音）
        mainBox.innerHTML =
          '<iframe width="100%" height="315" ' +
          'src="https://www.youtube.com/embed/' + main + '?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1" ' +
          'title="試穿影片" frameborder="0" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
          'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
      }else{
        mainBox.innerHTML = '<img src="' + main + '">';
      }
      return;
    }

    // 找到 card + 對應商品
    var card = t.closest('.product');
    if (!card) return;
    var pid = card.dataset.id;
    var p = products.find(function(x){ return x.id === pid; });

    // chips：顏色 / 尺寸 / 數量
    if (t.classList.contains('chip')){
      var type = t.dataset.type;
      if (type === 'color'){
        var group = card.querySelectorAll('.color-group .chip');
        for (var i=0;i<group.length;i++) group[i].classList.remove('active');
        t.classList.add('active');
        if (p && !isCustomId(p.id)){
          refreshSizeChips(card, p);
        }
      }else if (type === 'size'){
        if (t.classList.contains('disabled')) return;
        var group2 = card.querySelectorAll('.size-group .chip');
        for (var j=0;j<group2.length;j++) group2[j].classList.remove('active');
        t.classList.add('active');
        if (p && !isCustomId(p.id)){
          refreshQtyChips(card, p);
        }
      }else if (type === 'qty'){
        var group3 = card.querySelectorAll('.qty-group .chip');
        for (var k=0;k<group3.length;k++) group3[k].classList.remove('active');
        t.classList.add('active');
      }
      return;
    }

    // 加入購物車
    if (t.classList.contains('add')){
      if (p && isCustomId(p.id)){
        var check = validateCustomCard(card);
        if (!check.ok){ toast(check.message); return; }

        var item = {
          id: p.id,
          name: p.name || '客製化修改（每份 10 元）',
          img: (p.imgs && p.imgs[0]) || '',
          price: p.price || 10,
          qty: check.units,
          customCode: check.code,
          customMismatch: false
        };
        cart.push(item);
        saveCart();
        toast('已加入客製化項目');
        return;
      }

      if (!p) return;

      // 檢查是否 noOnlineOrder（理論上不會進來，因為 button 沒有 .add）
      if (p.noOnlineOrder){
        toast('此商品僅展示，請私訊或現場討論後下單');
        return;
      }

      var colorBtn = card.querySelector('.color-group .chip.active');
      var sizeBtn  = card.querySelector('.size-group  .chip.active');
      var qtyBtn   = card.querySelector('.qty-group  .chip.active');

      var color = colorBtn ? colorBtn.dataset.val : ((p.colors&&p.colors[0])||'');
      var size  = sizeBtn  ? sizeBtn.dataset.val  : ((p.sizes &&p.sizes[0]) ||'');
      var qty   = qtyBtn   ? Number(qtyBtn.dataset.val||1) : 1;

      if (!size){
        toast('請先選擇尺寸');
        return;
      }

      var cap = capFor(p, color, size);
      if (cap <= 0){
        toast('此規格暫時缺貨');
        return;
      }
      if (qty > cap){
        toast('此規格目前最多可購買 ' + cap + ' 件');
        return;
      }

      // 檢查購物車內同款同色同尺碼是否已存在
      var existing = cart.find(function(it){
        return it.id === p.id && it.color === color && it.size === size && !isCustomId(it.id);
      });
      if (existing){
        var newQty = existing.qty + qty;
        if (newQty > cap){
          toast('此規格目前最多可購買 ' + cap + ' 件');
          return;
        }
        existing.qty = newQty;
      }else{
        cart.push({
          id: p.id,
          name: p.name,
          img: (p.imgs && p.imgs[0]) || '',
          price: p.price,
          qty: qty,
          color: color,
          size: size
        });
      }

      saveCart();
      toast('已加入購物車');
      return;
    }
  });

  // 購物車操作（加、減、刪）
  if (cartList){
    cartList.addEventListener('click', function(e){
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;

      if (t.classList.contains('inc')){
        var i1 = Number(t.dataset.idx); var it = cart[i1]; if (!it) return;
        if (isCustomId(it.id)){
          it.qty = (it.qty||1) + 1;
          var p1 = parseCustomCode(it.customCode);
          if (p1){
            if (it.qty !== p1.unitsExpected){
              it.customMismatch = true;
            }else{
              it.customMismatch = false;
            }
          }
        }else{
          if (it.qty < MAX_QTY_PER_ITEM){
            it.qty++;
          }
        }
        saveCart();
        renderCart();
      }

      if (t.classList.contains('dec')){
        var i2 = Number(t.dataset.idx); var it2 = cart[i2]; if (!it2) return;
        it2.qty = (it2.qty||1) - 1;
        if (it2.qty <= 0){
          cart.splice(i2,1);
        }else{
          if (isCustomId(it2.id)){
            var p2 = parseCustomCode(it2.customCode);
            if (p2){
              it2.customMismatch = (it2.qty !== p2.unitsExpected);
            }
          }
        }
        saveCart();
        renderCart();
      }

      if (t.classList.contains('remove')){
        var i3 = Number(t.dataset.idx);
        if (cart[i3]){
          cart.splice(i3,1);
          saveCart();
          renderCart();
        }
      }
    });
  }

  function renderCart(){
    if (!cartList) return;
    cartList.innerHTML = '';
    if (!cart.length){
      cartList.innerHTML = '<p class="muted">購物車目前是空的</p>';
      updateSummary();
      return;
    }

    cart.forEach(function(it, index){
      var attrs = [];
      if (it.color) attrs.push('顏色：'+it.color);
      if (it.size)  attrs.push('尺寸：'+it.size);
      if (isCustomId(it.id) && it.customCode){
        attrs.push('認證碼：'+it.customCode);
      }

      var warn = '';
      if (isCustomId(it.id) && it.customMismatch){
        warn = '<div class="oos-note">⚠ 份數與認證碼金額不一致，請調整數量或重新輸入。</div>';
      }

      var html =
        '<div class="cart-card">' +
          '<div class="thumb"><img src="' + (it.img||'') + '" alt=""></div>' +
          '<div>' +
            '<div><b>' + (it.name||'') + '</b></div>' +
            (attrs.length ? '<div class="cart-attr">' + attrs.join(' | ') + '</div>' : '') +
            warn +
            '<div class="cart-actions">' +
              '<button class="chip small dec" data-idx="'+index+'">-</button>' +
              '<span>× ' + it.qty + '</span>' +
              '<button class="chip small inc" data-idx="'+index+'">+</button>' +
              '<button class="link-danger remove" data-idx="'+index+'">移除</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-right">' +
            '<div>' + fmt(it.price * it.qty) + '</div>' +
          '</div>' +
        '</div>';

      cartList.insertAdjacentHTML('beforeend', html);
    });

    updateSummary();
  }

  // ===== 抽屜開關 =====
  (function setupDrawer(){
    var btnCart = document.getElementById('btnCart');
    var btnClose = document.getElementById('drawerClose');
    if (!drawer) return;

    function openDrawer(){
      drawer.classList.add('open');
    }
    function closeDrawer(){
      drawer.classList.remove('open');
    }

    if (btnCart){
      btnCart.addEventListener('click', function(){
        renderCart();
        openDrawer();
      });
    }

    if (btnClose){
      btnClose.addEventListener('click', function(){
        closeDrawer();
      });
    }

    drawer.addEventListener('click', function(e){
      if (e.target === drawer){
        closeDrawer();
      }
    });
  })();

  // 初始載入
  updateBadge();
  renderCart();
  w.updatePayButtonState && w.updatePayButtonState();
});
