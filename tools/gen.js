// Sokoban level generator: random room + reverse (pull) BFS from solved state.
// Farthest state by push count = start position. Guaranteed solvable.
'use strict';
let seed = +process.argv[2] || 12345;
function rnd() { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }

const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function makeRoom(w, h, pieces) {
  // grid w x h with border walls
  const g = [];
  for (let y = 0; y < h; y++) { g.push([]); for (let x = 0; x < w; x++) g[y].push(x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : 0); }
  // cut corners
  for (let c = 0; c < 4; c++) {
    if (rnd() < 0.5) {
      const cw = ri(1, Math.floor((w - 2) / 2)), ch = ri(1, Math.floor((h - 2) / 2));
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const xx = c & 1 ? w - 2 - x : 1 + x, yy = c & 2 ? h - 2 - y : 1 + y;
        g[yy][xx] = 1;
      }
    }
  }
  const shapes = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 1]]];
  for (let i = 0; i < pieces; i++) {
    const s = shapes[ri(0, shapes.length - 1)];
    const ox = ri(1, w - 2), oy = ri(1, h - 2);
    for (const [dx, dy] of s) { const x = ox + dx, y = oy + dy; if (x > 0 && y > 0 && x < w - 1 && y < h - 1) g[y][x] = 1; }
  }
  return g;
}

function floorCells(g) { const f = []; for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (!g[y][x]) f.push(y * g[0].length + x); return f; }

function connected(g) {
  const w = g[0].length, f = floorCells(g); if (!f.length) return false;
  const seen = new Set([f[0]]), st = [f[0]];
  while (st.length) { const p = st.pop(); const x = p % w, y = (p / w) | 0; for (const [dx, dy] of D) { const q = (y + dy) * w + x + dx; if (!g[y + dy][x + dx] && !seen.has(q)) { seen.add(q); st.push(q); } } }
  return seen.size === f.length;
}

// Remove dead-end floor cells (3 walls) repeatedly to tidy, optional
function tidy(g) {
  const w = g[0].length, h = g.length; let ch = true;
  while (ch) { ch = false; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!g[y][x]) { let n = 0; for (const [dx, dy] of D) if (g[y + dy][x + dx]) n++; if (n >= 3) { g[y][x] = 1; ch = true; } } }
}

// ---------- solver core ----------
function mkLevel(g) {
  const w = g[0].length, h = g.length; const N = w * h; const wall = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) wall[y * w + x] = g[y][x];
  return { w, h, N, wall, off: [-w, 1, w, -1] };
}

// reachable region from p with boxes set; returns {min, set(Uint8Array)}
function reach(L, boxes, p, mark, stamp) {
  const st = [p]; mark[p] = stamp; let mn = p;
  while (st.length) { const c = st.pop(); if (c < mn) mn = c; for (const o of L.off) { const q = c + o; if (!L.wall[q] && !boxes.has(q) && mark[q] !== stamp) { mark[q] = stamp; st.push(q); } } }
  return mn;
}

function key(boxArr, pmin) { return boxArr.join(',') + '|' + pmin; }

// dead squares: box cannot reach any goal (via pulls from goals)
function deadSquares(L, goals) {
  const live = new Uint8Array(L.N); const st = [...goals]; for (const g of goals) live[g] = 1;
  while (st.length) { const c = st.pop(); for (const o of L.off) { const b = c + o, p = c + 2 * o; if (!L.wall[b] && !L.wall[p] && !live[b]) { live[b] = 1; st.push(b); } } }
  return live;
}

// forward BFS push-optimal solve. returns pushes count or -1
function solve(L, boxes0, player0, goals, limit = 3e6) {
  const goalSet = new Set(goals); const live = deadSquares(L, goals);
  const mark = new Int32Array(L.N), mark2 = new Int32Array(L.N); let stamp = 1;
  let b0 = [...boxes0].sort((a, b) => a - b);
  const bs0 = new Set(b0); const pm0 = reach(L, bs0, player0, mark, stamp++);
  const seen = new Map(); seen.set(key(b0, pm0), null);
  let frontier = [[b0, pm0]]; let depth = 0;
  const isSolved = (arr) => arr.every(b => goalSet.has(b));
  if (isSolved(b0)) return 0;
  while (frontier.length) {
    depth++; const next = [];
    for (const [arr, pm] of frontier) {
      const bs = new Set(arr); const s = stamp++; reach(L, bs, pm, mark, s);
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i];
        for (const o of L.off) {
          const from = b - o, to = b + o;
          if (mark[from] !== s) continue; if (L.wall[to] || bs.has(to) || !live[to]) continue;
          const na = arr.slice(); na[i] = to; na.sort((a, c) => a - c);
          const nbs = new Set(na); const nm = reach(L, nbs, b, mark2, stamp++);
          const k = key(na, nm); if (seen.has(k)) continue; seen.set(k, 1);
          if (isSolved(na)) return depth;
          next.push([na, nm]);
          if (seen.size > limit) return -2;
        }
      }
    }
    frontier = next;
  }
  return -1;
}

