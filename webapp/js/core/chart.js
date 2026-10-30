// ============================================================================
// chart.js — Dependency-free canvas line/area chart (multi-series).
// Theme-aware: reads colors from CSS custom properties so dark/light mode
// "just works" without re-plumbing options.
// ============================================================================

import { el } from './dom.js';

export function cssVar(name, fallback = '') {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export class LineChart {
  constructor(canvas, { height = 200 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.series = [];
    this.labels = [];
    this.min = null;
    this.max = null;
    this._tooltip = null;
    this._height = height;

    this._onResize = () => this.draw();
    this._onMove = (e) => this._hover(e);
    this._onLeave = () => this._hover(null);
    window.addEventListener('resize', this._onResize);
    canvas.addEventListener('mousemove', this._onMove);
    canvas.addEventListener('mouseleave', this._onLeave);
  }

  setData({ labels = [], series = [], min = null, max = null } = {}) {
    this.labels = labels;
    this.series = series;
    this.min = min;
    this.max = max;
    this.draw();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('mousemove', this._onMove);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
    this._tooltip?.remove();
    this._tooltip = null;
  }

  _size() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || this._height;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  _extent() {
    let lo = this.min != null ? this.min : Infinity;
    let hi = this.max != null ? this.max : -Infinity;
    if (this.min == null || this.max == null) {
      for (const s of this.series) {
        for (const v of s.values) {
          if (!Number.isFinite(v)) continue;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.08;
    return { lo: lo - pad, hi: hi + pad };
  }

  draw() {
    const { w, h } = this._size();
    const ctx = this.ctx;
    const pad = { top: 12, right: 12, bottom: 22, left: 46 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const { lo, hi } = this._extent();

    ctx.clearRect(0, 0, w, h);
    ctx.font = '10px system-ui, -apple-system, Segoe UI, sans-serif';

    const gridColor = cssVar('--chart-grid', '#e2e8f0');
    const textColor = cssVar('--text-muted', '#64748b');

    // Horizontal grid + y-axis labels.
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = pad.top + (plotH * i) / steps;
      const val = hi - ((hi - lo) * i) / steps;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, Math.round(y) + 0.5);
      ctx.lineTo(w - pad.right, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._fmt(val), pad.left - 6, y);
    }

    const n = Math.max(0, ...this.series.map((s) => s.values.length));
    if (n === 0) {
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sin datos', w / 2, h / 2);
      this._n = 0;
      return;
    }

    const xAt = (i) => pad.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
    const yAt = (v) => pad.top + plotH - ((v - lo) / (hi - lo)) * plotH;

    // X-axis labels.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxTicks = 6;
    const tickEvery = Math.max(1, Math.ceil(n / maxTicks));
    for (let i = 0; i < n; i += tickEvery) {
      ctx.fillText(this.labels[i] ?? '', xAt(i), h - pad.bottom + 6);
    }

    // Series (line + optional area fill).
    for (const s of this.series) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const v = s.values[i];
        if (Number.isFinite(v)) pts.push([xAt(i), yAt(v)]);
        else pts.push(null);
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = s.color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;
      for (const p of pts) {
        if (!p) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(p[0], p[1]);
          started = true;
        } else {
          ctx.lineTo(p[0], p[1]);
        }
      }
      ctx.stroke();

      if (s.fill) {
        const first = pts.findIndex((p) => p);
        const last = pts.map((p, i) => (p ? i : -1)).filter((i) => i >= 0).pop();
        if (first >= 0 && last >= 0) {
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.beginPath();
          ctx.moveTo(pts[first][0], pad.top + plotH);
          for (let i = first; i <= last; i++) if (pts[i]) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[last][0], pad.top + plotH);
          ctx.closePath();
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Cache geometry for hover.
    this._pad = pad;
    this._plotW = plotW;
    this._n = n;
    this._xAt = xAt;
    this._yAt = yAt;
    this._lo = lo;
    this._hi = hi;
    this._hoverIndex = this._hoverIndex == null ? null : Math.min(this._hoverIndex, n - 1);
    if (this._hoverIndex != null) this._drawCrosshair(this._hoverIndex);
  }

  _drawCrosshair(i) {
    if (!this._n) return;
    const ctx = this.ctx;
    const { w } = this._size();
    const x = this._xAt(i);
    const gridColor = cssVar('--chart-grid', '#e2e8f0');
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, this._pad.top);
    ctx.lineTo(x, this._pad.top + (this._size().h - this._pad.top - this._pad.bottom));
    ctx.stroke();
    ctx.setLineDash([]);
    for (const s of this.series) {
      const v = s.values[i];
      if (!Number.isFinite(v)) continue;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, this._yAt(v), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _fmt(v) {
    const a = Math.abs(v);
    if (a >= 1000) return String(Math.round(v));
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    return v.toFixed(2);
  }

  _hover(e) {
    if (!e) {
      this._hoverIndex = null;
      this._tooltip?.remove();
      this._tooltip = null;
      this.draw();
      return;
    }
    if (!this._n) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let i = Math.round(((x - this._pad.left) / this._plotW) * (this._n - 1));
    i = Math.max(0, Math.min(this._n - 1, i));
    this._hoverIndex = i;
    this.draw();

    // Tooltip.
    if (!this._tooltip) {
      this._tooltip = el('div', { class: 'chart-tooltip' });
      this.canvas.parentElement.appendChild(this._tooltip);
    }
    const rows = [
      el('div', { class: 'chart-tooltip__title', text: this.labels[i] ?? '' }),
      ...this.series
        .filter((s) => Number.isFinite(s.values[i]))
        .map((s) =>
          el('div', { class: 'chart-tooltip__row' },
            el('span', { class: 'chart-tooltip__dot', style: `background:${s.color}` }),
            el('span', { text: `${s.name}: ` }),
            el('strong', { text: this._fmt(s.values[i]) })),
        ),
    ];
    this._tooltip.replaceChildren(...rows);
    const tw = this._tooltip.offsetWidth;
    const tx = x + 12 + tw > rect.width ? x - tw - 12 : x + 12;
    this._tooltip.style.left = `${tx}px`;
    this._tooltip.style.top = `${Math.max(4, e.clientY - rect.top - 12)}px`;
  }
}
