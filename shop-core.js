// shop-core.js — 商品渲染、購物車核心
(function (w, d) {
  var grid = $('#grid');
  var pagerTop = $('#pager');
  var pagerBottom = $('#pagerBottom');
  var infoText = $('#infoText');
  var cartList = $('#cartList');
  var cartCount = $('#cartCount');
  var subtotalEl = $('#subtotal');
  var shippingEl = $('#shipping');
  var grandEl = $('#grand');
  var drawer = $('#drawer');

  var PAGE_SIZE = w.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = w.FREE_SHIP_THRESHOLD || 1000;

  var products = w.PRODUCTS || [];
  var cart = [];

  // ===== 渲染商品 =====
  function renderProducts(cat, page) {
    grid.innerHTML = '';
    var list = (cat === 'all') ? products : products.filter(p => p.cat === cat);
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

            // 顏色
            '<div style="margin-top:6px">' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
              '<div class="chips color-group">' +
                (p.colors || []).map(function (v, i) {
                  return '<button class="chip' + (i === 0 ? ' active' : '') + '" data-type="color" data-val="' + v + '">' + v + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +

            // 尺寸
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

    renderPager(pagerTop, list.length, page);
    renderPager(pagerBottom, list.length, page);
    infoText.textContent = '共 ' + list.length + ' 件';
  }

  function renderPager(mount, total, page) {
    mount.innerHTML = '';
    var pages = Math.ceil(total / PAGE_SIZE);
    for (var i = 1; i <= pages; i++) {
      var btn = d.createElement('button');
      btn.className = 'page-btn' + (i === page ? ' active' : '');
      btn.textContent = i;
      (function (i) {
        btn.addEventListener('click', function () {
          renderProducts(currentCat, i);
        });
      })(i);
      mount.appendChild(btn);
    }
  }

  // ===== 購物車更新 =====
  function updateCart() {
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

      cartList.querySelector('#goShop')?.addEventListener('click', function () {
        drawer.classList.remove('open');
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      subtotalEl.textContent = 'NT$0';
      shippingEl.textContent = 'NT$0';
      grandEl.textContent = 'NT$0';
      cartCount.textContent = '0';
      return;
    }

    cart.forEach(function (item, idx) {
      subtotal += item.price * item.qty;
      var row =
        '<div class="cart-card">' +
          '<img src="' + item.img + '" width="72" height="72">' +
          '<div>' +
            '<div>' + item.name + '</div>' +
            '<div class="cart-attr">顏色：' + item.color + '　尺寸：' + item.size + '</div>' +
            '<div class="cart-actions">' +
              '<button class="btn small dec" data-idx="' + idx + '">－</button>' +
              '<span>' + item.qty + '</span>' +
              '<button class="btn small inc" data-idx="' + idx + '">＋</button>' +
              '<button class="link-danger del" data-idx="' + idx + '">刪除</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-right">' + fmt(item.price * item.qty) + '</div>' +
        '</div>';
      cartList.insertAdjacentHTML('beforeend', row);
    });

    var shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : (subtotal > 0 ? 80 : 0);
    subtotalEl.textContent = fmt(subtotal);
    shippingEl.textContent = fmt(shipping);
    grandEl.textContent = fmt(subtotal + shipping);
    cartCount.textContent = cart.length;
  }

  // ===== 狀態 =====
  var currentCat = 'all';
  renderProducts('all', 1);

  // ===== Tabs 分類切換 =====
  $$('#tabs .tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('#tabs .tab').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderProducts(currentCat, 1);
    });
  });

  // ===== Grid 事件委派 =====
  grid.addEventListener('click', function (e) {
    // 縮圖切換
    if (e.target.tagName === 'IMG' && e.target.dataset.main) {
      var main = e.target.closest('.product').querySelector('.main-img img');
      var allThumbs = e.target.parentNode.querySelectorAll('img');
      allThumbs.forEach(function (img) { img.classList.remove('active'); });
      e.target.classList.add('active');
      main.src = e.target.dataset.main;
      return;
    }

    // 顏色/尺寸 chips
    var chip = e.target.closest('.chip[data-type]');
    if (chip) {
      var group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      return;
    }

    // 加入購物車
    if (e.target.classList.contains('add')) {
      var card = e.target.closest('.product');
      var id = card.dataset.id;
      var p = products.find(p => p.id === id);
      if (!p) return;

      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel  = card.querySelector('.size-group .chip.active');

      var item = {
        id: p.id,
        name: p.name,
        img: p.imgs[0],
        price: p.price,
        color: colorSel ? colorSel.dataset.val : (p.colors[0] || ''),
        size: sizeSel ? sizeSel.dataset.val : (p.sizes[0] || ''),
        qty: 1
      };

      cart.push(item);
      updateCart();
      toast('已加入購物車');
      drawer.classList.add('open');
      return;
    }
  });

  // ===== Cart 事件委派 =====
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

  // ===== 購物車開關 =====
  $('#openCart').addEventListener('click', function () {
    drawer.classList.add('open');
    updateCart();
  });
  $('#closeCart').addEventListener('click', function () {
    drawer.classList.remove('open');
  });

})(window, document);
