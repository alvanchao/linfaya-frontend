/* checkout-and-shipping.js — 選店、同步清空、付款流程 */
(function (w, d) {

  // 配送區塊顯示切換
  function onShipChange(){
    var checked = d.querySelector('input[name="ship"]:checked');
    var ship = checked ? checked.value : 'home';
    var home  = d.getElementById('homeFields');
    var fam   = d.getElementById('familyFields');
    var seven = d.getElementById('sevenFields');
    if(home)  home.style.display  = ship==='home'  ?'block':'none';
    if(fam)   fam.style.display   = ship==='family'?'block':'none';
    if(seven) seven.style.display = ship==='seven' ?'block':'none';
    if (w.renderCart) w.renderCart();
    try{ sessionStorage.setItem('SHIP_OPT', ship); }catch(_){}
  }
  $$('.form input[name="ship"]').forEach(function(r){ r.addEventListener('change', onShipChange); });
  onShipChange();

  // —— 選店（官方地圖）——
  async function openCvsMap(logisticsSubType){
    var preWin = w.openNamedWindow(w.CVS_WIN_NAME, '即將開啟官方門市地圖…');
    try{
      var signed = await w.fetchJSON(
        w.API_BASE + '/api/ecpay/map/sign',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ LogisticsSubType: logisticsSubType }) },
        { timeoutMs: 20000, retries: 2 }
      );
      if(!signed || !signed.endpoint || !signed.fields) throw new Error('sign failed');
      var target = preWin ? w.CVS_WIN_NAME : '_self';
      w.postForm(signed.endpoint, signed.fields, target);
    }catch(e){
      console.error(e);
      if (preWin) try{ preWin.close(); }catch(_){}
      alert('目前未能開啟門市地圖，請稍後再試。');
    }
  }

  d.addEventListener('click', function(e){
    var t = e.target;
    if(!(t instanceof HTMLElement)) return;
    if(t.id==='btnPickFamily'){
      e.preventDefault();
      try{ sessionStorage.setItem('CVS_TYPE','family'); }catch(_){}
      onShipChange();
      openCvsMap('FAMIC2C');
    }
    if(t.id==='btnPickSeven'){
      e.preventDefault();
      try{ sessionStorage.setItem('CVS_TYPE','seven'); }catch(_){}
      onShipChange();
      openCvsMap('UNIMARTC2C');
    }
  });

  // 地圖回傳
  window.addEventListener('message', function(ev){
    try{
      if(w.TRUSTED_ORIGINS.indexOf(ev.origin) === -1) return;
      var data=ev.data||{};
      if(data.type!=='EC_LOGISTICS_PICKED') return;
      var p=data.payload||{};

      var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
      var name = p.CVSStoreName || p.StName || p.StoreName || '';
      var address = p.CVSAddress || p.CVSAddr || p.Address || '';

      var savedType = sessionStorage.getItem('CVS_TYPE');
      if(savedType==='family'){
        var label1 = d.getElementById('familyPicked'); if(label1) label1.textContent = name+'（'+id+'）｜'+address;
      }else if(savedType==='seven'){
        var label2 = d.getElementById('sevenPicked'); if(label2) label2.textContent = name+'（'+id+'）｜'+address;
      }
    }catch(e){ console.error(e); }
  });

  // 本頁回來（localStorage 傳遞）
  (function(){
    try{
      var raw = localStorage.getItem('EC_LOGISTICS_PICKED');
      if(!raw){
        var saved = sessionStorage.getItem('SHIP_OPT');
        if (saved) onShipChange();
        return;
      }
      localStorage.removeItem('EC_LOGISTICS_PICKED');
      var p = JSON.parse(raw);
      var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
      var name = p.CVSStoreName || p.StName || p.StoreName || '';
      var address = p.CVSAddress || p.CVSAddr || p.Address || '';
      var type = sessionStorage.getItem('CVS_TYPE');
      if(type==='family'){
        var l1 = d.getElementById('familyPicked'); if(l1) l1.textContent = name+'（'+id+'）｜'+address;
        onShipChange();
      }else if(type==='seven'){
        var l2 = d.getElementById('sevenPicked'); if(l2) l2.textContent = name+'（'+id+'）｜'+address;
        onShipChange();
      }
    }catch(e){}
  })();

  // thankyou／cashier 回傳（多分頁同步清空）
  window.addEventListener('message', function(ev){
    try{
      if(w.TRUSTED_ORIGINS.indexOf(ev.origin) === -1) return;
      var data = ev.data || {};
      if (data && data.type === 'EC_PAY_DONE') {
        try { localStorage.setItem('EC_CLEAR_CART','1'); } catch(_) {}
        clearCart();
        try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
      }
    }catch(e){ console.error(e); }
  });

  // 備援：不同分頁同步清空
  window.addEventListener('storage', function(e){
    if (e.key === 'EC_CLEAR_CART' && e.newValue === '1') {
      clearCart();
      try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
    }
  });
  function clearCart(){
    try{ sessionStorage.removeItem('cart'); }catch(_){}
    // 由 shop-core 的 renderCart/updateBadge 處理畫面
    if (window.renderCart) window.renderCart();
    if (window.updateBadge) window.updateBadge();
    toast('付款完成，已清空購物車');
  }

  // 快取回來也檢查一次旗標
  function checkClearFlag(){
    try{
      if (localStorage.getItem('EC_CLEAR_CART') === '1') {
        localStorage.removeItem('EC_CLEAR_CART');
        clearCart();
      }
    }catch(e){}
  }
  checkClearFlag();
  window.addEventListener('focus', checkClearFlag);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) checkClearFlag(); });
  window.addEventListener('pageshow', function(e){
    if (e.persisted) {
      checkClearFlag();
      try {
        var raw = sessionStorage.getItem('cart');
        window.__cart_cache__ = raw ? JSON.parse(raw) : [];
        if (window.renderCart) window.renderCart();
        if (window.updateBadge) window.updateBadge();
      } catch(_) {}
    }
  });

  // ===== 付款 =====
  function validPhone(v){ return /^09\d{8}$/.test(v); }
  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  $('#checkout') && $('#checkout').addEventListener('click', async function (){
    // 這兩個函式在 shop-core.js 內
    if (!window.updatePayButtonState || !window.renderCart) {}

    // 取購物車
    var cart = [];
    try{
      cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
    }catch(_){ cart = []; }
    if(!cart.length) return alert('購物車是空的');

    if(w.PREORDER_MODE && w.REQUIRE_PREORDER_CHECKBOX){
      var agree = document.getElementById('agreePreorder');
      if (!agree || !agree.checked) return alert('請先勾選預購同意，再進行付款。');
    }

    var name = ($('#name')||{}).value || '';
    var email = ($('#email')||{}).value || '';
    var phone = ($('#phone')||{}).value || '';
    var checked = d.querySelector('input[name="ship"]:checked');
    var shipOpt = checked ? checked.value : 'home';
    var addr = ($('#addr')||{}).value || '';

    if(!name) return alert('請填寫收件姓名');
    if(!validEmail(email)) return alert('請輸入正確 Email');
    if(!validPhone(phone)) return alert('手機需為 09 開頭 10 碼');

    var shippingInfo = '';
    if(shipOpt==='home'){
      if(!addr) return alert('請填寫收件地址');
      shippingInfo='自家宅配｜'+addr;
    }
    if(shipOpt==='family'){
      var famText = ($('#familyPicked')||{}).textContent || '';
      if(!famText || famText.indexOf('尚未選擇')>=0) return alert('請先選擇全家門市');
      shippingInfo='全家店到店｜'+famText;
    }
    if(shipOpt==='seven'){
      var sevText = ($('#sevenPicked')||{}).textContent || '';
      if(!sevText || sevText.indexOf('尚未選擇')>=0) return alert('請先選擇 7-11 門市');
      shippingInfo='7-11 店到店｜'+sevText;
    }

    // 付款前再次檢查庫存上限
    for (var i=0;i<cart.length;i++){
      var it = cart[i];
      var prod = (window.PRODUCTS || []).find(function(p){ return p.id===it.id; }) || it;
      var k = (it.color||'')+'-'+(it.size||'');
      var n = (prod.stockMap && (k in prod.stockMap)) ? Number(prod.stockMap[k]) : Infinity;
      var cap = Math.min(window.MAX_QTY_PER_ITEM||5, isFinite(n)?n:(window.MAX_QTY_PER_ITEM||5));
      if ((it.qty||1) > cap){
        return alert('「'+it.name+'（'+it.color+'/'+it.size+'）」目前最多可購買 '+cap+' 件，請調整數量再結帳。');
      }
    }

    var sub = cart.reduce(function(s,i){ return s + (i.price||0)*(i.qty||1); }, 0);
    var shipFee = cart.length ? (sub>=w.FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
    var amount = sub + shipFee;

    var itemNameRaw = cart.map(function(i){ return i.name+'('+i.color+'/'+i.size+')x'+i.qty; }).join('#');
    var itemName = itemNameRaw.slice(0, 200);
    var tradeDesc = 'Linfaya Shop Order'.slice(0, 100);

    var payload = {
      orderId: 'LF'+Date.now(),
      amount: amount,
      itemName: itemName,
      tradeDesc: tradeDesc,
      name: name, email: email, phone: phone,
      shippingInfo: shippingInfo,
      subtotal: sub,
      shipFee: shipFee,
      returnURL: w.API_BASE + '/api/ecpay/return'
    };

    var win = w.openNamedWindow(w.CASHIER_WIN_NAME, '正在前往綠界收銀台…');

    try{
      var data = await w.fetchJSON(
        w.API_BASE + '/api/ecpay/create',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) },
        { timeoutMs: 20000, retries: 2 }
      );
      if(!data || !data.endpoint || !data.fields) throw new Error('missing fields');
      var target = win ? w.CASHIER_WIN_NAME : '_self';
      w.postForm(data.endpoint, data.fields, target);
      if(!win){ toast('已在本頁開啟綠界付款'); }
    }catch(e){
      console.error(e);
      if(win) try{ win.close(); }catch(_){}
      alert('目前尚未連上後端，請稍後再試。');
    }
  });

})(window, document);