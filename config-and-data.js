// config-and-data.js (safe)

// ---- 站台設定 ----
window.API_BASE = 'https://linfaya-ecpay-backend.onrender.com';
window.CVS_WIN_NAME = 'EC_CVS_MAP';
window.CASHIER_WIN_NAME = 'ECPAY_CASHIER';

window.FREE_SHIP_THRESHOLD = 1000;
window.PAGE_SIZE = 6;
window.MAX_QTY_PER_ITEM = 5;

// 不用 new URL，直接列出可接受來源
window.TRUSTED_ORIGINS = [
  'https://linfaya-ecpay-backend.onrender.com',
  'https://logistics.ecpay.com.tw',
  'https://logistics-stage.ecpay.com.tw',
  'https://payment.ecpay.com.tw',
  'https://payment-stage.ecpay.com.tw'
];

// ---- 預購設定 ----
window.PREORDER_MODE = true;
window.LEAD_DAYS_MIN = 7;
window.LEAD_DAYS_MAX = 14;
window.REQUIRE_PREORDER_CHECKBOX = true;

// ---- 商品資料 ----
// 注意：圖片路徑大小寫要和 /Photo 資料夾完全一致
window.PRODUCTS = [
  {
    id: 'top01',
    cat: 'tops',
    name: '無縫高彈背心',
    price: 399,
    colors: ['黑','膚'],
    sizes: ['S','M','L'],
    imgs: ['Photo/無縫高彈背心.jpg','Photo/鏤空美背短袖.jpg'],
    stockMap: { '黑-M': 0, '膚-S': 0, '膚-M': 2 }
  },
  {
    id: 'top02',
    cat: 'tops',
    name: '鏤空美背短袖',
    price: 429,
    colors: ['黑','粉'],
    sizes: ['S','M','L'],
    imgs: ['Photo/鏤空美背短袖.jpg'],
    stockMap: { '粉-L': 3 }
  },
  {
    id: 'btm01',
    cat: 'bottoms',
    name: '高腰緊身褲',
    price: 499,
    colors: ['黑','深灰'],
    sizes: ['S','M','L','XL'],
    imgs: ['Photo/高腰緊身褲.jpg'],
    stockMap: { '黑-XL': 0, '深灰-S': 0, '深灰-M': 1 }
  },
  {
    id: 'sk01',
    cat: 'bottoms',
    name: '魚尾練習裙',
    price: 699,
    colors: ['黑'],
    sizes: ['S','M','L'],
    imgs: ['Photo/魚尾練習裙.jpg'],
    stockMap: {}
  },
  {
    id: 'acc01',
    cat: 'accessories',
    name: '彈力護腕',
    price: 199,
    colors: ['黑'],
    sizes: ['F'],
    imgs: ['Photo/上衣＋緊身褲套組.jpg'],
    stockMap: {}
  },
  {
    id: 'sh01',
    cat: 'shoes',
    name: '舞鞋（軟底）',
    price: 990,
    colors: ['黑'],
    sizes: ['35','36','37','38','39','40'],
    imgs: ['Photo/上衣＋緊身褲套組.jpg'],
    stockMap: { '黑-39': 0 }
  },
  {
    id: 'set01',
    cat: 'tops',
    name: '上衣＋緊身褲套組',
    price: 849,
    colors: ['多色'],
    sizes: ['S','M','L'],
    imgs: ['Photo/上衣＋緊身褲套組.jpg'],
    stockMap: { '多色-L': 0 }
  },
  // ====== 新增：專屬客製化修改 ======
  {
    id:'custom01',
    cat:'accessories',        // 放在 Accessories 分類
    name:'專屬客製化修改',
    price:10,                 // 基本單價 = 10 元 / 份
    colors:['客製'],           // 固定選項
    sizes:['一份'],            // 固定選項
    imgs:['Photo/客製修改.jpg'],// 你可以放一張示意圖
    stockMap:{}               // 不限庫存
  }
];