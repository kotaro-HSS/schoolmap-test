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

  // ======== HTML要素を取得 ========
  const startSelect = document.getElementById("start");
  const endSelect = document.getElementById("end");
  const resultDiv = document.getElementById("result");
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");

  // ======== セレクトボックスに地点を入れる ========
  for (const key in nodes) {
    const opt1 = new Option(key, key);
    const opt2 = new Option(key, key);
    startSelect.add(opt1);
    endSelect.add(opt2);
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

  // ======== 地図を描画する関数（中心B基準＋階段線垂直） ========
  function drawMap(route = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const floorWidth = 500;
    const floorHeight = 200;
    const floorSpacing = 80;
    const skew = 0.5;

    // Canvas中心に2F-Bを置く
    const baseX = 250;
    const baseY = 200;

    const centerNodes = {
      1: nodes["1F-B"],
      2: nodes["2F-B"],
      3: nodes["3F-B"]
    };

    function project(x, y, floor) {
      const cx = centerNodes[floor].x;
      const cy = centerNodes[floor].y;
      const px = baseX + (x - cx) - (y - cy) * skew;
      const py = baseY + ((x - cx) + (y - cy)) * 0.3 - (floor - 2) * floorSpacing;
      return { px, py };
    }

    // フロア描画
    for (let f = 1; f <= 3; f++) {
      const c = centerNodes[f];
      const topLeft = project(c.x - floorWidth / 2, c.y - floorHeight / 2, f);
      const topRight = project(c.x + floorWidth / 2, c.y - floorHeight / 2, f);
      const bottomRight = project(c.x + floorWidth / 2, c.y + floorHeight / 2, f);
      const bottomLeft = project(c.x - floorWidth / 2, c.y + floorHeight / 2, f);

      ctx.fillStyle = "rgba(200,200,200,0.2)";
      ctx.beginPath();
      ctx.moveTo(topLeft.px, topLeft.py);
      ctx.lineTo(topRight.px, topRight.py);
      ctx.lineTo(bottomRight.px, bottomRight.py);
      ctx.lineTo(bottomLeft.px, bottomLeft.py);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${f}F`, topLeft.px + 10, topLeft.py + 20);
    }

    // 通路・経路描画
    for (const key in nodes) {
      const node = nodes[key];
      node.connects.forEach((c) => {
        const n2 = nodes[c];
        if (!n2) return;

        // --- 重複線防止 ---
        if (Object.keys(nodes).indexOf(key) > Object.keys(nodes).indexOf(c)) return;

        // --- B同士スキップ ---
        if (key.endsWith("B") && c.endsWith("B")) return;

        // --- 経路色判定 ---
        let isRoute = false;
        for (let i = 0; i < route.length - 1; i++) {
          if (
            (route[i] === key && route[i + 1] === c) ||
            (route[i] === c && route[i + 1] === key)
          ) {
            isRoute = true;
            break;
          }
        }

        let p1, p2;

        // --- 階段同士は垂直線 ---
        if (key.includes("Stair") && c.includes("Stair")) {
          const stairX = (project(node.x, node.y, node.floor).px + project(n2.x, n2.y, n2.floor).px) / 2;
          const py1 = project(node.x, node.y, node.floor).py;
          const py2 = project(n2.x, n2.y, n2.floor).py;
          p1 = { px: stairX, py: py1 };
          p2 = { px: stairX, py: py2 };
        } else {
          // --- 通路線 ---
          const proj1 = project(node.x, node.y, node.floor);
          const proj2 = project(n2.x, n2.y, n2.floor);
          p1 = proj1;
          p2 = proj2;
        }

        ctx.strokeStyle = isRoute ? "#ff5722" : "#aaa";
        ctx.lineWidth = isRoute ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      });
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
  }

  // ======== ボタンが押されたときの処理 ========
  document.getElementById("find-route").addEventListener("click", () => {
    const start = startSelect.value;
    const end = endSelect.value;
    if (!start || !end) return alert("現在地と目的地を選んでください。");

    const route = findRoute(start, end);
    if (route) {
      resultDiv.innerHTML = `経路: ${route.join(" → ")}`;
      drawMap(route);
    } else {
      resultDiv.innerHTML = "経路が見つかりません。";
    }
  });

  // ======== 初期表示 ========
  drawMap();
});
