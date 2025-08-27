// shop-core.js — LINFAYA
// - 分類含 customerize（客製化）；FLOW 只在該分頁顯示（由 #customFlow 控制）
// - 一般商品：顏色/尺寸/數量 chips；缺貨規格（disabled）；同規格加入時合併
// - CUSTOM01：需輸入認證碼(LFY###) + 份數；不一致不得加入；即時驗證＋紅字提示＋鎖定按鈕
// - 購物車內若改到不一致，結帳按鈕會被禁用；checkout 再次把關
// - 運費：宅配 80、超取 60、滿額免運（與 checkout-and-shipping.js 一致）
// - 不自動開購物車，只有按右上角才開

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
    } catch (e) {}
    return [];
  })();

  // 分類顯示名稱與排序（中文）
  var CAT_LABELS = {
    all: '全部',
    tops: '上著',
    bottoms: '下著',
    accessories: '飾品',
    shoes: '鞋',
    customerize: '客製化'
  };
  var CAT_ORDER = ['all','tops','bottoms','accessories','shoes','customerize'];

  // ===== 工具 =====
  function isCustomId(id){ return String(id||'').toLowerCase() === 'custom01'; }

  function parseCustomCode(code){
    if (!code) return null;
    var m = String(code).trim().toUpperCase().match(/^LFY(\d{1,6})$/);
    if (!m) return null;
    var amount = parseInt(m[1], 10);
    var unitsExpected = Math.round(amount / 10); // 每份 10 元
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
  function saveCart(){ try { sessionStorage.setItem('cart', JSON.stringify(cart)); } catch(_) {} updateBadge(); }

  function getShipOpt(){
    var chk = document.querySelector('input[name="ship"]:checked');
    if (chk && chk.value) return chk.value;
    try{ var s = sessionStorage.getItem('SHIP_OPT'); if (s) return s; }catch(_){}
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

  // ===== 狀態 =====
  var currentCat = 'all';
  var currentPage = 1;

  // ===== 分類分頁 =====
  function renderCats(){
    if (!cats) return;
    var available = Array.from(new Set(products.map(function(p){return p.cat;})));
    var arr = CAT_ORDER.filter(function(c){ return c==='all' || available.indexOf(c) >= 0; });
    cats.innerHTML = '';
    arr.forEach(function(c){
      var b = document.createElement('button');
      b.className = 'tab' + (c===currentCat?' active':'');
      b.dataset.cat = c;
      b.textContent = CAT_LABELS[c] || c;
      b.addEventListener('click', function(){
        currentCat = c; currentPage = 1;
        cats.querySelectorAll('.tab').forEach(function(x){ x.classList.toggle('active', x.dataset.cat===c); });
        renderProducts(currentCat, currentPage);
        try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
      });
      cats.appendChild(b);
    });
  }

  // ===== 顯示/隱藏客製化 FLOW 卡 =====
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
    var current = act ? Number(act.dataset.val) : 1;
    var maxShow = Math.max(1, Math.min(MAX_QTY_PER_ITEM, cap));
    var html = '';
    for (var i=1;i<=maxShow;i++){
      html += '<button class="chip'+(i===Math.min(current,maxShow)?' active':'')+'" data-type="qty" data-val="'+i+'">'+i+'</button>';
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

  // ====== custom 即時驗證 ======
  function validateCustomCard(card){
    if (!card) return { ok:false, message:'請輸入認證碼與份數' };
    var codeInput  = card.querySelector('.code-input');
    var unitsInput = card.querySelector('.units-input');
    var addBtn     = card.querySelector('.btn.add');
    var help       = card.querySelector('[data-role="custom-help"]');

    var code  = codeInput ? String(codeInput.value||'').trim() : '';
    var units = Math.max(1, Number(unitsInput ? unitsInput.value : 1) || 1);

    var parsed = parseCustomCode(code);
    var msg = '';
    var ok  = false;

    if (!parsed){
      msg = '請輸入正確的認證碼（格式：LFY後接金額，如 LFY550）。';
    }else if (units !== parsed.unitsExpected){
      msg = '認證碼金額對應份數應為 ' + parsed.unitsExpected + ' 份，請修正。';
    }else{
      ok = true;
    }

    if (help){
      help.textContent = ok ? '' : ('⚠ ' + msg);
      help.style.display = ok ? 'none' : 'block';
    }
    if (addBtn){
      addBtn.disabled = !ok;
      addBtn.style.opacity = ok ? '' : '0.6';
    }
    return { ok:ok, message:msg, code:parsed ? parsed.code : '', units:units };
  }

  // ===== 商品渲染 =====
  function renderProducts(cat, page){
    grid.innerHTML = '';

    var list = (cat==='all') ? products : products.filter(function(p){ return p.cat === cat; });
    var start = (page-1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    // 只在 customerize 分頁顯示 FLOW
    updateCustomFlowVisibility(cat === 'customerize');

    slice.forEach(function(p){
      var isCustom = isCustomId(p.id);
      var html = '';

      if (!isCustom) {
        var firstColor = (p.colors&&p.colors[0]) || '';
        html =
          '<div class="product" data-id="'+p.id+'">' +
            '<div class="imgbox">' +
              '<div class="main-img"><img src="'+p.imgs[0]+'" alt="'+p.name+'"></div>' +
              '<div class="thumbs">' +
                (p.imgs||[]).map(function(img,i){ return '<img src="'+img+'" data-main="'+img+'" '+(i===0?'class="active"':'')+' />'; }).join('') +
              '</div>' +
            '</div>' +
            '<div class="body">' +
              '<div><b>'+p.name+'</b></div>' +
              '<div class="muted">分類：'+p.cat+' | 價格：'+fmt(p.price)+'</div>' +

              '<div style="margin-top:6px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
                '<div class="chips color-group">' +
                  (p.colors||[]).map(function(c,i){ return '<button class="chip'+(i===0?' active':'')+'" data-type="color" data-val="'+c+'">'+c+'</button>'; }).join('') +
                '</div>' +
              '</div>' +

              '<div style="margin-top:8px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
                '<div class="chips size-group">' +
                  (p.sizes||[]).map(function(s,i){
                    var cap = capFor(p, firstColor, s);
                    var base = 'class="chip'+(i===0?' active':'')+'"';
                    return '<button '+(cap<=0? 'disabled class="chip disabled"':' '+base)+' data-type="size" data-val="'+s+'">'+s+'</button>';
                  }).join('') +
                '</div>' +
              '</div>' +

              '<div style="margin-top:8px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">數量</div>' +
                '<div class="chips qty-group"></div>' +
              '</div>' +

              '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
                '<button class="btn pri add">加入購物車</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      } else {
        var priceText = '每份 ' + fmt(p.price || 10);
        html =
          '<div class="product" data-id="'+p.id+'">' +
            '<div class="imgbox">' +
              '<div class="main-img"><img src="'+p.imgs[0]+'" alt="'+(p.name||'客製化')+'"></div>' +
              '<div class="thumbs">' +
                (p.imgs||[]).map(function(img,i){ return '<img src="'+img+'" data-main="'+img+'" '+(i===0?'class="active"':'')+' />'; }).join('') +
              '</div>' +
            '</div>' +
            '<div class="body">' +
              '<div><b>'+(p.name || '客製化修改（每份10元）')+'</b></div>' +
              '<div class="muted">分類：'+(p.cat || 'customerize')+' | 價格：'+priceText+'</div>' +

              '<div style="margin-top:8px;display:grid;gap:8px">' +
                '<div>' +
                  '<div class="muted" style="font-size:12px;margin-bottom:6px">認證碼</div>' +
                  '<input class="input code-input" placeholder="請輸入認證碼（例：LFY550）" autocomplete="off">' +
                '</div>' +
                '<div>' +
                  '<div class="muted" style="font-size:12px;margin-bottom:6px">份數（每份 NT$'+(p.price||10)+'）</div>' +
                  '<input class="input units-input" type="number" min="1" step="1" value="55" inputmode="numeric" pattern="\\d*">' +
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

    // 渲染後：縮圖預設第一張；一般商品刷新尺寸/數量 chips；客製化欄位綁定即時驗證
    var cards = grid.querySelectorAll('.product');
    for (var i=0;i<cards.length;i++){
      var card = cards[i];
      var id = card.dataset.id;
      var p = products.find(function(x){return x.id===id;});
      var thumbs = card.querySelectorAll('.thumbs img');
      if (thumbs && thumbs[0]){
        var main = card.querySelector('.main-img img');
        main.src = thumbs[0].dataset.main || thumbs[0].src;
        for (var j=0;j<thumbs.length;j++) thumbs[j].classList.toggle('active', j===0);
      }
      if (p && !isCustomId(p.id)) {
        refreshSizeChips(card, p);
      } else {
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
          try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
        });
      })(i);
      mount.appendChild(btn);
    }
  }

  // ===== 購物車 =====
  var cart = [];
  try{ cart = JSON.parse(sessionStorage.getItem('cart') || '[]'); }catch(_){ cart = []; }

  function updateCart(openDrawer){
    if (!cartList) return;
    cartList.innerHTML = '';
    var subtotal = 0;

    if (!cart.length){
      cartList.innerHTML = '<div class="empty">購物車是空的，去逛逛吧！</div>';
      if (subtotalEl) subtotalEl.textContent = fmt(0);
      if (shippingEl) shippingEl.textContent = fmt(0);
      if (grandEl) grandEl.textContent = fmt(0);
      updateBadge();
      saveCart();
      if (w.updatePayButtonState) w.updatePayButtonState();
      return;
    }

    for (var i=0;i<cart.length;i++){
      var item = cart[i];
      subtotal += (item.price||0) * (item.qty||1);

      var attrs = '';
      if (isCustomId(item.id) && item.customCode){
        var parsed = parseCustomCode(item.customCode);
        var mismatch = parsed ? (Number(item.qty||0) !== Number(parsed.unitsExpected||0)) : true;
        item.customMismatch = mismatch;
        attrs = '認證碼：' + item.customCode + '　份數：' + (item.qty||1) +
                (parsed ? '（應為 ' + parsed.unitsExpected + ' 份）' : '（格式錯誤）');
      } else {
        attrs = '顏色：' + (item.color||'-') + '　尺寸：' + (item.size||'-');
      }

      var warn = (item.customMismatch ? '<div style="color:#f87171;font-size:12px;margin-top:4px">⚠ 認證碼與份數不一致，請修正後才能結帳。</div>' : '');

      var row =
        '<div class="cart-card">' +
          '<img src="'+(item.img||'')+'" width="72" height="72" alt="">' +
          '<div>' +
            '<div>'+ (item.name||'') +'</div>' +
            '<div class="cart-attr">'+ attrs +'</div>' +
            '<div class="cart-actions">' +
              '<button class="btn small dec" data-idx="'+i+'">－</button>' +
              '<span>' + (item.qty||1) + '</span>' +
              '<button class="btn small inc" data-idx="'+i+'">＋</button>' +
              '<button class="link-danger del" data-idx="'+i+'">刪除</button>' +
            '</div>' +
            warn +
          </div>' +
          '<div class="cart-right">' + fmt((item.price||0)*(item.qty||1)) + '</div>' +
        '</div>';
      cartList.insertAdjacentHTML('beforeend', row);
    }

    var shipping = computeShipFee(subtotal);
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (shippingEl) shippingEl.textContent = fmt(shipping);
    if (grandEl)    grandEl.textContent    = fmt(subtotal + shipping);

    updateBadge();
    saveCart();
    if (w.updatePayButtonState) w.updatePayButtonState();
    if (openDrawer) drawer && drawer.classList.add('open');
  }

  // ===== 事件：商品列表（縮圖 / chips / 加入購物車）=====
  grid.addEventListener('click', function(e){
    var t = e.target;
    if (!(t instanceof HTMLElement)) return;

    // 縮圖切換
    if (t.matches('.thumbs img')){
      var main = t.closest('.imgbox').querySelector('.main-img img');
      var all = t.parentElement.querySelectorAll('img');
      for (var i=0;i<all.length;i++) all[i].classList.remove('active');
      t.classList.add('active');
      main.src = t.dataset.main || t.src;
      return;
    }

    var card = t.closest('.product'); if (!card) return;
    var id = card.dataset.id;
    var p  = products.find(function(x){return x.id===id;});

    // chips 切換
    var chip = t.closest('.chip[data-type]');
    if (chip && !chip.classList.contains('disabled')){
      var type = chip.dataset.type;
      var group = chip.closest('.chips');
      var allChips = group.querySelectorAll('.chip');
      for (var i=0;i<allChips.length;i++) allChips[i].classList.remove('active');
      chip.classList.add('active');
      if (p && !isCustomId(p.id)){
        if (type==='color') refreshSizeChips(card, p);
        if (type==='size')  refreshQtyChips(card, p);
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

        var merged = false;
        for (var i=0;i<cart.length;i++){
          var it = cart[i];
          if (isCustomId(it.id) && it.customCode === item.customCode){
            it.qty = (it.qty||0) + item.qty;
            merged = true; break;
          }
        }
        if (!merged) cart.push(item);

        toast('已加入購物車');
        updateCart(false);
        return;
      }

      // 一般商品
      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel  = card.querySelector('.size-group  .chip.active');
      var qtySel   = card.querySelector('.qty-group   .chip.active');
      var color = colorSel ? colorSel.dataset.val : ((p.colors&&p.colors[0])||'');
      var size  = sizeSel  ? sizeSel.dataset.val  : ((p.sizes &&p.sizes[0]) ||'');
      var qty   = Math.max(1, Number(qtySel ? qtySel.dataset.val : '1') || 1);

      var cap = capFor(p, color, size);
      if (cap <= 0){ toast('此規格目前缺貨'); return; }
      qty = Math.min(qty, cap);

      var item2 = { id:p.id, name:p.name, img:(p.imgs&&p.imgs[0])||'', price:p.price||0, color:color, size:size, qty:qty };

      var merged2 = false;
      for (var j=0;j<cart.length;j++){
        var it2 = cart[j];
        if (it2.id===item2.id && it2.color===item2.color && it2.size===item2.size){
          var next = (it2.qty||1) + qty;
          if (next > cap){ toast('此規格最多可購買 '+cap+' 件'); it2.qty = cap; }
          else { it2.qty = next; toast('已加入購物車'); }
          merged2 = true; break;
        }
      }
      if (!merged2){ cart.push(item2); toast('已加入購物車'); }

      updateCart(false);
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
          it.customMismatch = p1 ? (Number(it.qty||0) !== Number(p1.unitsExpected||0)) : true;
        }else{
          var prod  = products.find(function(x){return x.id===it.id;}) || {};
          var cap = capFor(prod, it.color, it.size);
          it.qty = Math.min(cap, (it.qty||1) + 1);
        }
        updateCart(false);
      }

      if (t.classList.contains('dec')){
        var i2 = Number(t.dataset.idx); var it2 = cart[i2]; if (!it2) return;
        it2.qty = Math.max(1, (it2.qty||1) - 1);
        if (isCustomId(it2.id)){
          var p2 = parseCustomCode(it2.customCode);
          it2.customMismatch = p2 ? (Number(it2.qty||0) !== Number(p2.unitsExpected||0)) : true;
        }
        updateCart(false);
      }

      if (t.classList.contains('del')){
        var i3 = Number(t.dataset.idx);
        cart.splice(i3, 1);
        updateCart(false);
      }
    });
  }

  // 開關購物車按鈕（不自動開）
  var openBtn  = document.getElementById('openCart');
  var closeBtn = document.getElementById('closeCart');
  if (openBtn)  openBtn.addEventListener('click', function(){ drawer && drawer.classList.add('open'); updateCart(false); });
  if (closeBtn) closeBtn.addEventListener('click', function(){ drawer && drawer.classList.remove('open'); });

  // 提供給外部（結帳頁會呼叫）
  w.renderCart  = function(){ updateCart(false); };
  w.updateBadge = updateBadge;

  // 監聽付款成功後的清空廣播（thankyou.html 會 set EC_CLEAR_CART）
  window.addEventListener('storage', function(e){
    if (e && e.key === 'EC_CLEAR_CART'){
      try{ sessionStorage.removeItem('cart'); }catch(_){}
      updateBadge();
      w.renderCart && w.renderCart();
    }
  });

  // ===== 初始化 =====
  renderCats();
  renderProducts('all', 1);
  updateCart(false);
});
