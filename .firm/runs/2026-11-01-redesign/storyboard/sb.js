/* Storyboard helpers: the well-grid (what the canvas will draw) and the guide placeholder (no face). */
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('accent') === 'orange') document.documentElement.dataset.accent = 'orange';

  // Hairline grid that bends into the gravity well. Drawn here as SVG; on the site it is the canvas ground.
  // opts: w,h (frame size), cx,cy (well centre), rh (horizon radius), sigma, pull, step, fadeLeft (0..1 of width where grid is faint)
  window.well = function (svg, o) {
    const w = o.w, h = o.h, cx = o.cx, cy = o.cy, s = o.sigma || 300, P = o.pull ?? 0.62, step = o.step || 46;
    const warp = (x, y) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1e-6;
      const f = 1 - P * Math.exp(-(r * r) / (s * s));
      return [cx + dx * f, cy + dy * f];
    };
    const line = (pts) => {
      let d = '';
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = warp(pts[i][0], pts[i][1]);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return d;
    };
    const n = 40; let paths = '';
    for (let x = step; x < w; x += step) {
      const pts = []; for (let i = 0; i <= n; i++) pts.push([x, (h * i) / n]);
      paths += `<path d="${line(pts)}"/>`;
    }
    for (let y = step; y < h; y += step) {
      const pts = []; for (let i = 0; i <= n; i++) pts.push([(w * i) / n, y]);
      paths += `<path d="${line(pts)}"/>`;
    }
    const id = 'm' + Math.random().toString(36).slice(2, 7);
    const fade = o.fadeLeft ?? 0.45;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="${fade}" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
        <radialGradient id="${id}r" cx="${cx / w}" cy="${cy / h}" r="${(o.rh * 1.08) / w}" gradientUnits="objectBoundingBox"><stop offset=".9" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
        <mask id="${id}"><rect width="${w}" height="${h}" fill="url(#${id}g)"/></mask>
      </defs>
      <g mask="url(#${id})" fill="none" stroke="${o.stroke || 'rgba(236,233,226,.12)'}" stroke-width="1" vector-effect="non-scaling-stroke">${paths}</g>`;
  };

  // The guide: Astraía (Quentin Otani, CC BY), head and shoulders, armillary rings. A silhouette only; no face is drawn.
  // x,y = head centre in the parent's px; sc = scale (1 = head 110 px tall); lit = 'left'|'right' (which side the ring lights)
  window.guide = function (x, y, sc, lit) {
    const L = lit === 'left' ? -1 : 1;
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    return `<svg style="position:absolute;left:${x - 170 * sc}px;top:${y - 90 * sc}px;width:${340 * sc}px;height:${320 * sc}px;overflow:visible" viewBox="-170 -90 340 320">
      <defs>
        <linearGradient id="${id}" x1="${L > 0 ? 1 : 0}" x2="${L > 0 ? 0 : 1}"><stop offset="0" stop-color="#2a2a30"/><stop offset=".55" stop-color="#17171b"/><stop offset="1" stop-color="#101013"/></linearGradient>
        <linearGradient id="${id}r" x1="${L > 0 ? 1 : 0}" x2="${L > 0 ? 0 : 1}"><stop offset="0" stop-color="var(--accent)" stop-opacity=".9"/><stop offset=".35" stop-color="#ece9e2" stop-opacity=".35"/><stop offset=".6" stop-color="#ece9e2" stop-opacity="0"/></linearGradient>
      </defs>
      <!-- armillary rings behind -->
      <g fill="none" stroke="var(--accent)" stroke-width="1.2" opacity=".55">
        <ellipse cx="0" cy="0" rx="118" ry="34" transform="rotate(-18)"/>
      </g>
      <!-- shoulders, neck, head -->
      <path d="M-170 230 C-170 150 -120 118 -60 110 L-24 100 L-24 64 L24 64 L24 100 L60 110 C120 118 170 150 170 230 Z" fill="url(#${id})"/>
      <path d="M-170 230 C-170 150 -120 118 -60 110 L-24 100 L-24 64 L24 64 L24 100 L60 110 C120 118 170 150 170 230 Z" fill="none" stroke="url(#${id}r)" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="46" ry="60" fill="url(#${id})"/>
      <ellipse cx="0" cy="0" rx="46" ry="60" fill="none" stroke="url(#${id}r)" stroke-width="1.5"/>
      <!-- porcelain seam lines (the android's plates), not a face -->
      <path d="M${L * 14} -58 C${L * 30} -30 ${L * 30} 20 ${L * 12} 56" fill="none" stroke="#ece9e2" stroke-opacity=".18" stroke-width="1"/>
      <path d="M-8 104 L-8 70 M8 104 L8 70" stroke="#ece9e2" stroke-opacity=".14" stroke-width="1"/>
      <!-- armillary rings in front -->
      <g fill="none" stroke="var(--accent)" stroke-width="1.2" opacity=".85">
        <ellipse cx="0" cy="0" rx="118" ry="34" transform="rotate(-18)" stroke-dasharray="0 190 190 0"/>
        <ellipse cx="0" cy="4" rx="84" ry="96" transform="rotate(${L * 62})" opacity=".6"/>
        <circle cx="${L * -96}" cy="-54" r="2.4" fill="var(--accent)"/>
      </g>
    </svg>`;
  };

  window.gauge = function (station, label, opts) {
    const o = opts || {};
    const H = o.h || 788, n = 9, ticks = [];
    const major = (i) => (i * H) / (n - 1);
    for (let i = 0; i < n; i++) {
      ticks.push(`<i class="t M" style="top:${major(i).toFixed(1)}px"></i>`);
      if (i < n - 1) for (let k = 1; k < 4; k++) ticks.push(`<i class="t" style="top:${(major(i) + (k * H) / (n - 1) / 4).toFixed(1)}px"></i>`);
    }
    const top = major(station - 1) + (o.frac || 0) * (H / (n - 1));
    return `<div class="gauge">${ticks.join('')}<i class="marker ${o.ring ? 'ring' : ''}" style="top:${(top - 4).toFixed(1)}px"></i><span class="read"><b>Station ${String(station).padStart(2, '0')} / 09</b> &nbsp;·&nbsp; ${label}</span></div>`;
  };
})();
