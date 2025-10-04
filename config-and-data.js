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
// NEW 標記說明：
// 1) 對任一商品加入 isNew: true ；或
// 2) 加入 newUntil: 'YYYY-MM-DD'（到期日當天含內會顯示 NEW）
// 兩者擇一即可。
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
      window.PHOTO_BASE + '美背短版上衣2.jpg',
      window.PHOTO_BASE + '美背短版上衣尺寸表.jpg'
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
      window.PHOTO_BASE + '不規則造型長袖4.jpg',
	  window.PHOTO_BASE + '不規則造型長袖尺寸表.jpg'
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
      window.PHOTO_BASE + '男生不規則長袖3.jpg',
      window.PHOTO_BASE + '男生不規則長袖尺寸表.jpg'
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
  {
    id: 'top06',
    cat: 'tops',
    name: '長版美背運動內衣',
    price: 530,
	newUntil: '2025-10-31',
    colors: ['玫紅', '淺紫灰', '深卡其', '櫻花粉', '卡布里藍', '樹莓紫', '水泥藍', '翡翠青', '蔣紅', '黑', '白', '苔綠', '青瓷', '復古玫瑰', '暗橙', '蒸餾咖啡', '磨砂綠', '白蛋白', '瀝青', '蔥綠', '薄粉', '波士頓橙', '繭棕', '晴日藍'],
    sizes: ['4', '6', '8', '10', '12'],
    imgs: [
      window.PHOTO_BASE + '長版美背運動內衣1.jpg',
      window.PHOTO_BASE + '長版美背運動內衣2.jpg',
      window.PHOTO_BASE + '長版美背運動內衣3.jpg',
      window.PHOTO_BASE + '長版美背運動內衣4.jpg',
      window.PHOTO_BASE + '長版美背運動內衣5.jpg',
      window.PHOTO_BASE + '長版美背運動內衣6.jpg',
      window.PHOTO_BASE + '長版美背運動內衣7.jpg',
      window.PHOTO_BASE + '長版美背運動內衣8.jpg',
      window.PHOTO_BASE + '長版美背運動內衣9.jpg',
      window.PHOTO_BASE + '長版美背運動內衣10.jpg',
      window.PHOTO_BASE + '長版美背運動內衣11.jpg',
      window.PHOTO_BASE + '長版美背運動內衣12.jpg',
      window.PHOTO_BASE + '長版美背運動內衣13.jpg',
      window.PHOTO_BASE + '長版美背運動內衣14.jpg',
      window.PHOTO_BASE + '長版美背運動內衣15.jpg',
      window.PHOTO_BASE + '長版美背運動內衣16.jpg',
      window.PHOTO_BASE + '長版美背運動內衣17.jpg',
      window.PHOTO_BASE + '長版美背運動內衣18.jpg',
      window.PHOTO_BASE + '長版美背運動內衣19.jpg'
    ],
    youtubeId: 'ygWTcGfvYsA', 
    stockMap: { }
  },
  {
    id: 'top07',
    cat: 'tops',
    name: '美背交叉運動內衣',
    price: 530,
	newUntil: '2025-10-31',
    colors: ['櫻花粉', '西納特拉藍', '樹莓紫', '骨白', '水泥藍', '洋紅紫', '板栗', '暗橙', '克萊因藍', '藍綠', '磨砂綠', '苔綠', '土灰', '白', '黑'],
    sizes: ['4', '6', '8', '10', '12'],
    imgs: [
      window.PHOTO_BASE + '美背交叉運動內衣1.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣2.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣3.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣4.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣5.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣6.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣7.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣8.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣9.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣10.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣11.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣12.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣13.jpg',
      window.PHOTO_BASE + '美背交叉運動內衣14.jpg'
	],
    youtubeId: 'D2MeY8EV7Ow',
    stockMap: { }
  },
   {
    id: 'top08',
    cat: 'tops',
    name: '美背鏤空運動內衣',
    price: 590,
	newUntil: '2025-10-31',
    colors: ['黑', '夜海藍', '梅子紫', '白蛋白', '比利時藍'],
    sizes: ['4', '6', '8', '10', '12'],
    imgs: [
      window.PHOTO_BASE + '美背鏤空運動內衣1.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣2.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣3.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣4.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣5.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣6.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣7.jpg',
      window.PHOTO_BASE + '美背鏤空運動內衣8.jpg'
	],
    youtubeId: '4_H-OQvKGFY',
    stockMap: { }
  },
   {
    id: 'top09',
    cat: 'tops',
    name: '繞頸美背運動內衣',
    price: 590,
	newUntil: '2025-10-31',
    colors: ['樹莓紫', '棕咖', '泛白藍', '陶灰褐', '水泥藍', '白', '藻黃', '黑', '淺杏粉', '紫蒲', '流光灰'],
    sizes: ['4', '6', '8', '10', '12'],
    imgs: [
      window.PHOTO_BASE + '繞頸美背運動內衣1.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣2.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣3.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣4.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣5.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣6.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣7.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣8.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣9.jpg',
      window.PHOTO_BASE + '繞頸美背運動內衣10.jpg'
	],
    youtubeId: 'Kw9sU1MV74I', 
    stockMap: { }
  },
   {
    id: 'top10',
    cat: 'tops',
    name: '雙線交叉基本款運動內衣',
    price: 530,
	newUntil: '2025-10-31',
    colors: ['藍綠', '土灰', '磨砂綠', '暗橙', '洋紅紫', '板栗', '冷藍', '波士頓橙', '青稞', '非凡洋紅', '蔥綠', '湛藍', '焦橙', '潮水藍', '雲杉綠', '深碳灰', '銘藍', '紮染黑灰', '黑', '黑迷彩'],
    sizes: ['4', '6', '8', '10', '12'],
    imgs: [
      window.PHOTO_BASE + '雙線交叉基本款運動內衣1.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣2.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣3.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣4.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣4-1.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣4-2.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣5.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣7.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣8.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣8-1.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣9.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣10.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣11.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣12.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣14.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣15.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣16.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣17.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣18.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣19.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣20.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣21.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣22.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣23.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣24.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣25.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣26.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣27.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣28.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣28-1.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣29.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣30.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣31.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣32.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣33.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣34.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣35.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣36.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣37.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣38.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣39.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣40.jpg',
      window.PHOTO_BASE + '雙線交叉基本款運動內衣41.jpg'
	],
    youtubeId: 'F73Zg2Xyy4Y',
    stockMap: { }
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
      window.PHOTO_BASE + '造型喇叭褲4R.jpg',
      window.PHOTO_BASE + '造型喇叭褲尺寸表.jpg'
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
      window.PHOTO_BASE + '喇叭褲2R.jpg',
      window.PHOTO_BASE + '喇叭褲尺寸表.jpg'
    ],
    youtubeId: 'LGIytjL8cy8',
    stockMap: { }
  },
  {
    id: 'btm04',
    cat: 'bottoms',
    name: '高腰交叉運動健身瑜珈褲',
    price: 690,
    newUntil: '2025-10-31',
    colors: ['番紫', '淺紫藍', '淺薄荷綠', '煙棕', '黑'],
    sizes: ['4', '6', '8', '10', '12'],
    imgs: [
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲1.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲2.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲3.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲4.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲5.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲6.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲7.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲8.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲9.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲10.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲11.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲12.jpg',
      window.PHOTO_BASE + '高腰交叉運動健身瑜珈褲13.jpg'
    ],
    youtubeId: '4_H-OQvKGFY',
    stockMap: { }
  },
  {
    id: 'btm05',
    cat: 'bottoms',
    name: '高腰運動健身瑜珈褲',
    price: 690,
    newUntil: '2025-10-31', 
    colors: ['黑', '石墨灰', '蒸餾咖啡', '鈦灰', '深碳灰', '海軍藍', '卡其棕', '煙灰'],
    sizes: ['4', '6', '8', '10'],
    imgs: [
      window.PHOTO_BASE + '高腰運動健身瑜珈褲1.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲2.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲3.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲4.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲5.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲6.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲7.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲8.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲9.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲10.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲11.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲12.jpg',
      window.PHOTO_BASE + '高腰運動健身瑜珈褲13.jpg'
    ],
    youtubeId: 'Kw9sU1MV74I',
    stockMap: { }
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
//newUntil: '2025-10-31',  ← 新增這行（到 10/31 都會顯示 NEW）