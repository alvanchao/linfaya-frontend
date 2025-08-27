// shop-core.js — 商品清單 / 分頁 / 購物車抽屜
(function (w, d) {
  // ====== 快速存取 ======
  var $ = function (s) { return d.querySelector(s); };
  var $$ = function (s) { return d.querySelectorAll(s); };
  var fmt = w.fmt;

  // ====== 全域狀態 ======
  var state = {
    currentCat: 'all',
    page: 1,
    cart: []
  };

  var EL = {
    grid:        $('#grid'),
    pagerTop:    $('#pager'),
    pagerBottom: $('#pagerBottom'),
    infoText:    $('#infoText'),
    drawer:      $('#drawer'),
    cartList:    $('#cartList'),
    cartCount:   $('#cartCount'),
    subtotal:    $('#subtotal'),
    shipping:    $('#shipping'),
    grand:       $('#grand'),
  };

  var PRODUCTS = w.PRODUCTS || [];
  var PAGE_SIZE = w.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = w.FREE_SHIP_THRESHOLD || 1000;

  // ====== LocalStorage（可選） ======
  try {
    var saved = localStorage.getItem('cart');
    if (saved) state.cart = JSON.parse(saved) || [];
  } catch (_) {}

  function saveCart() {
    try { localStorage.setItem('cart', JSON.stringify(state.cart)); } catch (_) {}
  }

  // ====== 商品渲染 ======
  function renderProducts(cat, page) {
    cat = cat || state.currentCat;
    page = page || 1;
    state.currentCat = cat;
    state.page = page;

    EL.grid.innerHTML = '';

    var list = (cat === 'all') ? PRODUCTS : PRODUCTS.filter(function (p) { return p.cat === cat; });
    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    slice.forEach(function (p, idx) {
      var mainImg = (p.imgs && p.imgs[0]) || '';
      var thumbs = (p.imgs || []).map(function (src, i) {
        return '<img src="' + src + '" data-main="' + src + '" ' + (i === 0 ? 'class="active"' : '') + ' />';
      }).join('');

      // 顏色 / 尺寸 chips（兩個區塊、兩行）
      var colorChips = (p.colors || []).map(function (v, i) {
        return '<button class="chip ' + (i === 0 ? 'active' : '') + '" data-type="color" data-val="' + v + '">' + v + '</button>';
      }).join('');
      var sizeChips = (p.sizes || []).map(function (v, i) {
        return '<button class="chip ' + (i === 0 ? 'active' : '') + '" data-type="size" data-val="' + v + '">' + v + '</button>';
      }).join('');

      var html =
        '<div class="product" data-id="' + p.id + '">' +
          '<div class="imgbox">' +
            '<div class="main-img"><img src="' + mainImg + '" alt="' + (p.name || '') + '"></div>' +
            '<div class="thumbs">' + thumbs + '</div>' +
          '</div>' +
          '<div class="body">' +
            '<div><b>' + (p.name || '') + '</b></div>' +
            // 分類 | 價格 同一行
            '<div class="muted">分類：' + (p.cat || '-') + ' | 價格：' + fmt(p.price) + '</div>' +

            // 顏色（第一行）
            '<div style="margin-top:6px">' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
              '<div class="chips attr color-group">' + colorChips + '</div>' +
            '</div>' +

            // 尺寸（第二行）
            '<div style="margin-top:10px">' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
              '<div class="chips attr size-group">' + sizeChips + '</div>' +
            '</div>' +

            '<button class="btn pri add" style="margin-top:10px">加入購物車</button>' +
          '</div>' +
        '</div>';

      EL.grid.insertAdjacentHTML('beforeend', html);
    });

    renderPager(EL.pagerTop, list.length, page);
    renderPager(EL.pagerBottom, list.length, page);
    EL.infoText.textContent = '共 ' + list.length + ' 件';
  }

  function renderPager(mount, total, page) {
    if (!mount) return;
    mount.innerHTML = '';
    var pages = Math.ceil(total / PAGE_SIZE) || 1;
    for (var i = 1; i <= pages; i++) {
      var btn = d.createElement('button');
      btn.className = 'page-btn' + (i === page ? ' active' : '');
      btn.textContent = i;
      (function (i0) {
        btn.addEventListener('click', function () { renderProducts(state.currentCat, i0); });
      })(i);
      mount.appendChild(btn);
    }
  }

  // ====== 抽屜：購物車渲染 ======
  function calcShipping(subtotal) {
    if (subtotal <= 0) return 0;
    if (subtotal >= FREE_SHIP_THRESHOLD) return 0;
    return 80; // 預設宅配 80；（門市到店交給 checkout-and-shipping.js 切換）
  }

  function renderCart() {
    var list = EL.cartList;
    list.innerHTML = '';

    if (state.cart.length === 0) {
      // 空購物車：灰色圖示 + 去逛逛
      list.innerHTML =
        '<div style="padding:28px 12px;display:grid;place-items:center;text-align:center;color:#8a94a7;">' +
          '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" style="opacity:.5;display:block;margin-bottom:10px">' +
            '<path d="M7 6h13l-1.2 7H8.5L7 6Z" stroke="currentColor" stroke-width="1.2"/>' +
            '<path d="M7 6l-.6-2H3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
            '<circle cx="9.5" cy="19.5" r="1.5" fill="currentColor"/>' +
            '<circle cx="17.5" cy="19.5" r="1.5" fill="currentColor"/>' +
          '</svg>' +
          '<div style="font-size:14px;margin-bottom:6px">購物車是空的</div>' +
          '<button type="button" class="btn" id="goShop" style="padding:8px 12px;border-radius:10px">去逛逛商品</button>' +
        '</div>';

      var go = list.querySelector('#goShop');
      if (go) go.addEventListener('click', function () {
        EL.drawer.classList.remove('open');
        $('#grid') && $('#grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      EL.subtotal.textContent = 'NT$0';
      EL.shipping.textContent = 'NT$0';
      EL.grand.textContent = 'NT$0';
      EL.cartCount.textContent = '0';
      return;
    }

    var subtotal = 0;

    state.cart.forEach(function (item, idx) {
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
      EL.cartList.insertAdjacentHTML('beforeend', row);
    });

    var shipping = calcShipping(subtotal);
    EL.subtotal.textContent = fmt(subtotal);
    EL.shipping.textContent = fmt(shipping);
    EL.grand.textContent = fmt(subtotal + shipping);
    EL.cartCount.textContent = String(state.cart.length);
  }
  w.renderCart = renderCart; // 給其它檔案（如 checkout）可呼叫

  // ====== 事件：商品格子 ======
  EL.grid.addEventListener('click', function (e) {
    // 縮圖切換
    if (e.target && e.target.tagName === 'IMG' && e.target.dataset.main) {
      var product = e.target.closest('.product');
      var main = product.querySelector('.main-img img');
      var all = e.target.parentNode.querySelectorAll('img');
      all.forEach(function (im) { im.classList.remove('active'); });
      e.target.classList.add('active');
      main.src = e.target.dataset.main;
      return;
    }

    // 屬性 chips（顏色 / 尺寸）
    var chip = e.target.closest && e.target.closest('.chip[data-type]');
    if (chip) {
      var group = chip.closest('.attr');
      group.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      return;
    }

    // 加入購物車
    if (e.target.classList.contains('add')) {
      var card = e.target.closest('.product');
      var id = card.getAttribute('data-id');
      var p = PRODUCTS.find(function (x) { return x.id === id; });
      if (!p) return;

      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel  = card.querySelector('.size-group  .chip.active');
      var item = {
        id: p.id,
        name: p.name,
        img: (p.imgs && p.imgs[0]) || '',
        price: p.price || 0,
        color: (colorSel && colorSel.dataset.val) || (p.colors && p.colors[0]) || '',
        size:  (sizeSel  && sizeSel.dataset.val)  || (p.sizes  && p.sizes[0])  || '',
        qty: 1
      };
      state.cart.push(item);
      saveCart();
      renderCart();
      EL.drawer.classList.add('open');
      w.toast && w.toast('已加入購物車');
      return;
    }
  });

  // ====== 事件：購物車抽屜 ======
  EL.cartList.addEventListener('click', function (e) {
    if (e.target.classList.contains('dec')) {
      var idx = +e.target.dataset.idx;
      if (state.cart[idx].qty > 1) state.cart[idx].qty -= 1;
      saveCart(); renderCart();
    }
    if (e.target.classList.contains('inc')) {
      var idx2 = +e.target.dataset.idx;
      state.cart[idx2].qty += 1;
      saveCart(); renderCart();
    }
    if (e.target.classList.contains('del')) {
      var idx3 = +e.target.dataset.idx;
      state.cart.splice(idx3, 1);
      saveCart(); renderCart();
    }
  });

  // ====== Tabs（分類） ======
  $$('#tabs .tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('#tabs .tab').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderProducts(btn.dataset.cat, 1);
    });
  });

  // ====== Drawer 開/關（保險：委派） ======
  d.addEventListener('click', function (e) {
    var openBtn = e.target.closest && e.target.closest('#openCart');
    var closeBtn = e.target.closest && e.target.closest('#closeCart');
    if (openBtn) { EL.drawer.classList.add('open'); renderCart(); }
    if (closeBtn) { EL.drawer.classList.remove('open'); }
  });

  // ====== 初始化 ======
  renderProducts('all', 1);
  renderCart();

})(window, document);
