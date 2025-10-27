// ======== ページが完全に読み込まれてから実行 ========
document.addEventListener("DOMContentLoaded", () => {
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

  const startSelect = document.getElementById("start");
  const endSelect = document.getElementById("end");
  const resultDiv = document.getElementById("result");
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");

  // ======== セレクトボックスに地点を入れる ========
  for (const key in nodes) {
    startSelect.add(new Option(key, key));
    endSelect.add(new Option(key, key));
  }

  // ======== 経路探索関数（幅優先探索） ========
  function findRoute(start, goal) {
    const queue = [[start, [start]]];
    const visited = new Set();

    while (queue.length > 0) {
      const [current, path] = queue.shift();
      if (current === goal) return path;

      for (const next of nodes[current].connects) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([next, [...path, next]]);
        }
      }
    }
    return null;
  }

  // ======== マップの状態（ズーム・移動） ========
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let lastX, lastY;

  // ======== スマホ／PC両対応のパン操作 ========
  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
      offsetX += (e.clientX - lastX);
      offsetY += (e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      drawMap(currentRoute);
    }
  });
  canvas.addEventListener("mouseup", () => (isDragging = false));
  canvas.addEventListener("mouseleave", () => (isDragging = false));

  // ======== ピンチズーム／ホイールズーム ========
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    scale *= zoom;
    drawMap(currentRoute);
  });

  let lastTouchDist = null;
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist) {
        scale *= dist / lastTouchDist;
      }
      lastTouchDist = dist;
      drawMap(currentRoute);
    } else if (e.touches.length === 1 && lastTouchDist === null) {
      if (lastX !== undefined) {
        offsetX += e.touches[0].clientX - lastX;
        offsetY += e.touches[0].clientY - lastY;
        drawMap(currentRoute);
      }
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  });
  canvas.addEventListener("touchend", () => {
    lastTouchDist = null;
    lastX = undefined;
  });

  // ======== マップ描画 ========
  let currentRoute = [];
  function drawMap(route = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const floorWidth = 500;
    const floorHeight = 200;
    const floorSpacing = 80;
    const skew = 0.5;
    const baseX = 250;
    const baseY = 200;
    const centerNodes = { 1: nodes["1F-B"], 2: nodes["2F-B"], 3: nodes["3F-B"] };

    function project(x, y, floor) {
      const cx = centerNodes[floor].x;
      const cy = centerNodes[floor].y;
      const px = baseX + (x - cx) - (y - cy) * skew;
      const py = baseY + ((x - cx) + (y - cy)) * 0.3 - (floor - 2) * floorSpacing;
      return { px, py };
    }

    // 各階平行四辺形
    for (let f = 1; f <= 3; f++) {
      const c = centerNodes[f];
      const corners = [
        project(c.x - floorWidth / 2, c.y - floorHeight / 2, f),
        project(c.x + floorWidth / 2, c.y - floorHeight / 2, f),
        project(c.x + floorWidth / 2, c.y + floorHeight / 2, f),
        project(c.x - floorWidth / 2, c.y + floorHeight / 2, f),
      ];

      ctx.fillStyle = "rgba(200,200,200,0.25)";
      ctx.beginPath();
      corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#444";
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${f}F`, corners[0].px + 10, corners[0].py + 20);
    }

    // 通路線
    for (const key in nodes) {
      const node = nodes[key];
      for (const c of node.connects) {
        const n2 = nodes[c];
        if (!n2) continue;
        if (Object.keys(nodes).indexOf(key) > Object.keys(nodes).indexOf(c)) continue;
        if (key.endsWith("B") && c.endsWith("B")) continue;

        let p1, p2;
        if (key.includes("Stair") && c.includes("Stair")) {
          const stairX = (project(node.x, node.y, node.floor).px + project(n2.x, n2.y, n2.floor).px) / 2;
          const py1 = project(node.x, node.y, node.floor).py;
          const py2 = project(n2.x, n2.y, n2.floor).py;
          p1 = { px: stairX, py: py1 };
          p2 = { px: stairX, py: py2 };
        } else {
          p1 = project(node.x, node.y, node.floor);
          p2 = project(n2.x, n2.y, n2.floor);
        }

        const isRoute = route.some((r, i) =>
          (r === key && route[i + 1] === c) || (r === c && route[i + 1] === key)
        );

        ctx.strokeStyle = isRoute ? "#ff5722" : "#aaa";
        ctx.lineWidth = isRoute ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    // ノード描画
    for (const key in nodes) {
      const node = nodes[key];
      const p = project(node.x, node.y, node.floor);
      ctx.beginPath();
      ctx.arc(p.px, p.py, 6, 0, Math.PI * 2);
      ctx.fillStyle = route.includes(key) ? "#ff5722" : "#0078d7";
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "12px sans-serif";
      ctx.fillText(key, p.px + 8, p.py - 4);
    }

    ctx.restore();
  }

  // ======== 経路ボタン ========
  document.getElementById("find-route").addEventListener("click", () => {
    const start = startSelect.value;
    const end = endSelect.value;
    if (!start || !end) return alert("現在地と目的地を選んでください。");
    const route = findRoute(start, end);
    currentRoute = route || [];
    if (route) resultDiv.textContent = `経路: ${route.join(" → ")}`;
    else resultDiv.textContent = "経路が見つかりません。";
    drawMap(route);
  });

  // ======== 初期表示 ========
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.7;
  drawMap();
});
