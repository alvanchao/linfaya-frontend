// App.js － LINFAYA COUTURE
// 功能：商品列表、購物車、全家/7-11 選店、綠界收銀台
// 修正重點：
// - postMessage 安全性：加入來源白名單檢查
// - 付款完成：以 localStorage 旗標同步所有分頁清空購物車
// - Safari/iOS 彈窗：預開命名視窗，若被擋改用本頁開啟
// - 邊界防呆：缺欄位檢查、ECPay 參數長度限制、門市欄位多別名支援

const API_BASE = 'https://linfaya-ecpay-backend.onrender.com';
const ADMIN_EMAIL = 'linfaya251@gmail.com';

const CVS_WIN_NAME = 'EC_CVS_MAP';
const CASHIER_WIN_NAME = 'ECPAY_CASHIER';

const FREE_SHIP_THRESHOLD = 1000;
const PAGE_SIZE = 6;

// 允許的 postMessage 來源（正式/測試）
const TRUSTED_ORIGINS = [
  new URL(API_BASE).origin,
  'https://logistics.ecpay.com.tw',
  'https://logistics-stage.ecpay.com.tw',
  'https://payment.ecpay.com.tw',
  'https://payment-stage.ecpay.com.tw'
];

const PRODUCTS = [
  {id:'top01',cat:'tops',name:'無縫高彈背心',price:399,colors:['黑','膚'],sizes:['S','M','L'],imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg']},
  {id:'top02',cat:'tops',name:'鏤空美背短袖',price:429,colors:['黑','粉'],sizes:['S','M','L'],imgs:['Photo/鏤空美背短袖.jpg']},
  {id:'btm01',cat:'bottoms',name:'高腰緊身褲',price:499,colors:['黑','深灰'],sizes:['S','M','L','XL'],imgs:['Photo/高腰緊身褲.jpg']},
  {id:'sk01',cat:'bottoms',name:'魚尾練習裙',price:699,colors:['黑'],sizes:['S','M','L'],imgs:['Photo/魚尾練習裙.jpg']},
  {id:'acc01',cat:'accessories',name:'彈力護腕',price:199,colors:['黑'],sizes:['F'],imgs:['Photo/上衣＋緊身褲套組.jpg']}, // TODO: 確認是否為正確圖片
  {id:'sh01',cat:'shoes',name:'舞鞋（軟底）',price:990,colors:['黑'],sizes:['35','36','37','38','39','40'],imgs:['Photo/上衣＋緊身褲套組.jpg']}, // TODO: 確認是否為正確圖片
  {id:'set01',cat:'tops',name:'上衣＋緊身褲套組',price:849,colors:['多色'],sizes:['S','M','L'],imgs:['Photo/上衣＋緊身褲套組.jpg']},
];

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = n => 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW');

function toast(msg='已加入購物車',ms=1200){
  const t=$('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}

function openNamedWindow(name, preloadHtml = "載入中，請稍候…") {
  let w = null;
  try { w = window.open('', name); } catch (_) { w = null; }
  if (!w || w.closed || typeof w.closed === 'undefined') return null;
  try {
    w.document.open();
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Loading</title><body style="font:14px/1.6 -apple-system,blinkmacsystemfont,Segoe UI,Roboto,Helvetica,Arial">${preloadHtml}</body>`);
    w.document.close();
  } catch (_) {}
  return w;
}

function postForm(endpoint, fields, target = '_self') {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = endpoint;
  form.target = target;
  Object.entries(fields).forEach(([k,v])=>{
    const i = document.createElement('input');
    i.type = 'hidden'; i.name = k; i.value = v;
    form.appendChild(i);
  });
  document.body.appendChild(form);
  form.submit();
  setTimeout(()=>form.remove(), 3000);
}

const state = {
  cat: 'all',
  page: 1,
  cart: JSON.parse(sessionStorage.getItem('cart')||'[]'),
  cvs: null,
  currentMapType: null
};
function persist(){ sessionStorage.setItem('cart', JSON.stringify(state.cart)); }

const tabs = $('#tabs');
if (tabs) {
  tabs.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tab'); if(!btn) return;
    $$('#tabs .tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    state.cat = btn.dataset.cat; state.page = 1;
    renderProducts();
  });
}

function buildPager(total, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const mountTop = $('#pager'), mountBottom = $('#pagerBottom');
  const render = (mount) => {
    if(!mount) return;
    mount.innerHTML = '';
    for(let p=1;p<=pages;p++){
      const b=document.createElement('button');
      b.type='button';
      b.className='page-btn' + (p===state.page?' active':'');
      b.textContent=String(p);
      b.onclick=()=>{ state.page=p; renderProducts(); };
      mount.appendChild(b);
    }
  };
  render(mountTop); render(mountBottom);
}

function renderProducts(){
  const list = state.cat==='all' ? PRODUCTS : PRODUCTS.filter(p=>p.cat===state.cat);
  const total=list.length, from=(state.page-1)*PAGE_SIZE;
  const pageItems=list.slice(from, from+PAGE_SIZE);

  const infoText = $('#infoText'); if(infoText) infoText.textContent = `共 ${total} 件`;
  buildPager(total, PAGE_SIZE);

  const grid=$('#grid'); if(!grid) return;
  grid.innerHTML='';
  pageItems.forEach(p=>{
    const el=document.createElement('div'); el.className='product';
    const first=p.imgs?.[0] || '';
    el.innerHTML=`
      <div class="imgbox">
        <div class="main-img"><img alt="${p.name}" src="${first}" loading="lazy"><div class="magnifier"></div></div>
        <div class="thumbs">${(p.imgs||[]).map((src,i)=>`<img src="${src}" data-idx="${i}" class="${i===0?'active':''}" loading="lazy">`).join('')}</div>
      </div>
      <div class="body">
        <b>${p.name}</b>
        <div class="muted">分類：${p.cat}｜可選：顏色、尺寸</div>
        <div class="price">${fmt(p.price)}</div>
        <div class="qty">
          <select class="select sel-color">${(p.colors||[]).map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
          <select class="select sel-size">${(p.sizes||[]).map(s=>`<option value="${s}">${s}</option>`).join('')}</select>
        </div>
        <div class="qty" style="margin-top:6px">
          <input class="input qty-input" type="number" min="1" value="1" style="width:84px" />
          <button type="button" class="btn pri add">加入購物車</button>
        </div>
      </div>
    `;
    const main=el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(img=>{
      img.addEventListener('click',()=>{
        el.querySelectorAll('.thumbs img').forEach(i=>i.classList.remove('active'));
        img.classList.add('active'); if(main) main.src=img.src;
      });
    });
    el.querySelector('.add')?.addEventListener('click',()=>{
      const color=el.querySelector('.sel-color')?.value || '';
      const size=el.querySelector('.sel-size')?.value || '';
      const qty=Math.max(1, parseInt(el.querySelector('.qty-input')?.value||'1',10));
      addToCart({...p,color,size,qty,img:first});
    });
    grid.appendChild(el);
  });
}
function addToCart(item){
  const found=state.cart.find(i=>i.id===item.id&&i.color===item.color&&i.size===item.size);
  if(found) found.qty = (found.qty||1) + item.qty;
  else state.cart.push(item);
  persist(); toast('已加入購物車'); updateBadge();
}
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function changeQty(idx,delta){
  const cur = state.cart[idx];
  if(!cur) return;
  cur.qty=Math.max(1,(cur.qty||1)+delta);
  persist(); renderCart(); updateBadge();
}
window.removeItem = removeItem;
window.changeQty  = changeQty;

const drawer=$('#drawer');
const openCartBtn  = $('#openCart');
const closeCartBtn = $('#closeCart');
if(openCartBtn) openCartBtn.onclick=()=>{drawer?.classList.add('open'); renderCart();};
if(closeCartBtn) closeCartBtn.onclick=()=>drawer?.classList.remove('open');

function subtotal(){ return state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0); }
function calcShipping(){
  const sub=subtotal();
  if(sub>=FREE_SHIP_THRESHOLD) return 0;
  const ship=$('input[name="ship"]:checked')?.value || 'home';
  return ship==='home'?80:60;
}

// 配送選項
function setShipOption(opt){ // 'home' | 'family' | 'seven'
  const r = document.querySelector(`input[name="ship"][value="${opt}"]`);
  if (r) { r.checked = true; }
  onShipChange();
  try{ sessionStorage.setItem('SHIP_OPT', opt); }catch(_){}
}

function onShipChange(){
  const ship=$('input[name="ship"]:checked')?.value || 'home';
  const home  = $('#homeFields');
  const fam   = $('#familyFields');
  const seven = $('#sevenFields');
  if(home)  home.style.display  = ship==='home'  ?'block':'none';
  if(fam)   fam.style.display   = ship==='family'?'block':'none';
  if(seven) seven.style.display = ship==='seven' ?'block':'none';
  renderCart();
  try{ sessionStorage.setItem('SHIP_OPT', ship); }catch(_){}
}
$$('input[name="ship"]').forEach(r=>r.addEventListener('change', onShipChange));

function renderCart(){
  const list=$('#cartList'); if(!list) return;
  list.innerHTML='';
  if(state.cart.length===0){ list.innerHTML='<p class="muted" style="padding:8px 12px">購物車是空的</p>'; }
  state.cart.forEach((it,idx)=>{
    const el=document.createElement('div'); el.className='cart-item';
    const pic = (it.imgs?.[0] ?? it.img) || '';
    el.innerHTML=`
      <img src="${pic}" alt="${it.name||''}">
      <div>
        <b>${it.name||''}</b>
        <div class="muted">顏色：${it.color||''}｜尺寸：${it.size||''}｜單價：${fmt(it.price||0)}</div>
        <div class="qty" style="margin-top:6px">
          <button type="button" class="btn" onclick="changeQty(${idx},-1)">-</button>
          <span>${it.qty||1}</span>
          <button type="button" class="btn" onclick="changeQty(${idx},1)">+</button>
          <button type="button" class="btn" style="margin-left:auto;border-color:#3a2230;color:#fca5a5" onclick="removeItem(${idx})">移除</button>
        </div>
      </div>
      <div><b>${fmt((it.price||0)*(it.qty||1))}</b></div>`;
    list.appendChild(el);
  });
  const sub=subtotal(), ship=state.cart.length?calcShipping():0;
  const subtotalEl = $('#subtotal'); if(subtotalEl) subtotalEl.textContent=fmt(sub);
  const shippingEl = $('#shipping'); if(shippingEl) shippingEl.textContent=fmt(ship);
  const grandEl    = $('#grand');    if(grandEl)    grandEl.textContent=fmt(sub+ship);
}
function updateBadge(){
  const n=state.cart.reduce((s,i)=>s+(i.qty||1),0);
  const cc=$('#cartCount'); if(cc) cc.textContent=String(n);
}

// 清空購物車（thankyou 通知 + localStorage 備援）
function clearCart(){
  state.cart = [];
  try{ sessionStorage.removeItem('cart'); }catch(_){}
  renderCart();
  updateBadge();
  toast('付款完成，已清空購物車');
}

// ===== 選店（Safari 安全版：先預開命名視窗，再送表單）=====
async function openCvsMap(logisticsSubType){
  const preWin = openNamedWindow(CVS_WIN_NAME, "即將開啟官方門市地圖…"); // 先於點擊時開
  try{
    const r = await fetch(`${API_BASE}/api/ecpay/map/sign`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ LogisticsSubType: logisticsSubType })
    });
    if(!r.ok) throw new Error('map/sign failed');
    const {endpoint, fields} = await r.json();
    const target = preWin ? CVS_WIN_NAME : '_self';
    postForm(endpoint, fields, target);
  }catch(e){
    console.error(e);
    if (preWin) try{ preWin.close(); }catch(_){}
    alert('目前未能開啟門市地圖，請稍後再試。');
  }
}

document.addEventListener('click',(e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  if(t.id==='btnPickFamily'){
    e.preventDefault();
    state.currentMapType='family';
    try{ sessionStorage.setItem('CVS_TYPE','family'); }catch(_){}
    setShipOption('family');
    openCvsMap('FAMIC2C');
  }
  if(t.id==='btnPickSeven'){
    e.preventDefault();
    state.currentMapType='seven';
    try{ sessionStorage.setItem('CVS_TYPE','seven'); }catch(_){}
    setShipOption('seven');
    openCvsMap('UNIMARTC2C');
  }
});

// 地圖彈窗回傳（安全檢查：來源白名單）
window.addEventListener('message',(ev)=>{
  try{
    if(!TRUSTED_ORIGINS.includes(ev.origin)) return; // 安全性：只接受白名單
    const data=ev.data||{};
    if(data.type!=='EC_LOGISTICS_PICKED') return;
    const p=data.payload||{};

    // 常見欄位別名做防呆
    const id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
    const name = p.CVSStoreName || p.StName || p.StoreName || '';
    const address = p.CVSAddress || p.StAddr || p.Address || '';

    if(state.currentMapType==='family'){
      const label = $('#familyPicked'); if(label) label.textContent = `${name}（${id}）｜${address}`;
      state.cvs = { type:'family', id, name, address };
    }else if(state.currentMapType==='seven'){
      const label = $('#sevenPicked'); if(label) label.textContent = `${name}（${id}）｜${address}`;
      state.cvs = { type:'seven', id, name, address };
    }
  }catch(e){
    console.error(e);
  }
});

// 地圖本頁回來：還原配送方式 + 門市
(function(){
  try{
    const raw = localStorage.getItem('EC_LOGISTICS_PICKED');
    if(!raw){
      const saved = sessionStorage.getItem('SHIP_OPT');
      if (saved) setShipOption(saved);
      return;
    }
    localStorage.removeItem('EC_LOGISTICS_PICKED');
    const p = JSON.parse(raw);
    const id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
    const name = p.CVSStoreName || p.StName || p.StoreName || '';
    const address = p.CVSAddress || p.StAddr || p.Address || '';
    const type = sessionStorage.getItem('CVS_TYPE') || state.currentMapType;
    if(type==='family'){
      const label = document.querySelector('#familyPicked');
      if(label) label.textContent = `${name}（${id}）｜${address}`;
      state.cvs = { type:'family', id, name, address };
      setShipOption('family');
    }else if(type==='seven'){
      const label = document.querySelector('#sevenPicked');
      if(label) label.textContent = `${name}（${id}）｜${address}`;
      state.cvs = { type:'seven', id, name, address };
      setShipOption('seven');
    }
  }catch(e){}
})();

// thankyou／cashier 回傳（安全檢查 + 多分頁同步清空）
window.addEventListener('message',(ev)=>{
  try{
    if(!TRUSTED_ORIGINS.includes(ev.origin)) return; // 安全性：只接受白名單
    const data = ev.data || {};
    if (data && data.type === 'EC_PAY_DONE') {
      try { localStorage.setItem('EC_CLEAR_CART','1'); } catch(_) {}
      clearCart();
      try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
    }
  }catch(e){
    console.error(e);
  }
});

// 備援：不同分頁同步清空
window.addEventListener('storage', (e)=>{
  if (e.key === 'EC_CLEAR_CART' && e.newValue === '1') {
    clearCart();
    try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
  }
});

// 進頁/回頁/快取回來都檢查一次旗標
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
document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) checkClearFlag(); });
window.addEventListener('pageshow', (e)=>{
  if (e.persisted) {
    checkClearFlag();
    try {
      state.cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
      renderCart(); updateBadge();
    } catch(_) {}
  }
});

// ===== 付款 =====
function validPhone(v){ return /^09\d{8}$/.test(v); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const checkoutBtn = $('#checkout');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async ()=>{
    if(!state.cart.length) return alert('購物車是空的');

    const name=$('#name')?.value.trim() || '';
    const email=$('#email')?.value.trim() || '';
    const phone=$('#phone')?.value.trim() || '';
    const shipOpt=$('input[name="ship"]:checked')?.value || 'home';
    const addr=$('#addr')?.value.trim() || '';

    if(!name) return alert('請填寫收件姓名');
    if(!validEmail(email)) return alert('請輸入正確 Email');
    if(!validPhone(phone)) return alert('手機需為 09 開頭 10 碼');

    let shippingInfo='';
    if(shipOpt==='home'){
      if(!addr) return alert('請填寫收件地址');
      shippingInfo=`自家宅配｜${addr}`;
    }
    if(shipOpt==='family'){
      if(!state.cvs||state.cvs.type!=='family') return alert('請先選擇全家門市');
      shippingInfo=`全家店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`;
    }
    if(shipOpt==='seven'){
      if(!state.cvs||state.cvs.type!=='seven')  return alert('請先選擇 7-11 門市');
      shippingInfo=`7-11 店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`;
    }

    const orderId = 'LF' + Date.now();
    const items = state.cart.map(i=>({id:i.id,name:i.name,color:i.color,size:i.size,qty:i.qty,price:i.price}));
    const sub = state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
    const shipFee = state.cart.length ? (sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
    const amount = sub + shipFee;

    // ECPay 實務：限制字串長度（保守 200 內）
    const itemNameRaw = items.map(i=>`${i.name}x${i.qty}`).join('#');
    const itemName = itemNameRaw.slice(0, 200);
    const tradeDesc = 'Linfaya Shop Order'.slice(0, 100);

    const payload = {
      orderId, amount,
      itemName,
      tradeDesc,
      name, email, phone,
      shippingInfo,
      subtotal: sub,
      shipFee: shipFee,
      returnURL: `${API_BASE}/api/ecpay/return`
    };

    const win = openNamedWindow(CASHIER_WIN_NAME, "正在前往綠界收銀台…");

    try{
      const r = await fetch(`${API_BASE}/api/ecpay/create`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if(!r.ok) throw new Error('create failed');
      const data = await r.json();
      if(!data || !data.endpoint || !data.fields) throw new Error('missing fields');

      const target = win ? CASHIER_WIN_NAME : '_self';
      postForm(data.endpoint, data.fields, target);
      if(!win){ toast('已在本頁開啟綠界付款'); }

    }catch(e){
      console.error(e);
      if(win) try{ win.close(); }catch(_){}
      alert('目前尚未連上後端，請稍後再試。');
    }
  });
}

const year = $('#year'); if(year) year.textContent = new Date().getFullYear();
updateBadge(); renderProducts(); onShipChange();
