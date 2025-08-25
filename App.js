/* ========= 基本設定 ========= */
const API_BASE = 'https://linfaya-ecpay-backend.onrender.com'
const ADMIN_EMAIL = 'linfaya251@gmail.com'
const FREE_SHIP_THRESHOLD = 1000 // 滿千免運
const CATS = ['all','tops','bottoms','accessories','shoes']

/* ========= 商品資料：支援 1~5 張圖片、顏色/尺寸 ========= */
const PRODUCTS = [
  // tops
  {id:'top01',cat:'tops',name:'無縫高彈背心',price:399,
   colors:['黑','膚'], sizes:['S','M','L'],
   imgs:['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg']},
  {id:'top02',cat:'tops',name:'鏤空美背短袖',price:429,
   colors:['黑','粉'], sizes:['S','M','L'],
   imgs:['Photo/鏤空美背短袖.jpg']},

  // bottoms
  {id:'btm01',cat:'bottoms',name:'高腰緊身褲',price:499,
   colors:['黑','深灰'], sizes:['S','M','L','XL'],
   imgs:['Photo/高腰緊身褲.jpg']},
  {id:'btm02',cat:'bottoms',name:'魚尾練習裙',price:699,
   colors:['黑'], sizes:['S','M','L'],
   imgs:['Photo/魚尾練習裙.jpg']},

  // accessories（先放示例，之後你有圖再補）
  {id:'acc01',cat:'accessories',name:'運動髮帶（素色）',price:129,
   colors:['黑','白','膚'], sizes:['F'],
   imgs:['Photo/鏤空美背短袖.jpg']}, 

  /// shoes（先放示例，之後你有圖再補)
  {id:'sh01',cat:'shoes',name:'軟底舞鞋（初學）',price:890,
   colors:['黑'], sizes:['35','36','37','38','39','40'],
   imgs:['Photo/上衣＋緊身褲套組.jpg']} 
]

/* ========= 狀態 ========= */
// 使用 sessionStorage：關掉/重開頁面即清空購物車
const state = {
  cart: JSON.parse(sessionStorage.getItem('cart')||'[]'),
  cvs: null,        // 選店結果
  activeCat: 'all'  // 分類
}
const fmt = n => 'NT$' + Number(n).toLocaleString('zh-Hant-TW')

/* ========= 分類 Tabs ========= */
const tabsEl = document.getElementById('tabs')
tabsEl?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.tab')
  if (!btn) return
  const cat = btn.dataset.cat
  if (!CATS.includes(cat)) return
  state.activeCat = cat
  tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'))
  btn.classList.add('active')
  renderProducts()
})

/* ========= 商品渲染 ========= */
const grid = document.getElementById('grid')

function renderProducts(){
  grid.innerHTML = ''
  const list = state.activeCat==='all'
    ? PRODUCTS
    : PRODUCTS.filter(p=>p.cat===state.activeCat)

  list.forEach(p=>{
    const el = document.createElement('div')
    el.className = 'product'
    const firstImg = p.imgs[0]

    el.innerHTML = `
      <div class="imgbox">
        <div class="main-img">
          <img alt="${p.name}" src="${firstImg}">
          <div class="magnifier"></div>
        </div>
        <div class="thumbs">
          ${p.imgs.map((src,i)=>`<img src="${src}" data-idx="${i}" class="${i===0?'active':''}">`).join('')}
        </div>
      </div>
      <div class="body">
        <b>${p.name}</b>
        <div class="muted">分類：${labelOfCat(p.cat)}</div>
        <div class="price">${fmt(p.price)}</div>
        <div class="row">
          <select class="select sel-color">
            ${p.colors.map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select>
          <select class="select sel-size">
            ${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>
          <input class="input qty-input" type="number" min="1" value="1" />
        </div>
        <div class="row" style="margin-top:6px">
          <button class="btn pri add">加入購物車</button>
        </div>
      </div>
    `

    // 縮圖切換
    const mainImg = el.querySelector('.main-img img')
    el.querySelectorAll('.thumbs img').forEach(img=>{
      img.addEventListener('click',()=>{
        el.querySelectorAll('.thumbs img').forEach(i=>i.classList.remove('active'))
        img.classList.add('active')
        mainImg.src = img.src
      })
    })
    // 放大鏡
    const box  = el.querySelector('.main-img')
    const lens = el.querySelector('.magnifier')
    const zoom = 2
    box.addEventListener('mouseenter',()=>{
      lens.style.display='block'
      lens.style.backgroundImage=`url('${mainImg.src}')`
      lens.style.backgroundSize = (box.offsetWidth*zoom)+'px '+(box.offsetHeight*zoom)+'px'
    })
    box.addEventListener('mouseleave',()=> lens.style.display='none')
    box.addEventListener('mousemove',e=>{
      const rect = box.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const r = lens.offsetWidth/2
      lens.style.left = (x - r) + 'px'
      lens.style.top  = (y - r) + 'px'
      const bx = Math.max(0, Math.min(x/box.offsetWidth * 100, 100))
      const by = Math.max(0, Math.min(y/box.offsetHeight* 100, 100))
      lens.style.backgroundPosition = `${bx}% ${by}%`
      lens.style.backgroundImage = `url('${mainImg.src}')`
    })
    // 點縮圖要更新放大鏡背景
    el.querySelectorAll('.thumbs img').forEach(img=>img.addEventListener('click',()=>{
      lens.style.backgroundImage = `url('${mainImg.src}')`
      lens.style.backgroundSize = (box.offsetWidth*zoom)+'px '+(box.offsetHeight*zoom)+'px'
    }))

    // 加入購物車
    el.querySelector('.add').onclick = ()=>{
      const color = el.querySelector('.sel-color').value
      const size  = el.querySelector('.sel-size').value
      const qty   = Math.max(1, parseInt(el.querySelector('.qty-input').value||'1'))
      addToCart({...p, color, size, qty, img: p.imgs[0]})
    }

    grid.appendChild(el)
  })
}
function labelOfCat(cat){
  return ({
    tops:'Tops（上衣/運動內衣）',
    bottoms:'Bottoms（褲/裙）',
    accessories:'Accessories（飾品）',
    shoes:'Shoes（舞鞋）'
  })[cat] || '其他'
}

