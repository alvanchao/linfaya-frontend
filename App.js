// ===== 你要改這兩個變數 =====
const API_BASE = 'https://linfaya-ecpay-backend.onrender.com'; // 你的後端
const ADMIN_EMAIL = 'linfaya251@gmail.com';

// ===== 資料與設定 =====
const FREE_SHIP_THRESHOLD = 1000;
const PAGE_SIZE = 6; // 每頁幾件

// 產品資料（示例）：
const PRODUCTS = [
  // Tops
  {id:'top01',cat:'tops',name:'無縫高彈背心',price:399,colors:['黑','膚'],sizes:['S','M','L'],imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg']},
  {id:'top02',cat:'tops',name:'鏤空美背短袖',price:429,colors:['黑','粉'],sizes:['S','M','L'],imgs:['Photo/鏤空美背短袖.jpg']},

  // Bottoms
  {id:'btm01',cat:'bottoms',name:'高腰緊身褲',price:499,colors:['黑','深灰'],sizes:['S','M','L','XL'],imgs:['Photo/高腰緊身褲.jpg']},
  {id:'sk01',cat:'bottoms',name:'魚尾練習裙',price:699,colors:['黑'],sizes:['S','M','L'],imgs:['Photo/魚尾練習裙.jpg']},

  // Accessories
  {id:'acc01',cat:'accessories',name:'彈力護腕',price:199,colors:['黑'],sizes:['F'],imgs:['Photo/上衣＋緊身褲套組.jpg']},

  // Shoes
  {id:'sh01',cat:'shoes',name:'舞鞋（軟底）',price:990,colors:['黑'],sizes:['35','36','37','38','39','40'],imgs:['Photo/上衣＋緊身褲套組.jpg']},

  // Set
  {id:'set01',cat:'tops',name:'上衣＋緊身褲套組',price:849,colors:['多色'],sizes:['S','M','L'],imgs:['Photo/上衣＋緊身褲套組.jpg']},
];

// ===== 工具 =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = n => 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW');

// ===== 狀態 =====
const state = {
  cat: 'all',
  page: 1,
  cart: JSON.parse(sessionStorage.getItem('cart')||'[]'),
  cvs: null
};
function persist() { sessionStorage.setItem('cart', JSON.stringify(state.cart)); }

// ===== Tabs =====
$('#tabs').addEventListener('click', (e)=>{
  const btn = e.target.closest('.tab'); if(!btn) return;
  $$('#tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  state.cat = btn.dataset.cat;
  state.page = 1;
  renderProducts();
});

// ===== 分頁 =====
function buildPager(total, pageSize, page, mountTop, mountBottom){
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const render = (mount) => {
    mount.innerHTML = '';
    for(let p=1; p<=pages; p++){
      const b = document.createElement('button');
      b.className = 'page-btn' + (p===page?' active':'');
      b.textContent = p;
      b.onclick = ()=>{ state.page=p; renderProducts(); };
      mount.appendChild(b);
    }
  };
  render(mountTop);
  render(mountBottom);
}

// ===== 商品清單（含相簿、顏色/尺寸、加入購物車）=====
function renderProducts(){
  const list = state.cat==='all' ? PRODUCTS : PRODUCTS.filter(p=>p.cat===state.cat);
  const total = list.length;
  const from = (state.page-1)*PAGE_SIZE;
  const pageItems = list.slice(from, from+PAGE_SIZE);

  $('#infoText').textContent = `共 ${total} 件`;
  buildPager(total, PAGE_SIZE, state.page, $('#pager'), $('#pagerBottom'));

  const grid = $('#grid');
  grid.innerHTML = '';
  pageItems.forEach(p=>{
    const el = document.createElement('div'); el.className='product';
    const first = p.imgs[0];
    el.innerHTML = `
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

    const main = el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(img=>{
      img.addEventListener('click',()=>{
        el.querySelectorAll('.thumbs img').forEach(i=>i.classList.remove('active'));
        img.classList.add('active'); main.src = img.src;
      });
    });

    el.querySelector('.add').onclick=()=>{
      const color=el.querySelector('.sel-color').value;
      const size=el.querySelector('.sel-size').value;
      const qty=parseInt(el.querySelector('.qty-input').value||'1');
      addToCart({...p,color,size,qty,img:p.imgs[0]});
    };

    grid.appendChild(el);
  });
}

function addToCart(item){
  const found=state.cart.find(i=>i.id===item.id && i.color===item.color && i.size===item.size);
  if(found) found.qty += item.qty; else state.cart.push(item);
  persist(); toast('已加入購物車'); updateBadge();
}
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function changeQty(idx,delta){ state.cart[idx].qty = Math.max(1,(state.cart[idx].qty||1)+delta); persist(); renderCart(); updateBadge(); }

// ===== 購物車抽屜 =====
const drawer = $('#drawer');
$('#openCart').onclick=()=>{drawer.classList.add('open'); renderCart();}
$('#closeCart').onclick=()=>drawer.classList.remove('open');

function subtotal(){ return state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0); }
function calcShipping(){
  const sub=subtotal();
  if(sub>=FREE_SHIP_THRESHOLD) return 0;
  const ship=$('input[name="ship"]:checked')?.value || 'home';
  return ship==='home'?80:60;
}
function onShipChange(){
  const ship=$('input[name="ship"]:checked')?.value || 'home';
  $('#homeFields').style.display = ship==='home'?'block':'none';
  $('#familyFields').style.display = ship==='family'?'block':'none';
  $('#sevenFields').style.display  = ship==='seven' ?'block':'none';
  renderCart();
}
$$('input[name="ship"]').forEach(r=>r.addEventListener('change', onShipChange));

function renderCart(){
  const list=$('#cartList'); list.innerHTML='';
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
  $('#subtotal').textContent=fmt(sub);
  $('#shipping').textContent=fmt(ship);
  $('#grand').textContent=fmt(sub+ship);
}
function updateBadge(){
  const n = state.cart.reduce((s,i)=>s+(i.qty||1),0);
  $('#cartCount').textContent = n;
}

// ===== 選店（官方地圖）=====
async function openCvsMap(logisticsSubType){
  const r = await fetch(`${API_BASE}/api/ecpay/map/sign`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ logisticsSubType })
  });
  if(!r.ok) { alert('選店後端未配置'); return; }
  const {endpoint, fields} = await r.json();
  window._lastMapDebug = {endpoint, fields};
  const form = document.createElement('form');
  form.method='POST'; form.action=endpoint; form.target='_blank';
  Object.entries(fields).forEach(([k,v])=>{
    const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
  });
  document.body.appendChild(form); form.submit(); form.remove();
}
document.addEventListener('click',(e)=>{
  if(e.target && e.target.id==='btnPickFamily'){ e.preventDefault(); openCvsMap('FAMI'); }
  if(e.target && e.target.id==='btnPickSeven'){ e.preventDefault(); openCvsMap('UNIMART'); }
});
window.addEventListener('message',(ev)=>{
  const d=ev.data||{}; if(d.type!=='CVS_PICKED'||!d.store) return;
  if(d.store.cvs==='FAMI'){ $('#familyPicked').textContent = `${d.store.name}（${d.store.id}）｜${d.store.address}`; state.cvs={type:'family',...d.store}; }
  if(d.store.cvs==='UNIMART'){ $('#sevenPicked').textContent = `${d.store.name}（${d.store.id}）｜${d.store.address}`; state.cvs={type:'seven',...d.store}; }
});

// ===== 付款 =====
function validPhone(v){ return /^09\d{8}$/.test(v); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

async function createEcpayLink(order){
  const r = await fetch(`${API_BASE}/api/ecpay/create`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(order)
  });
  if(!r.ok) throw new Error('create ecpay link failed');
  const data = await r.json();
  return data.paymentUrl;
}

$('#checkout').onclick = async ()=>{
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
  const sub=subtotal(); const shipFee=state.cart.length?(sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)):0;
  const amount=sub+shipFee;

  const order = {orderId,name,email,phone,shipOpt,shippingInfo,items,amount,subtotal:sub,shipFee,notify:{admin:ADMIN_EMAIL}};
  const newWin = window.open('about:blank','_blank');
  try{
    const link = await createEcpayLink(order);
    if(!link){ if(newWin && !newWin.closed) newWin.close(); return; }
    newWin.location = link;
    toast('正在前往綠界付款…',1600);
  }catch(e){
    if(newWin && !newWin.closed) newWin.close();
    alert('目前尚未連上後端，請稍後再試。');
  }
};

// ===== 其他 =====
function toast(msg='已加入購物車',ms=1200){
  const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}
$('#year').textContent = new Date().getFullYear();

updateBadge(); renderProducts(); onShipChange();
