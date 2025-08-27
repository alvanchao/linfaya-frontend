// shop-core.js — 一般商品 + CUSTOM01(客製化)：認證碼+份數；不符則【不能加入購物車】且【禁止結帳】
// - 不自動開購物車（只有按右上角才開）
// - 分類切換時，圖片/縮圖會正確重設
// - 運費：宅配 80、超取 60、滿額免運（與 checkout-and-shipping.js 一致）
// - CUSTOM01：認證碼(LFY###) + 份數；不符不得加入；購物車內改成不符會禁用結帳

document.addEventListener('DOMContentLoaded', function () {
  var w = window;
  var fmt   = w.fmt   ? w.fmt   : function(n){ return 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW'); };
  var toast = w.toast ? w.toast : function(){};

  // DOM
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
  if (!grid) return;

  // 設定
  var PAGE_SIZE = w.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = w.FREE_SHIP_THRESHOLD || 1000;
  var MAX_QTY_PER_ITEM = w.MAX_QTY_PER_ITEM || 5;
  var products = Array.isArray(w.PRODUCTS) ? w.PRODUCTS : [];

  // 客製化商品 id（容忍大小寫）
  function isCustomId(id){ return String(id||'').toLowerCase() === 'custom01'; }

  // 載入購物車
  var cart = [];
  try { cart = JSON.parse(sessionStorage.getItem('cart') || '[]'); } catch(_) { cart = []; }

  var currentCat = 'all';
  var currentPage = 1;

  // ====== 工具 ======
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

  // ====== CUSTOM01 工具 ======
  function parseCustomCode(code){
    if (!code) return null;
    var m = String(code).trim().toUpperCase().match(/^LFY(\d{1,6})$/);
    if (!m) return null;
    var amount = parseInt(m[1], 10);            // e.g., 550
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

  // 暴露給 checkout 使用（checkout 會呼叫這個來更新按鈕狀態）
  w.updatePayButtonState = function(){
    var raw = [];
    try{ raw = JSON.parse(sessionStorage.getItem('cart')||'[]'); }catch(_){}
    var blocked = hasCustomMismatch(raw);
    var btn = document.getElementById('checkout');
    if (btn){
      btn.disabled = !!blocked;
      btn.style.opacity = blocked ? '0.6' : '';
      btn.title = blocked ? '客製化認證碼與份數不一致，請於購物車修正後才能結帳。' : '';
    }
    // 顯示總結處的阻擋提示
    var noteId = 'custom-mismatch-note';
    var wrap = document.querySelector('.summary');
    var exist = document.getElementById(noteId);
    if (blocked){
      if (!exist){
        var div = document.createElement('div');
        div.id = noteId;
        div.style.cssText = 'color:#f87171;font-size:12px;margin:8px 0';
        div.textContent = '⚠ 客製化認證碼與份數不一致，請修正後才能結帳。';
        wrap && wrap.insertBefore(div, document.getElementById('checkout'));
      }
    }else{
      if (exist) exist.remove();
    }
  };

  // ====== 分類分頁 ======
  function renderCats(){
    var ctn = document.getElementById('cats');
    if (!ctn) return;
    var set = new Set(products.map(p=>p.cat));
    var arr = ['all', ...Array.from(set)];
    ctn.innerHTML = '';
    arr.forEach(function(c){
      var b = document.createElement('button');
      b.className = 'tab' + (c===currentCat?' active':'');
      b.dataset.cat = c;
      b.textContent = (c==='all'?'全部':c);
      b.addEventListener('click', function(){
        currentCat = c; currentPage = 1;
        ctn.querySelectorAll('.tab').forEach(function(x){ x.classList.toggle('active', x.dataset.cat===c); });
        renderProducts(currentCat, currentPage);
        try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
      });
      ctn.appendChild(b);
    });
  }

  // ====== 庫存/上限（一般商品用） ======
  function capFor(p, color, size){
    var cap = MAX_QTY_PER_ITEM;
    var k = (color||'')+'-'+(size||'');
    if (p.stockMap && (k in p.stockMap)) cap = Math.min(cap, Number(p.stockMap[k]||0));
    return cap;
  }

  // ====== chips 依顏色/尺寸刷新（尺寸與數量） ======
  function refreshQtyChips(card, p){
    var color = (card.querySelector('.color-group .chip.active')||{}).dataset?.val || (p.colors&&p.colors[0]) || '';
    var size  = (card.querySelector('.size-group  .chip.active')||{}).dataset?.val  || (p.sizes && p.sizes[0]) || '';
    var cap   = capFor(p, color, size);
    var qtyWrap = card.querySelector('.qty-group');
    if (!qtyWrap) return;
    var current = Number((qtyWrap.querySelector('.chip.active')||{}).dataset?.val || 1);
    var maxShow = Math.max(1, Math.min(MAX_QTY_PER_ITEM, cap));
    var html = '';
    for (var i=1; i<=maxShow; i++){
      html += '<button class="chip'+(i===Math.min(current,maxShow)?' active':'')+'" data-type="qty" data-val="'+i+'">'+i+'</button>';
    }
    qtyWrap.innerHTML = html;
  }
  function refreshSizeChips(card, p){
    var color = (card.querySelector('.color-group .chip.active')||{}).dataset?.val || (p.colors&&p.colors[0]) || '';
    card.querySelectorAll('.size-group .chip').forEach(function(btn){
      var size = btn.dataset.val;
      var cap = capFor(p, color, size);
      if (cap <= 0){ btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); }
      else { btn.classList.remove('disabled'); btn.removeAttribute('disabled'); }
    });
    var act = card.querySelector('.size-group .chip.active');
    if (act && act.classList.contains('disabled')){
      act.classList.remove('active');
      var firstOk = card.querySelector('.size-group .chip:not(.disabled)');
      if (firstOk) firstOk.classList.add('active');
    }
    refreshQtyChips(card, p);
  }

  // ====== 商品渲染 ======
  function renderProducts(cat, page) {
    grid.innerHTML = '';

    var list = (cat === 'all') ? products : products.filter(function(p){ return p.cat === cat; });
    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    slice.forEach(function (p) {
      var isCustom = isCustomId(p.id);
      var html = '';

      if (!isCustom) {
        var firstColor = (p.colors&&p.colors[0]) || '';
        html =
          '<div class="product" data-id="' + p.id + '">' +
            '<div class="imgbox">' +
              '<div class="main-img"><img src="' + p.imgs[0] + '" alt="' + p.name + '"></div>' +
              '<div class="thumbs">' +
                p.imgs.map(function (img, i) {
                  return '<img src="' + img + '" data-main="' + img + '" ' + (i === 0 ? 'class="active"' : '') + ' />';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="body">' +
              '<div><b>' + p.name + '</b></div>' +
              '<div class="muted">分類：' + p.cat + ' | 價格：' + fmt(p.price) + '</div>' +

              '<div style="margin-top:6px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
                '<div class="chips color-group">' +
                  (p.colors||[]).map(function (c, i) {
                    return '<button class="chip' + (i===0?' active':'') + '" data-type="color" data-val="' + c + '">' + c + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +

              '<div style="margin-top:8px">' +
                '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
                '<div class="chips size-group">' +
                  (p.sizes||[]).map(function (s, i) {
                    var cap = capFor(p, firstColor, s);
                    var dis = (cap<=0) ? ' disabled class="chip disabled' : ' class="chip';
                    return '<button'+dis + (i===0?' active':'') + '" data-type="size" data-val="' + s + '">' + s + '</button>';
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
        // CUSTOM01：認證碼＋份數
        var priceText = '每份 ' + fmt(p.price || 10);
        html =
          '<div class="product" data-id="' + p.id + '">' +
            '<div class="imgbox">' +
              '<div class="main-img"><img src="' + p.imgs[0] + '" alt="' + p.name + '"></div>' +
              '<div class="thumbs">' +
                p.imgs.map(function (img, i) {
                  return '<img src="' + img + '" data-main="' + img + '" ' + (i === 0 ? 'class="active"' : '') + ' />';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="body">' +
              '<div><b>' + (p.name || '客製化修改（每份10元）') + '</b></div>' +
              '<div class="muted">分類：' + (p.cat || 'custom') + ' | 價格：' + priceText + '</div>' +

              // 認證碼 + 份數
              '<div style="margin-top:8px;display:grid;gap:8px">' +
                '<div>' +
                  '<div class="muted" style="font-size:12px;margin-bottom:6px">認證碼</div>' +
                  '<input class="input code-input" placeholder="請輸入認證碼（例：LFY550）" autocomplete="off">' +
                '</div>' +
                '<div>' +
                  '<div class="muted" style="font-size:12px;margin-bottom:6px">份數（每份 NT$' + (p.price||10) + '）</div>' +
                  '<input class="input units-input" type="number" min="1" step="1" value="55" inputmode="numeric" pattern="\\d*">' +
                '</div>' +
              '</div>' +

              '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
                '<button class="btn pri add">加入購物車</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      grid.insertAdjacentHTML('beforeend', html);
    });

    infoText && (infoText.textContent = '共 ' + list.length + ' 件');
    renderPager(pager, list.length, page);

    // 渲染後：一般商品刷新尺寸/數量 chips、縮圖預設第一張
    grid.querySelectorAll('.product').forEach(function(card){
      var id = card.dataset.id;
      var p  = products.find(function(x){return x.id===id;});
      var thumbs = card.querySelectorAll('.thumbs img');
      thumbs.forEach(function(img,i){ img.classList.toggle('active', i===0); });
      var main = card.querySelector('.main-img img');
      if (thumbs[0]) main.src = thumbs[0].dataset.main || thumbs[0].src;
      if (p && !isCustomId(p.id)) refreshSizeChips(card, p);
    });
  }

  function renderPager(mount, total, page) {
    if (!mount) return;
    mount.innerHTML = '';
    var pages = Math.ceil(total / PAGE_SIZE) || 1;
    for (var i = 1; i <= pages; i++) {
      var btn = document.createElement('button');
      btn.className = 'page-btn' + (i === page ? ' active' : '');
      btn.textContent = i;
      (function (i0) {
        btn.addEventListener('click', function () {
          currentPage = i0;
          renderProducts(currentCat, currentPage);
          try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
        });
      })(i);
      mount.appendChild(btn);
    }
  }

  // ====== 購物車渲染（不自動開抽屜） ======
  function updateCart(openDrawer) {
    if (!cartList) return;
    cartList.innerHTML = '';
    var subtotal = 0;

    if (!cart.length) {
      cartList.innerHTML = '<div class="empty">購物車是空的，去逛逛吧！</div>';
      if (subtotalEl) subtotalEl.textContent = fmt(0);
      if (shippingEl) shippingEl.textContent = fmt(0);
      if (grandEl) grandEl.textContent = fmt(0);
      updateBadge();
      saveCart();
      if (w.updatePayButtonState) w.updatePayButtonState();
      return;
    }

    cart.forEach(function (item, idx) {
      subtotal += (item.price || 0) * (item.qty || 1);

      var attrs = '';
      if (isCustomId(item.id) && item.customCode) {
        // 重新評估是否不一致（如果在購物車中改了數量）
        var parsed = parseCustomCode(item.customCode);
        var mismatch = parsed ? (Number(item.qty||0) !== Number(parsed.unitsExpected||0)) : true;
        item.customMismatch = mismatch;

        attrs = '認證碼：' + item.customCode +
                '　份數：' + (item.qty||1) +
                (parsed ? '（應為 ' + parsed.unitsExpected + ' 份）' : '（格式錯誤）');
      } else {
        attrs = '顏色：' + (item.color || '-') + '　尺寸：' + (item.size || '-');
      }

      var warn = (item.customMismatch ? '<div style="color:#f87171;font-size:12px;margin-top:4px">⚠ 認證碼與份數不一致，請修正後才能結帳。</div>' : '');

      var row =
        '<div class="cart-card">' +
          '<img src="' + (item.img || '') + '" width="72" height="72" alt="">' +
          '<div>' +
            '<div>' + (item.name || '') + '</div>' +
            '<div class="cart-attr">' + attrs + '</div>' +
            '<div class="cart-actions">' +
              '<button class="btn small dec" data-idx="' + idx + '">－</button>' +
              '<span>' + (item.qty || 1) + '</span>' +
              '<button class="btn small inc" data-idx="' + idx + '">＋</button>' +
              '<button class="link-danger del" data-idx="' + idx + '">刪除</button>' +
            '</div>' +
            warn +
          '</div>' +
          '<div class="cart-right">' + fmt((item.price || 0) * (item.qty || 1)) + '</div>' +
        '</div>';
      cartList.insertAdjacentHTML('beforeend', row);
    });

    var shipping = computeShipFee(subtotal);
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (shippingEl) shippingEl.textContent = fmt(shipping);
    if (grandEl) grandEl.textContent = fmt(subtotal + shipping);
    updateBadge();
    saveCart();

    if (w.updatePayButtonState) w.updatePayButtonState();
    if (openDrawer) drawer && drawer.classList.add('open'); // 僅在指定時才會開
  }

  // ====== 清單點擊（縮圖 / chips / 加入購物車） ======
  grid.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof HTMLElement)) return;

    // 縮圖切換
    if (t.matches('.thumbs img')) {
      var main = t.closest('.imgbox').querySelector('.main-img img');
      t.parentElement.querySelectorAll('img').forEach(function(img){ img.classList.remove('active'); });
      t.classList.add('active');
      main.src = t.dataset.main || t.src;
      return;
    }

    var card = t.closest('.product');
    if (!card) return;
    var id = card.dataset.id;
    var p  = products.find(function(x){ return x.id===id; });

    // chips（一般商品的顏色/尺寸/數量）
    var chip = t.closest('.chip[data-type]');
    if (chip && !chip.classList.contains('disabled')) {
      var type = chip.dataset.type;
      var group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      if (p && !isCustomId(p.id)) {
        if (type === 'color') refreshSizeChips(card, p);
        if (type === 'size')  refreshQtyChips(card, p);
      }
      return;
    }

    // 加入購物車
    if (t.classList.contains('add')) {
      if (p && isCustomId(p.id)) {
        // ---- CUSTOM01 特規：不符不得加入 ----
        var codeInput  = card.querySelector('.code-input');
        var unitsInput = card.querySelector('.units-input');
        var code = codeInput ? String(codeInput.value || '').trim() : '';
        var units = Math.max(1, Number(unitsInput ? unitsInput.value : 1) || 1);

        var parsed = parseCustomCode(code);
        if (!parsed) { toast('請輸入正確的認證碼（例：LFY550）'); return; }

        if (units !== parsed.unitsExpected){
          toast('認證碼與份數不一致，請修正後再加入。');
          return; // 阻擋加入
        }

        var item = {
          id: p.id,
          name: p.name || '客製化修改（每份 10 元）',
          img: (p.imgs && p.imgs[0]) || '',
          price: p.price || 10,   // 每份 10 元
          qty: units,             // 份數
          customCode: parsed.code,
          customMismatch: false
        };

        // 相同認證碼才合併
        var merged = false;
        for (var i=0;i<cart.length;i++){
          var it = cart[i];
          if (isCustomId(it.id) && it.customCode===item.customCode){
            it.qty = (it.qty||0) + item.qty;
            merged = true; break;
          }
        }
        if (!merged) cart.push(item);

        toast('已加入購物車');
        updateCart(false); // 不開抽屜
        return;
      }

      // ---- 一般商品 ----
      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel  = card.querySelector('.size-group  .chip.active');
      var qtySel   = card.querySelector('.qty-group   .chip.active');
      var color = colorSel ? colorSel.dataset.val : ((p.colors && p.colors[0]) || '');
      var size  = sizeSel  ? sizeSel.dataset.val  : ((p.sizes  && p.sizes[0])  || '');
      var qty   = Math.max(1, Number(qtySel ? qtySel.dataset.val : '1')||1);

      var cap = capFor(p, color, size);
      if (cap <= 0){ toast('此規格目前缺貨'); return; }
      qty = Math.min(qty, cap);

      var item2 = { id:p.id, name:p.name, img:(p.imgs&&p.imgs[0])||'', price:p.price||0, color:color, size:size, qty:qty };

      // 相同規格合併
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

      updateCart(false); // 不開抽屜
      return;
    }
  });

  // 購物車內操作
  if (cartList) {
    cartList.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.classList.contains('inc')) {
        var i1 = Number(t.dataset.idx); var it = cart[i1]; if (!it) return;
        if (isCustomId(it.id)){
          // 客製化：加一份
          it.qty = (it.qty||1) + 1;
          // 更新 mismatch
          var p1 = parseCustomCode(it.customCode);
          it.customMismatch = p1 ? (Number(it.qty||0) !== Number(p1.unitsExpected||0)) : true;
        } else {
          // 一般商品：檢查上限
          var p  = products.find(function(x){return x.id===it.id;}) || {};
          var cap = capFor(p, it.color, it.size);
          it.qty = Math.min(cap, (it.qty||1) + 1);
        }
        updateCart(false);
      } else if (t.classList.contains('dec')) {
        var i2 = Number(t.dataset.idx); var it2 = cart[i2]; if (!it2) return;
        it2.qty = Math.max(1, (it2.qty||1) - 1);
        if (isCustomId(it2.id)){
          var p2 = parseCustomCode(it2.customCode);
          it2.customMismatch = p2 ? (Number(it2.qty||0) !== Number(p2.unitsExpected||0)) : true;
        }
        updateCart(false);
      } else if (t.classList.contains('del')) {
        var i3 = Number(t.dataset.idx);
        cart.splice(i3, 1);
        updateCart(false);
      }
    });
  }

  // 開關購物車按鈕（只有你按了才會開）
  var openBtn  = document.getElementById('openCart');
  var closeBtn = document.getElementById('closeCart');
  if (openBtn)  openBtn.addEventListener('click', function(){ drawer && drawer.classList.add('open'); updateCart(false); });
  if (closeBtn) closeBtn.addEventListener('click', function(){ drawer && drawer.classList.remove('open'); });

  // 暴露給外部（checkout-and-shipping.js）
  w.renderCart  = function(){ updateCart(false); }; // 不自動開抽屜

  // 初始化
  renderCats();
  renderProducts('all', 1);
  updateCart(false); // 初始化不開抽屜
});
