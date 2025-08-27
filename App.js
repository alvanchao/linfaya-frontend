// App.js － LINFAYA COUTURE（無「加購修改」版，瀏覽器相容版）
// 功能保留：顏色/尺寸/數量 chips（數量受庫存與單品上限 5 限制）、預購小提醒、滿千免運、全家/7-11 選店、ECPay 串接、逾時重試、多分頁同步清空

// ====== 常數 ======
const API_BASE = 'https://linfaya-ecpay-backend.onrender.com';
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

// ====== 商品資料 ======
const PRODUCTS = [
  {
    id:'top01',cat:'tops',name:'無縫高彈背心',price:399,
    colors:['黑','膚'],sizes:['S','M','L'],
    imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg'],
    stockMap:{ '黑-M':0, '膚-S':0, '膚-M':2 }
  },
  {
    id:'top02',cat:'tops',name:'鏤空美背短袖',price:429,
    colors:['黑','粉'],sizes:['S','M','L'],
    imgs:['Photo/鏤空美背短袖.jpg'],
    stockMap:{ '粉-L':3 }
  },
  {
    id:'btm01',cat:'bottoms',name:'高腰緊身褲',price:499,
    colors:['黑','深灰'],sizes:['S','M','L','XL'],
    imgs:['Photo/高腰緊身褲.jpg'],
    stockMap:{ '黑-XL':0, '深灰-S':0, '深灰-M':1 }
  },
  {
    id:'sk01',cat:'bottoms',name:'魚尾練習裙',price:699,
    colors:['黑'],sizes:['S','M','L'],
    imgs:['Photo/魚尾練習裙.jpg'],
    stockMap:{}
  },
  {
    id:'acc01',cat:'accessories',name:'彈力護腕',price:199,
    colors:['黑'],sizes:['F'],
    imgs:['Photo/上衣＋緊身褲套組.jpg'],
    stockMap:{}
  },
  {
    id:'sh01',cat:'shoes',name:'舞鞋（軟底）',price:990,
    colors:['黑'],sizes:['35','36','37','38','39','40'],
    imgs:['Photo/上衣＋緊身褲套組.jpg'],
    stockMap:{ '黑-39':0 }
  },
  {
    id:'set01',cat:'tops',name:'上衣＋緊身褲套組',price:849,
    colors:['多色'],sizes:['S','M','L'],
    imgs:['Photo/上衣＋緊身褲套組.jpg'],
    stockMap:{ '多色-L':0 }
  },
];

