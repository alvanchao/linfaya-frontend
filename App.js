// App.js － LINFAYA COUTURE（Chips + 數量受庫存限制 + 新版購物車）
// - stockMap 數字＝庫存數（0=售完；>0=剩餘數量）
// - 數量 chips 依組合庫存動態生成（1 ~ min(MAX_QTY_PER_ITEM, 庫存數)）
// - 商品卡：顏色/尺寸/數量 chips；售完灰掉禁用
// - 購物車：卡片樣式 + 數量 chips（同樣受庫存限制）
// - 保留：預購提醒（不含付款文字）、ECPay、全家/7-11 選店、逾時重試、多分頁清空

// ====== 常數 ======
const API_BASE = 'https://linfaya-ecpay-backend.onrender.com';
const ADMIN_EMAIL = 'linfaya251@gmail.com';

const CVS_WIN_NAME = 'EC_CVS_MAP';
const CASHIER_WIN_NAME = 'ECPAY_CASHIER';

const FREE_SHIP_THRESHOLD = 1000;
const PAGE_SIZE = 6;
const MAX_QTY_PER_ITEM = 5;

// 允許的 postMessage 來源（正式/測試）
const TRUSTED_ORIGINS = [
  new URL(API_BASE).origin,
  'https://logistics.ecpay.com.tw',
  'https://logistics-stage.ecpay.com.tw',
  'https://payment.ecpay.com.tw',
  'https://payment-stage.ecpay.com.tw'
];

// ====== 預購設定 ======
const PREORDER_MODE = true;
const LEAD_DAYS_MIN = 7;
const LEAD_DAYS_MAX = 14;
const REQUIRE_PREORDER_CHECKBOX = true;

// ====== 商品資料（依你現有 7 件；示範幾個組合有限/售完）======
// stockMap：key = '<顏色>-<尺寸>'，value = 庫存數（0=售完；不填=視為充足）
const PRODUCTS = [
  {
    id:'top01',cat:'tops',name:'無縫高彈背心',price:399,
    colors:['黑','膚'],sizes:['S','M','L'],
    imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg'],
    stockMap:{
      '黑-M':0,   // 售完
      '膚-S':0,   // 售完
      '膚-M':2    // 最多只能買 2 件
    }
  },
  {
    id:'top02',cat:'tops',name:'鏤空美背短袖',price:429,
    colors:['黑','粉'],sizes:['S','M','L'],
    imgs:['Photo/鏤空美背短袖.jpg'],
    stockMap:{
      '粉-L':3    // 最多 3 件
    }
  },
  {
    id:'btm01',cat:'bottoms',name:'高腰緊身褲',price:499,
    colors:['黑','深灰'],sizes:['S','M','L','XL'],
    imgs:['Photo/高腰緊身褲.jpg'],
    stockMap:{
      '黑-XL':0,  // 售完
      '深灰-S':0, // 售完
      '深灰-M':1  // 最多 1 件
    }
  },
  {
    id:'sk01',cat:'bottoms',name:'魚尾練習裙',price:699,
    colors:['黑'],sizes:['S','M','L'],
    imgs:['Photo/魚尾練習裙.jpg'],
    stockMap:{
      // 全可售（不填=庫存充足）
    }
  },
  {
    id:'acc01',cat:'accessories',name:'彈力護腕',price:199,
    colors:['黑'],sizes:['F'],
    imgs:['Photo/上衣＋緊身褲套組.jpg'],
    stockMap:{
      // 全可售
    }
  },
  {
    id:'sh01',cat:'shoes',name:'舞鞋（軟底）',price:990,
    colors:['黑'],sizes:['35','36','37','38','39','40'],
    imgs:['Photo/上衣＋緊身褲套組.jpg'],
    stockMap:{
      '黑-39':0   // 售完
    }
  },
  {
    id:'set01',cat:'tops',name:'上衣＋緊身褲套組',price:849,
    colors:['多色'],sizes:['S','M','L'],
    imgs:['Photo/上衣＋緊身褲套組.jpg'],
    stockMap:{
      '多色-L':0  // 售完
    }
  },
];

// ====== 小工具 ======
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = n => 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW');

