// shop-core.js — 安全版（修正 fmt / toast 未定義造成中斷）
document.addEventListener('DOMContentLoaded', function () {
  // ---- 取用全域工具（避免未定義造成整段中斷）----
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

  // 若關鍵節點缺少，直接停止，避免報錯
  if (!grid) return;

  // ---- 設定 ----
  var PAGE_SIZE = window.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = window.FREE_SHIP_THRESHOLD || 1000;

  // ---- 資料 ----
  var products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  var cart = [];
  var currentCat = 'all';

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
                (p.colors || []).map(function (v, i) {
                  return '<button class="chip' + (i === 0 ? ' active' : '') + '" data-type="color" data-val="' + v + '">' + v + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +

            '<div style="margin-top:8px">' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
              '<div class="chips size-group">' +
                (p.sizes || []).map(function (v, i) {
                  return '<button class="chip' + (i === 0 ? ' active' : '') + '" data-type="size" data-val="' + v + '">' + v + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +

            '<button class="btn pri add" style="margin-top:10px">加入購物車</button>' +
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

  // ============ 購物車 ============
  function updateCart() {
    if (!cartList) return;
    cartList.innerHTML = '';
    var subtotal = 0;

    if (cart.length === 0) {
      cartList.innerHTML =
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

      var go = cartList.querySelector('#goShop');
      if (go) go.addEventListener('click', function () {
        drawer && drawer.classList.remove('open');
        grid && grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      subtotalEl && (subtotalEl.textContent = 'NT$0');
      shippingEl && (shippingEl.textContent = 'NT$0');
      grandEl && (grandEl.textContent   = 'NT$0');
      cartCount && (cartCount.textContent = '0');
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

    var shipping = (subtotal >= FREE_SHIP_THRESHOLD || subtotal <= 0) ? 0 : 80;
    subtotalEl && (subtotalEl.textContent = fmt(subtotal));
    shippingEl && (shippingEl.textContent = fmt(shipping));
    grandEl   && (grandEl.textContent   = fmt(subtotal + shipping));
    cartCount && (cartCount.textContent = String(cart.length));
  }

  // ============ 綁定事件 ============
  // Grid 事件委派：縮圖 / chips / 加入購物車
  grid.addEventListener('click', function (e) {
    // 縮圖
    if (e.target.tagName === 'IMG' && e.target.dataset.main) {
      var main = e.target.closest('.product').querySelector('.main-img img');
      e.target.parentNode.querySelectorAll('img').forEach(function(img){ img.classList.remove('active'); });
      e.target.classList.add('active');
      main.src = e.target.dataset.main;
      return;
    }
    // chips
    var chip = e.target.closest && e.target.closest('.chip[data-type]');
    if (chip) {
      var group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      return;
    }
    // 加入購物車
    if (e.target.classList.contains('add')) {
      var card = e.target.closest('.product');
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
      cart.push(item);
      updateCart();
      drawer && drawer.classList.add('open');
      toast('已加入購物車');
    }
  });

  // 購物車操作（委派）
  if (cartList) {
    cartList.addEventListener('click', function (e) {
      if (e.target.classList.contains('dec')) {
        var idx = +e.target.dataset.idx;
        if (cart[idx].qty > 1) cart[idx].qty--;
        updateCart();
      }
      if (e.target.classList.contains('inc')) {
        var idx2 = +e.target.dataset.idx;
        cart[idx2].qty++;
        updateCart();
      }
      if (e.target.classList.contains('del')) {
        var idx3 = +e.target.dataset.idx;
        cart.splice(idx3, 1);
        updateCart();
      }
    });
  }

  // 開關購物車
  var openBtn  = document.getElementById('openCart');
  var closeBtn = document.getElementById('closeCart');
  if (openBtn)  openBtn.addEventListener('click', function(){ drawer && drawer.classList.add('open'); updateCart(); });
  if (closeBtn) closeBtn.addEventListener('click', function(){ drawer && drawer.classList.remove('open'); });

  // 初始化
  renderProducts('all', 1);
  updateCart();
});