/* ========= 購物車 ========= */
const drawer = document.getElementById('drawer')
document.getElementById('openCart').onclick = ()=>{ drawer.classList.add('open'); renderCart() }
document.getElementById('closeCart').onclick = ()=> drawer.classList.remove('open')

function persist(){ sessionStorage.setItem('cart', JSON.stringify(state.cart)) }
function toast(msg='已加入購物車',ms=1200){
  const t = document.getElementById('toast'); t.textContent = msg
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), ms)
}
function updateBadge(){
  const n = state.cart.reduce((s,i)=>s+(i.qty||1),0)
  document.getElementById('cartCount').textContent = n
}
function addToCart(item){
  const found = state.cart.find(i=>i.id===item.id && i.size===item.size && i.color===item.color)
  if(found){ found.qty += item.qty }
  else{ state.cart.push({id:item.id,name:item.name,price:item.price,imgs:item.imgs,color:item.color,size:item.size,qty:item.qty,img:item.img}) }
  persist(); updateBadge(); toast()
}
function removeItem(idx){ state.cart.splice(idx,1); persist(); renderCart(); updateBadge() }
function changeQty(idx,delta){ state.cart[idx].qty=Math.max(1,(state.cart[idx].qty||1)+delta); persist(); renderCart(); updateBadge() }

function subtotal(){ return state.cart.reduce((s,i)=>s+i.price*(i.qty||1),0) }
function shipFee(){
  const sub = subtotal()
  if (sub >= FREE_SHIP_THRESHOLD) return 0
  const shipOpt = document.querySelector('input[name="ship"]:checked')?.value || 'home'
  return (shipOpt==='home') ? 80 : 60
}

function renderCart(){
  const list = document.getElementById('cartList')
  list.innerHTML = state.cart.length ? '' : '<p class="muted" style="padding:8px 12px">購物車是空的</p>'
  state.cart.forEach((it,idx)=>{
    const el = document.createElement('div')
    el.className = 'cart-item'
    el.innerHTML = `
      <img src="${(it.imgs?it.imgs[0]:it.img)||''}" alt="${it.name}">
      <div>
        <b>${it.name}</b>
        <div class="muted">顏色：${it.color}｜尺寸：${it.size}｜單價：${fmt(it.price)}</div>
        <div class="row" style="margin-top:6px">
          <button class="btn" onclick="changeQty(${idx},-1)">-</button>
          <span>${it.qty||1}</span>
          <button class="btn" onclick="changeQty(${idx},1)">+</button>
          <button class="btn" style="margin-left:auto;border-color:#3a2230;color:#fca5a5" onclick="removeItem(${idx})">移除</button>
        </div>
      </div>
      <div><b>${fmt(it.price*(it.qty||1))}</b></div>
    `
    list.appendChild(el)
  })
  const sub = subtotal()
  const ship = state.cart.length? shipFee() : 0
  document.getElementById('subtotal').textContent = fmt(sub)
  document.getElementById('shipping').textContent = fmt(ship)
  document.getElementById('grand').textContent = fmt(sub + ship)
}

/* ========= 配送方式切換 & 選店 ========= */
function onShipChange(){
  const v = document.querySelector('input[name="ship"]:checked')?.value || 'home'
  document.getElementById('homeFields').style.display   = (v==='home') ? 'block':'none'
  document.getElementById('familyFields').style.display = (v==='family') ? 'block':'none'
  document.getElementById('sevenFields').style.display  = (v==='seven') ? 'block':'none'
  renderCart()
}
document.querySelectorAll('input[name="ship"]').forEach(r=>r.addEventListener('change',onShipChange))

