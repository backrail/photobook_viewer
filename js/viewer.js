document.addEventListener("DOMContentLoaded", init);

async function init() {

  // 長押し後のクリックをブロックするためのフラグ
  let blockPageTurnClick = false;

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


  // ----------------------------------------------------------
  // ③ PC：右クリックをページめくりから完全に除外
  // ----------------------------------------------------------
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
      // 長押しによって発生したクリックをブロック
      if (blockPageTurnClick) {
        blockPageTurnClick = false; // フラグをリセット
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }

      if (e.button === 2) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );

  flipBookElement.addEventListener(
    "contextmenu",
    (e) => e.preventDefault(),
    true
  );


  // ----------------------------------------------------
  // ④ 拡大オーバーレイ（画像全体が見切れない contain） ★ 最終修正箇所
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
      padding: 16px;
      pointer-events: auto;
    `;

    // ★ 修正点: stopPropからe.preventDefault()を削除し、クリック動作を有効にする
    const stopProp = (e) => {
      // イベント伝播（裏のフリップブックへの影響）のみを即座に停止する
      e.stopImmediatePropagation();
      // e.preventDefault() は削除することで、ボタンのクリックやタップ動作を有効にする
    };

    // mousedown, touchstart, click のイベント伝播を遮断
    overlay.addEventListener('mousedown', stopProp);
    overlay.addEventListener('touchstart', stopProp);
    overlay.addEventListener('click', stopProp);
    // touchend のリスナーは削除

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
    closeBtn.innerText = "✕";
    closeBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      color: white;
      font-size: 32px;
      cursor: pointer;
      z-index: 10000;
    `;

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    closeBtn.onclick = () =>
      (overlay.style.display = "none");

    overlay.onclick = (e) => {
      // オーバーレイ自体をクリックした場合に閉じる（画像やボタンクリックは除く）
      if (e.target === overlay)
        overlay.style.display = "none";
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


  // ----------------------------------------------------
  // ⑥ 左右ページ判定（押したページを拡大）
  // ----------------------------------------------------
  let lastPressEvent = null;

  function getClickedPageIndex(event) {
    const rect = flipBookElement.getBoundingClientRect();
    // event.touches が存在しない場合は event.clientX を使用
    const clientX =
      (event.touches?.[0]?.clientX ?? event.clientX) - rect.left;

    const mid = rect.width / 2;
    // flip.getCurrentPageIndex() は見開きの左側のページインデックス（表紙は 0）
    const leftPage = flip.getCurrentPageIndex();
    const rightPage = leftPage + 1;

    // 中央より左なら左ページ、右なら右ページのインデックスを返す
    return clientX < mid ? leftPage : rightPage;
  }


  // ----------------------------------------------------
  // ⑦ メニュークリック → 押した側のページを拡大
  // ----------------------------------------------------
  menu.onclick = () => {

    // 押した側の pageFlipIndex を取得
    let pageFlipIndex = getClickedPageIndex(lastPressEvent);

    let realIndex = pageFlipIndex;

    // 表紙が開かれている場合は、クリック位置に関わらず必ず pages[0] (表紙)を拡大する
    if (flip.getCurrentPageIndex() === 0) {
      realIndex = 0;
    }
    // それ以外のケース（見開きページ）で、インデックスが負の値になることは通常ないが、
    // 安全のため、最小値は 0 とする
    else if (realIndex < 0) {
      realIndex = 0;
    }

    // 拡大ビューに反映
    document.getElementById("zoom-img").src = pages[realIndex];
    document.getElementById("zoom-overlay").style.display = "flex";
    menu.style.display = "none";
  };



  // ----------------------------------------------------
  // ⑧ PC：右クリックでメニュー出す
  // ----------------------------------------------------
  flipBookElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    // クリックされたページが空白領域でないかチェック
    const rect = flipBookElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const mid = rect.width / 2;

    // 現在のページインデックスが 0 のとき（表紙見開き）
    if (flip.getCurrentPageIndex() === 0) {
      // 左半分 (clientX < mid) をクリックした場合、それは空白部分と見なす
      if (clientX < mid) {
        return;
      }
    }

    // 有効なページ上でクリックされた場合のみ、メニューを表示
    lastPressEvent = e;
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.display = "block";
  });


  // ----------------------------------------------------
  // ⑨ スマホ：タップ/長押し判定（誤動作ゼロ）
  // ----------------------------------------------------
  let touchStartTime = 0;
  let longPressTriggered = false;
  let pressTimer;

  flipBookElement.addEventListener("touchstart", (e) => {
    touchStartTime = Date.now();
    longPressTriggered = false;

    // タッチ位置が表紙の左側（空白）かどうかをチェック
    const rect = flipBookElement.getBoundingClientRect();
    const clientX = e.touches[0].clientX - rect.left;
    const mid = rect.width / 2;

    // 現在のページインデックスが 0 のとき（表紙見開き）
    if (flip.getCurrentPageIndex() === 0) {
      // 左半分 (clientX < mid) をタップした場合、長押し判定をスキップする
      if (clientX < mid) {
        return;
      }
    }

    pressTimer = setTimeout(() => {
      longPressTriggered = true;

      const t = e.touches[0];

      // lastPressEvent を座標情報のみの標準オブジェクトとして保存
      lastPressEvent = {
        clientX: t.clientX,
        clientY: t.clientY,
        touches: null
      };

      menu.style.left = `${t.clientX}px`;
      menu.style.top = `${t.clientY}px`;
      menu.style.display = "block";
    }, 500); // 長押し検出
  });

  flipBookElement.addEventListener("touchend", (e) => {
    clearTimeout(pressTimer);

    const elapsed = Date.now() - touchStartTime;

    if (longPressTriggered) {
      // 長押し → ページめくり禁止 + 次のクリックも禁止
      e.stopImmediatePropagation();
      e.preventDefault();

      // 長押し後に発生する synthetic click をブロックするためのフラグを設定
      blockPageTurnClick = true;

      return;
    }

    if (elapsed < 300) {
      // タップ → 通常のページめくり（PageFlipに任せる）
      return;
    }

    // 中途半端な押し（300〜500ms）は何もしない
    e.preventDefault();
    e.stopImmediatePropagation();
  });


  // ----------------------------------------------------
  // ⑩ メニュー外クリックで閉じる
  // ----------------------------------------------------
  document.addEventListener("click", (e) => {
    if (e.target !== menu)
      menu.style.display = "none";
  });
}