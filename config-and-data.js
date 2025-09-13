/// config-and-data.js (safe)

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

// ---- 圖片來源切換 ----
// 在網址加上 ?dev=1 會改用本機相對路徑（GitHub Pages 直接取最新檔）；
// 沒有 ?dev=1 時走 jsDelivr CDN（速度較快）。
window.USE_LOCAL_PHOTO = location.search.indexOf('dev=1') >= 0;
window.PHOTO_BASE = window.USE_LOCAL_PHOTO
  ? './Photo/'
  : 'https://cdn.jsdelivr.net/gh/alvanchao/linfaya-frontend/Photo/';

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
    imgs: [
      window.PHOTO_BASE + '客製修改.jpg'
    ],
    youtubeId: '', // ✅ YouTube/Shorts 影片 ID（可留空）
    stockMap: {}                     // 不限庫存
  },

  // ====== Tops ======
  {
    id: 'top01',
    cat: 'tops',
    name: '美背短版上衣',
    price: 370,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: [
      window.PHOTO_BASE + '美背短版上衣1.jpg',
      window.PHOTO_BASE + '美背短版上衣2.jpg'
    ],
    youtubeId: 'E5qANhO8fBk', 
    stockMap: { }
  },
  {
    id: 'top02',
    cat: 'tops',
    name: '不規則造型長袖',
    price: 425,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: [
      window.PHOTO_BASE + '不規則造型長袖1.jpg',
      window.PHOTO_BASE + '不規則造型長袖2.jpg',
      window.PHOTO_BASE + '不規則造型長袖3.jpg',
      window.PHOTO_BASE + '不規則造型長袖4.jpg'
    ],
    youtubeId: 'fJjJw1osqsE',
    stockMap: { }
  },
  {
    id: 'top03',
    cat: 'tops',
    name: '男生不規則長袖',
    price: 435,
    colors: ['黑', '白'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    imgs: [
      window.PHOTO_BASE + '男生不規則長袖1.jpg',
      window.PHOTO_BASE + '男生不規則長袖2.jpg',
      window.PHOTO_BASE + '男生不規則長袖3.jpg'
    ],
    youtubeId: 'MSWPEn5E23A',
    stockMap: { }
  },
  {
    id: 'top04',
    cat: 'tops',
    name: '一字領長袖連身衣',
    price: 550,
    colors: ['粉藍'],
    sizes: ['M'],
    imgs: [
      window.PHOTO_BASE + '一字領長袖連身衣.jpg'
    ],
    youtubeId: 'RicoBN4n0lk',
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
      window.PHOTO_BASE + '皮革流蘇連身裙1.jpg',
      window.PHOTO_BASE + '皮革流蘇連身裙2.jpg',
      window.PHOTO_BASE + '皮革流蘇連身裙3.jpg'
    ],
    youtubeId: '',
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
      window.PHOTO_BASE + '閃閃亮片綁帶流蘇裙1.jpg',
      window.PHOTO_BASE + '閃閃亮片綁帶流蘇裙2.jpg',
      window.PHOTO_BASE + '閃閃亮片綁帶流蘇裙3.jpg',
      window.PHOTO_BASE + '閃閃亮片綁帶流蘇裙4.jpg'
    ],
    youtubeId: 'dF6RMJtBbQ8',
    stockMap: { }
  },
  {
    id: 'btm02',
    cat: 'bottoms',
    name: '造型喇叭褲',
    price: 800,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: [
      window.PHOTO_BASE + '造型喇叭褲1.jpg',
      window.PHOTO_BASE + '造型喇叭褲2.jpg',
      window.PHOTO_BASE + '造型喇叭褲3R.jpg',
      window.PHOTO_BASE + '造型喇叭褲4R.jpg'
    ],
    youtubeId: 'E5qANhO8fBk',
    stockMap: { }
  },
  {
    id: 'btm03',
    cat: 'bottoms',
    name: '喇叭褲',
    price: 500,
    colors: ['黑'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imgs: [
      window.PHOTO_BASE + '喇叭褲1.jpg',
      window.PHOTO_BASE + '喇叭褲2R.jpg'
    ],
    youtubeId: 'LGIytjL8cy8',
    stockMap: { }
  },
  {
    id: 'btm04',
    cat: 'bottoms',
    name: '造型綁帶紗裙',
    price: 420,
    colors: ['黑'],
    sizes: ['F'],
    imgs: [
      window.PHOTO_BASE + '造型綁帶紗裙1.jpg',
      window.PHOTO_BASE + '造型綁帶紗裙2.jpg',
      window.PHOTO_BASE + '造型綁帶紗裙3.jpg'
    ],
    youtubeId: 'RicoBN4n0lk',
    stockMap: { '黑-F': 1 }
  }
];

//remark
//id: topxx/btmxx/accxx/shxx
//cat: tops/bottoms/accessories/shoes
//name: 網頁上看到的名字
//price: 網頁上看到的價錢
//colors: []內逗點跟單引號區隔
//sizes: []內逗點跟單引號區隔
//imgs: []內逗點跟單引號區隔
//圖片建議SIZE: 主圖是 4:3 比例，縮圖是 1:1（52×52 px 顯示）。
//Youtube 網址 https://www.youtube.com/shorts/gBX_zl42r3c, ID 是 gBX_zl42r3c
