// 商品列表 + 購物車
window.App = window.App || {};
var App = window.App;

// Tabs
(function(){
  var tabs = App.$('#tabs');
  if(!tabs) return;
  tabs.addEventListener('click', function(e){
    var btn = e.target.closest('.tab'); if(!btn) return;
    App.$$('#tabs .tab').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active');
    App.state.cat = btn.dataset.cat;
    App.state.page = 1;
    App.renderProducts();
  });
})();

// 商品列表
App.renderProducts = function(){
  var list = App.state.cat==='all' ? App.PRODUCTS : App.PRODUCTS.filter(function(p){ return p.cat===App.state.cat; });
  var total = list.length, from = (App.state.page-1)*App.PAGE_SIZE;
  var pageItems = list.slice(from, from+App.PAGE_SIZE);

  var infoText = App.$('#infoText'); if(infoText) infoText.textContent = '共 ' + total + ' 件';
  App.buildPager(total);

  var grid = App.$('#grid'); if(!grid) return;
  grid.innerHTML='';

  pageItems.forEach(function(p){
    var el = document.createElement('div'); el.className = 'product';
    var first = (p.imgs && p.imgs[0]) || '';

    var defColor = (p.colors||[]).find(function(c){ return App.anySizeAvailable(p,c); }) || ((p.colors && p.colors[0])||'');
    var defSize  = App.firstAvailableSize(p, defColor) || ((p.sizes && p.sizes[0])||'');
    var defMax   = defSize ? App.maxQtyFor(p, defColor, defSize) : App.MAX_QTY_PER_ITEM;
    var defQty   = 1;

    el.innerHTML =
      '<div class="imgbox">'+
        '<div class="main-img"><img alt="'+p.name+'" src="'+first+'" loading="lazy"><div class="magnifier"></div></div>'+
        '<div class="thumbs">'+(p.imgs||[]).map(function(src,i){return '<img src="'+src+'" data-idx="'+i+'" class="'+(i===0?'active':'')+'" loading="lazy">';}).join('')+'</div>'+
      '</div>'+
      '<div class="body">'+
        '<b>'+p.name+'</b>'+
        '<div class="muted">分類：'+p.cat+'｜可選：顏色、尺寸</div>'+
        '<div class="price">'+App.fmt(p.price)+'</div>'+

        '<div style="margin-top:4px">'+
          '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>'+
          '<div class="color-group">'+ App.renderChips(p.colors, defColor, { disableCheck:function(c){ return !App.anySizeAvailable(p,c); } }) +'</div>'+
        '</div>'+

        '<div style="margin-top:6px">'+
          '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>'+
          '<div class="size-group">'+ App.renderChips(p.sizes, defSize, { disableCheck:function(s){ return App.isOOS(p, defColor, s); } }) +'</div>'+
          '<div class="oos-note" style="display:none">此顏色已售完</div>'+
        '</div>'+

        '<div style="margin-top:6px">'+
          '<div class="muted" style="font-size:12px;margin-bottom:6px">數量</div>'+
          '<div class="qty-group">'+ App.renderChips(Array.from({length:defMax}, function(_,i){ return i+1; }), defQty, { small:true }) +'</div>'+
        '</div>'+

        (App.PREORDER_MODE ? '<div class="muted" style="font-size:12px;margin-top:8px">預購交期約 '+App.LEAD_DAYS_MIN+'–'+App.LEAD_DAYS_MAX+' 工作天。</div>' : '')+

        '<div class="qty" style="margin-top:10px"><button type="button" class="btn pri add">加入購物車</button></div>'+
      '</div>';

    // thumbs
    var main = el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(function(img){
      img.addEventListener('click', function(){
        el.querySelectorAll('.thumbs img').forEach(function(i){ i.classList.remove('active'); });
        img.classList.add('active'); if(main) main.src = img.src;
      });
    });

    var oosNote = el.querySelector('.oos-note');

    // chips 行為
    el.addEventListener('click', function(ev){
      var chip = ev.target.closest('.chip'); if(!chip) return;
      if (chip.getAttribute('data-disabled') === '1') return;

      var isColor = !!chip.closest('.color-group');
      var isSize  = !!chip.closest('.size-group');
      var isQty   = !!chip.closest('.qty-group');

      function pick(groupSel, target){
        el.querySelectorAll(groupSel+' .chip').forEach(function(c){ c.classList.remove('active'); });
        target.classList.add('active');
      }

      if (isColor){
        pick('.color-group', chip);
        var color = chip.getAttribute('data-value');
        var sizeWrap = el.querySelector('.size-group');
        var firstOk = App.firstAvailableSize(p, color);
        if (!firstOk){
          sizeWrap.innerHTML = App.renderChips(p.sizes, '', { disableCheck:function(){ return true; } });
          if (oosNote) oosNote.style.display = 'block';
          el.querySelector('.qty-group').innerHTML = App.renderChips([1], 1, { small:true, disableCheck:function(){return true;} });
        }else{
          sizeWrap.innerHTML = App.renderChips(p.sizes, firstOk, { disableCheck:function(s){ return App.isOOS(p, color, s); } });
          if (oosNote) oosNote.style.display = 'none';
          var max = App.maxQtyFor(p, color, firstOk);
          el.querySelector('.qty-group').innerHTML = App.renderChips(Array.from({length:max}, function(_,i){ return i+1; }), 1, { small:true });
        }
      }

      if (isSize){
        pick('.size-group', chip);
        var colorEl = el.querySelector('.color-group .chip.active'); var color = colorEl ? colorEl.getAttribute('data-value') : '';
        var size = chip.getAttribute('data-value');
        var max2 = App.maxQtyFor(p, color, size);
        el.querySelector('.qty-group').innerHTML = App.renderChips(Array.from({length:max2}, function(_,i){ return i+1; }), 1, { small:true });
      }

      if (isQty){
        pick('.qty-group', chip);
      }
    });

    // 加入購物車
    var addBtn = el.querySelector('.add');
    if (addBtn) addBtn.addEventListener('click', function(){
      var colorEl = el.querySelector('.color-group .chip.active'); var color = colorEl ? colorEl.getAttribute('data-value') : '';
      var sizeEl  = el.querySelector('.size-group .chip.active');  var size  = sizeEl ? sizeEl.getAttribute('data-value')  : '';
      var qtyEl   = el.querySelector('.qty-group .chip.active');   var qty   = parseInt(qtyEl ? qtyEl.getAttribute('data-value') : '1', 10);

      if (!color){ alert('請先選擇顏色'); return; }
      if (!size){  alert('此顏色目前已售完，請改選其他顏色'); return; }
      if (App.isOOS(p, color, size)){ alert('此尺寸目前已售完'); return; }

      var max = App.maxQtyFor(p, color, size);
      if (qty > max){ alert('此組合最多可購買 '+max+' 件'); return; }

      App.addToCart(Object.assign({}, p, { color:color, size:size, qty:qty, img:first }));
    });

    grid.appendChild(el);
  });
};

