// script.js - モバイル対応・パン＆ピンチ・既存経路ロジック保持版
document.addEventListener("DOMContentLoaded", () => {
  // ----- ノード定義（あなたの最新版ノード構成をここに保持） -----
  const nodes = {
    // 1F
    "1F-A": { x: 100, y: 80, floor: 1, connects: ["1F-B", "Stair1F-1"] },
    "1F-B": { x: 250, y: 80, floor: 1, connects: ["1F-A", "1F-C"] },
    "1F-C": { x: 400, y: 80, floor: 1, connects: ["1F-B", "Stair1F-2"] },
    "Stair1F-1": { x: 100, y: 150, floor: 1, connects: ["1F-A", "Stair2F-1"] },
    "Stair1F-2": { x: 400, y: 150, floor: 1, connects: ["1F-C", "Stair2F-2"] },

    // 2F
    "2F-A": { x: 100, y: 80, floor: 2, connects: ["2F-B", "Stair2F-1"] },
    "2F-B": { x: 250, y: 80, floor: 2, connects: ["2F-A", "2F-C"] },
    "2F-C": { x: 400, y: 80, floor: 2, connects: ["2F-B", "Stair2F-2"] },
    "Stair2F-1": { x: 100, y: 150, floor: 2, connects: ["2F-A", "Stair1F-1", "Stair3F-1"] },
    "Stair2F-2": { x: 400, y: 150, floor: 2, connects: ["2F-C", "Stair1F-2", "Stair3F-2"] },

    // 3F
    "3F-A": { x: 100, y: 80, floor: 3, connects: ["3F-B", "Stair3F-1"] },
    "3F-B": { x: 250, y: 80, floor: 3, connects: ["3F-A", "3F-C"] },
    "3F-C": { x: 400, y: 80, floor: 3, connects: ["3F-B", "Stair3F-2"] },
    "Stair3F-1": { x: 100, y: 150, floor: 3, connects: ["3F-A", "Stair2F-1"] },
    "Stair3F-2": { x: 400, y: 150, floor: 3, connects: ["3F-C", "Stair2F-2"] },
  };

  // --- HTML要素 ---
  const startSelect = document.getElementById("start");
  const endSelect = document.getElementById("end");
  const resultDiv = document.getElementById("result");
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");

  // --- セレクトに追加 ---
  Object.keys(nodes).forEach((k) => {
    startSelect.add(new Option(k, k));
    endSelect.add(new Option(k, k));
  });

  // ======== 経路探索 BFS ========
  function findRoute(start, goal) {
    if (start === goal) return [start];
    const queue = [[start]];
    const visited = new Set([start]);
    while (queue.length) {
      const path = queue.shift();
      const cur = path[path.length - 1];
      for (const nxt of nodes[cur].connects) {
        if (visited.has(nxt)) continue;
        const newPath = path.concat([nxt]);
        if (nxt === goal) return newPath;
        visited.add(nxt);
        queue.push(newPath);
      }
    }
    return null;
  }

  // ======== Canvas 解像度（Retina対応）とリサイズ ========
  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // リセット
      return true;
    }
    return false;
  }

  // ======== マップ変換（パン・ズーム）状態 ========
  let transform = { scale: 1.0, tx: 0, ty: 0 };
  // 現在のハイライト経路
  let currentRoute = [];

  // ======== 投影関数（平行四辺形アクソメ風） ========
  const floorWidth = 500;
  const floorHeight = 200;
  const floorSpacing = 80;
  const skew = 0.5;
  const baseX = 250;
  const baseY = 200;
  const centerNodes = {
    1: nodes["1F-B"],
    2: nodes["2F-B"],
    3: nodes["3F-B"],
  };

  function project(x, y, floor) {
    const cx = centerNodes[floor].x;
    const cy = centerNodes[floor].y;
    const px = baseX + (x - cx) - (y - cy) * skew;
    const py = baseY + ((x - cx) + (y - cy)) * 0.3 - (floor - 2) * floorSpacing;
    return { x: px, y: py };
  }

  // ======== 描画関数 ========
  function drawMap(route = []) {
    // ensure HiDPI
    resizeCanvasToDisplaySize();
    const dpr = window.devicePixelRatio || 1;
    // clear full resolution canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // apply transform (scale + translate). Because we used hi-dpi, operate in CSS pixels:
    ctx.save();
    // convert CSS px transform to actual canvas pixels:
    ctx.scale(dpr, dpr);
    ctx.translate(transform.tx, transform.ty);
    ctx.scale(transform.scale, transform.scale);

    // draw floors (parallel quads)
    for (let f = 1; f <= 3; f++) {
      const c = centerNodes[f];
      const tl = project(c.x - floorWidth / 2, c.y - floorHeight / 2, f);
      const tr = project(c.x + floorWidth / 2, c.y - floorHeight / 2, f);
      const br = project(c.x + floorWidth / 2, c.y + floorHeight / 2, f);
      const bl = project(c.x - floorWidth / 2, c.y + floorHeight / 2, f);

      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(220,220,255,${0.15 + f * 0.03})`;
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${f}F`, tl.x + 10, tl.y + 20);
    }

    // draw edges (avoid double-draw)
    const keys = Object.keys(nodes);
    for (const key of keys) {
      const node = nodes[key];
      for (const c of node.connects) {
        const idxA = keys.indexOf(key);
        const idxB = keys.indexOf(c);
        if (idxA > idxB) continue; // draw once
        // skip B-B (your requested rule)
        if (key.endsWith("B") && c.endsWith("B")) continue;

        const n2 = nodes[c];
        if (!n2) continue;

        let p1, p2;
        if (key.includes("Stair") && c.includes("Stair")) {
          // vertical stair: take avg x for straight vertical look
          const a = project(node.x, node.y, node.floor);
          const b = project(n2.x, n2.y, n2.floor);
          const stairX = (a.x + b.x) / 2;
          p1 = { x: stairX, y: a.y };
          p2 = { x: stairX, y: b.y };
        } else {
          p1 = project(node.x, node.y, node.floor);
          p2 = project(n2.x, n2.y, n2.floor);
        }

        // is this edge part of route?
        let isRoute = false;
        if (route && route.length) {
          for (let i = 0; i < route.length - 1; i++) {
            if ((route[i] === key && route[i + 1] === c) || (route[i] === c && route[i + 1] === key)) {
              isRoute = true;
              break;
            }
          }
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isRoute ? "#ff5722" : "#aaa";
        ctx.lineWidth = isRoute ? 3 : 1;
        ctx.stroke();
      }
    }

    // draw nodes
    for (const key of keys) {
      const node = nodes[key];
      const p = project(node.x, node.y, node.floor);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = route && route.includes(key) ? "#ff5722" : "#0078d7";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "12px sans-serif";
      ctx.fillText(key, p.x + 8, p.y - 4);
    }

    ctx.restore();
  }

  // ======== Interaction: pan / zoom (mouse & touch) ========
  // mouse drag
  let isPointerDown = false;
  let lastPointer = null;
  canvas.addEventListener("pointerdown", (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    isPointerDown = true;
    lastPointer = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!isPointerDown || !lastPointer) return;
    if (ev.pointerId !== lastPointer.id) return;
    const dx = ev.clientX - lastPointer.x;
    const dy = ev.clientY - lastPointer.y;
    transform.tx += dx / transform.scale;
    transform.ty += dy / transform.scale;
    lastPointer.x = ev.clientX;
    lastPointer.y = ev.clientY;
    drawMap(currentRoute);
  });
  canvas.addEventListener("pointerup", (ev) => {
    canvas.releasePointerCapture(ev.pointerId);
    isPointerDown = false;
    lastPointer = null;
  });
  canvas.addEventListener("pointercancel", () => {
    isPointerDown = false;
    lastPointer = null;
  });

  // wheel zoom
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.08 : 0.92;
    // zoom around mouse position
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.tx) / transform.scale;
    const my = (e.clientY - rect.top - transform.ty) / transform.scale;
    transform.scale *= zoomFactor;
    // adjust pan to keep focus
    transform.tx -= (zoomFactor - 1) * mx;
    transform.ty -= (zoomFactor - 1) * my;
    drawMap(currentRoute);
  }, { passive: false });

  // touch pinch: use pointers tracking
  const pointers = new Map();
  canvas.addEventListener("pointerdown", (e) => pointers.set(e.pointerId, e));
  canvas.addEventListener("pointermove", (e) => {
    if (pointers.size >= 2) {
      pointers.set(e.pointerId, e);
      // compute pinch if two pointers present
      const ps = Array.from(pointers.values());
      if (ps.length >= 2) {
        const a = ps[0], b = ps[1];
        const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
        const dist = Math.hypot(dx, dy);
        if (!canvas._lastPinchDist) canvas._lastPinchDist = dist;
        const zoom = dist / canvas._lastPinchDist;
        // center
        const rect = canvas.getBoundingClientRect();
        const cx = ((a.clientX + b.clientX) / 2 - rect.left - transform.tx) / transform.scale;
        const cy = ((a.clientY + b.clientY) / 2 - rect.top - transform.ty) / transform.scale;
        transform.scale *= zoom;
        transform.tx -= (zoom - 1) * cx;
        transform.ty -= (zoom - 1) * cy;
        canvas._lastPinchDist = dist;
        drawMap(currentRoute);
      }
    } else {
      // single pointer handled by pointermove above (pan)
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    pointers.delete(e.pointerId);
    canvas._lastPinchDist = null;
  });
  canvas.addEventListener("pointercancel", (e) => {
    pointers.delete(e.pointerId);
    canvas._lastPinchDist = null;
  });

  // ======== UI: find-route button action ========
  document.getElementById("find-route").addEventListener("click", () => {
    const start = startSelect.value;
    const end = endSelect.value;
    if (!start || !end) {
      alert("現在地と目的地を選んでください。");
      return;
    }
    const path = findRoute(start, end);
    currentRoute = path || [];
    if (path) resultDiv.textContent = `経路: ${path.join(" → ")}`;
    else resultDiv.textContent = "経路が見つかりません。";
    drawMap(currentRoute);
  });

  // initial size: set canvas CSS size, then draw
  function setCanvasInitialSize() {
    // make canvas height relative to viewport (70%)
    const wrap = canvas.parentElement;
    const w = Math.min(900, window.innerWidth - 24); // max width
    wrap.style.width = `${Math.min(window.innerWidth - 24, 900)}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${Math.round(window.innerHeight * 0.68)}px`;
    // transform initial pos center-ish
    transform = { scale: 1, tx: 0, ty: 0 };
  }

  window.addEventListener("resize", () => {
    setCanvasInitialSize();
    drawMap(currentRoute);
  });

  setCanvasInitialSize();
  drawMap();
});

