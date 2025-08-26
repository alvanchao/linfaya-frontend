// App.js － LINFAYA COUTURE
// 功能：商品列表、購物車、全家/7-11 選店、綠界收銀台
// 重點：固定視窗名稱避免多開；iOS Safari 若擋彈窗就自動改「本頁開啟」避免卡住
// 後端需搭配：/api/ecpay/create、/api/ecpay/map/sign、/api/ecpay/return、/api/ecpay/order-result

// ===== 基本設定 =====
const API_BASE = 'https://linfaya-ecpay-backend.onrender.com'; // 後端（Render）
const ADMIN_EMAIL = 'linfaya251@gmail.com';

// 固定視窗名稱（避免瀏覽器多開）
const CVS_WIN_NAME = 'EC_CVS_MAP';
const CASHIER_WIN_NAME = 'ECPAY_CASHIER';

// ===== 商店規則與資料 =====
const FREE_SHIP_THRESHOLD = 1000; // 滿千免運
const PAGE_SIZE = 6;

// 你的商品資料（可自行擴充）
const PRODUCTS = [
  {id:'top01',cat:'tops',name:'無縫高彈背心',price:399,colors:['黑','膚'],sizes:['S','M','L'],imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg']},
  {id:'top02',cat:'tops',name:'鏤空美背短袖',price:429,colors:['黑','粉'],sizes:['S','M','L'],imgs:['Photo/鏤空美背短袖.jpg']},
  {id:'btm01',cat:'bottoms',name:'高腰緊身褲',price:499,colors:['黑','深灰'],sizes:['S','M','L','XL'],imgs:['Photo/高腰緊身褲.jpg']},
  {id:'sk01',cat:'bottoms',name:'魚尾練習裙',price:699,colors:['黑'],sizes:['S','M','L'],imgs:['Photo/魚尾練習裙.jpg']},
  {id:'acc01',cat:'accessories',name:'彈力護腕',price:199,colors:['黑'],sizes:['F'],imgs:['Photo/上衣＋緊身褲套組.jpg']},
  {id:'sh01',cat:'shoes',name:'舞鞋（軟底）',price:990,colors:['黑'],sizes:['35','36','37','38','39','40'],imgs:['Photo/上衣＋緊身褲套組.jpg']},
  {id:'set01',cat:'tops',name:'上衣＋緊身褲套組',price:849,colors:['多色'],sizes:['S','M','L'],imgs:['Photo/上衣＋緊身褲套組.jpg']},
];

// ===== 小工具 =====
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = n => 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW');

function toast(msg='已加入購物車',ms=1200){
  const t=$('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}

// 嘗試開一個命名視窗；若被 Safari 擋掉，回傳 null（之後改用本頁開啟）
function openNamedWindow(name, preloadHtml = "載入中，請稍候…") {
  let w = null;
  try { w = window.open('', name); } catch (_) { w = null; }
  if (!w || w.closed || typeof w.closed === 'undefined') return null;
  try {
    w.document.open();
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Loading</title><body style="font:14px/1.6 -apple-system,blinkmacsystemfont,Segoe UI,Roboto,Helvetica,Arial"> ${preloadHtml}</body>`);
    w.document.close();
  } catch (_) {}
  return w;
}

// 以 POST 表單送出：target 可是命名視窗或 _self（本頁開啟）
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

// ===== 狀態 =====
const state = {
  cat: 'all',
  page: 1,
  cart: JSON.parse(sessionStorage.getItem('cart')||'[]'),
  cvs: null,                  // 選店結果 { type:'family'|'seven', id, name, address }
  currentMapType: null        // 'family' | 'seven'
};
function persist(){ sessionStorage.setItem('cart', JSON.stringify(state.cart)); }

// ===== Tabs =====
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

// ===== 分頁 =====
function buildPager(total, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const mountTop = $('#pager'), mountBottom = $('#pagerBottom');
  const render = (mount) => {
    if(!mount) return;
    mount.innerHTML = '';
    for(let p=1;p<=pages;p++){
      const b=document.createElement('button');
      b.className='page-btn' + (p===state.page?' active':'');
      b.textContent=p;
      b.onclick=()=>{ state.page=p; renderProducts(); };
      mount.appendChild(b);
    }
  };
  render(mountTop); render(mountBottom);
}

// ===== 商品清單 =====
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
    const first=p.imgs[0];
    el.innerHTML=`
      <div class="imgbox">
        <div class="main-img"><img alt="${p.name}" src="${first}"><div class="magnifier"></div></div>
        <div class="thumbs">${p.imgs.map((src,i)=>`<img src="${src}" data-idx="${i}" class="${i===0?'active':''}">`).join('')}</div>
      </div>
      <div class="body">
        <b>${p.name}</b>
        <div class="muted">分類：${p.cat}｜可選：顏色、尺寸</div>
        <div class="price">${fmt(p.price)}</div>
        <div class="qty">
          <select class="select sel-color">${p.colors.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
          <select class="select sel-size">${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join('')}</select>
        </div>
        <div class="qty" style="margin-top:6px">
          <input class="input qty-input" type="number" min="1" value="1" style="width:84px" />
          <button class="btn pri add">加入購物車</button>
        </div>
      </div>
    `;
    const main=el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(img=>{
      img.addEventListener('click',()=>{
        el.querySelectorAll('.thumbs img').forEach(i=>i.classList.remove('active'));
        img.classList.add('active'); main.src=img.src;
      });
    });
    el.querySelector('.add').onclick=()=>{
      const color=el.querySelector('.sel-color').value;
      const size=el.querySelector('.sel-size').value;
      const qty=Math.max(1, parseInt(el.querySelector('.qty-input').value||'1',10));
      addToCart({...p,color,size,qty,img:p.imgs[0]});
    };
    grid.appendChild(el);
  });
}
function addToCart(item){
  const found=state.cart.find(i=>i.id===item.id&&i.color===item.color&&i.size===item.size);
  if(found) found.qty += item.qty; else state.cart.push(item);
  persist(); toast('已加入購物車'); updateBadge();
}
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function changeQty(idx,delta){ state.cart[idx].qty=Math.max(1,(state.cart[idx].qty||1)+delta); persist(); renderCart(); updateBadge(); }
window.removeItem = removeItem;
window.changeQty  = changeQty;

// ===== 購物車抽屜 =====
const drawer=$('#drawer');
const openCartBtn  = $('#openCart');
const closeCartBtn = $('#closeCart');
if(openCartBtn) openCartBtn.onclick=()=>{drawer.classList.add('open'); renderCart();};
if(closeCartBtn) closeCartBtn.onclick=()=>drawer.classList.remove('open');

function subtotal(){ return state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0); }
function calcShipping(){
  const sub=subtotal();
  if(sub>=FREE_SHIP_THRESHOLD) return 0;
  const ship=$('input[name="ship"]:checked')?.value || 'home';
  return ship==='home'?80:60;
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
}
$$('input[name="ship"]').forEach(r=>r.addEventListener('change', onShipChange));

function renderCart(){
  const list=$('#cartList'); if(!list) return;
  list.innerHTML='';
  if(state.cart.length===0){ list.innerHTML='<p class="muted" style="padding:8px 12px">購物車是空的</p>'; }
  state.cart.forEach((it,idx)=>{
    const el=document.createElement('div'); el.className='cart-item';
    el.innerHTML=`
      <img src="${(it.imgs?it.imgs[0]:it.img)||''}" alt="${it.name}">
      <div>
        <b>${it.name}</b>
        <div class="muted">顏色：${it.color}｜尺寸：${it.size}｜單價：${fmt(it.price)}</div>
        <div class="qty" style="margin-top:6px">
          <button class="btn" onclick="changeQty(${idx},-1)">-</button>
          <span>${it.qty||1}</span>
          <button class="btn" onclick="changeQty(${idx},1)">+</button>
          <button class="btn" style="margin-left:auto;border-color:#3a2230;color:#fca5a5" onclick="removeItem(${idx})">移除</button>
        </div>
      </div>
      <div><b>${fmt(it.price*(it.qty||1))}</b></div>`;
    list.appendChild(el);
  });
  const sub=subtotal(), ship=state.cart.length?calcShipping():0;
  const subtotalEl = $('#subtotal'); if(subtotalEl) subtotalEl.textContent=fmt(sub);
  const shippingEl = $('#shipping'); if(shippingEl) shippingEl.textContent=fmt(ship);
  const grandEl    = $('#grand');    if(grandEl)    grandEl.textContent=fmt(sub+ship);
}
function updateBadge(){
  const n=state.cart.reduce((s,i)=>s+(i.qty||1),0);
  const cc=$('#cartCount'); if(cc) cc.textContent=n;
}

// ===== 選店（固定視窗名稱；被擋就改「本頁開啟」）=====
async function openCvsMap(logisticsSubType){
  const r = await fetch(`${API_BASE}/api/ecpay/map/sign`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ LogisticsSubType: logisticsSubType })
  });
  if(!r.ok){ alert('選店後端未配置'); return; }
  const {endpoint, fields} = await r.json();

  const win = openNamedWindow(CVS_WIN_NAME, "即將開啟官方門市地圖…");
  const target = win ? CVS_WIN_NAME : '_self';
  postForm(endpoint, fields, target);
}

// 兩顆選店按鈕：全家/7-11（記住使用者選哪一種，給本頁模式回填）
document.addEventListener('click',(e)=>{
  if(e.target && e.target.id==='btnPickFamily'){
    e.preventDefault();
    state.currentMapType='family';
    sessionStorage.setItem('CVS_TYPE','family');
    openCvsMap('FAMIC2C');
  }
  if(e.target && e.target.id==='btnPickSeven'){
    e.preventDefault();
    state.currentMapType='seven';
    sessionStorage.setItem('CVS_TYPE','seven');
    openCvsMap('UNIMARTC2C');
  }
});

// 後端在 /api/ecpay/map/callback 以 postMessage 回來（彈窗模式）
window.addEventListener('message',(ev)=>{
  const data=ev.data||{};
  if(data.type!=='EC_LOGISTICS_PICKED') return;
  const p=data.payload||{};
  const id = p.CVSStoreID || p.CVSStoreID1 || '';
  const name = p.CVSStoreName || '';
  const address = p.CVSAddress || '';
  if(state.currentMapType==='family'){
    const label = $('#familyPicked'); if(label) label.textContent = `${name}（${id}）｜${address}`;
    state.cvs = { type:'family', id, name, address };
  }else if(state.currentMapType==='seven'){
    const label = $('#sevenPicked'); if(label) label.textContent = `${name}（${id}）｜${address}`;
    state.cvs = { type:'seven', id, name, address };
  }
});

// 啟動時：若地圖在本頁開啟，從 localStorage 撈回剛選的門市（無彈窗模式）
(function(){
  try{
    const raw = localStorage.getItem('EC_LOGISTICS_PICKED');
    if(!raw) return;
    localStorage.removeItem('EC_LOGISTICS_PICKED');
    const p = JSON.parse(raw);
    const id = p.CVSStoreID || p.CVSStoreID1 || '';
    const name = p.CVSStoreName || '';
    const address = p.CVSAddress || '';
    const type = sessionStorage.getItem('CVS_TYPE') || state.currentMapType;
    if(type==='family'){
      const label = document.querySelector('#familyPicked');
      if(label) label.textContent = `${name}（${id}）｜${address}`;
      state.cvs = { type:'family', id, name, address };
    }else if(type==='seven'){
      const label = document.querySelector('#sevenPicked');
      if(label) label.textContent = `${name}（${id}）｜${address}`;
      state.cvs = { type:'seven', id, name, address };
    }
  }catch(e){}
})();

// ===== 付款（固定視窗名稱；被擋就用本頁開啟；傳 subtotal/shipFee/shippingInfo 給後端）=====
function validPhone(v){ return /^09\d{8}$/.test(v); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const checkoutBtn = $('#checkout');
if (checkoutBtn) {
  checkoutBtn.onclick = async ()=>{
    if(!state.cart.length) return alert('購物車是空的');

    const name=$('#name').value.trim();
    const email=$('#email').value.trim();
    const phone=$('#phone').value.trim();
    const shipOpt=$('input[name="ship"]:checked')?.value || 'home';
    const addr=$('#addr').value.trim();

    if(!name) return alert('請填寫收件姓名');
    if(!validEmail(email)) return alert('請輸入正確 Email');
    if(!validPhone(phone)) return alert('手機需為 09 開頭 10 碼');

    let shippingInfo='';
    if(shipOpt==='home'){ if(!addr) return alert('請填寫收件地址'); shippingInfo=`自家宅配｜${addr}`; }
    if(shipOpt==='family'){ if(!state.cvs||state.cvs.type!=='family') return alert('請先選擇全家門市'); shippingInfo=`全家店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`; }
    if(shipOpt==='seven'){ if(!state.cvs||state.cvs.type!=='seven')  return alert('請先選擇 7-11 門市'); shippingInfo=`7-11 店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`; }

    const orderId = 'LF' + Date.now();
    const items = state.cart.map(i=>({id:i.id,name:i.name,color:i.color,size:i.size,qty:i.qty,price:i.price}));
    const sub = state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
    const shipFee = state.cart.length ? (sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
    const amount = sub + shipFee;

    const payload = {
      orderId, amount,
      itemName: items.map(i=>`${i.name}x${i.qty}`).join('#'),
      tradeDesc: 'Linfaya Shop Order',
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
  };
}

// ===== 其他初始化 =====
const year = $('#year'); if(year) year.textContent = new Date().getFullYear();
updateBadge(); renderProducts(); onShipChange();