// ====== 購物車 ======
App.sameLine = function(i,j){ return i.id===j.id && i.color===j.color && i.size===j.size; };
App.addToCart = function(item){
  var idx = App.state.cart.findIndex(function(i){ return App.sameLine(i,item); });
  var prod = App.productById(item.id);
  var max = App.maxQtyFor(prod||item, item.color, item.size);
  if (idx >= 0){
    var next = Math.min(max, (App.state.cart[idx].qty||1) + item.qty);
    App.state.cart[idx].qty = next;
    if(next === max) App.toast('本組合最多 '+max+' 件'); else App.toast('已加入購物車');
  }else{
    item.qty = Math.max(1, Math.min(max, item.qty||1));
    App.state.cart.push(item);
    App.toast('已加入購物車');
  }
  App.persist(); App.updateBadge(); App.renderCart();
};
App.removeItem = function(idx){ App.state.cart.splice(idx,1); App.persist(); App.renderCart(); App.updateBadge(); };
App.setQty = function(idx, qty){
  var cur = App.state.cart[idx]; if(!cur) return;
  var prod = App.productById(cur.id);
  var max = App.maxQtyFor(prod||cur, cur.color, cur.size);
  var next = Math.max(1, Math.min(max, parseInt(qty,10)||1));
  cur.qty = next;
  App.persist(); App.renderCart(); App.updateBadge();
};
window.removeItem = App.removeItem;
window.setQty = App.setQty;

App.subtotal = function(){
  return App.state.cart.reduce(function(s,i){ return s + (i.price||0)*(i.qty||1); }, 0);
};
App.calcShipping = function(){
  var sub = App.subtotal();
  if(sub >= App.FREE_SHIP_THRESHOLD) return 0;
  var ship = (function(){ var el = document.querySelector('input[name="ship"]:checked'); return el ? el.value : 'home'; })();
  return ship==='home' ? 80 : 60;
};

// 購物車抽屜
(function(){
  var drawer = App.$('#drawer');
  var oc = App.$('#openCart'); if(oc) oc.addEventListener('click', function(){ if(drawer){ drawer.classList.add('open'); App.renderCart(); } });
  var cc = App.$('#closeCart'); if(cc) cc.addEventListener('click', function(){ if(drawer) drawer.classList.remove('open'); });
})();

