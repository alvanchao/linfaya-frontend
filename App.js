// App.js (SKU 狀態制 + 保留既有物流)
// 重點：
// - 讀取 products.json
// - 顏色→尺寸→狀態（現貨/預購/售完）
// - 移除數量控制，固定 1 件
// - 下單時把 SKU 明細塞進 itemName（後端已會寫進 CF4、信件、Google）
// - 物流/運費：優先呼叫你原有的函式，不存在才用 fallback（不會動到你現有流程）

const BASE_URL = "https://linfaya-ecpay-backend.onrender.com"; // 你的後端
const PRODUCTS_URL = "https://alvanchao.github.io/linfaya-frontend/products.json";

let PRODUCTS = [];
let CART = [];

// ====== 載入商品（products.json）======
async function loadProducts() {
  const r = await fetch(PRODUCTS_URL, { cache: "no-store" });
  PRODUCTS = await r.json();
  if (!Array.isArray(PRODUCTS)) PRODUCTS = [];
  renderProducts();
}

// ====== SKU helpers ======
function getColors(p) {
  const set = new Set((p.variants || []).map(v => v.color));
  return [...set];
}
function getSizesWithStatus(p, color) {
  return (p.variants || [])
    .filter(v => v.color === color)
    .map(v => ({ size: v.size, status: v.status })); // "現貨" | "預購" | "售完"
}
function findVariant(p, color, size) {
  return (p.variants || []).find(v => v.color === color && v.size === size);
}

// ====== 購物車 ======
function addToCart(product, color, size) {
  const v = findVariant(product, color, size);
  if (!v) return alert("此規格不存在");
  if (v.status === "售完") return alert("此規格已售完，無法下單");

  const item = {
    id: product.id,
    name: product.name,
    price: Number(product.price || 0),
    color,
    size,
    status: v.status, // 現貨/預購
    qty: 1,           // 單筆固定 1，避免多平台被掃貨
    img: (product.imgs && product.imgs[0]) || ""
  };
  CART.push(item);
  renderCart();
  toast(`已加入：${item.name}-${item.color}/${item.size}（${item.status}）`);
}

function removeFromCart(i) {
  CART.splice(i, 1);
  renderCart();
}

function composeItemsText(cart) {
  // 例：無縫高彈背心-黑/S（預購） ×1
  return cart.map(it => `${it.name}-${it.color}/${it.size}（${it.status}） ×${it.qty}`).join("、");
}

// ====== 物流／運費：保持你既有邏輯 ======
// 說明：如果你原本有 window.getExistingShippingInfoText() / window.getExistingShipFee() 或其他全域變數，這裡會優先使用。
// 沒有的話才用 fallback：從 localStorage.EC_LOGISTICS_PICKED 取出，或給預設。
function getShippingInfoText() {
  // 1) 你的既有函式（若已存在）
  if (typeof window.getExistingShippingInfoText === "function") {
    try { return window.getExistingShippingInfoText(); } catch(_) {}
  }
  // 2) 你的既有全域變數（若你有放）
  if (typeof window.SHIPPING_INFO_TEXT === "string" && window.SHIPPING_INFO_TEXT) {
    return window.SHIPPING_INFO_TEXT;
  }
  // 3) fallback：從物流地圖 callback 存的 localStorage（你的後端 /map/callback 已寫 EC_LOGISTICS_PICKED）
  try {
    const raw = localStorage.getItem("EC_LOGISTICS_PICKED");
    if (raw) {
      const j = JSON.parse(raw);
      // ECPay 地圖常見欄位：CVSStoreID、CVSStoreName、CVSAddress…
      const id = j.CVSStoreID || j.CVSStoreID_Rtn || j.CVSStoreID_1 || "";
      const name = j.CVSStoreName || j.CVSStoreName_Rtn || j.CVSStoreName_1 || "";
      const addr = j.CVSAddress || j.CVSAddress_Rtn || j.CVSAddress_1 || "";
      if (id || name || addr) return `超商：${name}（${id}）｜${addr}`;
    }
  } catch (_) {}
  // 4) 最後的安全預設
  return "配送資訊（未選）";
}

function getShipFee() {
  // 1) 你的既有函式（若已存在）
  if (typeof window.getExistingShipFee === "function") {
    try { return Number(window.getExistingShipFee()) || 0; } catch(_) {}
  }
  // 2) 你的既有全域變數
  if (typeof window.SHIP_FEE === "number") return window.SHIP_FEE;
  if (typeof window.SHIP_FEE === "string") return Number(window.SHIP_FEE) || 0;
  // 3) 安全預設
  return 60;
}