// ====== 小工具 ======
function $(s){ return document.querySelector(s); }
function $$(s){ return document.querySelectorAll(s); }
function fmt(n){ return 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW'); }

// 逾時 + 重試 fetch
async function fetchJSON(url, fetchOpts = {}, retryOpts = {}) {
  const timeoutMs = retryOpts.timeoutMs || 20000;
  const retries = retryOpts.retries || 2;
  const retryDelayBaseMs = retryOpts.retryDelayBaseMs || 800;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(new Error('Timeout reached, aborting!')), timeoutMs);
    try {
      const r = await fetch(url, { ...fetchOpts, signal: ac.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (/HTTP\s4\d\d/.test(String(e && e.message))) break;
      if (attempt === retries) break;
      await new Promise(res => setTimeout(res, retryDelayBaseMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

function toast(msg,ms){
  if(!msg) msg='已加入購物車';
  if(!ms) ms=1200;
  const t=$('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}

function openNamedWindow(name, preloadHtml) {
  if(!preloadHtml) preloadHtml="載入中，請稍候…";
  let w = null;
  try { w = window.open('', name); } catch (_) { w = null; }
  if (!w || w.closed || typeof w.closed === 'undefined') return null;
  try {
    w.document.open();
    w.document.write('<!doctype html><meta charset="utf-8"><title>Loading</title><body style="font:14px/1.6 -apple-system,blinkmacsystemfont,Segoe UI,Roboto,Helvetica,Arial">'+preloadHtml+'</body>');
    w.document.close();
  } catch (_) {}
  return w;
}

function postForm(endpoint, fields, target) {
  if(!target) target = '_self';
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = endpoint;
  form.target = target;
  for (var k in fields){
    var i = document.createElement('input');
    i.type = 'hidden'; i.name = k; i.value = fields[k];
    form.appendChild(i);
  }
  document.body.appendChild(form);
  form.submit();
  setTimeout(function(){ form.remove(); }, 3000);
}

// ====== 庫存判斷 ======
function getStock(product, color, size){
  const k = color + '-' + size;
  if (!product.stockMap) return Infinity;
  if (!(k in product.stockMap)) return Infinity;
  const n = Number(product.stockMap[k]);
  return isFinite(n) ? n : Infinity;
}
function isOOS(product, color, size){
  return getStock(product, color, size) <= 0;
}
function maxQtyFor(product, color, size){
  const stock = getStock(product, color, size);
  const cap = 5;
  return Math.min(cap, stock===Infinity?cap:stock);
}
function anySizeAvailable(product, color){
  return (product.sizes||[]).some(function(sz){ return !isOOS(product, color, sz); });
}
function firstAvailableSize(product, color){
  const arr = product.sizes||[];
  for(var i=0;i<arr.length;i++){ if(!isOOS(product,color,arr[i])) return arr[i]; }
  return null;
}
function productById(id){
  return PRODUCTS.find(function(p){ return p.id===id; }) || null;
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

// ====== 預購小提醒 ======
(function attachPreorderBanner(){
  const mount = document.createElement('section');
  mount.style.cssText = 'background:#141821;padding:14px 16px;border-radius:14px;margin:12px;color:#e6e9ef;line-height:1.6';
  const eta = PREORDER_MODE ? '預計出貨區間：'+preorderRangeToday(LEAD_DAYS_MIN, LEAD_DAYS_MAX) : '';
  mount.innerHTML =
    '<strong style="color:#fff;font-size:15px">小提醒</strong>'+
    '<div style="font-size:13px;color:#cfd3dc;line-height:1.6;margin-top:4px">'+
    (
      PREORDER_MODE
      ? '<div>※ 本官網採 <b style="color:#fff">預購</b> 模式，下單後約需 '+LEAD_DAYS_MIN+'–'+LEAD_DAYS_MAX+' 個<b style="color:#fff">工作天</b>出貨；若遇延遲將主動通知，並可退款或更換。</div>'+
        '<div style="margin-top:4px;color:#fff">'+eta+'</div>'
      : '<div>※ 本店商品同步於多平台販售，庫存以實際出貨為準。</div>'
    )+
    '<div style="margin-top:4px">完成付款後信件可能延遲，請檢查垃圾信或「促銷」分類。</div>'+
    '</div>';
  const header = document.querySelector('header');
  if(header && header.parentNode){
    header.parentNode.insertBefore(mount, header.nextSibling);
  }else{
    document.body.insertBefore(mount, document.body.firstChild);
  }
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
  const y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
  return y+'/'+m+'/'+dd;
}
function preorderRangeToday(min, max){
  const now = new Date();
  return ymd(addWorkingDays(now, min))+' ～ '+ymd(addWorkingDays(now, max));
}

// ====== Tabs & 分頁 ======
const tabs = $('#tabs');
if (tabs) {
  tabs.addEventListener('click', function(e){
    const btn = e.target.closest('.tab'); if(!btn) return;
    $$('#tabs .tab').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active');
    state.cat = btn.dataset.cat; state.page = 1;
    renderProducts();
  });
}
function buildPager(total, pageSize){
  if(!pageSize) pageSize=PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function render(mount){
    if(!mount) return;
    mount.innerHTML='';
    for(let p=1;p<=pages;p++){
      const b=document.createElement('button');
      b.type='button';
      b.className='page-btn'+(p===state.page?' active':'');
      b.textContent=String(p);
      b.onclick=function(){ state.page=p; renderProducts(); };
      mount.appendChild(b);
    }
  }
  render($('#pager')); render($('#pagerBottom'));
}

// ====== Chips 樣式 ======
(function injectStyle(){
  const css = `
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .chip{min-width:40px;padding:8px 10px;border:1px solid #2b3342;border-radius:10px;background:#0f1320;color:#c7cede;cursor:pointer;text-align:center;user-select:none}
  .chip:hover{transform:translateY(-1px);border-color:#3b4252}
  .chip.active{background:linear-gradient(135deg,#5eead4,#a78bfa);color:#0b0c10;border:none}
  .chip.small{min-width:32px;padding:6px 8px;border-radius:8px}
  .chip.disabled{opacity:.4;cursor:not-allowed;filter:grayscale(20%);text-decoration:line-through}
  .oos-note{color:#fca5a5;font-size:12px;margin-top:6px}
  `;
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
})();
function chipHTML(label, value, active, disabled, extraClass){
  const cls=['chip',extraClass,(active?'active':''),(disabled?'disabled':'')].filter(Boolean).join(' ');
  const disAttr=disabled?'aria-disabled="true" data-disabled="1"':'';
  return '<button type="button" class="'+cls+'" data-value="'+String(value)+'" '+disAttr+'>'+label+'</button>';
}
function renderChips(values, activeValue, opts){
  if(!values) values=[];
  if(!opts) opts={};
  return '<div class="chips">'+
    values.map(function(v){
      const disabled = typeof opts.disableCheck==='function' ? !!opts.disableCheck(v) : false;
      return chipHTML(v, v, String(v)===String(activeValue), disabled, opts.small?'small':'');
    }).join('')
  +'</div>';
}

// ====== 商品列表 ======
function renderProducts(){
  const list = state.cat==='all' ? PRODUCTS : PRODUCTS.filter(function(p){ return p.cat===state.cat; });
  const total=list.length, from=(state.page-1)*PAGE_SIZE;
  const pageItems=list.slice(from, from+PAGE_SIZE);
  var infoText=$('#infoText'); if(infoText) infoText.textContent='共 '+total+' 件';
  buildPager(total, PAGE_SIZE);
  const grid=$('#grid'); if(!grid) return;
  grid.innerHTML='';
  pageItems.forEach(function(p){
    const el=document.createElement('div'); el.className='product';
    const first=(p.imgs && p.imgs[0]) || '';
    const defColor = (p.colors||[]).find(function(c){return anySizeAvailable(p,c);}) || ((p.colors && p.colors[0])||'');
    const defSize = firstAvailableSize(p, defColor) || ((p.sizes && p.sizes[0])||'');
    const defMax  = defSize ? maxQtyFor(p, defColor, defSize) : MAX_QTY_PER_ITEM;
    const defQty  = 1;
    el.innerHTML=
      '<div class="imgbox">'+
        '<div class="main-img"><img alt="'+p.name+'" src="'+first+'" loading="lazy"><div class="magnifier"></div></div>'+
        '<div class="thumbs">'+(p.imgs||[]).map(function(src,i){return '<img src="'+src+'" data-idx="'+i+'" class="'+(i===0?'active':'')+'" loading="lazy">';}).join('')+'</div>'+
      '</div>'+
      '<div class="body">'+
        '<b>'+p.name+'</b>'+
        '<div class="muted">分類：'+p.cat+'｜可選：顏色、尺寸</div>'+
        '<div class="price">'+fmt(p.price)+'</div>'+
        '<div style="margin-top:4px"><div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div><div class="color-group">'+
          renderChips(p.colors, defColor, { disableCheck: function(c){ return !anySizeAvailable(p,c); } })+
        '</div></div>'+
        '<div style="margin-top:6px"><div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div><div class="size-group">'+
          renderChips(p.sizes, defSize, { disableCheck:function(s){ return isOOS(p, defColor, s); } })+
        '</div><div class="oos-note" style="display:none">此顏色已售完</div></div>'+
        '<div style="margin-top:6px"><div class="muted" style="font-size:12px;margin-bottom:6px">數量</div><div class="qty-group">'+
          renderChips(Array.from({length:defMax},function(_,i){return i+1;}), defQty, { small:true })+
        '</div></div>'+
        (PREORDER_MODE ? '<div class="muted" style="font-size:12px;margin-top:8px">預購交期約 '+LEAD_DAYS_MIN+'–'+LEAD_DAYS_MAX+' 工作天。</div>' : '')+
        '<div class="qty" style="margin-top:10px"><button type="button" class="btn pri add">加入購物車</button></div>'+
      '</div>';
    const main=el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(function(img){
      img.addEventListener('click',function(){
        el.querySelectorAll('.thumbs img').forEach(function(i){i.classList.remove('active');});
        img.classList.add('active'); if(main) main.src=img.src;
      });
    });
    const oosNote = el.querySelector('.oos-note');
    el.addEventListener('click',function(ev){
      const chip = ev.target.closest('.chip'); if(!chip) return;
      if(chip.dataset.disabled==='1') return;
      const isColor=!!chip.closest('.color-group');
      const isSize =!!chip.closest('.size-group');
      const isQty  =!!chip.closest('.qty-group');
      function pick(sel,target){ el.querySelectorAll(sel+' .chip').forEach(function(c){c.classList.remove('active');}); target.classList.add('active'); }
      if(isColor){
        pick('.color-group', chip);
        const color=chip.dataset.value;
        const sizeWrap=el.querySelector('.size-group');
        const firstOk=firstAvailableSize(p,color);
        if(!firstOk){
          sizeWrap.innerHTML=renderChips(p.sizes, '', { disableCheck:function(s){return true;} });
          if(oosNote) oosNote.style.display='block';
          el.querySelector('.qty-group').innerHTML=renderChips([1], 1, { small:true, disableCheck:function(){return true;} });
        }else{
          sizeWrap.innerHTML=renderChips(p.sizes, firstOk, { disableCheck:function(s){ return isOOS(p,color,s); } });
          if(oosNote) oosNote.style.display='none';
          const max=maxQtyFor(p,color,firstOk);
          el.querySelector('.qty-group').innerHTML=renderChips(Array.from({length:max},function(_,i){return i+1;}), 1, { small:true });
        }
      }
      if(isSize){
        pick('.size-group', chip);
        const colorEl=el.querySelector('.color-group .chip.active'); var color=colorEl?colorEl.dataset.value:undefined;
        const size=chip.dataset.value;
        const max=maxQtyFor(p,color,size);
        el.querySelector('.qty-group').innerHTML=renderChips(Array.from({length:max},function(_,i){return i+1;}), 1, { small:true });
      }
      if(isQty){ pick('.qty-group', chip); }
    });
    var addBtn=el.querySelector('.add');
    if(addBtn) addBtn.addEventListener('click',function(){
      var colorEl=el.querySelector('.color-group .chip.active'); var color=colorEl?colorEl.dataset.value:undefined;
      var sizeEl=el.querySelector('.size-group .chip.active'); var size=sizeEl?sizeEl.dataset.value:undefined;
      var qtyEl=el.querySelector('.qty-group .chip.active'); var qty=parseInt(qtyEl?qtyEl.dataset.value:'1',10);
      if(!color){return alert('請先選擇顏色');}
      if(!size){return alert('此顏色目前已售完，請改選其他顏色');}
      if(isOOS(p,color,size)){return alert('此尺寸目前已售完');}
      const max=maxQtyFor(p,color,size);
      if(qty>max) return alert('此組合最多可購買 '+max+' 件');
      addToCart(Object.assign({},p,{color:color,size:size,qty:qty,img:first}));
    });
    grid.appendChild(el);
  });
}

// ====== 購物車 ======
function sameLine(i,j){ return i.id===j.id && i.color===j.color && i.size===j.size; }
function addToCart(item){
  const idx=state.cart.findIndex(function(i){return sameLine(i,item);});
  const prod=productById(item.id);
  const max=maxQtyFor(prod||item,item.color,item.size);
  if(idx>=0){
    const next=Math.min(max,(state.cart[idx].qty||1)+item.qty);
    state.cart[idx].qty=next;
    if(next===max) toast('本組合最多 '+max+' 件'); else toast('已加入購物車');
  }else{
    item.qty=Math.max(1,Math.min(max,item.qty||1));
    state.cart.push(item);
    toast('已加入購物車');
  }
  persist(); updateBadge(); renderCart();
}
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function setQty(idx,qty){
  const cur=state.cart[idx]; if(!cur) return;
  const prod=productById(cur.id);
  const max=maxQtyFor(prod||cur,cur.color,cur.size);
  const next=Math.max(1,Math.min(max,parseInt(qty,10)||1));
  cur.qty=next;
  persist(); renderCart(); updateBadge();
}
window.removeItem=removeItem; window.setQty=setQty;

const drawer=$('#drawer');
var oc=$('#openCart'); if(oc) oc.addEventListener('click',function(){ drawer.classList.add('open'); renderCart(); });
var cc=$('#closeCart'); if(cc) cc.addEventListener('click',function(){ drawer.classList.remove('open'); });

// ...（購物車 renderCart、checkout 等保留，省略未動部分）

// 初始化
var yearEl=$('#year'); if(yearEl) yearEl.textContent=new Date().getFullYear();
updateBadge(); renderProducts(); onShipChange(); renderCart();