App.renderCart = function(){
  var list = App.$('#cartList'); if(!list) return;
  list.innerHTML = '';
  if(App.state.cart.length===0){
    list.innerHTML = '<p class="muted" style="padding:8px 12px">購物車是空的</p>';
  }
  App.state.cart.forEach(function(it, idx){
    var pic = (it.imgs && it.imgs[0]) || it.img || '';
    var prod = App.productById(it.id) || it;
    var max = App.maxQtyFor(prod, it.color, it.size);
    if ((it.qty||1) > max) it.qty = max;
    var row = document.createElement('div');
    row.className = 'cart-card';
    row.style = 'display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;border:1px solid #212736;border-radius:14px;background:#0e121b;padding:10px';
    row.innerHTML =
      '<img src="'+pic+'" alt="'+(it.name||'')+'" style="width:72px;height:72px;border-radius:12px;object-fit:cover">'+
      '<div>'+
        '<div><b>'+(it.name||'')+'</b></div>'+
        '<div class="cart-attr" style="color:#8a94a7;font-size:12px">顏色：'+(it.color||'')+'｜尺寸：'+(it.size||'')+'｜單價：'+App.fmt(it.price||0)+'</div>'+
        '<div class="cart-actions" style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap">'+
          '<div class="chips">'+
            Array.from({length:max}, function(_,i){ return i+1; }).map(function(v){
              var a = (v===(it.qty||1)) ? ' active' : '';
              return '<button type="button" class="chip small'+a+'" data-qty="'+v+'" data-idx="'+idx+'">'+v+'</button>';
            }).join('')+
          '</div>'+
          '<button class="link-danger" style="border:1px solid #3a2230;color:#fca5a5;background:transparent;border-radius:10px;padding:6px 10px;cursor:pointer" onclick="removeItem('+idx+')">移除商品</button>'+
        '</div>'+
      '</div>'+
      '<div class="cart-right" style="text-align:right"><b>'+App.fmt((it.price||0)*(it.qty||1))+'</b></div>';
    list.appendChild(row);
  });

  // 代理事件：數量 chips
  list.onclick = function(ev){
    var btnQty = ev.target.closest('.chip.small[data-qty]');
    if(btnQty){
      var idx = parseInt(btnQty.getAttribute('data-idx'),10);
      var qty = parseInt(btnQty.getAttribute('data-qty'),10);
      App.setQty(idx, qty);
      return;
    }
  };

  // 預購同意
  var extraMount = App.$('#agreementsMount');
  if (!extraMount) {
    extraMount = document.createElement('div');
    extraMount.id = 'agreementsMount';
    extraMount.style.margin = '8px 0';
    list.parentNode && list.parentNode.insertBefore(extraMount, list.nextSibling);
  }
  extraMount.innerHTML = (App.PREORDER_MODE && App.REQUIRE_PREORDER_CHECKBOX && App.state.cart.length) ? (
    '<div style="padding:10px 12px;border-top:1px solid #1f2430;background:#0b0f17;border-radius:8px;margin-bottom:8px">'+
      '<div style="font-size:13px;color:#e6e9ef;margin-bottom:6px">'+
        '<b>預購提醒</b>：此筆訂單為預購，出貨需 '+App.LEAD_DAYS_MIN+'–'+App.LEAD_DAYS_MAX+' 工作天；若逾期將主動通知並提供退款／更換。'+
        '<div style="margin-top:4px;color:#fff">預計出貨區間：'+App.preorderRangeToday(App.LEAD_DAYS_MIN, App.LEAD_DAYS_MAX)+'</div>'+
      '</div>'+
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#e6e9ef">'+
        '<input id="agreePreorder" type="checkbox" '+(App.state.agreePreorder?'checked':'')+' />'+
        '<span>我已了解並同意預購交期與相關說明。</span>'+
      '</label>'+
    '</div>'
  ) : '';

  var chkPre = App.$('#agreePreorder');
  if (chkPre) chkPre.onchange = function(e){ App.state.agreePreorder = !!e.target.checked; App.updatePayButtonState(); };

  var sub = App.subtotal(), ship = App.state.cart.length ? App.calcShipping() : 0;
  var subtotalEl = App.$('#subtotal'); if(subtotalEl) subtotalEl.textContent = App.fmt(sub);
  var shippingEl = App.$('#shipping'); if(shippingEl) shippingEl.textContent = App.fmt(ship);
  var grandEl = App.$('#grand'); if(grandEl) grandEl.textContent = App.fmt(sub+ship);

  App.updatePayButtonState();
};

App.updateBadge = function(){
  var n = App.state.cart.reduce(function(s,i){ return s + (i.qty||1); }, 0);
  var cc = App.$('#cartCount'); if(cc) cc.textContent = String(n);
};

App.canCheckout = function(){
  if(!App.state.cart.length) return false;
  if(App.PREORDER_MODE && App.REQUIRE_PREORDER_CHECKBOX && !App.state.agreePreorder) return false;
  return true;
};
App.updatePayButtonState = function(){
  var btn = App.$('#checkout'); if(!btn) return;
  var ok = App.canCheckout();
  btn.disabled = !ok;
  btn.title = ok ? '前往綠界付款' : (App.PREORDER_MODE && App.REQUIRE_PREORDER_CHECKBOX ? '請先勾選預購同意' : '請先加入商品');
};

// 初始化（小提醒 / 商品 / 年份）
(function(){
  var year = App.$('#year'); if(year) year.textContent = new Date().getFullYear();
  App.attachPreorderBanner();
  App.updateBadge();
  App.renderProducts();
})();