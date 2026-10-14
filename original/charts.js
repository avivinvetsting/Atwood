/**
 * charts.js - Multi-channel High Performance Canvas Graph Engine
 * Supports:
 * - High-contrast Light Theme (default) and Dark Theme
 * - Position y(t), Velocity v(t), and Forces T(t), N1(t)
 * - Auto-scaling with padding & zero-line emphasis
 * - Split multi-plot mode & individual tabs
 * - CSV export
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AtwoodCharts = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  class AtwoodCharts {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dataPoints = [];
      this.maxDuration = 20; // seconds window
      this.activeTab = 'all'; // 'all', 'pos', 'vel', 'force'
      this.theme = options.theme || 'light';

      this.updateThemeColors();
      this.resize();
    }

    setTheme(themeName) {
      this.theme = themeName === 'dark' ? 'dark' : 'light';
      this.updateThemeColors();
      this.draw();
    }

    updateThemeColors() {
      if (this.theme === 'dark') {
        this.colors = {
          bgCanvas: '#0b1120',
          bgPlot: '#0f172a',
          borderPlot: '#334155',
          gridLines: 'rgba(255, 255, 255, 0.06)',
          zeroLine: 'rgba(255, 255, 255, 0.25)',
          axisText: '#94a3b8',
          titleText: '#f8fafc',
          emptyText: '#64748b'
        };
      } else {
        // High-clarity Light Theme
        this.colors = {
          bgCanvas: '#ffffff',
          bgPlot: '#f8fafc',
          borderPlot: '#e2e8f0',
          gridLines: 'rgba(148, 163, 184, 0.2)',
          zeroLine: 'rgba(15, 23, 42, 0.45)',
          axisText: '#475569',
          titleText: '#0f172a',
          emptyText: '#64748b'
        };
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
      this.width = rect.width || this.canvas.width || 600;
      this.height = rect.height || this.canvas.height || 280;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }

    reset() {
      this.dataPoints = [];
      this.draw();
    }

    record(time, state) {
      this.dataPoints.push({
        t: time,
        y1: state.y1,
        y2: state.y2,
        v1: state.v1,
        v2: state.v2,
        T: state.T,
        N1: state.N1,
        isSlack: state.isSlack
      });

      // Keep up to 25 seconds of dense data
      const cutoff = time - 25;
      if (this.dataPoints.length > 1500) {
        this.dataPoints = this.dataPoints.filter(p => p.t >= cutoff);
      }
    }

    setActiveTab(tab) {
      this.activeTab = tab;
      this.draw();
    }

    exportCSV() {
      if (this.dataPoints.length === 0) return null;
      let csv = 'Time (s),y1 (m),y2 (m),v1 (m/s),v2 (m/s),Tension (N),Normal1 (N),isSlack\n';
      for (const p of this.dataPoints) {
        csv += `${p.t.toFixed(3)},${p.y1.toFixed(3)},${p.y2.toFixed(3)},${p.v1.toFixed(3)},${p.v2.toFixed(3)},${p.T.toFixed(3)},${p.N1.toFixed(3)},${p.isSlack ? 1 : 0}\n`;
      }
      return csv;
    }

    draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = this.colors.bgCanvas;
      ctx.fillRect(0, 0, w, h);

      if (this.dataPoints.length < 2) {
        ctx.font = '600 13px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = this.colors.emptyText;
        ctx.textAlign = 'center';
        ctx.fillText('הפעל את הסימולציה כדי להציג גרפים בזמן אמת', w / 2, h / 2);
        return;
      }

      const latestT = this.dataPoints[this.dataPoints.length - 1].t;
      const minT = Math.max(0, latestT - this.maxDuration);
      const visibleData = this.dataPoints.filter(p => p.t >= minT);

      if (this.activeTab === 'all') {
        const gap = 12;
        const subH = (h - gap * 4) / 3;

        // Subplot 1: y(t)
        this.drawSubPlot({
          x: 48, y: 10, w: w - 65, h: subH,
          title: 'מיקום y [מטרים]',
          data: visibleData,
          minT, maxT: Math.max(minT + 2, latestT),
          series: [
            { key: 'y1', label: 'גוף 1 (y₁)', color: '#2563eb' },
            { key: 'y2', label: 'גוף 2 (y₂)', color: '#ea580c' }
          ],
          yUnit: 'm'
        });

        // Subplot 2: v(t)
        this.drawSubPlot({
          x: 48, y: 10 + subH + gap, w: w - 65, h: subH,
          title: 'מהירות v [מטר/שנייה]',
          data: visibleData,
          minT, maxT: Math.max(minT + 2, latestT),
          series: [
            { key: 'v1', label: 'גוף 1 (v₁)', color: '#2563eb' },
            { key: 'v2', label: 'גוף 2 (v₂)', color: '#ea580c' }
          ],
          yUnit: 'm/s'
        });

        // Subplot 3: Forces T, N
        this.drawSubPlot({
          x: 48, y: 10 + (subH + gap) * 2, w: w - 65, h: subH,
          title: 'כוחות: מתיחות T ונורמל N₁ [ניוטון]',
          data: visibleData,
          minT, maxT: Math.max(minT + 2, latestT),
          series: [
            { key: 'T', label: 'מתיחות (T)', color: '#16a34a' },
            { key: 'N1', label: 'נורמל על גוף 1 (N₁)', color: '#9333ea' }
          ],
          yUnit: 'N'
        });
      } else if (this.activeTab === 'pos') {
        this.drawSubPlot({
          x: 55, y: 18, w: w - 75, h: h - 45,
          title: 'גרף מקום - זמן: y₁(t), y₂(t) [מטרים]',
          data: visibleData,
          minT, maxT: Math.max(minT + 2, latestT),
          series: [
            { key: 'y1', label: 'גוף 1 (y₁)', color: '#2563eb' },
            { key: 'y2', label: 'גוף 2 (y₂)', color: '#ea580c' }
          ],
          yUnit: 'm'
        });
      } else if (this.activeTab === 'vel') {
        this.drawSubPlot({
          x: 55, y: 18, w: w - 75, h: h - 45,
          title: 'גרף מהירות - זמן: v₁(t), v₂(t) [מטר/שנייה]',
          data: visibleData,
          minT, maxT: Math.max(minT + 2, latestT),
          series: [
            { key: 'v1', label: 'גוף 1 (v₁)', color: '#2563eb' },
            { key: 'v2', label: 'גוף 2 (v₂)', color: '#ea580c' }
          ],
          yUnit: 'm/s'
        });
      } else if (this.activeTab === 'force') {
        this.drawSubPlot({
          x: 55, y: 18, w: w - 75, h: h - 45,
          title: 'גרף כוחות - זמן: מתיחות T(t) ונורמל N₁(t) [ניוטון]',
          data: visibleData,
          minT, maxT: Math.max(minT + 2, latestT),
          series: [
            { key: 'T', label: 'מתיחות חוט (T)', color: '#16a34a' },
            { key: 'N1', label: 'כוח נורמלי קרקע (N₁)', color: '#9333ea' }
          ],
          yUnit: 'N'
        });
      }
    }

    drawSubPlot(cfg) {
      const { x, y, w, h, title, data, minT, maxT, series, yUnit } = cfg;
      const ctx = this.ctx;

      // Find Y min & max
      let minY = Infinity;
      let maxY = -Infinity;

      for (const p of data) {
        for (const s of series) {
          const val = p[s.key];
          if (val < minY) minY = val;
          if (val > maxY) maxY = val;
        }
      }

      if (minY === Infinity) {
        minY = 0;
        maxY = 10;
      }

      // Add margins & avoid zero range
      if (maxY - minY < 0.1) {
        maxY += 1;
        minY -= 1;
      }
      const ySpan = maxY - minY;
      const yMinPadded = minY - ySpan * 0.08;
      const yMaxPadded = maxY + ySpan * 0.08;

      // Coordinate transformers
      const toScreenX = (t) => x + ((t - minT) / (maxT - minT)) * w;
      const toScreenY = (val) => y + h - ((val - yMinPadded) / (yMaxPadded - yMinPadded)) * h;

      // Subplot Background
      ctx.fillStyle = this.colors.bgPlot;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = this.colors.borderPlot;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Grid Lines
      ctx.strokeStyle = this.colors.gridLines;
      ctx.lineWidth = 1;
      const yTicks = 4;
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = this.colors.axisText;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= yTicks; i++) {
        const val = yMinPadded + (i / yTicks) * (yMaxPadded - yMinPadded);
        const sy = toScreenY(val);
        ctx.beginPath();
        ctx.moveTo(x, sy);
        ctx.lineTo(x + w, sy);
        ctx.stroke();

        ctx.fillText(`${val.toFixed(1)} ${yUnit}`, x - 5, sy);
      }

      // Zero Y axis line if visible
      if (yMinPadded <= 0 && yMaxPadded >= 0) {
        const zeroY = toScreenY(0);
        ctx.strokeStyle = this.colors.zeroLine;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, zeroY);
        ctx.lineTo(x + w, zeroY);
        ctx.stroke();
      }

      // Time X axis labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const xTicks = 4;
      for (let i = 0; i <= xTicks; i++) {
        const tVal = minT + (i / xTicks) * (maxT - minT);
        const sx = toScreenX(tVal);
        ctx.fillText(`${tVal.toFixed(1)}s`, sx, y + h + 3);
      }

      // Title at top left of subplot
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = this.colors.titleText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, x + 8, y + 6);

      // Legend series at top right
      let legendX = x + w - 10;
      ctx.textAlign = 'right';
      for (let i = series.length - 1; i >= 0; i--) {
        const s = series[i];
        const lastVal = data.length > 0 ? data[data.length - 1][s.key].toFixed(2) : '--';
        const text = `${s.label}: ${lastVal} ${yUnit}`;

        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = s.color;
        ctx.fillText(text, legendX, y + 6);

        const textW = ctx.measureText(text).width;
        // Dot indicator
        ctx.beginPath();
        ctx.arc(legendX - textW - 6, y + 11, 3.5, 0, Math.PI * 2);
        ctx.fill();

        legendX -= (textW + 24);
      }

      // Plot Series Curves
      for (const s of series) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < data.length; i++) {
          const p = data[i];
          const px = toScreenX(p.t);
          const py = toScreenY(p[s.key]);

          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }
    }
  }

  return { AtwoodCharts };
});
