// shop-core.js — 商品列表 / 購物車（與結帳一致的運費邏輯 + sessionStorage 同步）
document.addEventListener('DOMContentLoaded', function () {
  // ---- 取用全域工具（若未載入 utils 也不會中斷） ----
  var fmt   = (window.fmt)   ? window.fmt   : function(n){ return 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW'); };
  var toast = (window.toast) ? window.toast : function(){ /* no-op */ };

  // ---- 快速抓 DOM ----
  var grid        = document.getElementById('grid');
  var pagerTop    = document.getElementById('pager');
  var pagerBottom = document.getElementById('pagerBottom');
  var infoText    = document.getElementById('infoText');
  var cartList    = document.getElementById('cartList');
  var cartCount   = document.getElementById('cartCount');
  var subtotalEl  = document.getElementById('subtotal');
  var shippingEl  = document.getElementById('shipping');
  var grandEl     = document.getElementById('grand');
  var drawer      = document.getElementById('drawer');

  if (!grid) return; // 主清單缺少就不執行（避免報錯）

  // ---- 設定 ----
  var PAGE_SIZE = window.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = window.FREE_SHIP_THRESHOLD || 1000;
  var MAX_QTY_PER_ITEM = window.MAX_QTY_PER_ITEM || 5;

  // ---- 資料 ----
  var products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];

  // 從 sessionStorage 載入購物車
  var cart = [];
  try { cart = JSON.parse(sessionStorage.getItem('cart') || '[]'); } catch(_) { cart = []; }

  var currentCat = 'all';

  // ============ 工具 ============
  function updateBadge(){
    if (cartCount) cartCount.textContent = String(cart.length);
  }
  function saveCart(){
    try { sessionStorage.setItem('cart', JSON.stringify(cart)); } catch(_) {}
    updateBadge();
  }
  function getShipOpt(){
    // 先看畫面上單選；沒有就看 sessionStorage；預設 home
    var chk = document.querySelector('input[name="ship"]:checked');
    if (chk && chk.value) return chk.value;
    try{
      var s = sessionStorage.getItem('SHIP_OPT');
      if (s) return s;
    }catch(_){}
    return 'home';
  }
  function computeShipFee(subtotal){
    if (subtotal <= 0) return 0;
    if (subtotal >= FREE_SHIP_THRESHOLD) return 0;
    var opt = getShipOpt();
    return (opt === 'home') ? 80 : 60; // 與 checkout-and-shipping.js 保持一致
  }

  // 對外提供給 checkout-and-shipping.js 觸發重新渲染
  window.renderCart  = function(){ updateCart(); };
  window.updateBadge = updateBadge;

  // ============ 商品渲染 ============
  function renderProducts(cat, page) {
    grid.innerHTML = '';
    var list = (cat === 'all') ? products : products.filter(function(p){ return p.cat === cat; });
    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    slice.forEach(function (p) {
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
                  return '<button class="chip' + (i===0?' active':'') + '" data-type="size" data-val="' + s + '">' + s + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +

            '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
              '<button class="btn add">加入購物車</button>' +
              '<button class="btn ghost" id="openCartFromCard">查看購物車</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      grid.insertAdjacentHTML('beforeend', html);
    });

    infoText && (infoText.textContent = '共 ' + list.length + ' 件');
    renderPager(pagerTop, list.length, page);
    renderPager(pagerBottom, list.length, page);
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
          renderProducts(currentCat, i0);
        });
      })(i);
      mount.appendChild(btn);
    }
  }

  // ============ 購物車渲染 ============
  function updateCart() {
    if (!cartList) return;
    cartList.innerHTML = '';
    var subtotal = 0;

    if (!cart.length) {
      cartList.innerHTML = '<div class="empty">購物車是空的，去逛逛吧！</div>';
      drawer && drawer.classList.add('open');
      // 金額歸零顯示
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

    // 與結帳一致的運費邏輯
    var shipping = computeShipFee(subtotal);
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (shippingEl) shippingEl.textContent = fmt(shipping);
    if (grandEl) grandEl.textContent = fmt(subtotal + shipping);
    updateBadge();
    saveCart();
  }

  // ============ 事件：清單點擊 ============
  grid.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof HTMLElement)) return;

    // 查看購物車
    if (t.id === 'openCartFromCard') {
      drawer && drawer.classList.add('open');
      updateCart();
      return;
    }

    // 縮圖切換大圖
    if (t.matches('.thumbs img')) {
      var main = t.closest('.imgbox').querySelector('.main-img img');
      t.parentElement.querySelectorAll('img').forEach(function(img){ img.classList.remove('active'); });
      t.classList.add('active');
      main.src = t.dataset.main;
      return;
    }

    // chips 選擇
    var chip = t.closest('.chip[data-type]');
    if (chip) {
      var group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      return;
    }

    // 加入購物車
    if (t.classList.contains('add')) {
      var card = t.closest('.product');
      var id   = card.dataset.id;
      var p    = products.find(function(x){ return x.id === id; });
      if (!p) return;

      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel  = card.querySelector('.size-group  .chip.active');
      var item = {
        id: p.id,
        name: p.name,
        img: (p.imgs && p.imgs[0]) || '',
        price: p.price || 0,
        color: colorSel ? colorSel.dataset.val : ((p.colors && p.colors[0]) || ''),
        size:  sizeSel  ? sizeSel.dataset.val  : ((p.sizes  && p.sizes[0])  || ''),
        qty: 1
      };

      // 相同規格合併數量
      var merged = false;
      for (var i=0;i<cart.length;i++){
        var it = cart[i];
        if (it.id===item.id && it.color===item.color && it.size===item.size){
          var cap = MAX_QTY_PER_ITEM;
          try{
            var k = (it.color||'')+'-'+(it.size||'');
            var stockMap = (p.stockMap||{});
            if (k in stockMap) cap = Math.min(cap, Number(stockMap[k]));
          }catch(_){}
          var nextQty = (it.qty||1)+1;
          if (nextQty > cap) {
            toast('此規格目前最多可購買 '+cap+' 件');
          } else {
            it.qty = nextQty;
            toast('已加入購物車');
          }
          merged = true;
          break;
        }
      }
      if (!merged){
        cart.push(item);
        toast('已加入購物車');
      }
      drawer && drawer.classList.add('open');
      updateCart();
      return;
    }
  });

  // ============ 事件：購物車內操作（數量 / 刪除） ============
  if (cartList) {
    cartList.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.classList.contains('inc')) {
        var i1 = Number(t.dataset.idx);
        var it = cart[i1]; if (!it) return;
        var prod = (products.find(function(p){ return p.id===it.id; }) || it);
        var k = (it.color||'')+'-'+(it.size||'');
        var cap = MAX_QTY_PER_ITEM;
        if (prod.stockMap && (k in prod.stockMap)) cap = Math.min(cap, Number(prod.stockMap[k]));
        if ((it.qty||1) >= cap) { toast('此規格目前最多可購買 '+cap+' 件'); return; }
        it.qty = (it.qty||1) + 1;
        updateCart();
      } else if (t.classList.contains('dec')) {
        var i2 = Number(t.dataset.idx);
        var it2 = cart[i2]; if (!it2) return;
        it2.qty = Math.max(1, (it2.qty||1) - 1);
        updateCart();
      } else if (t.classList.contains('del')) {
        var i3 = Number(t.dataset.idx);
        cart.splice(i3, 1);
        updateCart();
      }
    });
  }

  // 開關購物車按鈕
  var openBtn  = document.getElementById('openCart');
  var closeBtn = document.getElementById('closeCart');
  if (openBtn)  openBtn.addEventListener('click', function(){ drawer && drawer.classList.add('open'); updateCart(); });
  if (closeBtn) closeBtn.addEventListener('click', function(){ drawer && drawer.classList.remove('open'); });

  // 初始化
  renderProducts('all', 1);
  updateCart();
});