// 注入 chips 樣式
(function injectChipStyle(){
  const css = `
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .chip{min-width:40px;padding:8px 10px;border:1px solid #2b3342;border-radius:10px;background:#0f1320;color:#c7cede;cursor:pointer;text-align:center;user-select:none}
  .chip:hover{transform:translateY(-1px);border-color:#3b4252}
  .chip.active{background:linear-gradient(135deg,#5eead4,#a78bfa);color:#0b0c10;border:none}
  .chip.small{min-width:32px;padding:6px 8px;border-radius:8px}
  .chip.disabled{opacity:.4;cursor:not-allowed;filter:grayscale(20%);text-decoration:line-through}
  .cart-card{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;border:1px solid #212736;border-radius:14px;background:#0e121b;padding:10px}
  .cart-right{text-align:right}
  .cart-attr{color:#8a94a7;font-size:12px}
  .cart-actions{display:flex;gap:8px;align-items:center;margin-top:6px}
  .link-danger{border:1px solid #3a2230;color:#fca5a5;background:transparent;border-radius:10px;padding:6px 10px;cursor:pointer}
  .oos-note{color:#fca5a5;font-size:12px;margin-top:6px}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// 預購交期（工作天）計算
function addWorkingDays(fromDate, n){
  const d = new Date(fromDate);
  let added = 0;
  while (added < n){
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}
function ymd(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `${y}/${m}/${dd}`;
}
function preorderRangeToday(min, max){
  const now = new Date();
  return `${ymd(addWorkingDays(now, min))} ～ ${ymd(addWorkingDays(now, max))}`;
}

// 逾時 + 重試 fetch
async function fetchJSON(url, fetchOpts = {}, retryOpts = {}) {
  const { timeoutMs = 20000, retries = 2, retryDelayBaseMs = 800 } = retryOpts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(new Error('Timeout reached, aborting!')), timeoutMs);
    try {
      const r = await fetch(url, { ...fetchOpts, signal: ac.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (/HTTP\s4\d\d/.test(String(e?.message||e))) break;
      if (attempt === retries) break;
      await new Promise(res => setTimeout(res, retryDelayBaseMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

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

// ====== 庫存判斷（數字＝庫存；不列＝充足）======
const QTY_VALUES = Array.from({length:MAX_QTY_PER_ITEM},(_,i)=>i+1);
function getStock(product, color, size){
  const k = `${color}-${size}`;
  if (!product.stockMap) return Infinity;          // 沒有 stockMap → 充足
  if (!(k in product.stockMap)) return Infinity;   // 沒列出 → 充足
  const n = Number(product.stockMap[k]);
  return Number.isFinite(n) ? n : Infinity;
}
function isOOS(product, color, size){
  return getStock(product, color, size) <= 0;
}
function maxQtyFor(product, color, size){
  const stock = getStock(product, color, size);
  return Math.min(MAX_QTY_PER_ITEM, stock===Infinity?MAX_QTY_PER_ITEM:stock);
}
function anySizeAvailable(product, color){
  return (product.sizes||[]).some(sz=>!isOOS(product, color, sz));
}
function firstAvailableSize(product, color){
  const sz = (product.sizes||[]).find(s=>!isOOS(product, color, s));
  return sz || null;
}
function productById(id){
  return PRODUCTS.find(p=>p.id===id) || null;
}

// ====== 狀態 ======
const state = {
  cat: 'all',
  page: 1,
  cart: JSON.parse(sessionStorage.getItem('cart')||'[]'),
  cvs: null,
  currentMapType: null,
  agreePreorder: !REQUIRE_PREORDER_CHECKBOX
};
function persist(){ sessionStorage.setItem('cart', JSON.stringify(state.cart)); }

// Tabs
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

// ====== 頁首「小提醒」（深色、不含付款文字）======
(function attachPreorderBanner(){
  const mount = document.createElement('section');
  mount.style.cssText = 'background:#141821;padding:14px 16px;border-radius:14px;margin:12px;color:#e6e9ef;line-height:1.6';
  const eta = PREORDER_MODE ? `預計出貨區間：${preorderRangeToday(LEAD_DAYS_MIN, LEAD_DAYS_MAX)}` : '';
  mount.innerHTML = `
    <strong style="color:#fff;font-size:15px">小提醒</strong>
    <div style="font-size:13px;color:#cfd3dc;line-height:1.6;margin-top:4px">
      ${
        PREORDER_MODE
        ? `<div>※ 本官網採 <b style="color:#fff">預購</b> 模式，下單後約需 ${LEAD_DAYS_MIN}–${LEAD_DAYS_MAX} 個<b style="color:#fff">工作天</b>出貨；若遇延遲將主動通知，並可退款或更換。</div>
           <div style="margin-top:4px;color:#fff">${eta}</div>`
        : `<div>※ 本店商品同步於多平台販售，庫存以實際出貨為準。</div>`
      }
      <div style="margin-top:4px">完成付款後信件可能延遲，請檢查垃圾信或「促銷」分類。</div>
    </div>
  `;
  const header = document.querySelector('header');
  if(header && header.parentNode){
    header.parentNode.insertBefore(mount, header.nextSibling);
  }else{
    document.body.insertBefore(mount, document.body.firstChild);
  }
})();

// ====== 共用：渲染 chips ======
function chipHTML(label, value, active=false, disabled=false, extraClass=''){
  const cls = ['chip', extraClass, active?'active':'', disabled?'disabled':''].filter(Boolean).join(' ');
  const disAttr = disabled ? 'aria-disabled="true" data-disabled="1"' : '';
  return `<button type="button" class="${cls}" data-value="${String(value)}" ${disAttr}>${label}</button>`;
}
function renderChips(values=[], activeValue, { small=false, disableCheck=null }={}){
  return `<div class="chips">${
    values.map(v=>{
      const disabled = typeof disableCheck==='function' ? !!disableCheck(v) : false;
      return chipHTML(v, v, String(v)===String(activeValue), disabled, small?'small':'');
    }).join('')
  }</div>`;
}

// ====== 商品列表（chips：顏色/尺寸/數量 + 庫存限制）======
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
    // 預設：第一個有貨的顏色/尺寸
    const defColor = (p.colors||[]).find(c=>anySizeAvailable(p,c)) || (p.colors?.[0]||'');
    const defSize  = firstAvailableSize(p, defColor) || (p.sizes?.[0]||'');
    const defMax   = defSize ? maxQtyFor(p, defColor, defSize) : MAX_QTY_PER_ITEM;
    const defQty   = 1;

    el.innerHTML=`
      <div class="imgbox">
        <div class="main-img"><img alt="${p.name}" src="${first}" loading="lazy"><div class="magnifier"></div></div>
        <div class="thumbs">${(p.imgs||[]).map((src,i)=>`<img src="${src}" data-idx="${i}" class="${i===0?'active':''}" loading="lazy">`).join('')}</div>
      </div>
      <div class="body">
        <b>${p.name}</b>
        <div class="muted">分類：${p.cat}｜可選：顏色、尺寸</div>
        <div class="price">${fmt(p.price)}</div>

        <div style="margin-top:4px">
          <div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>
          <div class="color-group">
            ${renderChips(p.colors, defColor, {
              disableCheck: (c)=>!anySizeAvailable(p, c)
            })}
          </div>
        </div>

        <div style="margin-top:6px">
          <div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>
          <div class="size-group">
            ${renderChips(p.sizes, defSize, {
              disableCheck: (s)=>isOOS(p, defColor, s)
            })}
          </div>
          <div class="oos-note" style="display:none">此顏色已售完</div>
        </div>

        <div style="margin-top:6px">
          <div class="muted" style="font-size:12px;margin-bottom:6px">數量</div>
          <div class="qty-group">
            ${renderChips(Array.from({length:defMax},(_,i)=>i+1), defQty, { small:true })}
          </div>
        </div>

        <div class="qty" style="margin-top:10px">
          <button type="button" class="btn pri add">加入購物車</button>
        </div>

        ${ PREORDER_MODE ? `<div class="muted" style="font-size:12px;margin-top:8px">預購交期約 ${LEAD_DAYS_MIN}–${LEAD_DAYS_MAX} 工作天。</div>` : `` }
      </div>
    `;

    const main=el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(img=>{
      img.addEventListener('click',()=>{
        el.querySelectorAll('.thumbs img').forEach(i=>i.classList.remove('active'));
        img.classList.add('active'); if(main) main.src=img.src;
      });
    });

    const oosNote = el.querySelector('.oos-note');

    // 事件：chips 切換
    el.addEventListener('click',(ev)=>{
      const chip = ev.target.closest('.chip');
      if(!chip) return;
      if (chip.dataset.disabled === '1') return; // 禁用不動作

      // 判斷所在群組
      const isColor = !!chip.closest('.color-group');
      const isSize  = !!chip.closest('.size-group');
      const isQty   = !!chip.closest('.qty-group');

      // 切換 active
      const pick = (groupSel, target) => {
        el.querySelectorAll(`${groupSel} .chip`).forEach(c=>c.classList.remove('active'));
        target.classList.add('active');
      };

      if (isColor){
        pick('.color-group', chip);
        const color = chip.dataset.value;
        const sizeWrap = el.querySelector('.size-group');
        const firstOk = firstAvailableSize(p, color);

        if (!firstOk){
          sizeWrap.innerHTML = renderChips(p.sizes, '', { disableCheck:(s)=>true });
          if (oosNote) oosNote.style.display = 'block';
          // 數量清成 1 顆（不可選）
          el.querySelector('.qty-group').innerHTML = renderChips([1], 1, { small:true, disableCheck:()=>true });
        }else{
          sizeWrap.innerHTML = renderChips(p.sizes, firstOk, { disableCheck:(s)=>isOOS(p, color, s) });
          if (oosNote) oosNote.style.display = 'none';
          // 更新數量 chips
          const max = maxQtyFor(p, color, firstOk);
          el.querySelector('.qty-group').innerHTML = renderChips(Array.from({length:max},(_,i)=>i+1), 1, { small:true });
        }
      }

      if (isSize){
        pick('.size-group', chip);
        const color = el.querySelector('.color-group .chip.active')?.dataset.value;
        const size = chip.dataset.value;
        const max = maxQtyFor(p, color, size);
        el.querySelector('.qty-group').innerHTML = renderChips(Array.from({length:max},(_,i)=>i+1), 1, { small:true });
      }

      if (isQty){
        pick('.qty-group', chip);
      }
    });

    // 加入購物車
    el.querySelector('.add')?.addEventListener('click',()=>{
      const color = el.querySelector('.color-group .chip.active')?.dataset.value;
      const size  = el.querySelector('.size-group .chip.active')?.dataset.value;
      const qty   = parseInt(el.querySelector('.qty-group .chip.active')?.dataset.value || '1', 10);

      if (!color){ return alert('請先選擇顏色'); }
      if (!size){ return alert('此顏色目前已售完，請改選其他顏色'); }
      if (isOOS(p, color, size)){ return alert('此尺寸目前已售完'); }

      const max = maxQtyFor(p, color, size);
      if (qty > max) return alert(`此組合最多可購買 ${max} 件`);

      addToCart({...p,color,size,qty,img:first});
    });

    grid.appendChild(el);
  });
}

function addToCart(item){
  const found=state.cart.find(i=>i.id===item.id&&i.color===item.color&&i.size===item.size);
  const prod = productById(item.id);
  const max = maxQtyFor(prod || item, item.color, item.size);

  if(found){
    const next = Math.min(max, (found.qty||1) + item.qty);
    found.qty = next;
    if(next === max) toast(`本組合最多 ${max} 件`);
    else toast('已加入購物車');
  }else{
    item.qty = Math.max(1, Math.min(max, item.qty||1));
    state.cart.push(item);
    toast('已加入購物車');
  }
  persist(); updateBadge();
}

// ====== 購物車（卡片樣式 + chips 改數量，受庫存限制）======
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function setQty(idx, qty){
  const cur = state.cart[idx]; if(!cur) return;
  const prod = productById(cur.id);
  const max = maxQtyFor(prod || cur, cur.color, cur.size);
  const next = Math.max(1, Math.min(max, parseInt(qty,10)||1));
  cur.qty = next;
  persist(); renderCart(); updateBadge();
}
window.removeItem = removeItem;
window.setQty    = setQty;

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

function setShipOption(opt){
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
  if(state.cart.length===0){
    list.innerHTML='<p class="muted" style="padding:8px 12px">購物車是空的</p>';
  }

  state.cart.forEach((it,idx)=>{
    const pic = (it.imgs?.[0] ?? it.img) || '';
    const prod = productById(it.id) || it;
    const max = maxQtyFor(prod, it.color, it.size);
    // 若現有數量超過 max，自動下修
    if ((it.qty||1) > max) it.qty = max;

    const row = document.createElement('div');
    row.className = 'cart-card';
    row.innerHTML = `
      <img src="${pic}" alt="${it.name||''}" style="width:72px;height:72px;border-radius:12px;object-fit:cover">
      <div>
        <div><b>${it.name||''}</b></div>
        <div class="cart-attr">顏色：${it.color||''}｜尺寸：${it.size||''}｜單價：${fmt(it.price||0)}</div>
        <div class="cart-actions">
          <div class="chips">
            ${
              Array.from({length:max},(_,i)=>i+1).map(v=>{
                const a = v===(it.qty||1)?' active':'';
                return `<button type="button" class="chip small${a}" data-qty="${v}" data-idx="${idx}">${v}</button>`;
              }).join('')
            }
          </div>
          <button class="link-danger" onclick="removeItem(${idx})">移除</button>
        </div>
      </div>
      <div class="cart-right"><b>${fmt((it.price||0)*(it.qty||1))}</b></div>
    `;
    list.appendChild(row);
  });

  // 事件代理：點選 chips 改數量
  list.onclick = (ev)=>{
    const btn = ev.target.closest('.chip.small[data-qty]');
    if(!btn) return;
    const idx = parseInt(btn.dataset.idx,10);
    const qty = parseInt(btn.dataset.qty,10);
    setQty(idx, qty);
  };

  // 預購同意
  let mount = $('#preorderMount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'preorderMount';
    mount.style.margin = '8px 0';
    list.parentNode?.insertBefore(mount, list.nextSibling);
  }
  if (PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && state.cart.length){
    mount.innerHTML = `
      <div style="padding:10px 12px;border-top:1px solid #1f2430;background:#0b0f17;border-radius:8px">
        <div style="font-size:13px;color:#e6e9ef;margin-bottom:6px">
          <b>預購提醒</b>：此筆訂單為預購，出貨需 ${LEAD_DAYS_MIN}–${LEAD_DAYS_MAX} 工作天；
          若逾期將主動通知並提供退款／更換。
          <div style="margin-top:4px;color:#fff">預計出貨區間：${preorderRangeToday(LEAD_DAYS_MIN, LEAD_DAYS_MAX)}</div>
        </div>
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#e6e9ef">
          <input id="agreePreorder" type="checkbox" ${state.agreePreorder?'checked':''}/>
          <span>我已了解並同意預購交期與相關說明。</span>
        </label>
      </div>
    `;
    const chk = $('#agreePreorder');
    if (chk) chk.onchange = (e)=>{ state.agreePreorder = !!e.target.checked; updatePayButtonState(); };
  }else{
    mount.innerHTML = '';
  }

  const sub=subtotal(), ship=state.cart.length?calcShipping():0;
  const subtotalEl = $('#subtotal'); if(subtotalEl) subtotalEl.textContent=fmt(sub);
  const shippingEl = $('#shipping'); if(shippingEl) shippingEl.textContent=fmt(ship);
  const grandEl    = $('#grand');    if(grandEl)    grandEl.textContent=fmt(sub+ship);

  updatePayButtonState();
}

function updateBadge(){
  const n=state.cart.reduce((s,i)=>s+(i.qty||1),0);
  const cc=$('#cartCount'); if(cc) cc.textContent=String(n);
}

function canCheckout(){
  if(!state.cart.length) return false;
  if(PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && !state.agreePreorder) return false;
  return true;
}

function updatePayButtonState(){
  const btn = $('#checkout');
  if(!btn) return;
  const ok = canCheckout();
  btn.disabled = !ok;
  btn.title = ok ? '前往綠界付款' : (PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX ? '請先勾選預購同意' : '請先加入商品');
}

// 清空購物車（thankyou 通知 + localStorage 備援）
function clearCart(){
  state.cart = [];
  try{ sessionStorage.removeItem('cart'); }catch(_){}
  renderCart();
  updateBadge();
  toast('付款完成，已清空購物車');
}

// ===== 選店（Safari 安全版）=====
async function openCvsMap(logisticsSubType){
  const preWin = openNamedWindow(CVS_WIN_NAME, "即將開啟官方門市地圖…");
  try{
    const {endpoint, fields} = await fetchJSON(
      `${API_BASE}/api/ecpay/map/sign`,
      {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ LogisticsSubType: logisticsSubType })
      },
      { timeoutMs: 20000, retries: 2 }
    );
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

// 地圖彈窗回傳（安全檢查）
window.addEventListener('message',(ev)=>{
  try{
    if(!TRUSTED_ORIGINS.includes(ev.origin)) return;
    const data=ev.data||{};
    if(data.type!=='EC_LOGISTICS_PICKED') return;
    const p=data.payload||{};

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
    const address = p.CVSAddress || p.CVSAddr || p.Address || '';
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

// thankyou／cashier 回傳（多分頁同步清空）
window.addEventListener('message',(ev)=>{
  try{
    if(!TRUSTED_ORIGINS.includes(ev.origin)) return;
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
    if(PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && !state.agreePreorder){
      return alert('請先勾選預購同意，再進行付款。');
    }

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

    // 付款前再次檢查每個品項是否仍符合庫存上限
    for (const it of state.cart){
      const prod = productById(it.id);
      const max = maxQtyFor(prod||it, it.color, it.size);
      if (it.qty > max){
        return alert(`「${it.name}（${it.color}/${it.size}）」目前最多可購買 ${max} 件，請調整數量再結帳。`);
      }
    }

    const orderId = 'LF' + Date.now();
    const items = state.cart.map(i=>({id:i.id,name:i.name,color:i.color,size:i.size,qty:i.qty,price:i.price}));
    const sub = state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
    const shipFee = state.cart.length ? (sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
    const amount = sub + shipFee;

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
      const data = await fetchJSON(
        `${API_BASE}/api/ecpay/create`,
        {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        },
        { timeoutMs: 20000, retries: 2 }
      );
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

// 初始渲染
updateBadge(); renderProducts(); onShipChange(); renderCart();