async function openCvsMap(logisticsSubType){
  try{
    const res = await fetch(`${API_BASE}/api/ecpay/map/sign`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ logisticsSubType })
    })
    if(!res.ok) throw new Error('sign failed')
    const { endpoint, fields } = await res.json()
    window._lastMapDebug = { endpoint, fields } // 方便你F12檢查
    const form = document.createElement('form')
    form.method='POST'; form.action=endpoint; form.target='_blank'
    Object.entries(fields).forEach(([k,v])=>{
      const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; form.appendChild(i)
    })
    document.body.appendChild(form); form.submit(); form.remove()
  }catch(e){
    console.warn(e); alert('尚未設定選店後端，無法開啟官方地圖。')
  }
}
document.addEventListener('click',(e)=>{
  if(e.target?.id==='btnPickFamily'){ e.preventDefault(); openCvsMap('FAMI') }
  if(e.target?.id==='btnPickSeven'){  e.preventDefault(); openCvsMap('UNIMART') }
})
window.addEventListener('message',(ev)=>{
  const data = ev.data || {}
  if(data.type==='CVS_PICKED' && data.store){
    if(data.store.cvs==='FAMI'){
      document.getElementById('familyPicked').textContent = `${data.store.name}（${data.store.id}）｜${data.store.address}`
      state.cvs = { type:'family', ...data.store }
    }else if(data.store.cvs==='UNIMART'){
      document.getElementById('sevenPicked').textContent = `${data.store.name}（${data.store.id}）｜${data.store.address}`
      state.cvs = { type:'seven', ...data.store }
    }
  }
})

/* ========= 檢查 & 付款 ========= */
function validPhone(v){ return /^09\d{8}$/.test(v) }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

async function createEcpayLink(order){
  try{
    const res = await fetch(`${API_BASE}/api/ecpay/create`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(order)
    })
    if(!res.ok) throw new Error('create ecpay link failed')
    const data = await res.json()
    return data.paymentUrl // 後端 /pay/:tradeNo
  }catch(e){
    console.warn(e)
    alert('目前尚未連上綠界後端，請先設定伺服器 API。')
    return null
  }
}

document.getElementById('checkout').onclick = async()=>{
  if(!state.cart.length) return alert('購物車是空的')
  const name  = document.getElementById('name').value.trim()
  const email = document.getElementById('email').value.trim()
  const phone = document.getElementById('phone').value.trim()
  const shipOpt = document.querySelector('input[name="ship"]:checked')?.value || 'home'
  const addr = document.getElementById('addr').value.trim()

  if(!name) return alert('請填寫收件姓名')
  if(!validEmail(email)) return alert('請輸入正確 Email')
  if(!validPhone(phone)) return alert('手機需為 09 開頭 10 碼')

  let shippingInfo=''
  if(shipOpt==='home'){
    if(!addr) return alert('請填寫收件地址')
    shippingInfo = `自家宅配｜${addr}`
  }else if(shipOpt==='family'){
    if(!state.cvs || state.cvs.type!=='family') return alert('請先選擇全家門市')
    shippingInfo = `全家店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`
  }else if(shipOpt==='seven'){
    if(!state.cvs || state.cvs.type!=='seven') return alert('請先選擇 7-11 門市')
    shippingInfo = `7-11 店到店｜${state.cvs.name}（${state.cvs.id}）${state.cvs.address}`
  }

  const orderId = 'LF' + Date.now()
  const items = state.cart.map(i=>({ id:i.id, name:i.name, color:i.color, size:i.size, qty:i.qty, price:i.price }))
  const sub = subtotal()
  const sfee = state.cart.length ? (sub>=FREE_SHIP_THRESHOLD?0:(shipOpt==='home'?80:60)) : 0
  const amount = sub + sfee

  const order = { orderId, name, email, phone, shipOpt, shippingInfo, items,
                  amount, subtotal:sub, shipFee:sfee, notify:{ admin: ADMIN_EMAIL } }

  // 先開空白分頁避免彈窗被擋
  const newWin = window.open('about:blank','_blank')

  const link = await createEcpayLink(order)
  if(!link){ if(newWin && !newWin.closed) newWin.close(); return }
  newWin.location = link
  toast('正在前往綠界付款…',1600)
}

/* ========= 初始化 ========= */
document.getElementById('year').textContent = new Date().getFullYear()
renderProducts()
updateBadge()
renderCart()
onShipChange()

// 讓變更數量/移除可在全域被 inline onclick 呼叫
window.changeQty = changeQty
window.removeItem = removeItem
