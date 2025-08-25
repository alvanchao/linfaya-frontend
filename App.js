// ========= 改成你的 Render 後端網址 =========
const API_BASE = 'https://linfaya-ecpay-backend.onrender.com';
const ADMIN_EMAIL = 'linfaya251@gmail.com';
const FREE_SHIP_THRESHOLD = 1000;

// ======= 商品資料：支援 1~5 張圖 =======
const PRODUCTS = [
  {id:'top01',name:'無縫高彈背心',price:399,color:'黑/膚',size:'S/M/L',imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg']},
  {id:'top02',name:'鏤空美背短袖',price:429,color:'黑/粉',size:'S/M/L',imgs:['Photo/鏤空美背短袖.jpg']},
  {id:'btm01',name:'高腰緊身褲',price:499,color:'黑/深灰',size:'S/M/L/XL',imgs:['Photo/高腰緊身褲.jpg']},
  {id:'sk01',name:'魚尾練習裙',price:699,color:'黑',size:'S/M/L',imgs:['Photo/魚尾練習裙.jpg']},
  {id:'set01',name:'上衣＋緊身褲套組',price:849,color:'多色',size:'S/M/L',imgs:['Photo/上衣＋緊身褲套組.jpg']},
];

// 購物車狀態（sessionStorage：重開頁面會清空）
const state = { cart: JSON.parse(sessionStorage.getItem('cart')||'[]'), cvs: null };
const fmt = n => 'NT$' + n.toLocaleString('zh-Hant-TW');

// 商品渲染
const $grid = document.getElementById('grid');
PRODUCTS.forEach(p=>{
  const el=document.createElement('div');
  el.className='product';
  const firstImg = p.imgs[0];
  el.innerHTML=`
    <div class="imgbox">
      <div class="main-img"><img alt="${p.name}" src="${firstImg}"><div class="magnifier"></div></div>
      <div class="thumbs">${p.imgs.map((src,i)=>`<img src="${src}" data-idx="${i}" class="${i===0?'active':''}">`).join('')}</div>
    </div>
    <div class="body">
      <b>${p.name}</b>
      <div class="muted">顏色：${p.color}｜尺寸：${p.size}</div>
      <div class="price">${fmt(p.price)}</div>
      <div class="qty">
        <select class="input sel-size">
          ${p.size.split('/').map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
        <input class="qty-input" type="number" min="1" value="1" />
        <button class="btn pri add">加入購物車</button>
      </div>
    </div>`;

  // 縮圖切換
  const mainImg = el.querySelector('.main-img img');
  el.querySelectorAll('.thumbs img').forEach(img=>{
    img.addEventListener('click',()=>{
      el.querySelectorAll('.thumbs img').forEach(i=>i.classList.remove('active'));
      img.classList.add('active');
      mainImg.src = img.src;
      updateLensBg();
    });
  });

  // 放大鏡
  const box = el.querySelector('.main-img');
  const lens = el.querySelector('.magnifier');
  const zoom = 2;
  box.addEventListener('mouseenter',()=>{ lens.style.display='block'; updateLensBg(); });
  box.addEventListener('mouseleave',()=>{ lens.style.display='none'; });
  box.addEventListener('mousemove',e=>{
    const rect = box.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const r = lens.offsetWidth/2;
    lens.style.left = (x - r) + 'px';
    lens.style.top  = (y - r) + 'px';
    const bx = Math.max(0, Math.min(x/box.offsetWidth * 100, 100));
    const by = Math.max(0, Math.min(y/box.offsetHeight* 100, 100));
    lens.style.backgroundPosition = `${bx}% ${by}%`;
  });
  function updateLensBg(){
    lens.style.backgroundImage = `url('${mainImg.src}')`;
    lens.style.backgroundSize = (box.offsetWidth*zoom)+'px '+(box.offsetHeight*zoom)+'px';
  }

  // 加入購物車
  el.querySelector('.add').onclick=()=>{
    const size=el.querySelector('.sel-size').value;
    const qty=parseInt(el.querySelector('.qty-input').value||'1');
    addToCart({...p,size,qty,img:p.imgs[0]});
  }

  $grid.appendChild(el);
});

function addToCart(item){
  const found = state.cart.find(i=>i.id===item.id && i.size===item.size);
  if(found){ found.qty += item.qty; }
  else{ state.cart.push(item); }
  persist();
  toast('已加入購物車');
  updateBadge();
}
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function changeQty(idx,delta){ state.cart[idx].qty=Math.max(1,(state.cart[idx].qty||1)+delta); persist(); renderCart(); updateBadge(); }
function persist(){ sessionStorage.setItem('cart',JSON.stringify(state.cart)); }

// Cart drawer
const drawer = document.getElementById('drawer');
document.getElementById('openCart').onclick=()=>{drawer.classList.add('open');renderCart()}
document.getElementById('closeCart').onclick=()=>drawer.classList.remove('open')

function subtotal(){ return state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0); }
function calcShipping(){
  const sub = subtotal();
  if(sub >= FREE_SHIP_THRESHOLD) return 0;
  const shipOpt = document.querySelector('input[name="ship"]:checked')?.value || 'home';
  if(shipOpt==='home') return 80;
  if(shipOpt==='family' || shipOpt==='seven') return 60;
  return 80;
}

