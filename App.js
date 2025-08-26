// App.js － LINFAYA COUTURE
// 功能：商品列表、購物車、物流、綠界收銀台
// 修正：讀取 products.json 的 variants（顏色/尺寸/狀態）
// - 顏色選單來自 variants
// - 尺寸選單帶狀態（現貨/預購/售完），售完 disable
// - 單筆限購 1
// - itemName 會帶完整 SKU 明細
// - checkout() 用現有物流資訊，而不是寫死

const API_BASE = 'https://linfaya-ecpay-backend.onrender.com';

const PAGE_SIZE = 6;
let PRODUCTS = [];

// ===== 載入商品 =====
async function loadProducts() {
  try {
    const url = "https://alvanchao.github.io/linfaya-frontend/products.json";
    const r = await fetch(url, { cache: "no-store" });
    PRODUCTS = await r.json();
    renderProducts();
  } catch (e) {
    console.error("載入商品失敗", e);
    PRODUCTS = [];
    renderProducts();
  }
}

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = n => 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW');

function toast(msg='已加入購物車',ms=1200){
  const t=$('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}

const state = {
  cat: 'all',
  page: 1,
  cart: JSON.parse(sessionStorage.getItem('cart')||'[]')
};
function persist(){ sessionStorage.setItem('cart', JSON.stringify(state.cart)); }

// ===== 分頁 =====
function buildPager(total, pageSize = 6) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
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
  render($('#pager')); render($('#pagerBottom'));
}

// ===== 渲染商品 (variants) =====
function renderProducts(){
  const list = state.cat==='all' ? PRODUCTS : PRODUCTS.filter(p=>p.cat===state.cat);
  const total=list.length, from=(state.page-1)*PAGE_SIZE;
  const pageItems=list.slice(from, from+PAGE_SIZE);

  const infoText = $('#infoText'); if(infoText) infoText.textContent = `共 ${total} 件`;
  buildPager(total, PAGE_SIZE);

  const grid=$('#grid'); if(!grid) return;
  grid.innerHTML='';
  pageItems.forEach(p=>{
    if (p.visible === false) return;
    const el=document.createElement('div'); el.className='product';
    const first=p.imgs[0];
    el.innerHTML=`
      <div class="imgbox">
        <div class="main-img"><img alt="${p.name}" src="${first}"><div class="magnifier"></div></div>
        <div class="thumbs">${p.imgs.map((src,i)=>`<img src="${src}" data-idx="${i}" class="${i===0?'active':''}">`).join('')}</div>
      </div>
      <div class="body">
        <b>${p.name}</b>
        <div class="muted">分類：${p.cat}</div>
        <div class="price">${fmt(p.price)}</div>
        <div class="qty">
          <label>顏色：</label>
          <select class="select sel-color"></select>
        </div>
        <div class="qty" style="margin-top:6px">
          <label>尺寸：</label>
          <select class="select sel-size"></select>
        </div>
        <div class="qty" style="margin-top:6px">
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

    const colorSel = el.querySelector('.sel-color');
    const sizeSel = el.querySelector('.sel-size');

    // 動態建立顏色清單
    const colors = [...new Set((p.variants||[]).map(v=>v.color))];
    colors.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c; opt.textContent=c;
      colorSel.appendChild(opt);
    });

    let selectedColor = colors[0];
    function refreshSizes(){
      sizeSel.innerHTML='';
      const sizes = (p.variants||[]).filter(v=>v.color===selectedColor);
      sizes.forEach(v=>{
        const opt=document.createElement('option');
        opt.value=v.size;
        opt.textContent=`${v.size}（${v.status}）`;
        if(v.status==='售完') opt.disabled=true;
        sizeSel.appendChild(opt);
      });
    }
    refreshSizes();

    colorSel.addEventListener('change', e=>{
      selectedColor=e.target.value; refreshSizes();
    });

    el.querySelector('.add').onclick=()=>{
      const size=sizeSel.value;
      const variant=(p.variants||[]).find(v=>v.color===selectedColor && v.size===size);
      if(!variant) return alert("規格不存在");
      if(variant.status==='售完') return alert("此規格已售完");
      addToCart(p, variant);
    };

    grid.appendChild(el);
  });
}

// ===== 購物車 =====
function addToCart(product, variant){
  const item={
    id:product.id,
    name:product.name,
    price:product.price,
    color:variant.color,
    size:variant.size,
    status:variant.status,
    qty:1,
    img:(product.imgs&&product.imgs[0])||""
  };
  state.cart.push(item); persist(); updateBadge(); renderCart();
  toast(`已加入：${item.name}-${item.color}/${item.size}（${item.status}）`);
}

function renderCart(){
  const box=$('#cartItems'); if(!box) return;
  box.innerHTML='';
  state.cart.forEach((it,i)=>{
    const li=document.createElement('div');
    li.className='cart-row';
    li.innerHTML=`
      <div>${it.name}-${it.color}/${it.size}（${it.status}）</div>
      <div>${fmt(it.price)}</div>
      <button onclick="removeFromCart(${i})">移除</button>
    `;
    box.appendChild(li);
  });
  const total=state.cart.reduce((s,it)=>s+it.price*it.qty,0);
  $('#cartTotal').textContent=fmt(total);
}

function removeFromCart(i){
  state.cart.splice(i,1); persist(); updateBadge(); renderCart();
}

function updateBadge(){
  const b=$('#cartBadge'); if(!b) return;
  b.textContent=state.cart.length;
}

// ===== 明細 =====
function composeItemsText(){
  return state.cart.map(it=>
    `${it.name}-${it.color}/${it.size}（${it.status}）×${it.qty}`
  ).join("、");
}

// ===== 付款 =====
async function checkout(){
  if(!state.cart.length) return alert("購物車是空的");
  const subtotal=state.cart.reduce((s,it)=>s+it.price*it.qty,0);

  // 🔹 運費 & 配送資訊：呼叫你現有的函式 / 全域變數
  const shipFee = (typeof window.getShipFee==="function") ? window.getShipFee() : 60;
  const shippingInfo = (typeof window.getShippingInfoText==="function") ? window.getShippingInfoText() : "未選擇";

  const amount=subtotal+shipFee;
  const buyer={
    name:prompt("請輸入姓名："),
    email:prompt("請輸入Email："),
    phone:prompt("請輸入電話：")
  };
  const payload={
    amount,
    itemName:composeItemsText(),
    email:buyer.email,
    phone:buyer.phone,
    name:buyer.name,
    shippingInfo,
    subtotal,
    shipFee
  };
  const r=await fetch(`${API_BASE}/api/ecpay/create`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const {endpoint,fields}=await r.json();
  postForm(endpoint,fields,"_blank");
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

window.addEventListener("DOMContentLoaded",()=>{ loadProducts(); renderCart(); updateBadge(); });
