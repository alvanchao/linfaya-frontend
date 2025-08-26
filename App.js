// App.js
// 改版重點：收到 /api/ecpay/create 回傳後，前端直接建立 <form> POST 到 ECPay；不再打 /pay/:no

(function () {
  // 你的後端
  const API_BASE = "https://linfaya-ecpay-backend.onrender.com";

  const $ = (id) => document.getElementById(id);
  const msg = $("msg");
  const storeInfo = $("storeInfo");
  const btnPick = $("btnPick");
  const btnPay = $("btnPay");

  // 門市暫存
  let cvs = null;

  function setMsg(text, ok = true) {
    msg.innerHTML = `<p class="${ok ? "ok" : "err"}">${text}</p>`;
  }

  // 建立並送出表單（POST 到 endpoint）
  function postForm(endpoint, fields, target = "_self") {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = endpoint;
    form.target = target;

    Object.keys(fields).forEach((k) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = `${fields[k]}`;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 5000);
  }

  // 選店：開物流地圖
  btnPick.addEventListener("click", async () => {
    try {
      const subtype = $("subtype").value; // FAMIC2C / UNIMARTC2C
      const resp = await fetch(`${API_BASE}/api/ecpay/map/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ LogisticsSubType: subtype })
      });
      const data = await resp.json();
      if (!data || !data.endpoint || !data.fields) throw new Error("簽章失敗");

      // 開地圖新視窗，避免被瀏覽器擋彈窗：點擊事件中立即 open
      const win = window.open("about:blank", "_blank");
      if (!win) {
        setMsg("無法開啟新視窗，請允許本網站彈出視窗。", false);
        return;
      }
      // 透過 POST 把簽章欄位送到綠界地圖
      postForm(data.endpoint, data.fields, win.name);
      setMsg("已開啟門市地圖，請在新視窗選擇門市。");
    } catch (err) {
      console.error(err);
      setMsg("開啟門市地圖失敗", false);
    }
  });

  // 接收地圖回傳門市
  window.addEventListener("message", (ev) => {
    const { data } = ev;
    if (!data || data.type !== "EC_LOGISTICS_PICKED") return;
    cvs = data.payload || {};
    const id = cvs.CVSStoreID || cvs.CVSStoreID1 || "";
    const name = cvs.CVSStoreName || "";
    const addr = cvs.CVSAddress || "";
    storeInfo.innerHTML = id
      ? `<div>門市：${id} ${name}（${addr}）</div>`
      : `<div>未選擇</div>`;
    setMsg("門市已選擇");
  });

  // 付款
  btnPay.addEventListener("click", async () => {
    try {
      const itemName = $("itemName").value.trim();
      const amount = parseInt($("amount").value, 10) || 0;
      const name = $("name").value.trim();
      const phone = $("phone").value.trim();
      const email = $("email").value.trim();

      if (!itemName || !amount) {
        setMsg("請填商品與金額。", false);
        return;
      }
      if (!/^09\d{8}$/.test(phone || "")) {
        setMsg("請輸入正確的台灣手機號碼（09xxxxxxxx）。", false);
        return;
      }
      if (!cvs || !cvs.CVSStoreID) {
        setMsg("請先選擇超商門市。", false);
        return;
      }

      // 建立訂單：後端計算 CheckMacValue，回傳 { endpoint, fields }
      const payload = {
        amount,
        itemName,
        tradeDesc: "Linfaya Shop Order",
        name,
        phone,
        email,
        // 以下兩個可視需要帶回你網站頁面
        clientBackURL: "https://alvanchao.github.io/#/thankyou",
        returnURL: `${API_BASE}/api/ecpay/return`
      };
      const resp = await fetch(`${API_BASE}/api/ecpay/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!data || !data.endpoint || !data.fields) {
        throw new Error("建立訂單失敗");
      }

      // 直接 POST 到綠界收銀台
      postForm(data.endpoint, data.fields, "_self");
      setMsg("前往綠界收銀台中…");
    } catch (err) {
      console.error(err);
      setMsg("前往付款失敗", false);
    }
  });
})();
