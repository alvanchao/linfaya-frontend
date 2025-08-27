/* shop-core.js — 商品渲染、庫存/購物車邏輯、分頁與 tabs */
(function (w, d) {
  // ===== 內部工具（不依賴現代語法）=====
  function getStock(product, color, size){
    var k = color + '-' + size;
    if (!product.stockMap) return Infinity;
    if (!(k in product.stockMap)) return Infinity;
    var n = Number(product.stockMap[k]);
    return isFinite(n) ? n : Infinity;
  }
  function isOOS(product, color, size){ return getStock(product, color, size) <= 0; }
  function maxQtyFor(product, color, size){
    var stock = getStock(product, color, size);
    var cap = w.MAX_QTY_PER_ITEM || 5;
    return Math.min(cap, stock===Infinity ? cap : stock);
  }
  function anySizeAvailable(product, color){
    var arr = product.sizes || [];
    for (var i=0;i<arr.length;i++){
      if (!isOOS(product, color, arr[i])) return true;
    }
    return false;
  }
  function firstAvailableSize(product, color){
    var arr = product.sizes || [];
    for (var i=0;i<arr.length;i++){
      if (!isOOS(product, color, arr[i])) return arr[i];
    }
    return null;
  }
  function productById(id){
    var list = w.PRODUCTS || [];
    for (var i=0;i<list.length;i++){ if (list[i].id===id) return list[i]; }
    return null;
  }

  // ===== 狀態 =====
  var state = {
    cat: 'all',
    page: 1,
    cart: [],
    cvs: null,
    currentMapType: null,
    agreePreorder: !w.REQUIRE_PREORDER_CHECKBOX
  };
  try {
    var saved = sessionStorage.getItem('cart');
    state.cart = saved ? JSON.parse(saved) : [];
  } catch(_) {}

  function persist(){ try{ sessionStorage.setItem('cart', JSON.stringify(state.cart)); }catch(_){} }

  // ===== chips UI =====
  function chipHTML(label, value, active, disabled, extraClass){
    var cls = ['chip', extraClass || '', active?'active':'', disabled?'disabled':''].filter(Boolean).join(' ');
    var disAttr = disabled ? 'aria-disabled="true" data-disabled="1"' : '';
    return '<button type="button" class="'+cls+'" data-value="'+String(value)+'" '+disAttr+'>'+label+'</button>';
  }
  function renderChips(values, activeValue, opts){
    values = values || [];
    opts = opts || {};
    var html = '<div class="chips">';
    for (var i=0;i<values.length;i++){
      var v = values[i];
      var disabled = typeof opts.disableCheck === 'function' ? !!opts.disableCheck(v) : false;
      html += chipHTML(v, v, String(v)===String(activeValue), disabled, opts.small?'small':'');
    }
    html += '</div>';
    return html;
  }

  // ===== Tabs & 分頁 =====
  var tabs = $('#tabs');
  if (tabs) {
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.tab') : null; if(!btn) return;
      $$('#tabs .tab').forEach(function(t){ t.classList.remove('active'); });
      btn.classList.add('active');
      state.cat = btn.getAttribute('data-cat'); state.page = 1;
      renderProducts();
    });
  }

  function buildPager(total, pageSize) {
    pageSize = pageSize || w.PAGE_SIZE;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var mountTop = $('#pager'), mountBottom = $('#pagerBottom');
    function put(mount) {
      if(!mount) return;
      mount.innerHTML = '';
      for (var p=1;p<=pages;p++){
        (function (pno) {
          var b=d.createElement('button');
          b.type='button'; b.textContent=String(pno);
          b.className='page-btn' + (pno===state.page?' active':'');
          b.onclick=function(){ state.page=pno; renderProducts(); };
          mount.appendChild(b);
        })(p);
      }
    }
    put(mountTop); put(mountBottom);
  }

  // ===== 商品列表 =====
  w.renderProducts = function renderProducts(){
    var all = w.PRODUCTS || [];
    var list = state.cat==='all' ? all : all.filter(function(p){ return p.cat===state.cat; });
    var total=list.length, from=(state.page-1)*(w.PAGE_SIZE||6);
    var pageItems=list.slice(from, from+(w.PAGE_SIZE||6));

    var infoText = $('#infoText'); if(infoText) infoText.textContent = '共 ' + total + ' 件';
    buildPager(total, w.PAGE_SIZE);

    var grid=$('#grid'); if(!grid) return;
    grid.innerHTML='';

    pageItems.forEach(function(p){
      var el=d.createElement('div'); el.className='product';
      var first=(p.imgs && p.imgs[0]) ? p.imgs[0] : '';

      var defColor = (p.colors||[]).filter(function(c){ return anySizeAvailable(p,c); })[0] || (p.colors && p.colors[0]) || '';
      var defSize  = firstAvailableSize(p, defColor) || (p.sizes && p.sizes[0]) || '';
      var defMax   = defSize ? maxQtyFor(p, defColor, defSize) : w.MAX_QTY_PER_ITEM;
      var defQty   = 1;

      el.innerHTML =
        '<div class="imgbox">' +
          '<div class="main-img"><img alt="'+p.name+'" src="'+first+'" loading="lazy"><div class="magnifier"></div></div>' +
          '<div class="thumbs">'+ (p.imgs||[]).map(function(src,i){ return '<img src="'+src+'" data-idx="'+i+'" class="'+(i===0?'active':'')+'" loading="lazy">'; }).join('') +'</div>' +
        '</div>' +
        '<div class="body">' +
          '<b>'+p.name+'</b>' +
          '<div class="muted">分類：'+p.cat+'｜可選：顏色、尺寸</div>' +
          '<div class="price">'+fmt(p.price)+'</div>' +

          '<div style="margin-top:4px">' +
            '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
            '<div class="color-group">'+ renderChips(p.colors || [], defColor, { disableCheck: function(c){ return !anySizeAvailable(p, c); } }) +'</div>' +
          '</div>' +

          '<div style="margin-top:6px">' +
            '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
            '<div class="size-group">'+ renderChips(p.sizes || [], defSize, { disableCheck:function(s){ return isOOS(p, defColor, s); } }) +'</div>' +
            '<div class="oos-note" style="display:none">此顏色已售完</div>' +
          '</div>' +

          '<div style="margin-top:6px">' +
            '<div class="muted" style="font-size:12px;margin-bottom:6px">數量</div>' +
            '<div class="qty-group">'+ renderChips(Array.from({length:defMax}, function(){return 0;}).map(function(_,i){return i+1;}), defQty, { small:true }) +'</div>' +
          '</div>' +

          (w.PREORDER_MODE ? ('<div class="muted" style="font-size:12px;margin-top:8px">預購交期約 '+w.LEAD_DAYS_MIN+'–'+w.LEAD_DAYS_MAX+' 工作天。</div>') : '') +
          '<div class="qty" style="margin-top:10px"><button type="button" class="btn pri add">加入購物車</button></div>' +
        '</div>';

      var main = el.querySelector('.main-img img');
      el.querySelectorAll('.thumbs img').forEach(function(img){
        img.addEventListener('click', function(){
          el.querySelectorAll('.thumbs img').forEach(function(i){ i.classList.remove('active'); });
          img.classList.add('active'); if(main) main.src=img.src;
        });
      });

      var oosNote = el.querySelector('.oos-note');

      el.addEventListener('click', function (ev) {
        var chip = ev.target && ev.target.classList && ev.target.classList.contains('chip') ? ev.target : (ev.target.closest ? ev.target.closest('.chip') : null);
        if(!chip) return;
        if (chip.getAttribute('data-disabled') === '1') return;

        var inColor = !!(chip.closest && chip.closest('.color-group'));
        var inSize  = !!(chip.closest && chip.closest('.size-group'));
        var inQty   = !!(chip.closest && chip.closest('.qty-group'));

        function pick(groupSel, target){
          el.querySelectorAll(groupSel + ' .chip').forEach(function(c){ c.classList.remove('active'); });
          target.classList.add('active');
        }

        if (inColor){
          pick('.color-group', chip);
          var color = chip.getAttribute('data-value');
          var sizeWrap = el.querySelector('.size-group');
          var firstOk = firstAvailableSize(p, color);
          if (!firstOk){
            sizeWrap.innerHTML = renderChips(p.sizes||[], '', { disableCheck:function(){return true;} });
            if (oosNote) oosNote.style.display = 'block';
            el.querySelector('.qty-group').innerHTML = renderChips([1], 1, { small:true, disableCheck:function(){return true;} });
          }else{
            sizeWrap.innerHTML = renderChips(p.sizes||[], firstOk, { disableCheck:function(s){ return isOOS(p, color, s); } });
            if (oosNote) oosNote.style.display = 'none';
            var max = maxQtyFor(p, color, firstOk);
            el.querySelector('.qty-group').innerHTML = renderChips(Array.from({length:max}, function(){return 0;}).map(function(_,i){return i+1;}), 1, { small:true });
          }
        }

        if (inSize){
          pick('.size-group', chip);
          var color2El = el.querySelector('.color-group .chip.active');
          var color2 = color2El ? color2El.getAttribute('data-value') : '';
          var size = chip.getAttribute('data-value');
          var max2 = maxQtyFor(p, color2, size);
          el.querySelector('.qty-group').innerHTML = renderChips(Array.from({length:max2}, function(){return 0;}).map(function(_,i){return i+1;}), 1, { small:true });
        }

        if (inQty){
          pick('.qty-group', chip);
        }
      });

      // 加入購物車
      var addBtn = el.querySelector('.add');
      if (addBtn) addBtn.addEventListener('click', function(){
        var colorEl = el.querySelector('.color-group .chip.active');
        var sizeEl  = el.querySelector('.size-group .chip.active');
        var qtyEl   = el.querySelector('.qty-group .chip.active');

        var color = colorEl ? colorEl.getAttribute('data-value') : '';
        var size  = sizeEl ? sizeEl.getAttribute('data-value') : '';
        var qty   = parseInt(qtyEl ? qtyEl.getAttribute('data-value') : '1', 10);

        if (!color){ return alert('請先選擇顏色'); }
        if (!size){ return alert('此顏色目前已售完，請改選其他顏色'); }
        if (isOOS(p, color, size)){ return alert('此尺寸目前已售完'); }

        var max = maxQtyFor(p, color, size);
        if (qty > max) return alert('此組合最多可購買 ' + max + ' 件');

        addToCart(Object.assign({}, p, { color:color, size:size, qty:qty, img:first }));
      });

      grid.appendChild(el);
    });
  };

  // ===== 購物車 =====
  function sameLine(i, j){ return i.id===j.id && i.color===j.color && i.size===j.size; }

  w.addToCart = function addToCart(item){
    var idx = state.cart.findIndex(function(i){ return sameLine(i,item); });
    if (idx >= 0){
      var prod = productById(item.id) || item;
      var max = maxQtyFor(prod, item.color, item.size);
      var next = Math.min(max, (state.cart[idx].qty||1) + item.qty);
      state.cart[idx].qty = next;
      if(next === max) toast('本組合最多 ' + max + ' 件'); else toast('已加入購物車');
    }else{
      var prod2 = productById(item.id) || item;
      var max2 = maxQtyFor(prod2, item.color, item.size);
      item.qty = Math.max(1, Math.min(max2, item.qty||1));
      state.cart.push(item);
      toast('已加入購物車');
    }
    persist(); updateBadge(); renderCart();
  };
  w.removeItem = function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); };
  w.setQty = function setQty(idx, qty){
    var cur = state.cart[idx]; if(!cur) return;
    var prod = productById(cur.id) || cur;
    var max = maxQtyFor(prod, cur.color, cur.size);
    var next = Math.max(1, Math.min(max, parseInt(qty,10)||1));
    cur.qty = next;
    persist(); renderCart(); updateBadge();
  };

  function subtotal(){ return state.cart.reduce(function(s,i){ return s + (i.price||0)*(i.qty||1); }, 0); }
  function calcShipping(){
    var sub=subtotal();
    if(sub >= w.FREE_SHIP_THRESHOLD) return 0;
    var shipEl = d.querySelector('input[name="ship"]:checked');
    var ship = shipEl ? shipEl.value : 'home';
    return ship==='home'?80:60;
  }

  w.renderCart = function renderCart(){
    var list=$('#cartList'); if(!list) return;
    list.innerHTML='';
    if(state.cart.length===0){
      list.innerHTML='<p class="muted" style="padding:8px 12px">購物車是空的</p>';
    }

    state.cart.forEach(function(it,idx){
      var pic = (it.imgs && it.imgs[0]) ? it.imgs[0] : (it.img || '');
      var prod = productById(it.id) || it;
      var max = maxQtyFor(prod, it.color, it.size);
      if ((it.qty||1) > max) it.qty = max;

      var row = d.createElement('div');
      row.className = 'cart-card';
      row.innerHTML =
        '<img src="'+pic+'" alt="'+(it.name||'')+'" style="width:72px;height:72px;border-radius:12px;object-fit:cover">' +
        '<div>' +
          '<div><b>'+(it.name||'')+'</b></div>' +
          '<div class="cart-attr">顏色：'+(it.color||'')+'｜尺寸：'+(it.size||'')+'｜單價：'+fmt(it.price||0)+'</div>' +
          '<div class="cart-actions">' +
            '<div class="chips">' +
              Array.from({length:max}).map(function(_,i){
                var v=i+1, a=(v===(it.qty||1)?' active':'');
                return '<button type="button" class="chip small'+a+'" data-qty="'+v+'" data-idx="'+idx+'">'+v+'</button>';
              }).join('') +
            '</div>' +
            '<button class="link-danger" onclick="removeItem('+idx+')">移除商品</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-right"><b>'+fmt((it.price||0)*(it.qty||1))+'</b></div>';
      list.appendChild(row);
    });

    list.onclick = function (ev){
      var btnQty = ev.target && ev.target.closest ? ev.target.closest('.chip.small[data-qty]') : null;
      if(btnQty){
        var idx = parseInt(btnQty.getAttribute('data-idx'),10);
        var qty = parseInt(btnQty.getAttribute('data-qty'),10);
        w.setQty(idx, qty);
        return;
      }
    };

    // 預購同意
    var extraMount = $('#agreementsMount');
    if (!extraMount) {
      extraMount = d.createElement('div');
      extraMount.id = 'agreementsMount';
      extraMount.style.margin = '8px 0';
      list.parentNode && list.parentNode.insertBefore(extraMount, list.nextSibling);
    }
    extraMount.innerHTML = (w.PREORDER_MODE && w.REQUIRE_PREORDER_CHECKBOX && state.cart.length) ? (
      '<div style="padding:10px 12px;border-top:1px solid #1f2430;background:#0b0f17;border-radius:8px;margin-bottom:8px">' +
        '<div style="font-size:13px;color:#e6e9ef;margin-bottom:6px">' +
          '<b>預購提醒</b>：此筆訂單為預購，出貨需 '+w.LEAD_DAYS_MIN+'–'+w.LEAD_DAYS_MAX+' 工作天；' +
          '若逾期將主動通知並提供退款／更換。' +
          '<div style="margin-top:4px;color:#fff">預計出貨區間：'+w.preorderRangeToday(w.LEAD_DAYS_MIN, w.LEAD_DAYS_MAX)+'</div>' +
        '</div>' +
        '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#e6e9ef">' +
          '<input id="agreePreorder" type="checkbox" '+(state.agreePreorder?'checked':'')+' />' +
          '<span>我已了解並同意預購交期與相關說明。</span>' +
        '</label>' +
      '</div>'
    ) : '';

    var chkPre = $('#agreePreorder');
    if (chkPre) chkPre.onchange = function (e){ state.agreePreorder = !!e.target.checked; updatePayButtonState(); };

    var sub=subtotal(), ship=state.cart.length?calcShipping():0;
    var el1=$('#subtotal'), el2=$('#shipping'), el3=$('#grand');
    if (el1) el1.textContent=fmt(sub);
    if (el2) el2.textContent=fmt(ship);
    if (el3) el3.textContent=fmt(sub+ship);
    updatePayButtonState();
  };

  function updateBadge(){
    var n=state.cart.reduce(function(s,i){ return s + (i.qty||1); }, 0);
    var cc=$('#cartCount'); if(cc) cc.textContent=String(n);
  }
  w.updateBadge = updateBadge;

  function canCheckout(){
    if(!state.cart.length) return false;
    if(w.PREORDER_MODE && w.REQUIRE_PREORDER_CHECKBOX && !state.agreePreorder) return false;
    return true;
  }
  function updatePayButtonState(){
    var btn = $('#checkout');
    if(!btn) return;
    var ok = canCheckout();
    btn.disabled = !ok;
    btn.title = ok ? '前往綠界付款' : (w.PREORDER_MODE && w.REQUIRE_PREORDER_CHECKBOX ? '請先勾選預購同意' : '請先加入商品');
  }
  w.updatePayButtonState = updatePayButtonState;

  // Drawer
  var drawer=$('#drawer');
  var openCartBtn  = $('#openCart');
  var closeCartBtn = $('#closeCart');
  if(openCartBtn) openCartBtn.addEventListener('click', function(){ if(drawer){drawer.classList.add('open');} w.renderCart(); });
  if(closeCartBtn) closeCartBtn.addEventListener('click', function(){ if(drawer){drawer.classList.remove('open');} });

  // 初始化
  updateBadge(); renderProducts(); renderCart();

})(window, document);