// reverse BFS from solved: find farthest state
function generate(g, nBoxes) {
  const L = mkLevel(g); const f = floorCells(g);
  if (f.length < nBoxes + 4) return null;
  // goals random
  const goals = []; const pool = f.slice();
  while (goals.length < nBoxes) { const i = ri(0, pool.length - 1); goals.push(pool.splice(i, 1)[0]); }
  goals.sort((a, b) => a - b);
  const mark = new Int32Array(L.N), mark2 = new Int32Array(L.N); let stamp = 1;
  const gs = new Set(goals);
  // all player regions around goal config
  const starts = []; const regionSeen = new Set();
  for (const p of f) { if (gs.has(p)) continue; const m = reach(L, gs, p, mark, stamp++); if (!regionSeen.has(m)) { regionSeen.add(m); starts.push([goals.slice(), m]); } }
  const dist = new Map(); for (const s of starts) dist.set(key(s[0], s[1]), 0);
  let frontier = starts; let depth = 0; let best = null; let bestScore = -1;
  const LIM = 400000;
  while (frontier.length) {
    depth++; const next = [];
    for (const [arr, pm] of frontier) {
      const bs = new Set(arr); const s = stamp++; reach(L, bs, pm, mark, s);
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i];
        for (const o of L.off) {
          // pull: player at b+o moves to b+2o, box moves b -> b+o
          const pAt = b + o, pTo = b + 2 * o;
          if (mark[pAt] !== s) continue; if (L.wall[pTo] || bs.has(pTo)) continue;
          const na = arr.slice(); na[i] = pAt; na.sort((a, c) => a - c);
          const nbs = new Set(na); const nm = reach(L, nbs, pTo, mark2, stamp++);
          const k = key(na, nm); if (dist.has(k)) continue; dist.set(k, depth);
          next.push([na, nm, pTo]);
          const onGoal = na.filter(x => gs.has(x)).length;
          const score = depth * 10 - onGoal * 25;
          if (onGoal === 0 && score > bestScore) { bestScore = score; best = { boxes: na, player: pTo, pushes: depth }; }
          if (dist.size > LIM) { frontier = []; break; }
        }
      }
    }
    if (dist.size > LIM) break;
    frontier = next.map(x => [x[0], x[1]]);
  }
  if (!best) return null;
  return { L, goals, ...best };
}

function render(g, goals, boxes, player) {
  const w = g[0].length, h = g.length;
  // compute walls to keep: walls adjacent (8-neigh) to reachable floor
  const rows = [];
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (g[y][x]) {
        let near = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < h && xx < w && !g[yy][xx]) near = true; }
        r += near ? '#' : ' ';
      } else {
        const G = goals.includes(p), B = boxes.includes(p), P = p === player;
        r += B && G ? '*' : B ? '$' : P && G ? '+' : P ? '@' : G ? '.' : '-';
      }
    }
    rows.push(r.replace(/\s+$/, ''));
  }
  // trim empty rows
  while (rows.length && !rows[0].trim()) rows.shift();
  while (rows.length && !rows[rows.length - 1].trim()) rows.pop();
  return rows;
}

module.exports = { makeRoom, connected, tidy, generate, render, solve, mkLevel, floorCells, ri, rnd, setSeed: s => seed = s };

if (require.main === module) {
  const cfgs = JSON.parse(process.argv[3]);
  const out = [];
  for (const c of cfgs) {
    let tries = 0, found = [];
    while (found.length < (c.pool || c.count * 40) && tries < (c.maxTries || c.count * 20000)) {
      tries++;
      const g = makeRoom(ri(c.w[0], c.w[1]), ri(c.h[0], c.h[1]), ri(c.p[0], c.p[1]));
      tidy(g);
      if (!connected(g)) continue;
      const fl = floorCells(g).length; if (fl < c.minFloor || fl > c.maxFloor) continue;
      const r = generate(g, c.boxes); if (!r) continue;
      if (r.pushes < c.minPush) continue;
      const rr = render(g, r.goals, r.boxes, r.player).join('\n'); if (found.some(f => f.rows.join('\n') === rr)) continue;
      found.push({ rows: render(g, r.goals, r.boxes, r.player), pushes: r.pushes, boxes: c.boxes });
    }
    found.sort((a, b) => b.pushes - a.pushes);
    out.push(...found.slice(0, c.count).reverse());
    process.stderr.write(`boxes ${c.boxes}: tries ${tries} found ${found.length} pushes ${found.slice(0, c.count).map(f => f.pushes)}\n`);
  }
  console.log(JSON.stringify(out));
}
