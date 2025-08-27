// 工具、UI 共用
window.App = window.App || {};
var App = window.App;

// 基本工具
App.$  = function(s){ return document.querySelector(s); };
App.$$ = function(s){ return document.querySelectorAll(s); };
App.fmt = function(n){ return 'NT$' + Number(n||0).toLocaleString('zh-Hant-TW'); };

// 逾時+重試 fetch
App.fetchJSON = async function(url, fetchOpts, retryOpts){
  fetchOpts = fetchOpts || {};
  retryOpts = retryOpts || {};
  var timeoutMs = retryOpts.timeoutMs || 20000;
  var retries = retryOpts.retries || 2;
  var retryDelayBaseMs = retryOpts.retryDelayBaseMs || 800;
  var lastErr;
  for (var attempt=0; attempt<=retries; attempt++){
    var ac = new AbortController();
    var t = setTimeout(function(){ try{ ac.abort(new Error('Timeout')); }catch(_){ } }, timeoutMs);
    try{
      var r = await fetch(url, Object.assign({}, fetchOpts, { signal: ac.signal }));
      clearTimeout(t);
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){
      clearTimeout(t);
      lastErr = e;
      if (/HTTP\s4\d\d/.test(String(e && e.message))) break;
      if (attempt === retries) break;
      await new Promise(function(res){ setTimeout(res, retryDelayBaseMs * Math.pow(2, attempt)); });
    }
  }
  throw lastErr;
};

// Toast
App.toast = function(msg, ms){
  if(!msg) msg='已加入購物車';
  if(!ms) ms=1200;
  var t = App.$('#toast'); if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, ms);
};

// 預購交期（工作天）計算 + 小提醒
App.addWorkingDays = function(fromDate, n){
  var d = new Date(fromDate);
  var added = 0;
  while(added < n){
    d.setDate(d.getDate()+1);
    var day = d.getDay();
    if(day !== 0 && day !== 6) added += 1;
  }
  return d;
};
App.ymd = function(d){
  var y = d.getFullYear();
  var m = ('0'+(d.getMonth()+1)).slice(-2);
  var dd= ('0'+d.getDate()).slice(-2);
  return y+'/'+m+'/'+dd;
};
App.preorderRangeToday = function(min,max){
  var now = new Date();
  return App.ymd(App.addWorkingDays(now,min))+' ～ '+App.ymd(App.addWorkingDays(now,max));
};
App.attachPreorderBanner = function(){
  var mount = document.createElement('section');
  mount.style.cssText = 'background:#141821;padding:14px 16px;border-radius:14px;margin:12px;color:#e6e9ef;line-height:1.6';
  var eta = App.PREORDER_MODE ? '預計出貨區間：'+App.preorderRangeToday(App.LEAD_DAYS_MIN, App.LEAD_DAYS_MAX) : '';
  mount.innerHTML =
    '<strong style="color:#fff;font-size:15px">小提醒</strong>'+
    '<div style="font-size:13px;color:#cfd3dc;line-height:1.6;margin-top:4px">'+
    (
      App.PREORDER_MODE
      ? '<div>※ 本官網採 <b style="color:#fff">預購</b> 模式，下單後約需 '+App.LEAD_DAYS_MIN+'–'+App.LEAD_DAYS_MAX+' 個<b style="color:#fff">工作天</b>出貨；若遇延遲將主動通知，並可退款或更換。</div>'+
        '<div style="margin-top:4px;color:#fff">'+eta+'</div>'
      : '<div>※ 本店商品同步於多平台販售，庫存以實際出貨為準。</div>'
    )+
    '<div style="margin-top:4px">完成付款後信件可能延遲，請檢查垃圾信或「促銷」分類。</div>'+
    '</div>';
  var header = document.querySelector('header');
  if(header && header.parentNode) header.parentNode.insertBefore(mount, header.nextSibling);
  else document.body.insertBefore(mount, document.body.firstChild);
};

// Chips CSS（一次注入）
(function(){
  var css = [
    '.chips{display:flex;gap:8px;flex-wrap:wrap}',
    '.chip{min-width:40px;padding:8px 10px;border:1px solid #2b3342;border-radius:10px;background:#0f1320;color:#c7cede;cursor:pointer;text-align:center;user-select:none}',
    '.chip:hover{transform:translateY(-1px);border-color:#3b4252}',
    '.chip.active{background:linear-gradient(135deg,#5eead4,#a78bfa);color:#0b0c10;border:none}',
    '.chip.small{min-width:32px;padding:6px 8px;border-radius:8px}',
    '.chip.disabled{opacity:.4;cursor:not-allowed;filter:grayscale(20%);text-decoration:line-through}',
    '.oos-note{color:#fca5a5;font-size:12px;margin-top:6px}'
  ].join('\n');
  var style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
})();

// Chips/分頁/庫存工具
App.chipHTML = function(label, value, active, disabled, extraClass){
  var cls = ['chip', extraClass, active?'active':'', disabled?'disabled':''].filter(Boolean).join(' ');
  var disAttr = disabled ? 'aria-disabled="true" data-disabled="1"' : '';
  return '<button type="button" class="'+cls+'" data-value="'+String(value)+'" '+disAttr+'>'+label+'</button>';
};
App.renderChips = function(values, activeValue, opts){
  values = values || [];
  opts = opts || {};
  return '<div class="chips">'+values.map(function(v){
    var disabled = typeof opts.disableCheck==='function' ? !!opts.disableCheck(v) : false;
    return App.chipHTML(v, v, String(v)===String(activeValue), disabled, opts.small?'small':'');
  }).join('') + '</div>';
};
App.buildPager = function(total){
  var pageSize = App.PAGE_SIZE;
  var pages = Math.max(1, Math.ceil(total / pageSize));
  function draw(mount){
    if(!mount) return;
    mount.innerHTML='';
    for(var p=1;p<=pages;p++){
      var b=document.createElement('button');
      b.type='button';
      b.className='page-btn'+(p===App.state.page?' active':'');
      b.textContent=String(p);
      b.onclick=function(pp){ return function(){ App.state.page=pp; App.renderProducts(); }; }(p);
      mount.appendChild(b);
    }
  }
  draw(App.$('#pager')); draw(App.$('#pagerBottom'));
};

// 庫存工具
App.getStock = function(product, color, size){
  var k = color + '-' + size;
  if (!product.stockMap) return Infinity;
  if (!(k in product.stockMap)) return Infinity;
  var n = Number(product.stockMap[k]);
  return isFinite(n) ? n : Infinity;
};
App.isOOS = function(product, color, size){ return App.getStock(product,color,size) <= 0; };
App.maxQtyFor = function(product, color, size){
  var stock = App.getStock(product, color, size);
  var cap = App.MAX_QTY_PER_ITEM;
  return Math.min(cap, stock===Infinity?cap:stock);
};
App.anySizeAvailable = function(product, color){
  var sizes = product.sizes || [];
  for(var i=0;i<sizes.length;i++){ if(!App.isOOS(product, color, sizes[i])) return true; }
  return false;
};
App.firstAvailableSize = function(product, color){
  var sizes = product.sizes || [];
  for(var i=0;i<sizes.length;i++){ if(!App.isOOS(product, color, sizes[i])) return sizes[i]; }
  return null;
};
App.productById = function(id){
  for(var i=0;i<App.PRODUCTS.length;i++){ if(App.PRODUCTS[i].id===id) return App.PRODUCTS[i]; }
  return null;
};