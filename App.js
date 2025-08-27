// App.js － LINFAYA COUTURE（相容版：不使用 ?. / ??，避免舊版瀏覽器整檔掛掉）

// ====== 常數 ======
var API_BASE = 'https://linfaya-ecpay-backend.onrender.com';
var ADMIN_EMAIL = 'linfaya251@gmail.com';

var CVS_WIN_NAME = 'EC_CVS_MAP';
var CASHIER_WIN_NAME = 'ECPAY_CASHIER';

var FREE_SHIP_THRESHOLD = 1000;
var PAGE_SIZE = 6;
var MAX_QTY_PER_ITEM = 5;

// 允許的 postMessage 來源（正式/測試）
var TRUSTED_ORIGINS = [
  new URL(API_BASE).origin,
  'https://logistics.ecpay.com.tw',
  'https://logistics-stage.ecpay.com.tw',
  'https://payment.ecpay.com.tw',
  'https://payment-stage.ecpay.com.tw'
];

// ====== 預購設定 ======
var PREORDER_MODE = true;
var LEAD_DAYS_MIN = 7;
var LEAD_DAYS_MAX = 14;
var REQUIRE_PREORDER_CHECKBOX = true;

// ====== Alteration 定價（依 cat 自動套用）======
var ALTER_PRICING = {
  bottoms: [
    { id:'hem', name:'改長度（褲/裙）', type:'by_cm', base:200, perCm:50, freeCm:5, maxCm:50, cap:null },
    { id:'waist', name:'改腰圍', type:'fixed', price:300 }
  ],
  tops: [
    { id:'sleeve', name:'改袖長', type:'fixed', price:250 },
    { id:'shape', name:'改腰身（收腰）', type:'fixed', price:350 }
  ]
};
function getAlterOptionsForProduct(product){
  if (product && Array.isArray(product.alterOptions)) return product.alterOptions;
  return (product && ALTER_PRICING[product.cat]) ? ALTER_PRICING[product.cat] : [];
}
function calcAlterFee(opt, params){
  if (!opt) return 0;
  if (opt.type === 'fixed') return Number(opt.price || 0);
  if (opt.type === 'by_cm'){
    var cm = Math.max(0, Number((params && params.cm) || 0));
    var base   = Number(('base' in opt)   ? opt.base   : 0);
    var freeCm = Number(('freeCm' in opt) ? opt.freeCm : 0);
    var per    = Number(('perCm' in opt)  ? opt.perCm  : 0);
    var extra  = Math.max(0, cm - freeCm);
    var fee    = base + extra * per;
    if (opt.cap === null || typeof opt.cap === 'undefined') return fee;
    return Math.min(fee, Number(opt.cap));
  }
  return 0;
}
function formatAlterSummary(opt, params, fee){
  if (!opt) return '';
  if (opt.type === 'fixed') return opt.name + ' (+' + fee + ')';
  if (opt.type === 'by_cm') {
    var cm = Number((params && params.cm) || 0);
    return opt.name + ' ' + cm + 'cm (+' + fee + ')';
  }
  return opt.name + ' (+' + fee + ')';
}

// ====== 商品資料 ======
var PRODUCTS = [
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
  }
];

