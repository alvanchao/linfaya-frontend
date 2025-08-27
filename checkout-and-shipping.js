// 配送/選店/結帳（與後端串接）
window.App = window.App || {};
var App = window.App;

// 清空購物車（thankyou 訊號）
App.clearCart = function(){
  App.state.cart = [];
  try{ sessionStorage.removeItem('cart'); }catch(_){}
  App.renderCart();
  App.updateBadge();
  App.toast('付款完成，已清空購物車');
};

// 配送方式切換
App.setShipOption = function(opt){
  var r = document.querySelector('input[name="ship"][value="'+opt+'"]');
  if (r) r.checked = true;
  App.onShipChange();
  try{ sessionStorage.setItem('SHIP_OPT', opt); }catch(_){}
};
App.onShipChange = function(){
  var el = document.querySelector('input[name="ship"]:checked');
  var ship = el ? el.value : 'home';
  var home  = App.$('#homeFields');
  var fam   = App.$('#familyFields');
  var seven = App.$('#sevenFields');
  if(home)  home.style.display  = ship==='home'  ? 'block':'none';
  if(fam)   fam.style.display   = ship==='family'? 'block':'none';
  if(seven) seven.style.display = ship==='seven' ? 'block':'none';
  App.renderCart();
  try{ sessionStorage.setItem('SHIP_OPT', ship); }catch(_){}
};
App.$$('input[name="ship"]').forEach(function(r){ r.addEventListener('change', App.onShipChange); });

// 打開官方門市地圖
App.openCvsMap = async function(logisticsSubType){
  var preWin = (function(name, html){
    var w = null;
    try{ w = window.open('', name); }catch(_){ w = null; }
    if (!w || w.closed || typeof w.closed === 'undefined') return null;
    try{
      w.document.open();
      w.document.write('<!doctype html><meta charset="utf-8"><title>Loading</title><body style="font:14px/1.6 -apple-system,blinkmacsystemfont,Segoe UI,Roboto,Helvetica,Arial">'+(html||'即將開啟官方門市地圖…')+'</body>');
      w.document.close();
    }catch(_){}
    return w;
  })(App.CVS_WIN_NAME);
  try{
    var data = await App.fetchJSON(App.API_BASE+'/api/ecpay/map/sign', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ LogisticsSubType: logisticsSubType })
    }, { timeoutMs:20000, retries:2 });
    var target = preWin ? App.CVS_WIN_NAME : '_self';
    // POST form
    var f = document.createElement('form');
    f.method='POST'; f.action = data.endpoint; f.target = target;
    Object.keys(data.fields||{}).forEach(function(k){
      var i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=data.fields[k]; f.appendChild(i);
    });
    document.body.appendChild(f); f.submit(); setTimeout(function(){ f.remove(); }, 3000);
  }catch(e){
    if(preWin) try{ preWin.close(); }catch(_){}
    alert('目前未能開啟門市地圖，請稍後再試。');
  }
};

// 選店按鈕
document.addEventListener('click', function(e){
  var t = e.target;
  if(!(t instanceof HTMLElement)) return;
  if(t.id==='btnPickFamily'){
    e.preventDefault();
    App.state.currentMapType='family';
    try{ sessionStorage.setItem('CVS_TYPE','family'); }catch(_){}
    App.setShipOption('family');
    App.openCvsMap('FAMIC2C');
  }
  if(t.id==='btnPickSeven'){
    e.preventDefault();
    App.state.currentMapType='seven';
    try{ sessionStorage.setItem('CVS_TYPE','seven'); }catch(_){}
    App.setShipOption('seven');
    App.openCvsMap('UNIMARTC2C');
  }
});

// 地圖回傳
window.addEventListener('message', function(ev){
  try{
    if(App.TRUSTED_ORIGINS.indexOf(ev.origin)===-1) return;
    var data = ev.data || {};
    if(data.type!=='EC_LOGISTICS_PICKED') return;
    var p = data.payload || {};
    var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
    var name = p.CVSStoreName || p.StName || p.StoreName || '';
    var address = p.CVSAddress || p.CVSAddr || p.Address || '';
    if(App.state.currentMapType==='family'){
      var label1 = App.$('#familyPicked'); if(label1) label1.textContent = name+'（'+id+'）｜'+address;
      App.state.cvs = { type:'family', id:id, name:name, address:address };
    }else if(App.state.currentMapType==='seven'){
      var label2 = App.$('#sevenPicked'); if(label2) label2.textContent = name+'（'+id+'）｜'+address;
      App.state.cvs = { type:'seven', id:id, name:name, address:address };
    }
  }catch(e){}
});

// 本頁回來還原
(function(){
  try{
    var raw = localStorage.getItem('EC_LOGISTICS_PICKED');
    if(!raw){
      var saved = sessionStorage.getItem('SHIP_OPT');
      if (saved) App.setShipOption(saved);
      return;
    }
    localStorage.removeItem('EC_LOGISTICS_PICKED');
    var p = JSON.parse(raw);
    var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
    var name = p.CVSStoreName || p.StName || p.StoreName || '';
    var address = p.CVSAddress || p.CVSAddr || p.Address || '';
    var type = sessionStorage.getItem('CVS_TYPE') || App.state.currentMapType;
    if(type==='family'){
      var label1 = document.querySelector('#familyPicked'); if(label1) label1.textContent = name+'（'+id+'）｜'+address;
      App.state.cvs = { type:'family', id:id, name:name, address:address };
      App.setShipOption('family');
    }else if(type==='seven'){
      var label2 = document.querySelector('#sevenPicked'); if(label2) label2.textContent = name+'（'+id+'）｜'+address;
      App.state.cvs = { type:'seven', id:id, name:name, address:address };
      App.setShipOption('seven');
    }
  }catch(e){}
})();

