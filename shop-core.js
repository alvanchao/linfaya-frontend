document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('grid');
  var pagerTop = document.getElementById('pager');
  var pagerBottom = document.getElementById('pagerBottom');
  var infoText = document.getElementById('infoText');
  var cartList = document.getElementById('cartList');
  var cartCount = document.getElementById('cartCount');
  var subtotalEl = document.getElementById('subtotal');
  var shippingEl = document.getElementById('shipping');
  var grandEl = document.getElementById('grand');
  var drawer = document.getElementById('drawer');

  var PAGE_SIZE = window.PAGE_SIZE || 6;
  var FREE_SHIP_THRESHOLD = window.FREE_SHIP_THRESHOLD || 1000;

  var products = window.PRODUCTS || [];
  var cart = [];
  var currentCat = 'all';

  // ============ 商品渲染 ============
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

    infoText.textContent = '共 ' + list.length + ' 件';
    renderPager(pagerTop, list.length, page);
    renderPager(pagerBottom, list.length, page);
  }

  function renderPager(mount, total, page) {
    mount.innerHTML = '';
    var pages = Math.ceil(total / PAGE_SIZE);
    for (var i = 1; i <= pages; i++) {
      var btn = document.createElement('button');
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

  // ============ 購物車 ============
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
          '<button type="button" class="btn" id="goShop">去逛逛商品</button>' +
        '</div>';

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

  // ============ 綁定事件 ============
  // 商品格子
  grid.addEventListener('click', function (e) {
    if (e.target.tagName === 'IMG' && e.target.dataset.main) {
      var main = e.target.closest('.product').querySelector('.main-img img');
      e.target.parentNode.querySelectorAll('img').forEach(img => img.classList.remove('active'));
      e.target.classList.add('active');
      main.src = e.target.dataset.main;
    }

    var chip = e.target.closest('.chip[data-type]');
    if (chip) {
      var group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    }

    if (e.target.classList.contains('add')) {
      var card = e.target.closest('.product');
      var id = card.dataset.id;
      var p = products.find(x => x.id === id);
      if (!p) return;
      var colorSel = card.querySelector('.color-group .chip.active');
      var sizeSel = card.querySelector('.size-group .chip.active');
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
      drawer.classList.add('open');
      toast('已加入購物車');
    }
  });

  // 購物車操作
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

  // 開關購物車
  document.getElementById('openCart').addEventListener('click', function () {
    drawer.classList.add('open');
    updateCart();
  });
  document.getElementById('closeCart')?.addEventListener('click', function () {
    drawer.classList.remove('open');
  });

  // 初始化
  renderProducts('all', 1);
  updateCart();
});