// ====== 小工具 ======
function $(s){ return document.querySelector(s); }
function $$(s){ return document.querySelectorAll(s); }
function fmt(n){ return 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW'); }

// 注入 chips 樣式
(function injectStyle(){
  var css = [
  '.chips{display:flex;gap:8px;flex-wrap:wrap}',
  '.chip{min-width:40px;padding:8px 10px;border:1px solid #2b3342;border-radius:10px;background:#0f1320;color:#c7cede;cursor:pointer;text-align:center;user-select:none}',
  '.chip:hover{transform:translateY(-1px);border-color:#3b4252}',
  '.chip.active{background:linear-gradient(135deg,#5eead4,#a78bfa);color:#0b0c10;border:none}',
  '.chip.small{min-width:32px;padding:6px 8px;border-radius:8px}',
  '.chip.disabled{opacity:.4;cursor:not-allowed;filter:grayscale(20%);text-decoration:line-through}',
  '.cart-card{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;border:1px solid #212736;border-radius:14px;background:#0e121b;padding:10px}',
  '.cart-right{text-align:right}',
  '.cart-attr{color:#8a94a7;font-size:12px}',
  '.cart-actions{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap}',
  '.link-danger{border:1px solid #3a2230;color:#fca5a5;background:transparent;border-radius:10px;padding:6px 10px;cursor:pointer}',
  '.link{border:1px solid #2b3342;background:transparent;color:#d6deeb;border-radius:10px;padding:6px 10px;cursor:pointer}',
  '.oos-note{color:#fca5a5;font-size:12px;margin-top:6px}',
  '.alter-summary{color:#cfe3ff;font-size:12px;margin-top:6px}',
  '.muted{color:#8a94a7}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// 預購交期
function addWorkingDays(fromDate, n){
  var d = new Date(fromDate);
  var added = 0;
  while (added < n){
    d.setDate(d.getDate() + 1);
    var day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}
function ymd(d){
  var y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
  return y+'/'+m+'/'+dd;
}
function preorderRangeToday(min, max){
  var now = new Date();
  return ymd(addWorkingDays(now, min)) + ' ～ ' + ymd(addWorkingDays(now, max));
}

// 逾時 + 重試 fetch
async function fetchJSON(url, fetchOpts, retryOpts) {
  fetchOpts = fetchOpts || {};
  retryOpts = retryOpts || {};
  var timeoutMs = ('timeoutMs' in retryOpts) ? retryOpts.timeoutMs : 20000;
  var retries   = ('retries'   in retryOpts) ? retryOpts.retries   : 2;
  var retryDelayBaseMs = ('retryDelayBaseMs' in retryOpts) ? retryOpts.retryDelayBaseMs : 800;

  var lastErr;
  for (var attempt = 0; attempt <= retries; attempt++) {
    var ac = new AbortController();
    var t = setTimeout(function(){ try{ ac.abort(new Error('Timeout reached, aborting!')); }catch(_){ } }, timeoutMs);
    try {
      var opts = {}; for (var k in fetchOpts) opts[k]=fetchOpts[k];
      opts.signal = ac.signal;
      var r = await fetch(url, opts);
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      var msg = String((e && e.message) || e);
      if (/HTTP\s4\d\d/.test(msg)) break;
      if (attempt === retries) break;
      var delay = retryDelayBaseMs * Math.pow(2, attempt);
      await new Promise(function(res){ setTimeout(res, delay); });
    }
  }
  throw lastErr;
}

function toast(msg,ms){
  if(!ms) ms=1200;
  var t=$('#toast'); if(!t) return;
  t.textContent=msg||'已加入購物車'; t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},ms);
}

function openNamedWindow(name, preloadHtml) {
  if(!preloadHtml) preloadHtml = "載入中，請稍候…";
  var w = null;
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
  var form = document.createElement('form');
  form.method = 'POST';
  form.action = endpoint;
  form.target = target;
  Object.keys(fields).forEach(function(k){
    var i = document.createElement('input');
    i.type = 'hidden'; i.name = k; i.value = fields[k];
    form.appendChild(i);
  });
  document.body.appendChild(form);
  form.submit();
  setTimeout(function(){ form.remove(); }, 3000);
}

// ====== 庫存判斷（數字＝庫存；不列＝充足）======
var QTY_VALUES = Array.from({length:MAX_QTY_PER_ITEM},function(_,i){return i+1;});
function getStock(product, color, size){
  var k = String(color)+'-'+String(size);
  if (!product || !product.stockMap) return Infinity;
  if (!(k in product.stockMap)) return Infinity;
  var n = Number(product.stockMap[k]);
  return isFinite(n) ? n : Infinity;
}
function isOOS(product, color, size){
  return getStock(product, color, size) <= 0;
}
function maxQtyFor(product, color, size){
  var stock = getStock(product, color, size);
  return Math.min(MAX_QTY_PER_ITEM, stock===Infinity?MAX_QTY_PER_ITEM:stock);
}
function anySizeAvailable(product, color){
  var arr = (product && product.sizes) ? product.sizes : [];
  for (var i=0;i<arr.length;i++){ if(!isOOS(product, color, arr[i])) return true; }
  return false;
}
function firstAvailableSize(product, color){
  var arr = (product && product.sizes) ? product.sizes : [];
  for (var i=0;i<arr.length;i++){ if(!isOOS(product, color, arr[i])) return arr[i]; }
  return null;
}
function productById(id){
  for (var i=0;i<PRODUCTS.length;i++){ if(PRODUCTS[i].id===id) return PRODUCTS[i]; }
  return null;
}

// ====== 狀態 ======
var state = {
  cat: 'all',
  page: 1,
  cart: (function(){ try{ return JSON.parse(sessionStorage.getItem('cart')||'[]'); }catch(_){ return []; }})(),
  cvs: null,
  currentMapType: null,
  agreePreorder: !REQUIRE_PREORDER_CHECKBOX,
  agreeAlter: false
};
function persist(){ try{ sessionStorage.setItem('cart', JSON.stringify(state.cart)); }catch(_){} }

// Tabs
var tabs = $('#tabs');
if (tabs) {
  tabs.addEventListener('click', function(e){
    var btn = e.target.closest('.tab'); if(!btn) return;
    $$('#tabs .tab').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active');
    state.cat = btn.dataset.cat; state.page = 1;
    renderProducts();
  });
}

function buildPager(total, pageSize) {
  if(!pageSize) pageSize = PAGE_SIZE;
  var pages = Math.max(1, Math.ceil(total / pageSize));
  var mountTop = $('#pager'), mountBottom = $('#pagerBottom');
  function draw(mount){
    if(!mount) return;
    mount.innerHTML = '';
    for(var p=1;p<=pages;p++){
      var b=document.createElement('button');
      b.type='button';
      b.className='page-btn' + (p===state.page?' active':'');
      b.textContent=String(p);
      b.onclick=(function(pp){ return function(){ state.page=pp; renderProducts(); }; })(p);
      mount.appendChild(b);
    }
  }
  draw(mountTop); draw(mountBottom);
}

// ====== 頁首「小提醒」======
(function attachPreorderBanner(){
  var mount = document.createElement('section');
  mount.setAttribute('style','background:#141821;padding:14px 16px;border-radius:14px;margin:12px;color:#e6e9ef;line-height:1.6');
  var eta = PREORDER_MODE ? ('預計出貨區間：'+preorderRangeToday(LEAD_DAYS_MIN, LEAD_DAYS_MAX)) : '';
  mount.innerHTML =
    '<strong style="color:#fff;font-size:15px">小提醒</strong>' +
    '<div style="font-size:13px;color:#cfd3dc;line-height:1.6;margin-top:4px">' +
      ( PREORDER_MODE
        ? ('<div>※ 本官網採 <b style="color:#fff">預購</b> 模式，下單後約需 '+LEAD_DAYS_MIN+'–'+LEAD_DAYS_MAX+' 個<b style="color:#fff">工作天</b>出貨；若遇延遲將主動通知，並可退款或更換。</div>' +
           '<div style="margin-top:4px;color:#fff">'+eta+'</div>')
        : ('<div>※ 本店商品同步於多平台販售，庫存以實際出貨為準。</div>')
      ) +
      '<div style="margin-top:4px">完成付款後信件可能延遲，請檢查垃圾信或「促銷」分類。</div>' +
    '</div>';
  var header = document.querySelector('header');
  if(header && header.parentNode){ header.parentNode.insertBefore(mount, header.nextSibling); }
  else { document.body.insertBefore(mount, document.body.firstChild); }
})();

// ====== chips ======
function chipHTML(label, value, active, disabled, extraClass){
  var cls = ['chip', extraClass||'', active?'active':'', disabled?'disabled':''].filter(Boolean).join(' ');
  var disAttr = disabled ? 'aria-disabled="true" data-disabled="1"' : '';
  return '<button type="button" class="'+cls+'" data-value="'+String(value)+'" '+disAttr+'>'+label+'</button>';
}
function renderChips(values, activeValue, opts){
  values = values || [];
  opts = opts || {};
  var small = !!opts.small;
  var disableCheck = typeof opts.disableCheck==='function' ? opts.disableCheck : null;
  return '<div class="chips">' + values.map(function(v){
    var dis = disableCheck ? !!disableCheck(v) : false;
    return chipHTML(v, v, String(v)===String(activeValue), dis, small?'small':'');
  }).join('') + '</div>';
}

// ====== 商品列表（商品卡上就能加購修改）======
function renderProducts(){
  var list = state.cat==='all' ? PRODUCTS : PRODUCTS.filter(function(p){ return p.cat===state.cat; });
  var total=list.length, from=(state.page-1)*PAGE_SIZE;
  var pageItems=list.slice(from, from+PAGE_SIZE);

  var infoText = $('#infoText'); if(infoText) infoText.textContent = '共 ' + total + ' 件';
  buildPager(total, PAGE_SIZE);

  var grid=$('#grid'); if(!grid) return;
  grid.innerHTML='';

  pageItems.forEach(function(p){
    var el=document.createElement('div'); el.className='product';
    var first = (p.imgs && p.imgs[0]) ? p.imgs[0] : '';
    var defColor = (p.colors||[]).find(function(c){return anySizeAvailable(p,c);}) || ((p.colors&&p.colors[0])||'');
    var defSize  = firstAvailableSize(p, defColor) || ((p.sizes&&p.sizes[0])||'');
    var defMax   = defSize ? maxQtyFor(p, defColor, defSize) : MAX_QTY_PER_ITEM;
    var defQty   = 1;

    var alterOpts = getAlterOptionsForProduct(p);
    var hasAlter = alterOpts.length>0;

    var alterHtml = !hasAlter ? '' :
      '<div style="margin-top:8px">' +
        '<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" class="chk-alter"> 需要修改</label>' +
        '<div class="alter-fields" style="display:none;margin-top:6px">' +
          '<div style="display:grid;gap:6px">' +
            '<div>' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">修改項目</div>' +
              '<select class="select alter-opt">' +
                alterOpts.map(function(o){ return '<option value="'+o.id+'" data-type="'+o.type+'">'+o.name+(o.type==='fixed'?'（+'+fmt(o.price)+'）':'')+'</option>'; }).join('') +
              '</select>' +
            '</div>' +
            '<div class="alter-cm-row" style="display:none">' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">縮短（cm）</div>' +
              '<input class="input alter-cm" type="number" min="0" max="999" placeholder="請輸入整數公分">' +
              '<div class="muted alter-hint" style="font-size:12px;margin-top:4px"></div>' +
            '</div>' +
            '<div>' +
              '<div class="muted" style="font-size:12px;margin-bottom:6px">備註（選填）</div>' +
              '<input class="input alter-note" placeholder="例：穿鞋量的長度、預留 3cm 摺邊⋯⋯">' +
            '</div>' +
            '<div class="muted" style="font-size:12px">加價金額：<b class="alter-fee">NT$0</b></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    el.innerHTML =
      '<div class="imgbox">' +
        '<div class="main-img"><img alt="'+p.name+'" src="'+first+'" loading="lazy"><div class="magnifier"></div></div>' +
        '<div class="thumbs">'+ (p.imgs||[]).map(function(src,i){ return '<img src="'+src+'" data-idx="'+i+'" class="'+(i===0?'active':'')+'" loading="lazy">'; }).join('') +'</div>' +
      '</div>' +
      '<div class="body">' +
        '<b>'+p.name+'</b>' +
        '<div class="muted">分類：'+p.cat+'｜可選：顏色、尺寸</div>' +
        '<div class="price">'+fmt(p.price)+'</div>' +

        '<div style="margin-top:4px">' +
          '<div class="muted" style="font-size:12px;margin-bottom:6px">顏色</div>' +
          '<div class="color-group">'+
            renderChips(p.colors, defColor, { disableCheck: function(c){ return !anySizeAvailable(p, c); } }) +
          '</div>' +
        '</div>' +

        '<div style="margin-top:6px">' +
          '<div class="muted" style="font-size:12px;margin-bottom:6px">尺寸</div>' +
          '<div class="size-group">'+
            renderChips(p.sizes, defSize, { disableCheck:function(s){ return isOOS(p, defColor, s); } }) +
          '</div>' +
          '<div class="oos-note" style="display:none">此顏色已售完</div>' +
        '</div>' +

        '<div style="margin-top:6px">' +
          '<div class="muted" style="font-size:12px;margin-bottom:6px">數量</div>' +
          '<div class="qty-group">'+
            renderChips(Array.from({length:defMax},function(_,i){return i+1;}), defQty, { small:true }) +
          '</div>' +
        '</div>' +

        alterHtml +

        '<div class="qty" style="margin-top:10px">' +
          '<button type="button" class="btn pri add">加入購物車</button>' +
        '</div>' +

        (PREORDER_MODE ? '<div class="muted" style="font-size:12px;margin-top:8px">預購交期約 '+LEAD_DAYS_MIN+'–'+LEAD_DAYS_MAX+' 工作天。</div>' : '') +
      '</div>';

    // thumbs
    var main=el.querySelector('.main-img img');
    el.querySelectorAll('.thumbs img').forEach(function(img){
      img.addEventListener('click',function(){
        el.querySelectorAll('.thumbs img').forEach(function(i){ i.classList.remove('active'); });
        img.classList.add('active'); if(main) main.src=img.src;
      });
    });

    var oosNote = el.querySelector('.oos-note');

    // 修改面板（產品卡）
    var chkAlter   = el.querySelector('.chk-alter');
    var fieldsWrap = el.querySelector('.alter-fields');
    var selOpt     = el.querySelector('.alter-opt');
    var cmRow      = el.querySelector('.alter-cm-row');
    var cmInput    = el.querySelector('.alter-cm');
    var cmHint     = el.querySelector('.alter-hint');
    var feeEl      = el.querySelector('.alter-fee');
    var noteInput  = el.querySelector('.alter-note');

    function currentAlterOption(){
      if(!selOpt) return null;
      var id = selOpt.value;
      for (var i=0;i<alterOpts.length;i++){ if(alterOpts[i].id===id) return alterOpts[i]; }
      return null;
    }
    function refreshAlterUI(){
      if(!chkAlter || !fieldsWrap) return;
      fieldsWrap.style.display = chkAlter.checked ? 'block' : 'none';
      if(!chkAlter.checked) return;

      var opt = currentAlterOption();
      if(!opt) return;

      if (opt.type==='by_cm'){
        cmRow.style.display = 'block';
        var free = ('freeCm' in opt)?opt.freeCm:0;
        var base = ('base'   in opt)?opt.base  :0;
        var per  = ('perCm'  in opt)?opt.perCm :0;
        var cap  = (opt.cap===null || typeof opt.cap==='undefined') ? '無封頂' : ('封頂 '+opt.cap);
        var maxC = ('maxCm' in opt) ? (opt.maxCm+'cm') : '—';
        cmHint.textContent = '基礎 '+base+'（含 '+free+'cm），超過每 cm +'+per+'，'+cap+'；建議上限 '+maxC;
      }else{
        cmRow.style.display = 'none';
      }
      updateAlterFee();
    }
    function updateAlterFee(){
      if(!chkAlter || !chkAlter.checked || !feeEl) return 0;
      var opt = currentAlterOption();
      var params = {};
      if (opt && opt.type==='by_cm'){
        var maxC = Number(('maxCm' in opt) ? opt.maxCm : 999);
        var cm = Math.max(0, Math.min(maxC, Number((cmInput && cmInput.value) || 0)));
        if (cmInput) cmInput.value = cm;
        params.cm = cm;
      }
      var fee = calcAlterFee(opt, params);
      feeEl.textContent = fmt(fee);
      return fee;
    }
    if (chkAlter){
      chkAlter.addEventListener('change', refreshAlterUI);
      if(selOpt) selOpt.addEventListener('change', refreshAlterUI);
      if(cmInput) cmInput.addEventListener('input', updateAlterFee);
    }

    // chips 切換
    el.addEventListener('click',function(ev){
      var chip = ev.target.closest('.chip');
      if(!chip) return;
      if (chip.getAttribute('data-disabled') === '1') return;

      var isColor = !!chip.closest('.color-group');
      var isSize  = !!chip.closest('.size-group');
      var isQty   = !!chip.closest('.qty-group');

      function pick(groupSel, target){
        el.querySelectorAll(groupSel+' .chip').forEach(function(c){ c.classList.remove('active'); });
        target.classList.add('active');
      }

      if (isColor){
        pick('.color-group', chip);
        var color = chip.dataset.value;
        var sizeWrap = el.querySelector('.size-group');
        var firstOk = firstAvailableSize(p, color);

        if (!firstOk){
          sizeWrap.innerHTML = renderChips(p.sizes, '', { disableCheck:function(){return true;} });
          if (oosNote) oosNote.style.display = 'block';
          el.querySelector('.qty-group').innerHTML = renderChips([1], 1, { small:true, disableCheck:function(){return true;} });
        }else{
          sizeWrap.innerHTML = renderChips(p.sizes, firstOk, { disableCheck:function(s){return isOOS(p, color, s);} });
          if (oosNote) oosNote.style.display = 'none';
          var max = maxQtyFor(p, color, firstOk);
          el.querySelector('.qty-group').innerHTML = renderChips(Array.from({length:max},function(_,i){return i+1;}), 1, { small:true });
        }
      }

      if (isSize){
        pick('.size-group', chip);
        var color2 = (el.querySelector('.color-group .chip.active')||{}).dataset;
        color2 = color2 ? color2.value : '';
        var size = chip.dataset.value;
        var max2 = maxQtyFor(p, color2, size);
        el.querySelector('.qty-group').innerHTML = renderChips(Array.from({length:max2},function(_,i){return i+1;}), 1, { small:true });
      }

      if (isQty){
        pick('.qty-group', chip);
      }
    });

    // 初始化修改 UI
    refreshAlterUI();

    // 加入購物車
    var addBtn = el.querySelector('.add');
    if (addBtn){
      addBtn.addEventListener('click',function(){
        var colorEl = el.querySelector('.color-group .chip.active');
        var sizeEl  = el.querySelector('.size-group .chip.active');
        var qtyEl   = el.querySelector('.qty-group .chip.active');
        var color = colorEl ? colorEl.dataset.value : '';
        var size  = sizeEl  ? sizeEl.dataset.value  : '';
        var qty   = parseInt(qtyEl ? qtyEl.dataset.value : '1', 10);

        if (!color){ alert('請先選擇顏色'); return; }
        if (!size){ alert('此顏色目前已售完，請改選其他顏色'); return; }
        if (isOOS(p, color, size)){ alert('此尺寸目前已售完'); return; }

        var max = maxQtyFor(p, color, size);
        if (qty > max){ alert('此組合最多可購買 '+max+' 件'); return; }

        var alteration = null;
        if (chkAlter && chkAlter.checked && hasAlter){
          var opt = currentAlterOption();
          var params = {};
          if (opt && opt.type==='by_cm'){
            var cmVal = Math.max(0, Number((cmInput && cmInput.value) || 0));
            params.cm = cmVal;
          }
          var fee = calcAlterFee(opt, params);
          alteration = { optId:opt.id, optName:opt.name, type:opt.type, fee:fee, note:String((noteInput && noteInput.value)||'').trim() };
          if (opt.type==='by_cm') alteration.cm = params.cm;
        }

        addToCart({
          id:p.id, cat:p.cat, name:p.name, price:p.price,
          colors:p.colors, sizes:p.sizes, imgs:p.imgs,
          color:color, size:size, qty:qty, img:first, alteration:alteration
        });
      });
    }

    grid.appendChild(el);
  });
}

// ====== 購物車（只顯示摘要）======
function alterKey(a){
  if(!a) return '';
  var t = a.type || '';
  if (t==='fixed') return a.optId+'|fixed|'+(a.fee||0)+'|'+(a.note||'');
  if (t==='by_cm') return a.optId+'|bycm|'+(a.cm||0)+'|'+(a.fee||0)+'|'+(a.note||'');
  try{ return JSON.stringify(a); }catch(_){ return String(a); }
}
function sameLine(i, j){
  return i.id===j.id && i.color===j.color && i.size===j.size && alterKey(i.alteration)===alterKey(j.alteration);
}
function addToCart(item){
  var idx = state.cart.findIndex(function(i){ return sameLine(i,item); });
  if (idx >= 0){
    var prod = productById(item.id) || item;
    var max = maxQtyFor(prod, item.color, item.size);
    var next = Math.min(max, (state.cart[idx].qty||1) + item.qty);
    state.cart[idx].qty = next;
    if(next === max) toast('本組合最多 '+max+' 件'); else toast('已加入購物車');
  }else{
    var prod2 = productById(item.id) || item;
    var max2 = maxQtyFor(prod2, item.color, item.size);
    item.qty = Math.max(1, Math.min(max2, item.qty||1));
    state.cart.push(item);
    toast('已加入購物車');
  }
  persist(); updateBadge(); renderCart();
}

function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge(); }
function setQty(idx, qty){
  var cur = state.cart[idx]; if(!cur) return;
  var prod = productById(cur.id) || cur;
  var max = maxQtyFor(prod, cur.color, cur.size);
  var next = Math.max(1, Math.min(max, parseInt(qty,10)||1));
  cur.qty = next;
  persist(); renderCart(); updateBadge();
}
window.removeItem = removeItem;
window.setQty    = setQty;

var drawer=$('#drawer');
var openCartBtn  = $('#openCart');
var closeCartBtn = $('#closeCart');
if(openCartBtn) openCartBtn.onclick=function(){ if(drawer) drawer.classList.add('open'); renderCart(); };
if(closeCartBtn) closeCartBtn.onclick=function(){ if(drawer) drawer.classList.remove('open'); };

function lineTotal(it){
  var alterFee = (it.alteration && it.alteration.fee) ? it.alteration.fee : 0;
  var unit = (it.price||0) + alterFee;
  return unit * (it.qty||1);
}
function subtotal(){ return state.cart.reduce(function(s,i){return s+lineTotal(i);},0); }
function calcShipping(){
  var sub=subtotal();
  if(sub>=FREE_SHIP_THRESHOLD) return 0;
  var r = document.querySelector('input[name="ship"]:checked');
  var ship = r ? r.value : 'home';
  return ship==='home'?80:60;
}

function setShipOption(opt){
  var r = document.querySelector('input[name="ship"][value="'+opt+'"]');
  if (r) r.checked = true;
  onShipChange();
  try{ sessionStorage.setItem('SHIP_OPT', opt); }catch(_){}
}

function onShipChange(){
  var r = document.querySelector('input[name="ship"]:checked');
  var ship = r ? r.value : 'home';
  var home  = $('#homeFields');
  var fam   = $('#familyFields');
  var seven = $('#sevenFields');
  if(home)  home.style.display  = ship==='home'  ?'block':'none';
  if(fam)   fam.style.display   = ship==='family'?'block':'none';
  if(seven) seven.style.display = ship==='seven' ?'block':'none';
  renderCart();
  try{ sessionStorage.setItem('SHIP_OPT', ship); }catch(_){}
}
$$('input[name="ship"]').forEach(function(r){ r.addEventListener('change', onShipChange); });

function renderCart(){
  var list=$('#cartList'); if(!list) return;
  list.innerHTML='';
  if(state.cart.length===0){ list.innerHTML='<p class="muted" style="padding:8px 12px">購物車是空的</p>'; }

  state.cart.forEach(function(it,idx){
    var pic = (it.imgs && it.imgs[0]) ? it.imgs[0] : (it.img || '');
    var prod = productById(it.id) || it;
    var max = maxQtyFor(prod, it.color, it.size);
    if ((it.qty||1) > max) it.qty = max;

    var alterText = (it.alteration)
      ? formatAlterSummary(
          { id:it.alteration.optId, name:it.alteration.optName, type:it.alteration.type },
          it.alteration, it.alteration.fee) + (it.alteration.note?('（'+it.alteration.note+'）'):'')
      : '';

    var row = document.createElement('div');
    row.className = 'cart-card';
    row.innerHTML =
      '<img src="'+pic+'" alt="'+(it.name||'')+'" style="width:72px;height:72px;border-radius:12px;object-fit:cover">' +
      '<div>' +
        '<div><b>'+(it.name||'')+'</b></div>' +
        '<div class="cart-attr">顏色：'+(it.color||'')+'｜尺寸：'+(it.size||'')+'｜單價：'+fmt((it.price||0) + ((it.alteration&&it.alteration.fee)||0))+'</div>' +
        ( it.alteration ? '<div class="alter-summary">修改：'+alterText+'</div>' : '' ) +
        '<div class="cart-actions">' +
          '<div class="chips">' +
            Array.from({length:max},function(_,i){return i+1;}).map(function(v){
              var a = (v===(it.qty||1))?' active':'';
              return '<button type="button" class="chip small'+a+'" data-qty="'+v+'" data-idx="'+idx+'">'+v+'</button>';
            }).join('') +
          '</div>' +
          '<button class="link-danger" onclick="removeItem('+idx+')">移除商品</button>' +
        '</div>' +
      '</div>' +
      '<div class="cart-right"><b>'+fmt(lineTotal(it))+'</b></div>';
    list.appendChild(row);
  });

  // 事件代理：數量 chips
  list.onclick = function(ev){
    var btnQty = ev.target.closest('.chip.small[data-qty]');
    if(btnQty){
      var idx = parseInt(btnQty.getAttribute('data-idx'),10);
      var qty = parseInt(btnQty.getAttribute('data-qty'),10);
      setQty(idx, qty);
      return;
    }
  };

  // 有無修改 → 是否顯示同意
  var hasAlter = state.cart.some(function(i){ return !!i.alteration; });
  if (!hasAlter) state.agreeAlter = false;

  var extraMount = $('#agreementsMount');
  if (!extraMount) {
    extraMount = document.createElement('div');
    extraMount.id = 'agreementsMount';
    extraMount.style.margin = '8px 0';
    list.parentNode && list.parentNode.insertBefore(extraMount, list.nextSibling);
  }

  var html = '';
  if (PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && state.cart.length){
    html +=
      '<div style="padding:10px 12px;border-top:1px solid #1f2430;background:#0b0f17;border-radius:8px;margin-bottom:8px">' +
        '<div style="font-size:13px;color:#e6e9ef;margin-bottom:6px">' +
          '<b>預購提醒</b>：此筆訂單為預購，出貨需 '+LEAD_DAYS_MIN+'–'+LEAD_DAYS_MAX+' 工作天；' +
          '若逾期將主動通知並提供退款／更換。' +
          '<div style="margin-top:4px;color:#fff">預計出貨區間：'+preorderRangeToday(LEAD_DAYS_MIN, LEAD_DAYS_MAX)+'</div>' +
        '</div>' +
        '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#e6e9ef">' +
          '<input id="agreePreorder" type="checkbox" '+(state.agreePreorder?'checked':'')+' />' +
          '<span>我已了解並同意預購交期與相關說明。</span>' +
        '</label>' +
      '</div>';
  }
  if (hasAlter){
    html +=
      '<div style="padding:10px 12px;border-top:1px solid #1f2430;background:#0b0f17;border-radius:8px">' +
        '<div style="font-size:13px;color:#e6e9ef;margin-bottom:6px">' +
          '<b>客製化提醒</b>：商品經修改（如縮短、收腰等）後，屬依個人需求之客製化商品，依法' +
          '<b>不適用七日鑑賞期</b>，恕無法退換貨。' +
        '</div>' +
        '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#e6e9ef">' +
          '<input id="agreeAlter" type="checkbox" '+(state.agreeAlter?'checked':'')+' />' +
          '<span>我已閱讀並同意「修改後屬客製化，恕不退換貨」。</span>' +
        '</label>' +
      '</div>';
  }
  extraMount.innerHTML = html;

  var chkPre = $('#agreePreorder');
  if (chkPre) chkPre.onchange = function(e){ state.agreePreorder = !!e.target.checked; updatePayButtonState(); };
  var chkAlt = $('#agreeAlter');
  if (chkAlt) chkAlt.onchange = function(e){ state.agreeAlter = !!e.target.checked; updatePayButtonState(); };

  var sub=subtotal(), ship=state.cart.length?calcShipping():0;
  var st = $('#subtotal'); if(st) st.textContent = fmt(sub);
  var sh = $('#shipping'); if(sh) sh.textContent = fmt(ship);
  var gd = $('#grand');    if(gd) gd.textContent = fmt(sub+ship);

  updatePayButtonState();
}

function updateBadge(){
  var n=state.cart.reduce(function(s,i){return s+(i.qty||1);},0);
  var cc=$('#cartCount'); if(cc) cc.textContent=String(n);
}

function canCheckout(){
  if(!state.cart.length) return false;
  if(PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && !state.agreePreorder) return false;
  var hasAlter = state.cart.some(function(i){ return !!i.alteration; });
  if (hasAlter && !state.agreeAlter) return false;
  return true;
}

function updatePayButtonState(){
  var btn = $('#checkout'); if(!btn) return;
  var ok = canCheckout();
  btn.disabled = !ok;

  var hasAlter = state.cart.some(function(i){ return !!i.alteration; });
  if (!ok){
    if (hasAlter && !state.agreeAlter) { btn.title = '請勾選「修改後屬客製化，恕不退換貨」同意'; return; }
    if (PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && !state.agreePreorder) { btn.title = '請先勾選預購同意'; return; }
    btn.title = '請先加入商品';
  }else{
    btn.title = '前往綠界付款';
  }
}

// 清空購物車
function clearCart(){
  state.cart = [];
  try{ sessionStorage.removeItem('cart'); }catch(_){}
  state.agreeAlter = false;
  renderCart();
  updateBadge();
  toast('付款完成，已清空購物車');
}

// ===== 選店（Safari 安全版）=====
async function openCvsMap(logisticsSubType){
  var preWin = openNamedWindow(CVS_WIN_NAME, "即將開啟官方門市地圖…");
  try{
    var r = await fetchJSON(API_BASE+'/api/ecpay/map/sign',
      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ LogisticsSubType: logisticsSubType }) },
      { timeoutMs: 20000, retries: 2 }
    );
    var endpoint = r.endpoint, fields = r.fields;
    var target = preWin ? CVS_WIN_NAME : '_self';
    postForm(endpoint, fields, target);
  }catch(e){
    try{ if (preWin) preWin.close(); }catch(_){}
    alert('目前未能開啟門市地圖，請稍後再試。');
  }
}