function renderCart(){
  const list=document.getElementById('cartList');
  list.innerHTML='';
  if(state.cart.length===0){ list.innerHTML='<p class="muted" style="padding:8px 12px">購物車是空的</p>'; }
  state.cart.forEach((it,idx)=>{
    const el=document.createElement('div');
    el.className='cart-item';
    el.innerHTML=`
      <img src="${(it.imgs?it.imgs[0]:it.img)||''}" alt="${it.name}">
      <div>
        <b>${it.name}</b>
        <div class="muted">尺寸：${it.size}｜單價：${fmt(it.price)}</div>
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
  const sub = subtotal();
  const ship = state.cart.length?calcShipping():0;
  document.getElementById('subtotal').textContent=fmt(sub);
  document.getElementById('shipping').textContent=fmt(ship);
  document.getElementById('grand').textContent=fmt(sub+ship);
}

function updateBadge(){
  const n = state.cart.reduce((s,i)=>s+(i.qty||1),0);
  document.getElementById('cartCount').textContent = n;
}

// 配送方式切換：顯示對應欄位
function onShipChange(){
  const shipOpt = document.querySelector('input[name="ship"]:checked')?.value || 'home';
  document.getElementById('homeFields').style.display = shipOpt==='home' ? 'block':'none';
  document.getElementById('familyFields').style.display = shipOpt==='family' ? 'block':'none';
  document.getElementById('sevenFields').style.display = shipOpt==='seven' ? 'block':'none';
  renderCart();
}
document.querySelectorAll('input[name="ship"]').forEach(r=>r.addEventListener('change',onShipChange));

// ======= 綠界官方地圖選店 =======
async function openCvsMap(logisticsSubType){
  try{
    const res = await fetch(`${API_BASE}/api/ecpay/map/sign`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ logisticsSubType })
    });
    if(!res.ok) throw new Error('sign failed');
    const { endpoint, fields } = await res.json();
    window._lastMapDebug = { endpoint, fields }; // 除錯用
    const form = document.createElement('form');
    form.method='POST'; form.action=endpoint; form.target='_blank';
    Object.entries(fields).forEach(([k,v])=>{ const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; form.appendChild(i); });
    document.body.appendChild(form); form.submit(); form.remove();
  }catch(err){
    console.warn(err);
    alert('尚未設定選店後端，無法開啟官方地圖。');
  }
}
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id==='btnPickFamily'){ e.preventDefault(); openCvsMap('FAMI'); }
  if(e.target && e.target.id==='btnPickSeven'){ e.preventDefault(); openCvsMap('UNIMART'); }
});
window.addEventListener('message', (ev)=>{
  const data = ev.data || {};
  if(data.type==='CVS_PICKED' && data.store){
    if(data.store.cvs==='FAMI'){
      document.getElementById('familyPicked').textContent = `${data.store.name}（${data.store.id}）｜${data.store.address}`;
      state.cvs = { type:'family', ...data.store };
    }else if(data.store.cvs==='UNIMART'){
      document.getElementById('sevenPicked').textContent = `${data.store.name}（${data.store.id}）｜${data.store.address}`;
      state.cvs = { type:'seven', ...data.store };
    }
  }
});

// ======= 綠界付款 =======
async function createEcpayLink(order){
  const url = `${API_BASE}/api/ecpay/create`;
  try{
    const res = await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(order)
    });
    const text = await res.text();
    if(!res.ok){
      console.error('create failed', res.status, text);
      alert(`後端回應錯誤 ${res.status}\n${text}`);
      return null;
    }
    let data;
    try { data = JSON.parse(text); } catch {
      console.error('JSON parse error, raw=', text);
      alert('後端回傳格式非 JSON：\n' + text);
      return null;
    }
    return data.paymentUrl;
  }catch(e){
    console.error('fetch error to', url, e);
    alert(`呼叫後端失敗：${e.message}\nAPI_BASE=${API_BASE}`);
    return null;
  }
}

// Checkout
function validPhone(v){ return /^09\d{8}$/.test(v); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

document.getElementById('checkout').onclick=async()=>{
  if(!state.cart.length) return alert('購物車是空的');
  const name=document.getElementById('name').value.trim();
  const email=document.getElementById('email').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const shipOpt=document.querySelector('input[name="ship"]:checked')?.value || 'home';
  const addr=document.getElementById('addr').value.trim();

  if(!name) return alert('請填寫收件姓名');
  if(!validEmail(email)) return alert('請輸入正確 Email');
  if(!validPhone(phone)) return alert('手機需為 09 開頭 10 碼');

  let shippingInfo='';
  if(shipOpt==='home'){
    if(!addr) return alert('請填寫收件地址');
    shippingInfo = `自家宅配｜${addr}`;
  }else if(shipOpt==='family'){
    if(!state.cvs || state.cvs.type!=='family') return alert('請先選擇全家門市');
    shippingInfo = `全家店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`;
  }else if(shipOpt==='seven'){
    if(!state.cvs || state.cvs.type!=='seven') return alert('請先選擇 7-11 門市');
    shippingInfo = `7-11 店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`;
  }

  const orderId = 'LF' + Date.now();
  const items = state.cart.map(i=>({id:i.id,name:i.name,size:i.size,qty:i.qty,price:i.price}));
  const sub = subtotal();
  const shipFee = state.cart.length? (sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
  const amount = sub + shipFee;
  const order = {orderId,name,email,phone,shipOpt,shippingInfo,items,amount,subtotal:sub,shipFee,notify:{admin:ADMIN_EMAIL}};

  const link = await createEcpayLink(order);
  if(!link) return;
  window.open(link,'_blank');
  toast('正在前往綠界付款…',1600);
}

function toast(msg='已加入購物車',ms=1200){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}

document.getElementById('year').textContent=new Date().getFullYear();
updateBadge();
renderCart();
