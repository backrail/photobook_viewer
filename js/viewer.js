document.addEventListener("DOMContentLoaded", init);

async function init() {

  // ----------------------------------------------------
  // ① ページ画像の自動ロード
  // ----------------------------------------------------
  async function imageExists(url) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }

  const pages = [];
  let index = 1;
  while (true) {
    const url = `pages/${index}.jpg`;
    const exists = await imageExists(url);
    if (!exists) break;
    pages.push(url);
    index++;
  }

  if (pages.length === 0) {
    console.warn("No pages/*.jpg found.");
    return;
  }

  // ----------------------------------------------------
  // ② 画面フィット（常に90%余白）
  // ----------------------------------------------------
  function calcBookSize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const baseRatio = 800 / 1200;

    let width = vw;
    let height = vw / baseRatio;

    if (height > vh) {
      height = vh;
      width = vh * baseRatio;
    }

    width *= 0.90;
    height *= 0.90;

    return { width, height };
  }

  const size = calcBookSize();

  const flipBookElement = document.getElementById("flip-book");

  const flip = new St.PageFlip(flipBookElement, {
    width: size.width,
    height: size.height,
    size: "stretch",
    maxShadowOpacity: 0.9,
    showCover: true,
    drawShadow: true,
    mobileScrollSupport: true
  });

  flip.loadFromImages(pages);

  window.addEventListener("resize", () => {
    const newSize = calcBookSize();
    flip.update(newSize.width, newSize.height);
  });


  // ----------------------------------------------------
  // ③ 右クリック → ページめくりを完全に禁止
  // ----------------------------------------------------
  flipBookElement.addEventListener(
    "mousedown",
    (e) => {
      if (e.button === 2) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );

  flipBookElement.addEventListener(
    "click",
    (e) => {
      if (e.button === 2) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );

  flipBookElement.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault();
    },
    true
  );


  // ----------------------------------------------------
  // ④ 拡大ビュー（オーバーレイの生成）
  // ----------------------------------------------------
  if (!document.getElementById("zoom-overlay")) {
    const overlay = document.createElement("div");
    overlay.id = "zoom-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    const img = document.createElement("img");
    img.id = "zoom-img";
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      margin: auto;
    `;

    const closeBtn = document.createElement("div");
    closeBtn.id = "zoom-close";
    closeBtn.innerText = "✕";
    closeBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      color: white;
      font-size: 32px;
      cursor: pointer;
    `;

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    closeBtn.onclick = () => overlay.style.display = "none";
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.style.display = "none";
    };
  }


  // ----------------------------------------------------
  // ⑤ 拡大メニュー（右クリック & 長押し）
  // ----------------------------------------------------
  const menu = document.createElement("div");
  menu.id = "zoom-menu";
  menu.style.cssText = `
    position: fixed;
    display: none;
    background: rgba(30,30,30,0.96);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 9999;
    font-size: 16px;
    cursor: pointer;
  `;
  menu.innerText = "🔍 拡大して見る";
  document.body.appendChild(menu);


  //-----------------------------------------------------
  // ⑥ 左右どちらを押したか判定する（重要）
  //-----------------------------------------------------
  let lastPressEvent = null;

  function getClickedPageIndex(event) {
    const rect = flipBookElement.getBoundingClientRect();
    const clientX =
      (event.touches?.[0]?.clientX ?? event.clientX) - rect.left;

    const mid = rect.width / 2;
    const leftPage = flip.getCurrentPageIndex();
    const rightPage = leftPage + 1;

    return clientX < mid ? leftPage : rightPage;
  }


  //-----------------------------------------------------
  // ⑦ メニュークリック → 押した側のページを拡大
  //-----------------------------------------------------
  menu.onclick = () => {

    // 押した側の pageFlipIndex を取得
    let pageFlipIndex = getClickedPageIndex(lastPressEvent);

    // PageFlipIndex → pages[] index に変換
    let realIndex = pageFlipIndex;

    // 表紙だけ例外扱い（realIndex = -1 → pages[0])
    if (realIndex < 0) realIndex = -1;

    // 拡大ビューに反映
    document.getElementById("zoom-img").src = pages[realIndex];
    document.getElementById("zoom-overlay").style.display = "flex";
    menu.style.display = "none";
  };



  //-----------------------------------------------------
  // ⑧ 右クリックでメニュー表示
  //-----------------------------------------------------
  flipBookElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    lastPressEvent = e;
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.display = "block";
  });


  //-----------------------------------------------------
  // ⑨ 長押しでメニュー表示（スマホ）
  //-----------------------------------------------------
  let pressTimer;

  flipBookElement.addEventListener("touchstart", (e) => {
    pressTimer = setTimeout(() => {
      lastPressEvent = e;
      const t = e.touches[0];
      menu.style.left = `${t.clientX}px`;
      menu.style.top = `${t.clientY}px`;
      menu.style.display = "block";
    }, 500);
  });

  flipBookElement.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
  });


  //-----------------------------------------------------
  // ⑩ メニュー外クリックで閉じる
  //-----------------------------------------------------
  document.addEventListener("click", (e) => {
    if (e.target !== menu) menu.style.display = "none";
  });
}