// ====== 結帳（建立付款；物流沿用你的流程）======
async function checkout() {
  if (!CART.length) return alert("購物車是空的");
  const subtotal = CART.reduce((s, it) => s + it.price * it.qty, 0);
  const shipFee = getShipFee();
  const amount = subtotal + shipFee;

  // 這三個欄位沿用你原本的購買人資料取得方式；下面是最簡 fallback（你可以保留你原本的表單讀值）
  const buyer = {
    name: readBuyerField("buyerName") || prompt("請輸入姓名："),
    email: readBuyerField("buyerEmail") || prompt("請輸入 Email："),
    phone: readBuyerField("buyerPhone") || prompt("請輸入電話：")
  };

  const itemsText = composeItemsText(CART);
  const shippingInfoText = getShippingInfoText(); // ★ 直接用你既有邏輯取配送資訊

  const payload = {
    amount,
    itemName: itemsText,
    email: buyer.email || "",
    phone: buyer.phone || "",
    name: buyer.name || "",
    shippingInfo: shippingInfoText,
    subtotal,
    shipFee
  };

  // 呼叫你現有的後端建立綠界訂單
  const r = await fetch(`${BASE_URL}/api/ecpay/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  if (!j || !j.endpoint || !j.fields) {
    console.error("create failed:", j);
    return alert("建立付款失敗，請稍後再試");
  }

  // 轉送到綠界，維持你既有流程
  postToGateway(j.endpoint, j.fields);
}

// 用你原本的轉送方式（不動）
function postToGateway(url, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

// ====== UI：商品＆購物車（不碰你的物流 UI）======
function renderProducts() {
  const root = document.getElementById("products");
  if (!root) return;
  root.innerHTML = "";

  PRODUCTS.forEach(p => {
    if (!p || p.visible === false) return;

    const colors = getColors(p);
    if (!colors.length) return;

    let selectedColor = colors[0];
    let sizes = getSizesWithStatus(p, selectedColor);
    let selectedSize = sizes[0]?.size;

    const wrap = document.createElement("div");
    wrap.className = "product-card";
    wrap.innerHTML = `
      <div class="p-hd">
        <img src="${(p.imgs && p.imgs[0]) || ""}" alt="${p.name}" onerror="this.style.display='none'" style="max-width:150px;border-radius:8px"/>
        <div class="meta">
          <h3>${p.name}</h3>
          <div class="price">NT$${Number(p.price||0)}</div>
        </div>
      </div>
      <div class="p-opts">
        <div>
          <label>顏色：</label>
          <select class="colorSel"></select>
        </div>
        <div>
          <label>尺寸：</label>
          <select class="sizeSel"></select>
        </div>
      </div>
      <div class="p-act">
        <button class="addBtn">加入購物車</button>
      </div>
    `;

    // 顏色選單
    const colorSel = wrap.querySelector(".colorSel");
    colors.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      colorSel.appendChild(opt);
    });

    // 尺寸選單（含狀態）
    const sizeSel = wrap.querySelector(".sizeSel");
    function refreshSizes() {
      sizeSel.innerHTML = "";
      sizes = getSizesWithStatus(p, selectedColor);
      sizes.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.size;
        opt.textContent = `${s.size}（${s.status}）`;
        if (s.status === "售完") opt.disabled = true;
        sizeSel.appendChild(opt);
      });
      selectedSize = sizes.find(s => s.status !== "售完")?.size || sizes[0]?.size;
      if (selectedSize) sizeSel.value = selectedSize;
    }
    refreshSizes();

    colorSel.addEventListener("change", e => {
      selectedColor = e.target.value;
      refreshSizes();
    });
    sizeSel.addEventListener("change", e => {
      selectedSize = e.target.value;
    });

    wrap.querySelector(".addBtn").addEventListener("click", () => {
      if (!selectedColor || !selectedSize) return alert("請選擇顏色與尺寸");
      addToCart(p, selectedColor, selectedSize);
    });

    root.appendChild(wrap);
  });
}

function renderCart() {
  const root = document.getElementById("cart");
  if (!root) return;
  root.innerHTML = "";

  if (!CART.length) {
    root.textContent = "購物車是空的";
    return;
  }

  CART.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="cart-info">
        <div>${it.name} - ${it.color}/${it.size}（${it.status}）</div>
        <div>NT$${Number(it.price||0)}</div>
      </div>
      <div class="cart-act">
        <button onclick="removeFromCart(${idx})">移除</button>
      </div>
    `;
    root.appendChild(row);
  });

  const subtotal = CART.reduce((s, it) => s + Number(it.price || 0) * it.qty, 0);
  const shipFee = getShipFee();
  const amount = subtotal + shipFee;

  const sum = document.createElement("div");
  sum.className = "cart-sum";
  sum.innerHTML = `
    <div>小計：NT$${subtotal}</div>
    <div>運費：NT$${shipFee}</div>
    <div><strong>總計：NT$${amount}</strong></div>
    <div style="margin-top:8px">
      <button onclick="checkout()">前往付款</button>
    </div>
  `;
  root.appendChild(sum);
}

// ====== 小工具 ======
function readBuyerField(id) {
  const el = document.getElementById(id);
  if (el && "value" in el) return String(el.value || "").trim();
  return "";
}
function toast(msg) {
  try { console.log(msg); } catch(_) {}
  alert(msg);
}

// ====== 啟動 ======
window.addEventListener("DOMContentLoaded", () => {
  // 如果你原本有初始化物流的程式（例如載入門市、監聽 postMessage），照舊留在你既有的 <script> 中即可。
  loadProducts();
});