// 分頁同步清空
window.addEventListener('message', function(ev){
  try{
    if(App.TRUSTED_ORIGINS.indexOf(ev.origin)===-1) return;
    var data = ev.data || {};
    if (data && data.type === 'EC_PAY_DONE') {
      try { localStorage.setItem('EC_CLEAR_CART','1'); } catch(_) {}
      App.clearCart();
      try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
    }
  }catch(e){}
});
window.addEventListener('storage', function(e){
  if (e.key === 'EC_CLEAR_CART' && e.newValue === '1') {
    App.clearCart();
    try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
  }
});
function checkClearFlag(){
  try{
    if (localStorage.getItem('EC_CLEAR_CART') === '1') {
      localStorage.removeItem('EC_CLEAR_CART');
      App.clearCart();
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
      App.state.cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
      App.renderCart(); App.updateBadge();
    } catch(_) {}
  }
});

// 結帳
function validPhone(v){ return /^09\d{8}$/.test(v); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

var checkoutBtn = App.$('#checkout');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async function(){
    if(!App.state.cart.length) return alert('購物車是空的');
    if(App.PREORDER_MODE && App.REQUIRE_PREORDER_CHECKBOX && !App.state.agreePreorder){
      return alert('請先勾選預購同意，再進行付款。');
    }
    var name = (App.$('#name') && App.$('#name').value || '').trim();
    var email= (App.$('#email')&& App.$('#email').value|| '').trim();
    var phone= (App.$('#phone')&& App.$('#phone').value|| '').trim();
    var shipEl = document.querySelector('input[name="ship"]:checked');
    var shipOpt = shipEl ? shipEl.value : 'home';
    var addr = (App.$('#addr') && App.$('#addr').value || '').trim();

    if(!name) return alert('請填寫收件姓名');
    if(!validEmail(email)) return alert('請輸入正確 Email');
    if(!validPhone(phone)) return alert('手機需為 09 開頭 10 碼');

    var shippingInfo='';
    if(shipOpt==='home'){
      if(!addr) return alert('請填寫收件地址');
      shippingInfo='自家宅配｜'+addr;
    }
    if(shipOpt==='family'){
      if(!App.state.cvs || App.state.cvs.type!=='family') return alert('請先選擇全家門市');
      shippingInfo='全家店到店｜'+App.state.cvs.name+'（'+App.state.cvs.id+'）'+App.state.cvs.address;
    }
    if(shipOpt==='seven'){
      if(!App.state.cvs || App.state.cvs.type!=='seven') return alert('請先選擇 7-11 門市');
      shippingInfo='7-11 店到店｜'+App.state.cvs.name+'（'+App.state.cvs.id+'）'+App.state.cvs.address;
    }

    // 再檢查庫存上限
    for (var k=0; k<App.state.cart.length; k++){
      var it = App.state.cart[k];
      var prod = App.productById(it.id) || it;
      var max = App.maxQtyFor(prod, it.color, it.size);
      if (it.qty > max){
        return alert('「'+it.name+'（'+it.color+'/'+it.size+'）」目前最多可購買 '+max+' 件，請調整數量再結帳。');
      }
    }

    var orderId = 'LF' + Date.now();
    var sub = App.subtotal();
    var shipFee = App.state.cart.length ? (sub>=App.FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
    var amount = sub + shipFee;
    var itemNameRaw = App.state.cart.map(function(i){ return i.name+'('+i.color+'/'+i.size+')x'+i.qty; }).join('#');
    var itemName = itemNameRaw.slice(0, 200);
    var tradeDesc = 'Linfaya Shop Order'.slice(0, 100);

    var payload = {
      orderId: orderId, amount: amount,
      itemName: itemName,
      tradeDesc: tradeDesc,
      name: name, email: email, phone: phone,
      shippingInfo: shippingInfo,
      subtotal: sub,
      shipFee: shipFee,
      returnURL: App.API_BASE + '/api/ecpay/return'
    };

    var win = (function(name, html){
      var w = null;
      try{ w = window.open('', name); }catch(_){ w = null; }
      if (!w || w.closed || typeof w.closed === 'undefined') return null;
      try{
        w.document.open();
        w.document.write('<!doctype html><meta charset="utf-8"><title>Loading</title><body style="font:14px/1.6 -apple-system,blinkmacsystemfont,Segoe UI,Roboto,Helvetica,Arial">'+(html||'正在前往綠界收銀台…')+'</body>');
        w.document.close();
      }catch(_){}
      return w;
    })(App.CASHIER_WIN_NAME);

    try{
      var data = await App.fetchJSON(App.API_BASE+'/api/ecpay/create', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      }, { timeoutMs:20000, retries:2 });
      if(!data || !data.endpoint || !data.fields) throw new Error('missing fields');
      var target = win ? App.CASHIER_WIN_NAME : '_self';
      var f = document.createElement('form');
      f.method='POST'; f.action=data.endpoint; f.target=target;
      Object.keys(data.fields||{}).forEach(function(k){
        var i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=data.fields[k]; f.appendChild(i);
      });
      document.body.appendChild(f); f.submit(); setTimeout(function(){ f.remove(); }, 3000);
      if(!win) App.toast('已在本頁開啟綠界付款');
    }catch(e){
      if(win) try{ win.close(); }catch(_){}
      alert('目前尚未連上後端，請稍後再試。');
    }
  });
}

// 初始顯示配送區塊、購物車匯總
App.onShipChange();
App.renderCart();