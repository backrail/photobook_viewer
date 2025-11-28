document.addEventListener("DOMContentLoaded", init);

async function init() {

  // --- 画像が存在するか HEAD で確認して、自動でページを集める ---
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
    console.warn("No pages/*.jpg found. Put images as 1.jpg, 2.jpg ... in the pages folder.");
    return;
  }

  // --- 画面サイズに応じて本のサイズを計算（常にスクロールなしでフィット） ---
  function calcBookSize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 縦横比（800x1200 = 2:3）
    const baseRatio = 800 / 1200;

    let width = vw;
    let height = vw / baseRatio;

    if (height > vh) {
      height = vh;
      width = vh * baseRatio;
    }

    return { width, height };
  }

  const size = calcBookSize();

  const flip = new St.PageFlip(document.getElementById("flip-book"), {
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

  // ---------------------------------------------
  // ⭐ ここから「ページ拡大表示」追加機能
  // ---------------------------------------------

  // 拡大ビュー用のDOMを追加（なければ作成）
  if (!document.getElementById("zoom-overlay")) {
    const overlay = document.createElement("div");
    overlay.id = "zoom-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      padding: 20px;
    `;

    const img = document.createElement("img");
    img.id = "zoom-img";
    img.style.cssText = `
      width: 100%;
      height: auto;
      max-width: 900px;
    `;

    const closeBtn = document.createElement("div");
    closeBtn.id = "zoom-close";
    closeBtn.innerText = "✕";
    closeBtn.style.cssText = `
      position: fixed;
      top: 15px;
      right: 20px;
      color: white;
      font-size: 32px;
      cursor: pointer;
      z-index: 10000;
    `;

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    closeBtn.onclick = () => {
      overlay.style.display = "none";
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.style.display = "none";
    };
  }

  // ⭐ ページクリック → 拡大表示
  document.getElementById("flip-book").addEventListener("click", () => {
    const current = flip.getCurrentPageIndex();
    const imgUrl = pages[current];

    document.getElementById("zoom-img").src = imgUrl;
    document.getElementById("zoom-overlay").style.display = "flex";
  });

}