document.addEventListener('click',function(e){
  var t = e.target;
  if(!t || !(t instanceof HTMLElement)) return;
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

// 地圖彈窗回傳
window.addEventListener('message',function(ev){
  try{
    if(TRUSTED_ORIGINS.indexOf(ev.origin)===-1) return;
    var data=ev.data||{};
    if(data.type!=='EC_LOGISTICS_PICKED') return;
    var p=data.payload||{};

    var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
    var name = p.CVSStoreName || p.StName || p.StoreName || '';
    var address = p.CVSAddress || p.CVSAddr || p.Address || '';

    if(state.currentMapType==='family'){
      var label1 = $('#familyPicked'); if(label1) label1.textContent = name+'（'+id+'）｜'+address;
      state.cvs = { type:'family', id:id, name:name, address:address };
    }else if(state.currentMapType==='seven'){
      var label2 = $('#sevenPicked'); if(label2) label2.textContent = name+'（'+id+'）｜'+address;
      state.cvs = { type:'seven', id:id, name:name, address:address };
    }
  }catch(e){}
});

// 地圖本頁回來
(function(){
  try{
    var raw = localStorage.getItem('EC_LOGISTICS_PICKED');
    if(!raw){
      var saved = sessionStorage.getItem('SHIP_OPT');
      if (saved) setShipOption(saved);
      return;
    }
    localStorage.removeItem('EC_LOGISTICS_PICKED');
    var p = JSON.parse(raw);
    var id = p.CVSStoreID || p.CVSStoreID1 || p.StCode || p.StoreID || '';
    var name = p.CVSStoreName || p.StName || p.StoreName || '';
    var address = p.CVSAddress || p.CVSAddr || p.Address || '';
    var type = sessionStorage.getItem('CVS_TYPE') || state.currentMapType;
    if(type==='family'){
      var label1 = document.querySelector('#familyPicked');
      if(label1) label1.textContent = name+'（'+id+'）｜'+address;
      state.cvs = { type:'family', id:id, name:name, address:address };
      setShipOption('family');
    }else if(type==='seven'){
      var label2 = document.querySelector('#sevenPicked');
      if(label2) label2.textContent = name+'（'+id+'）｜'+address;
      state.cvs = { type:'seven', id:id, name:name, address:address };
      setShipOption('seven');
    }
  }catch(e){}
})();

// thankyou／cashier 回傳（多分頁同步清空）
window.addEventListener('message',function(ev){
  try{
    if(TRUSTED_ORIGINS.indexOf(ev.origin)===-1) return;
    var data = ev.data || {};
    if (data && data.type === 'EC_PAY_DONE') {
      try { localStorage.setItem('EC_CLEAR_CART','1'); } catch(_){}
      clearCart();
      try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
    }
  }catch(e){}
});

// 備援：不同分頁同步清空
window.addEventListener('storage', function(e){
  if (e.key === 'EC_CLEAR_CART' && e.newValue === '1') {
    clearCart();
    try { localStorage.removeItem('EC_CLEAR_CART'); } catch(_){}
  }
});

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
      state.cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
      renderCart(); updateBadge();
    } catch(_) {}
  }
});

