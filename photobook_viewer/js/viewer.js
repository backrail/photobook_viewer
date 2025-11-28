
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

    // 縦横比（元の 800x1200 = 2:3）
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
    showCover: true,            // 最初と最後のページをハードカバー扱い
    drawShadow: true,
    mobileScrollSupport: true
  });

  flip.loadFromImages(pages);

  window.addEventListener("resize", () => {
    const newSize = calcBookSize();
    flip.update(newSize.width, newSize.height);
  });
}
