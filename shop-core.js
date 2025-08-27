// shop-core.js — Chips數量選擇＋不自動開購物車＋分類切換重設縮圖
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
  function ymd(d){ var y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0'); return y+'/'+m+'/'+dd; }
  function buildPreorderPanelHTML(){
    var eta=''; try{ var t=new Date(), min=new Date(t), max=new Date(t); min.setDate(min.getDate()+(w.LEAD_DAYS_MIN||7)); max.setDate(max.getDate()+(w.LEAD_DAYS_MAX||14)); eta=ymd(min)+' ～ '+ymd(max);}catch(_){}
    return ''+
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<strong style="color:#fff;font-size:15px">小提醒</strong>' +
          (w.PREORDER_MODE ? '<span class="chip small active" style="pointer-events:none">預計出貨： '+eta+'</span>' : '') +
        '</div>' +
        '<div style="font-size:13px;color:#cfd3dc;line-height:1.7">' +
          (w.PREORDER_MODE
            ? '<div>※ 本官網採 <b style="color:#fff">預購</b> 模式，下單後約需 '+w.LEAD_DAYS_MIN+'–'+w.LEAD_DAYS_MAX+' 個<b style="color:#fff">工作天</b>出貨；若遇延遲將主動通知，並可退款或更換。</div>'
            : '<div>※ 本店商品同步於多平台販售，庫存以實際出貨為準。</div>'
          ) +
          '<div style="margin-top:4px">完成付款後信件可能延遲，請檢查垃圾信或「促銷」分類。</div>' +
        '</div>' +
      '</div>';
  }

  // 暴露給 checkout 使用
  w.renderCart  = function(){ updateCart(false); }; // 不自動開抽屜
  w.updateBadge = updateBadge;

  // ====== 分類分頁 ======
  function renderCats(){
    if (!cats) return;
    var set = new Set(products.map(p=>p.cat));
    var arr = ['all', ...Array.from(set)];
    cats.innerHTML = '';
    arr.forEach(function(c){
      var b = document.createElement('button');
      b.className = 'tab' + (c===currentCat?' active':'');
      b.dataset.cat = c;
      b.textContent = (c==='all'?'全部':c);
      b.addEventListener('click', function(){
        currentCat = c; currentPage = 1;
        // 更新 tab 樣式
        cats.querySelectorAll('.tab').forEach(function(x){ x.classList.toggle('active', x.dataset.cat===c); });
        // 重新渲染清單
        renderProducts(currentCat, currentPage);
        // 捲回清單頂端，視覺更明顯
        try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
      });
      cats.appendChild(b);
    });
  }

  // ====== 庫存/上限 ======
  function capFor(p, color, size){
    var cap = MAX_QTY_PER_ITEM;
    var k = (color||'')+'-'+(size||'');
    if (p.stockMap && (k in p.stockMap)) cap = Math.min(cap, Number(p.stockMap[k]||0));
    return cap;
  }

  // ====== chips 依顏色/尺寸刷新（尺寸與數量） ======
  function refreshSizeChips(card, p){
    var color = (card.querySelector('.color-group .chip.active')||{}).dataset?.val || (p.colors&&p.colors[0]) || '';
    card.querySelectorAll('.size-group .chip').forEach(function(btn){
      var size = btn.dataset.val;
      var cap = capFor(p, color, size);
      if (cap <= 0){ btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); }
      else { btn.classList.remove('disabled'); btn.removeAttribute('disabled'); }
    });
    // 若目前 active 被關閉，轉到第一個可用
    var act = card.querySelector('.size-group .chip.active');
    if (act && act.classList.contains('disabled')){
      act.classList.remove('active');
      var firstOk = card.querySelector('.size-group .chip:not(.disabled)');
      if (firstOk) firstOk.classList.add('active');
    }
    // 尺寸確定後刷新數量 chips
    refreshQtyChips(card, p);
  }

  function refreshQtyChips(card, p){
    var color = (card.querySelector('.color-group .chip.active')||{}).dataset?.val || (p.colors&&p.colors[0]) || '';
    var size  = (card.querySelector('.size-group  .chip.active')||{}).dataset?.val  || (p.sizes && p.sizes[0]) || '';
    var cap   = capFor(p, color, size);
    var qtyWrap = card.querySelector('.qty-group');
    if (!qtyWrap) return;
    // 目前選到的數量
    var current = (qtyWrap.querySelector('.chip.active')||{}).dataset?.val;
    current = Number(current||1);
    // 重新渲染 1..min(MAX, cap)
    var maxShow = Math.max(1, Math.min(MAX_QTY_PER_ITEM, cap));
    var html = '';
    for (var i=1; i<=maxShow; i++){
      html += '<button class="chip'+(i===Math.min(current,maxShow)?' active':'')+'" data-type="qty" data-val="'+i+'">'+i+'</button>';
    }
    qtyWrap.innerHTML = html;
  }

  // ====== 商品渲染 ======
  function renderProducts(cat, page) {
    grid.innerHTML = '';

    // 小提醒面板（若頁面有容器）
    var panel = document.getElementById('preorderPanel');
    if (panel) panel.innerHTML = buildPreorderPanelHTML();

    // 篩選＋分頁
    var list = (cat === 'all') ? products : products.filter(function(p){ return p.cat === cat; });
    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    slice.forEach(function (p) {
      var firstColor = (p.colors&&p.colors[0]) || '';
      var firstSize  = (p.sizes&&p.sizes[0])  || '';

      var html =
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
                  // 先用第一個顏色檢查可用性
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
      grid.insertAdjacentHTML('beforeend', html);
    });

    infoText && (infoText.textContent = '共 ' + list.length + ' 件');
    renderPager(pager, list.length, page);

    // 渲染後，依首次顏色刷新尺寸與數量；縮圖第一張帶 active
    grid.querySelectorAll('.product').forEach(function(card){
      var id = card.dataset.id;
      var p  = products.find(function(x){return x.id===id;});
      if (p) refreshSizeChips(card, p); // 這也會帶動 refreshQtyChips
      var thumbs = card.querySelectorAll('.thumbs img');
      thumbs.forEach(function(img,i){ img.classList.toggle('active', i===0); });
      var main = card.querySelector('.main-img img');
      if (thumbs[0]) main.src = thumbs[0].dataset.main || thumbs[0].src;
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

  // ====== 購物車渲染（從不自動開抽屜） ======
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
      return;
    }

    cart.forEach(function (item, idx) {
      subtotal += (item.price || 0) * (item.qty || 1);
      var row =
        '<div class="cart-card">' +
          '<img src="' + (item.img || '') + '" width="72" height="72" alt="">' +
          '<div>' +
            '<div>' + (item.name || '') + '</div>' +
            '<div class="cart-attr">顏色：' + (item.color || '-') + '　尺寸：' + (item.size || '-') + '</div>' +
            '<div class="cart-actions">' +
              '<button class="btn small dec" data-idx="' + idx + '">－</button>' +
              '<span>' + (item.qty || 1) + '</span>' +
              '<button class="btn small inc" data-idx="' + idx + '">＋</button>' +
              '<button class="link-danger del" data-idx="' + idx + '">刪除</button>' +
            '</div>' +
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

    if (openDrawer) drawer && drawer.classList.add('open'); // 我們只在你指定時才開
  }

  // ====== 事件：清單點擊（縮圖 / chips） ======
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

    // chips（顏色 / 尺寸 / 數量）
    var chip = t.closest('.chip[data-type]');
    if (chip && !chip.classList.contains('disabled')) {
      var type = chip.dataset.type;
      var group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      if (p && type === 'color') refreshSizeChips(card, p);
      if (p && type === 'size')  refreshQtyChips(card, p);
      return;
    }

    // 加入購物車
    if (t.classList.contains('add')) {
      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel  = card.querySelector('.size-group  .chip.active');
      var qtySel   = card.querySelector('.qty-group   .chip.active');
      var color = colorSel ? colorSel.dataset.val : ((p.colors && p.colors[0]) || '');
      var size  = sizeSel  ? sizeSel.dataset.val  : ((p.sizes  && p.sizes[0])  || '');
      var qty   = Math.max(1, Number(qtySel ? qtySel.dataset.val : '1')||1);

      // 庫存上限
      var cap = capFor(p, color, size);
      if (cap <= 0){ toast('此規格目前缺貨'); return; }
      qty = Math.min(qty, cap);

      var item = { id:p.id, name:p.name, img:(p.imgs&&p.imgs[0])||'', price:p.price||0, color:color, size:size, qty:qty };

      // 相同規格合併
      var merged = false;
      for (var i=0;i<cart.length;i++){
        var it = cart[i];
        if (it.id===item.id && it.color===item.color && it.size===item.size){
          var next = (it.qty||1) + qty;
          if (next > cap){ toast('此規格最多可購買 '+cap+' 件'); it.qty = cap; }
          else { it.qty = next; toast('已加入購物車'); }
          merged = true; break;
        }
      }
      if (!merged){ cart.push(item); toast('已加入購物車'); }

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
        var p  = products.find(function(x){return x.id===it.id;}) || {};
        var cap = capFor(p, it.color, it.size);
        it.qty = Math.min(cap, (it.qty||1) + 1);
        updateCart(false);
      } else if (t.classList.contains('dec')) {
        var i2 = Number(t.dataset.idx); var it2 = cart[i2]; if (!it2) return;
        it2.qty = Math.max(1, (it2.qty||1) - 1);
        updateCart(false);
      } else if (t.classList.contains('del')) {
        var i3 = Number(t.dataset.idx);
        cart.splice(i3, 1);
        updateCart(false);
      }
    });
  }

  // 開關購物車按鈕（只有你按了才會打開）
  var openBtn  = document.getElementById('openCart');
  var closeBtn = document.getElementById('closeCart');
  if (openBtn)  openBtn.addEventListener('click', function(){ drawer && drawer.classList.add('open'); updateCart(false); });
  if (closeBtn) closeBtn.addEventListener('click', function(){ drawer && drawer.classList.remove('open'); });

  // 初始化
  renderCats();
  renderProducts('all', 1);
  updateCart(false); // 初始化不開抽屜
});