// ===== 付款 =====
function validPhone(v){ return /^09\d{8}$/.test(v); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

var checkoutBtn = $('#checkout');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async function(){
    if(!state.cart.length){ alert('購物車是空的'); return; }

    var hasAlter = state.cart.some(function(i){ return !!i.alteration; });
    if (hasAlter && !state.agreeAlter){ alert('請勾選同意「修改後屬客製化，恕不退換貨」。'); return; }
    if(PREORDER_MODE && REQUIRE_PREORDER_CHECKBOX && !state.agreePreorder){ alert('請先勾選預購同意，再進行付款。'); return; }

    var nameI=$('#name'), emailI=$('#email'), phoneI=$('#phone');
    var name=(nameI&&nameI.value?nameI.value.trim():''), email=(emailI&&emailI.value?emailI.value.trim():''), phone=(phoneI&&phoneI.value?phoneI.value.trim():'');
    var rShip=document.querySelector('input[name="ship"]:checked'); var shipOpt=rShip?rShip.value:'home';
    var addrI=$('#addr'); var addr=(addrI&&addrI.value?addrI.value.trim():'');

    if(!name){ alert('請填寫收件姓名'); return; }
    if(!validEmail(email)){ alert('請輸入正確 Email'); return; }
    if(!validPhone(phone)){ alert('手機需為 09 開頭 10 碼'); return; }

    var shippingInfo='';
    if(shipOpt==='home'){
      if(!addr){ alert('請填寫收件地址'); return; }
      shippingInfo='自家宅配｜'+addr;
    }
    if(shipOpt==='family'){
      if(!state.cvs||state.cvs.type!=='family'){ alert('請先選擇全家門市'); return; }
      shippingInfo='全家店到店｜'+state.cvs.name+'（'+state.cvs.id+'）'+state.cvs.address;
    }
    if(shipOpt==='seven'){
      if(!state.cvs||state.cvs.type!=='seven'){ alert('請先選擇 7-11 門市'); return; }
      shippingInfo='7-11 店到店｜'+state.cvs.name+'（'+state.cvs.id+'）'+state.cvs.address;
    }

    for (var i=0;i<state.cart.length;i++){
      var it = state.cart[i];
      var prod = productById(it.id) || it;
      var max = maxQtyFor(prod, it.color, it.size);
      if (it.qty > max){
        alert('「'+it.name+'（'+it.color+'/'+it.size+'）」目前最多可購買 '+max+' 件，請調整數量再結帳。');
        return;
      }
    }

    var orderId = 'LF' + Date.now();
    var sub = state.cart.reduce(function(s,i){return s+lineTotal(i);},0);
    var shipFee = state.cart.length ? (sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0;
    var amount = sub + shipFee;

    var itemNameRaw = state.cart.map(function(i){
      var unit = (i.price||0) + ((i.alteration&&i.alteration.fee)||0);
      var base = i.name+'('+i.color+'/'+i.size+')x'+i.qty+'@'+unit;
      if(i.alteration){
        var sum = formatAlterSummary(
          { id:i.alteration.optId, name:i.alteration.optName, type:i.alteration.type },
          i.alteration, i.alteration.fee
        );
        return base+'[修改:'+sum+(i.alteration.note?('｜'+i.alteration.note):'')+']';
      }
      return base;
    }).join('#');

    var itemName = itemNameRaw.slice(0, 200);
    var tradeDesc = 'Linfaya Shop Order'.slice(0, 100);

    var payload = {
      orderId:orderId, amount:amount,
      itemName:itemName, tradeDesc:tradeDesc,
      name:name, email:email, phone:phone,
      shippingInfo:shippingInfo,
      subtotal: sub, shipFee: shipFee,
      returnURL: API_BASE + '/api/ecpay/return'
    };

    var win = openNamedWindow(CASHIER_WIN_NAME, "正在前往綠界收銀台…");

    try{
      var data = await fetchJSON(API_BASE+'/api/ecpay/create',
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) },
        { timeoutMs: 20000, retries: 2 }
      );
      if(!data || !data.endpoint || !data.fields) throw new Error('missing fields');

      var target = win ? CASHIER_WIN_NAME : '_self';
      postForm(data.endpoint, data.fields, target);
      if(!win){ toast('已在本頁開啟綠界付款'); }

    }catch(e){
      try{ if(win) win.close(); }catch(_){}
      alert('目前尚未連上後端，請稍後再試。');
    }
  });
}

var year = $('#year'); if(year) year.textContent = new Date().getFullYear();

// 初始渲染
updateBadge(); renderProducts(); onShipChange(); renderCart();