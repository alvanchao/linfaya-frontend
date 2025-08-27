// shop-core.js — 商品渲染、購物車核心

(function(w, d){
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

  function renderProducts(cat, page){
    grid.innerHTML = '';
    var list = (cat === 'all') ? products : products.filter(p => p.cat === cat);
    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    slice.forEach(function(p){
      var html =
        '<div class="product">' +
          '<div class="imgbox">' +
            '<div class="main-img"><img src="'+p.imgs[0]+'" alt="'+p.name+'"></div>' +
            '<div class="thumbs">' +
              p.imgs.map(function(img,i){
                return '<img src="'+img+'" data-main="'+p.imgs[i]+'" '+(i===0?'class="active"':'')+' />';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="body">' +
            '<div><b>'+p.name+'</b></div>' +
            // ✅ 修改這裡：分類與價格在同一行，用 | 分隔
            '<div class="muted">分類：' + p.cat + ' | 價格：' + fmt(p.price) + '</div>' +
            '<div class="chips">' +
              renderChips('顏色', p.colors) +
              renderChips('尺寸', p.sizes) +
            '</div>' +
            '<button class="btn pri add" data-id="'+p.id+'">加入購物車</button>' +
          '</div>' +
        '</div>';
      grid.insertAdjacentHTML('beforeend', html);
    });

    renderPager(pagerTop, list.length, page);
    renderPager(pagerBottom, list.length, page);
    infoText.textContent = '共 ' + list.length + ' 件';
  }

  function renderChips(label, arr){
    if (!arr || !arr.length) return '';
    return '<div class="chips">' +
      arr.map(function(v){
        return '<button class="chip">'+v+'</button>';
      }).join('') +
    '</div>';
  }

  function renderPager(mount, total, page){
    mount.innerHTML = '';
    var pages = Math.ceil(total / PAGE_SIZE);
    for (var i=1;i<=pages;i++){
      var btn = d.createElement('button');
      btn.className = 'page-btn' + (i===page?' active':'');
      btn.textContent = i;
      (function(i){
        btn.addEventListener('click', function(){
          renderProducts(currentCat, i);
        });
      })(i);
      mount.appendChild(btn);
    }
  }

  function updateCart(){
    cartList.innerHTML = '';
    var subtotal = 0;
    cart.forEach(function(item, idx){
      subtotal += item.price * item.qty;
      var row =
        '<div class="cart-card">' +
          '<img src="'+item.img+'" width="72" height="72">' +
          '<div>' +
            '<div>'+item.name+'</div>' +
            '<div class="cart-attr">顏色：'+item.color+'　尺寸：'+item.size+'</div>' +
            '<div class="cart-actions">' +
              '<button class="btn small dec" data-idx="'+idx+'">－</button>' +
              '<span>'+item.qty+'</span>' +
              '<button class="btn small inc" data-idx="'+idx+'">＋</button>' +
              '<button class="link-danger del" data-idx="'+idx+'">刪除</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-right">NT$'+(item.price*item.qty)+'</div>' +
        '</div>';
      cartList.insertAdjacentHTML('beforeend', row);
    });
    var shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : (subtotal>0?80:0);
    subtotalEl.textContent = 'NT$'+subtotal;
    shippingEl.textContent = 'NT$'+shipping;
    grandEl.textContent = 'NT$'+(subtotal+shipping);
    cartCount.textContent = cart.length;
  }

  // 全域狀態
  var currentCat = 'all';

  // 初始化
  renderProducts('all', 1);

  // 分類切換
  $$('#tabs .tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      $$('#tabs .tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderProducts(currentCat, 1);
    });
  });

  // 縮圖切換
  grid.addEventListener('click', function(e){
    if (e.target.tagName==='IMG' && e.target.dataset.main){
      var main = e.target.closest('.product').querySelector('.main-img img');
      var allThumbs = e.target.parentNode.querySelectorAll('img');
      allThumbs.forEach(function(img){ img.classList.remove('active'); });
      e.target.classList.add('active');
      main.src = e.target.dataset.main;
    }
  });

  // 購物車事件
  grid.addEventListener('click', function(e){
    if (e.target.classList.contains('add')){
      var id = e.target.dataset.id;
      var p = products.find(p=>p.id===id);
      if (!p) return;
      var item = {
        id:p.id, name:p.name, img:p.imgs[0], price:p.price,
        color:p.colors[0], size:p.sizes[0], qty:1
      };
      cart.push(item);
      updateCart();
      toast('已加入購物車');
      drawer.classList.add('open');
    }
  });

  cartList.addEventListener('click', function(e){
    if (e.target.classList.contains('dec')){
      var idx = +e.target.dataset.idx;
      if (cart[idx].qty>1) cart[idx].qty--;
      updateCart();
    }
    if (e.target.classList.contains('inc')){
      var idx2 = +e.target.dataset.idx;
      cart[idx2].qty++;
      updateCart();
    }
    if (e.target.classList.contains('del')){
      var idx3 = +e.target.dataset.idx;
      cart.splice(idx3,1);
      updateCart();
    }
  });

})(window, document);
