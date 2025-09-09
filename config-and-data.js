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

  // ====== 專屬客製化修改(特別的收費方式) ======
  {
    id: 'custom01',
    cat: 'customerize',              // 放在 customerize 分類
    name: '專屬客製化修改',
    price: 10,                       // 基本單價 = 10 元 / 份
    colors: ['X'],
    sizes: ['X'],
    imgs: ['Photo/客製修改.jpg'],      // 請確認 /Photo/ 內有這張圖；沒有就上傳
    stockMap: {}                     // 不限庫存
  },

  // ====== Tops ======
  {
    id: 'top02',
    cat: 'tops',
    name: '不規則造型長袖',
    price: 425,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: [
      'Photo/不規則造型長袖1.jpg',
      'Photo/不規則造型長袖2.jpg',
      'Photo/不規則造型長袖3.jpg',
      'Photo/不規則造型長袖4.jpg'
    ],
    stockMap: { '黑-M': 1, '黑-L': 1 }
  },
  {
    id: 'top03',
    cat: 'tops',
    name: '男生不規則長袖',
    price: 435,
    colors: ['黑', '白'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    imgs: [
      'Photo/男生不規則長袖1.jpg',
      'Photo/男生不規則長袖2.jpg',
      'Photo/男生不規則長袖3.jpg'
    ],
    stockMap: { '黑-XL': 2, '白-XL': 2 }
  },
  {
    id: 'top04',
    cat: 'tops',
    name: '一字領長袖連身衣',
    price: 550,
    colors: ['粉藍'],
    sizes: ['M'],
    imgs: ['Photo/一字領長袖連身衣.jpg'],
    stockMap: { '粉藍-M': 1 }
  },
  {
    id: 'top05',
    cat: 'tops',
    name: '皮革流蘇連身裙',
    price: 730,
    colors: ['黑'],
    sizes: ['L'],
    imgs: [
      'Photo/皮革流蘇連身裙1.jpg',
      'Photo/皮革流蘇連身裙2.jpg'
    ],
    stockMap: { '黑-L': 1 }
  },

  // ====== Bottoms ======
  {
    id: 'btm01',
    cat: 'bottoms',
    name: '閃閃亮片綁帶流蘇裙',
    price: 545,
    colors: ['黑', '白'],
    sizes: ['F'],
    imgs: [
      'Photo/閃閃亮片綁帶流蘇裙1.jpg',
      'Photo/閃閃亮片綁帶流蘇裙2.jpg'
    ],
    stockMap: { '黑-F': 1, '白-F': 1 }
  },
  {
    id: 'btm02',
    cat: 'bottoms',
    name: '造型喇叭褲',
    price: 800,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: [
      'Photo/造型喇叭褲1.jpg',
      'Photo/造型喇叭褲2.jpg',
      'Photo/造型喇叭褲3.jpg',
      'Photo/造型喇叭褲4.jpg'
    ],
    stockMap: { '黑-M': 1, '黑-L': 1 }
  },
  {
    id: 'btm03',
    cat: 'bottoms',
    name: '喇叭褲',
    price: 500,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: ['Photo/喇叭褲1.jpg', 'Photo/喇叭褲2.jpg'],
    stockMap: { '黑-M': 1, '黑-L': 1 }
  },
  {
    id: 'btm04',
    cat: 'bottoms',
    name: '造型綁帶紗裙',
    price: 420,
    colors: ['黑'],
    sizes: ['F'],
    imgs: [
      'Photo/造型綁帶紗裙1.jpg',
      'Photo/造型綁帶紗裙2.jpg',
      'Photo/造型綁帶紗裙3.jpg'
    ],
    stockMap: { '黑-F': 1 }
  }
];
