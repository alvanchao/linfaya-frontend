/* checkout-and-shipping.js — 選店、同步清空、付款流程（含客製化不符強制阻擋） */
(function (w, d) {
  // 小工具
  function $(s){ return d.querySelector(s); }
  function validPhone(v){ return /^09\d{8}$/.test(v); }
  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // ===== 客製化檢查（CUSTOM01）=====
  function isCustomId(id){ return String(id||'').toLowerCase() === 'custom01'; }
  function parseCustomCode(code){
    if(!code) return null;
    var m = String(code).trim().toUpperCase().match(/^LFY(\d{1,6})$/);
    if(!m) return null;
    var amount = parseInt(m[1],10);
    var unitsExpected = Math.round(amount / 10);
    return { code:'LFY'+m[1], unitsExpected: unitsExpected };
  }
  function hasCustomMismatch(cart){
    for (var i=0;i<cart.length;i++){
      var it = cart[i];
      if (isCustomId(it.id) && it.customCode){
        var p = parseCustomCode(it.customCode);
        if (!p || Number(it.qty||0) !== Number(p.unitsExpected||0)) return true;
      }
    }
    return false;
  }

  // ===== 配送方式顯示切換 =====
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

  // 用事件委派監聽配送選擇與挑選門市按鈕（避免 $$/未定義）
  d.addEventListener('change', function(e){
    var t = e.target;
    if (t && t.name === 'ship') onShipChange();
  });
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

  // —— 官方門市地圖（需後端簽名 API）——
  async function openCvsMap(kind){
    var target = w.CVS_WIN_NAME || 'EC_CVS_MAP';
    var win = window.open('about:blank', target, 'width=960,height=720,noopener,noreferrer');
    try{
      var signed = await w.fetchJSON(
        w.API_BASE + '/api/ecpay/map/sign',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind: kind||'FAMIC2C' }) },
        { timeoutMs: 15000, retries: 1 }
      );
      if(!signed || !signed.endpoint || !signed.fields) throw new Error('missing map sign');
      w.postForm(signed.endpoint, signed.fields, target);
    }catch(e){
      console.error(e);
      if (win) try{ win.close(); }catch(_){}
      alert('開啟門市地圖失敗，請稍後再試。');
    }
  }

  // ===== 多分頁購物車同步清空（與原邏輯相同）=====
  function clearCart(){
    try{ sessionStorage.removeItem('cart'); }catch(_){}
    if (w.renderCart) w.renderCart();
    if (w.updateBadge) w.updateBadge();
  }
  window.addEventListener('message', function(ev){
    try{
      if ((w.TRUSTED_ORIGINS||[]).indexOf(ev.origin) === -1) return;
      var data = ev.data || {};
      if (data.type === 'EC_PAY_DONE') {
        try { localStorage.setItem('EC_CLEAR_CART','1'); } catch(_) {}
        clearCart();
        try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
      }
      if (data.type === 'EC_LOGISTICS_PICKED') {
        var p=data.payload||{};
        var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
        var name = p.CVSStoreName || p.StName || p.StoreName || '';
        var address = p.CVSAddress || p.CVSAddr || p.Address || '';
        var type = (sessionStorage.getItem('CVS_TYPE')||'').toLowerCase();
        if(type==='family'){
          var l1 = d.getElementById('familyPicked'); if(l1) l1.textContent = name+'（'+id+'）｜'+address;
          onShipChange();
        }else if(type==='seven'){
          var l2 = d.getElementById('sevenPicked'); if(l2) l2.textContent = name+'（'+id+'）｜'+address;
          onShipChange();
        }
      }
    }catch(e){}
  });
  window.addEventListener('storage', function(e){
    if (e.key === 'EC_CLEAR_CART' && e.newValue === '1') {
      clearCart();
      try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
    }
  });

  // 初始一次
  onShipChange();
  if (w.renderCart) w.renderCart();
  if (w.updatePayButtonState) w.updatePayButtonState();

  // ===== 付款按鈕 =====
  var btn = $('#checkout');
  if (btn) btn.addEventListener('click', async function (){
    // 讀購物車
    var cart = [];
    try{ cart = JSON.parse(sessionStorage.getItem('cart') || '[]'); }catch(_){}
    if(!cart.length) return alert('購物車是空的');

    // 客製化不符 ⇒ 阻擋
    if (hasCustomMismatch(cart)) {
      return alert('客製化認證碼與份數不一致，請修正後才能結帳。');
    }

    // 預購需同意
    if (w.PREORDER_MODE && w.REQUIRE_PREORDER_CHECKBOX){
      var agree = $('#agreePreorder');
      if (!agree || !agree.checked) return alert('請先勾選預購同意，再進行付款。');
    }

    // 基本欄位
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

    // 最後一次庫存上限檢查（一般商品）
    for (var i=0;i<cart.length;i++){
      var it = cart[i];
      if (!isCustomId(it.id)) {
        var prod = (w.PRODUCTS || []).find(function(p){ return p.id===it.id; }) || it;
        var k = (it.color||'')+'-'+(it.size||'');
        var n = (prod.stockMap && (k in prod.stockMap)) ? Number(prod.stockMap[k]) : Infinity;
        var cap = Math.min(w.MAX_QTY_PER_ITEM||5, isFinite(n)?n:(w.MAX_QTY_PER_ITEM||5));
        if ((it.qty||1) > cap){
          return alert('「'+it.name+'（'+(it.color||'-')+'/'+(it.size||'-')+'）」最多可購買 '+cap+' 件，請調整數量再結帳。');
        }
      }
    }

    // 金額
    var sub = cart.reduce(function(s,i){ return s + (i.price||0)*(i.qty||1); }, 0);
    var shipFee = (function(){
      if (sub <= 0) return 0;
      if (sub >= (w.FREE_SHIP_THRESHOLD||1000)) return 0;
      return (shipOpt === 'home') ? 80 : 60; // 與 shop-core.js 一致
    })();
    var amount = sub + shipFee;

    // 整理品名（給綠界）
    var itemNameRaw = cart.map(function(i){
      if (isCustomId(i.id)) return (i.name || '客製化') + 'x' + i.qty;
      var attrs = (i.color?i.color:'-') + '/' + (i.size?i.size:'-');
      return (i.name||'商品') + '('+attrs+')x' + i.qty;
    }).join('#');
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

    // 送到後端換綠界表單
    var win = null;
    if (w.OPEN_CASHIER_IN_POPUP){
      try{ win = w.openNamedWindow(w.CASHIER_WIN_NAME || 'EC_PAY', '即將前往付款…'); }catch(_){}
    }
    try{
      var data = await w.fetchJSON(
        w.API_BASE + '/api/ecpay/create',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) },
        { timeoutMs: 20000, retries: 2 }
      );
      if(!data || !data.endpoint || !data.fields) throw new Error('missing fields');
      var target = win ? (w.CASHIER_WIN_NAME || 'EC_PAY') : '_self';
      w.postForm(data.endpoint, data.fields, target);
    }catch(e){
      console.error(e);
      if(win) try{ win.close(); }catch(_){}
      alert('目前尚未連上後端，請稍後再試。');
    }
  });

})(window, document);
