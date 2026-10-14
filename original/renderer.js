/**
 * renderer.js - Atwood Machine Canvas Visualizer
 * High-clarity, modern physics simulation visualizer.
 * Supports:
 * - High-contrast Light Theme (default, classroom & projector friendly) and Dark Theme
 * - Ceiling crossbeam, industrial mounting bracket & rotating mechanical pulley
 * - Braided high-contrast rope with realistic animated slack sine waves
 * - 3D styled masses with metallic top hooks and height readouts
 * - Free Body Diagram (FBD) with proportional force arrows (T, mg, N) & high-legibility badges
 * - Laboratory ground floor with measuring grid & live status banner
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AtwoodRenderer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  class AtwoodRenderer {
    constructor(canvas, sim, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.sim = sim;

      this.theme = options.theme || 'light';
      this.showFBD = options.showFBD ?? true;
      this.showRuler = options.showRuler ?? true;
      this.showLabels = options.showLabels ?? true;

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
          bgGradTop: '#090d16',
          bgGradBottom: '#0f172a',
          gridLines: 'rgba(255, 255, 255, 0.04)',
          ground: '#1e293b',
          groundGrass: '#10b981',
          groundText: '#64748b',
          ceiling: '#334155',
          ceilingBorder: '#475569',
          pulleyMount: '#475569',
          pulleyBracket: '#334155',
          pulleyRim: '#94a3b8',
          pulleyGroove: '#1e293b',
          pulleySpoke: '#cbd5e1',
          pulleyAxle: '#f8fafc',
          stringTaut: '#f8fafc',
          stringSlack: '#f59e0b',
          mass1: '#3b82f6',
          mass1Border: '#60a5fa',
          mass2: '#f97316',
          mass2Border: '#fb923c',
          badgeBg: 'rgba(15, 23, 42, 0.92)',
          badgeText: '#f8fafc',
          badgeBorder: '#475569',
          forceTension: '#22c55e',
          forceWeight: '#ef4444',
          forceNormal: '#a855f7',
          ruler: '#475569',
          rulerText: '#94a3b8',
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        };
      } else {
        // High-clarity, elegant Light Theme (No black, bright, crisp)
        this.colors = {
          bgGradTop: '#ffffff',
          bgGradBottom: '#f1f5f9',
          gridLines: 'rgba(100, 116, 139, 0.1)',
          ground: '#e2e8f0',
          groundGrass: '#059669',
          groundText: '#334155',
          ceiling: '#cbd5e1',
          ceilingBorder: '#94a3b8',
          pulleyMount: '#475569',
          pulleyBracket: '#334155',
          pulleyRim: '#475569',
          pulleyGroove: '#1e293b',
          pulleySpoke: '#64748b',
          pulleyAxle: '#1e293b',
          stringTaut: '#0f172a',      // Bold navy/slate string - maximum clarity on light bg
          stringSlack: '#ea580c',     // Vivid orange wavy slack string
          mass1: '#2563eb',           // Vivid Royal Blue
          mass1Border: '#1d4ed8',
          mass2: '#ea580c',           // Vivid Orange / Coral
          mass2Border: '#c2410c',
          badgeBg: '#ffffff',
          badgeText: '#0f172a',
          badgeBorder: '#cbd5e1',
          forceTension: '#16a34a',    // Vibrant green
          forceWeight: '#dc2626',     // Bold crimson red
          forceNormal: '#9333ea',     // Royal purple
          ruler: '#94a3b8',
          rulerText: '#334155',
          shadowColor: 'rgba(15, 23, 42, 0.16)'
        };
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
      this.width = rect.width || this.canvas.width || 600;
      this.height = rect.height || this.canvas.height || 480;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);

      // Coordinate mapping:
      // Real physics: y = 0 (ground) to y = 9m (near top)
      this.groundY = this.height - 48; // pixels from top
      const simH = (this.sim && Number.isFinite(this.sim.pulleyHeight)) ? this.sim.pulleyHeight : 8.0;
      this.meterScale = (this.groundY - 75) / (simH + 0.6); // px per meter
      this.pulleyCenterX = this.width / 2;
      this.pulleyCenterY = this.groundY - simH * this.meterScale;

      const simRadius = (this.sim && Number.isFinite(this.sim.pulleyRadius) && this.sim.pulleyRadius > 0)
        ? this.sim.pulleyRadius
        : 0.45;
      this.pulleyRadiusPx = Math.max(30, simRadius * this.meterScale * 1.5);
    }

    meterToPxY(meter) {
      const safeMeter = Number.isFinite(meter) ? meter : 0;
      return this.groundY - safeMeter * this.meterScale;
    }

    draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const sim = this.sim;

      if (!sim) return;

      const simH = Number.isFinite(sim.pulleyHeight) ? sim.pulleyHeight : 8.0;
      this.pulleyCenterY = this.groundY - simH * this.meterScale;

      const simRadius = (Number.isFinite(sim.pulleyRadius) && sim.pulleyRadius > 0) ? sim.pulleyRadius : 0.45;
      this.pulleyRadiusPx = Math.max(30, simRadius * this.meterScale * 1.5);

      ctx.clearRect(0, 0, w, h);

      this.drawBackground();
      if (this.showRuler) this.drawRuler();
      this.drawCeiling();
      this.drawPulleyMount();
      this.drawStrings();
      this.drawPulley();
      this.drawMasses();
      if (this.showFBD) this.drawFBD();
      this.drawGround();
      this.drawStateBanner();
    }

    drawBackground() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Clean soft gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, this.colors.bgGradTop);
      grad.addColorStop(1, this.colors.bgGradBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle scientific measuring grid
      ctx.strokeStyle = this.colors.gridLines;
      ctx.lineWidth = 1;

      const maxY = Math.ceil(this.sim.pulleyHeight) + 1;
      for (let m = 1; m <= maxY; m++) {
        const py = this.meterToPxY(m);
        if (py >= 25 && py <= this.groundY) {
          ctx.beginPath();
          ctx.moveTo(50, py);
          ctx.lineTo(w - 20, py);
          ctx.stroke();
        }
      }
    }

    drawRuler() {
      const ctx = this.ctx;
      const x = 45;
      const maxY = Math.ceil(this.sim.pulleyHeight) + 1;

      ctx.strokeStyle = this.colors.ruler;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x, this.meterToPxY(maxY));
      ctx.stroke();

      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = this.colors.rulerText;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let m = 0; m <= maxY; m++) {
        const py = this.meterToPxY(m);
        ctx.beginPath();
        ctx.moveTo(x - 6, py);
        ctx.lineTo(x + 6, py);
        ctx.stroke();

        ctx.fillText(`${m}m`, x - 9, py);

        // Subdivisions (0.5m)
        if (m < maxY) {
          const subPy = this.meterToPxY(m + 0.5);
          ctx.beginPath();
          ctx.moveTo(x - 3, subPy);
          ctx.lineTo(x + 3, subPy);
          ctx.stroke();
        }
      }
    }

    drawCeiling() {
      const ctx = this.ctx;
      const ceilingY = 24;

      // Crossbeam body
      ctx.fillStyle = this.colors.ceiling;
      ctx.fillRect(0, 0, this.width, ceilingY);

      // Bottom edge line
      ctx.strokeStyle = this.colors.ceilingBorder;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, ceilingY);
      ctx.lineTo(this.width, ceilingY);
      ctx.stroke();

      // Diagonal hatching stripes
      ctx.strokeStyle = this.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 2;
      for (let x = -20; x < this.width + 40; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, ceilingY);
        ctx.lineTo(x + 14, 0);
        ctx.stroke();
      }
    }

    drawPulleyMount() {
      const ctx = this.ctx;
      const cx = this.pulleyCenterX;
      const cy = this.pulleyCenterY;
      const ceilingY = 24;

      // Hanging bracket rod
      const mountGrad = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
      mountGrad.addColorStop(0, this.colors.pulleyMount);
      mountGrad.addColorStop(0.5, '#64748b');
      mountGrad.addColorStop(1, this.colors.pulleyBracket);

      ctx.fillStyle = mountGrad;
      ctx.fillRect(cx - 7, ceilingY, 14, Math.max(0, cy - ceilingY));

      // Mounting bolts at ceiling
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx - 3, ceilingY + 5, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 3, ceilingY + 5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Triangular bracket head holding axle
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 10);
      ctx.lineTo(cx + 16, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.closePath();
      ctx.fillStyle = this.colors.pulleyBracket;
      ctx.fill();
      ctx.strokeStyle = this.colors.pulleyRim;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    drawPulley() {
      const ctx = this.ctx;
      const cx = this.pulleyCenterX;
      const cy = this.pulleyCenterY;
      const r = this.pulleyRadiusPx;

      ctx.save();
      ctx.translate(cx, cy);

      // Pulley Outer Rim
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.pulleyRim;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.colors.pulleyMount;
      ctx.stroke();

      // Pulley Inner Groove (where the rope sits)
      ctx.beginPath();
      ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.pulleyGroove;
      ctx.fill();

      // Rotating Spokes
      ctx.rotate(this.sim.pulleyAngle || 0);
      ctx.strokeStyle = this.colors.pulleySpoke;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r - 7, 0);
        ctx.stroke();
        ctx.rotate(Math.PI / 2);
      }

      // Center Axle Pin
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.pulleyAxle;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner axle highlight
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      ctx.restore();
    }

    drawStrings() {
      const ctx = this.ctx;
      const sim = this.sim;
      const cx = this.pulleyCenterX;
      const cy = this.pulleyCenterY;
      const r = this.pulleyRadiusPx;

      const x1 = cx - r;
      const y1Px = this.meterToPxY(sim.y1);

      const x2 = cx + r;
      const y2Px = this.meterToPxY(sim.y2);

      // String around pulley top
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = sim.isSlack ? this.colors.stringSlack : this.colors.stringTaut;

      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0, false);
      ctx.stroke();

      // Left string to Mass 1
      const isSlack1 = sim.isSlack && (sim.a1 === -sim.g || sim.T < 0.05);
      this.drawStringLine(x1, cy, x1, y1Px, isSlack1);

      // Right string to Mass 2
      const isSlack2 = sim.isSlack && (sim.a2 === -sim.g || sim.T < 0.05);
      this.drawStringLine(x2, cy, x2, y2Px, isSlack2);
    }

    drawStringLine(x1, y1, x2, y2, isSlackWavy) {
      const ctx = this.ctx;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = isSlackWavy ? this.colors.stringSlack : this.colors.stringTaut;

      if (!isSlackWavy) {
        // Taut straight string with clean line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else {
        // Animated slack sine wave
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const steps = 32;
        const dy = (y2 - y1) / steps;
        const waveAmp = 10;
        const freq = 3;
        const phase = (this.sim.time || 0) * 14;

        for (let i = 1; i <= steps; i++) {
          const cy = y1 + i * dy;
          const decay = Math.sin((i / steps) * Math.PI);
          const cx = x1 + Math.sin((i / steps) * Math.PI * 2 * freq + phase) * waveAmp * decay;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
    }

    getMassDimensions(mass) {
      const safeMass = (Number.isFinite(mass) && mass > 0) ? mass : 2.0;
      const baseSize = 46;
      const scale = Math.pow(safeMass / 2.0, 1 / 3);
      const width = Math.max(38, Math.min(74, baseSize * scale));
      const height = Math.max(34, Math.min(68, baseSize * scale * 0.92));
      return { width, height };
    }

    drawMasses() {
      const ctx = this.ctx;
      const sim = this.sim;
      const cx = this.pulleyCenterX;
      const r = this.pulleyRadiusPx;

      // Mass 1
      const x1 = cx - r;
      const y1Px = this.meterToPxY(sim.y1);
      const dim1 = this.getMassDimensions(sim.m1);
      this.drawSingleMass(
        x1, y1Px, dim1.width, dim1.height,
        'm₁', `${sim.m1.toFixed(1)} kg`,
        this.colors.mass1, this.colors.mass1Border,
        sim.y1,
        '#2563eb'
      );

      // Mass 2
      const x2 = cx + r;
      const y2Px = this.meterToPxY(sim.y2);
      const dim2 = this.getMassDimensions(sim.m2);
      this.drawSingleMass(
        x2, y2Px, dim2.width, dim2.height,
        'm₂', `${sim.m2.toFixed(1)} kg`,
        this.colors.mass2, this.colors.mass2Border,
        sim.y2,
        '#ea580c'
      );
    }

    drawSingleMass(centerX, topY, w, h, label, massText, fillColor, strokeColor, meterY, accentColor) {
      const ctx = this.ctx;
      const left = centerX - w / 2;
      const top = topY;
      const corner = 8;

      // 3D Drop Shadow
      ctx.save();
      ctx.shadowColor = this.colors.shadowColor;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      // Rounded mass block with subtle gradient
      const massGrad = ctx.createLinearGradient(left, top, left + w, top + h);
      massGrad.addColorStop(0, fillColor);
      massGrad.addColorStop(1, strokeColor);

      ctx.beginPath();
      ctx.roundRect(left, top, w, h, corner);
      ctx.fillStyle = massGrad;
      ctx.fill();
      ctx.restore();

      // Mass border
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();

      // Top specular highlight line
      ctx.beginPath();
      ctx.roundRect(left + 2, top + 2, w - 4, 3, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      // Top Hanging Loop / Hook
      ctx.beginPath();
      ctx.arc(centerX, top - 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center hole of hook
      ctx.beginPath();
      ctx.arc(centerX, top - 5, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.bgGradTop;
      ctx.fill();

      // Label text (m1 / m2)
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, centerX, top + h * 0.36);

      // Mass text (kg)
      ctx.font = '600 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(massText, centerX, top + h * 0.72);

      // Height Badge Underneath
      if (this.showLabels) {
        const badgeText = `y = ${meterY.toFixed(2)}m`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        const metrics = ctx.measureText(badgeText);
        const bW = metrics.width + 12;
        const bH = 18;
        const bX = centerX - bW / 2;
        const bY = top + h + 8;

        // Pill shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = this.colors.badgeBg;
        ctx.beginPath();
        ctx.roundRect(bX, bY, bW, bH, 9);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = this.colors.badgeBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = this.colors.badgeText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, centerX, bY + bH / 2);
      }
    }

    drawFBD() {
      const ctx = this.ctx;
      const sim = this.sim;
      const cx = this.pulleyCenterX;
      const r = this.pulleyRadiusPx;

      const x1 = cx - r;
      const y1Px = this.meterToPxY(sim.y1);
      const dim1 = this.getMassDimensions(sim.m1);

      const x2 = cx + r;
      const y2Px = this.meterToPxY(sim.y2);
      const dim2 = this.getMassDimensions(sim.m2);

      // Force scale (pixels per Newton)
      const forceScale = 1.85;

      // --- Body 1 Forces ---
      const center1Y = y1Px + dim1.height / 2;

      // Tension T on m1 (Upward)
      if (sim.T > 0.05) {
        const lenT = Math.max(22, sim.T * forceScale);
        this.drawVectorArrow(
          x1 - 12, center1Y,
          x1 - 12, center1Y - lenT,
          this.colors.forceTension,
          `T = ${sim.T.toFixed(1)} N`,
          'left'
        );
      }

      // Weight W1 on m1 (Downward)
      const w1 = sim.m1 * sim.g;
      const lenW1 = Math.max(22, w1 * forceScale);
      this.drawVectorArrow(
        x1 + 12, center1Y,
        x1 + 12, center1Y + lenW1,
        this.colors.forceWeight,
        `W₁ = ${w1.toFixed(1)} N`,
        'right'
      );

      // Normal force N1 on m1 (Upward from ground)
      if (sim.N1 > 0.05) {
        const lenN1 = Math.max(20, sim.N1 * forceScale);
        this.drawVectorArrow(
          x1 + 26, y1Px + dim1.height,
          x1 + 26, y1Px + dim1.height - lenN1,
          this.colors.forceNormal,
          `N₁ = ${sim.N1.toFixed(1)} N`,
          'right'
        );
      }

      // --- Body 2 Forces ---
      const center2Y = y2Px + dim2.height / 2;

      // Tension T on m2 (Upward)
      if (sim.T > 0.05) {
        const lenT = Math.max(22, sim.T * forceScale);
        this.drawVectorArrow(
          x2 + 12, center2Y,
          x2 + 12, center2Y - lenT,
          this.colors.forceTension,
          `T = ${sim.T.toFixed(1)} N`,
          'right'
        );
      }

      // Weight W2 on m2 (Downward)
      const w2 = sim.m2 * sim.g;
      const lenW2 = Math.max(22, w2 * forceScale);
      this.drawVectorArrow(
        x2 - 12, center2Y,
        x2 - 12, center2Y + lenW2,
        this.colors.forceWeight,
        `W₂ = ${w2.toFixed(1)} N`,
        'left'
      );

      // Normal force N2 on m2 (Upward from ground)
      if (sim.N2 > 0.05) {
        const lenN2 = Math.max(20, sim.N2 * forceScale);
        this.drawVectorArrow(
          x2 - 26, y2Px + dim2.height,
          x2 - 26, y2Px + dim2.height - lenN2,
          this.colors.forceNormal,
          `N₂ = ${sim.N2.toFixed(1)} N`,
          'left'
        );
      }
    }

    drawVectorArrow(fromX, fromY, toX, toY, color, label, align = 'right') {
      const ctx = this.ctx;
      const headLen = 9;
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.5;

      // Arrow shaft
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // High-Contrast Force Badge Bubble
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(label);
      const textW = textMetrics.width + 10;
      const textH = 18;
      const offsetX = align === 'right' ? 8 : -(textW + 8);
      const labelX = toX + offsetX;
      const labelY = (fromY + toY) / 2 - textH / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = this.colors.badgeBg;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, textW, textH, 4);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX + 5, labelY + textH / 2);

      ctx.restore();
    }

    drawGround() {
      const ctx = this.ctx;
      const gy = this.groundY;
      const h = this.height - gy;

      // Ground floor body
      ctx.fillStyle = this.colors.ground;
      ctx.fillRect(0, gy, this.width, h);

      // Crisp grass / top surface trim line
      ctx.fillStyle = this.colors.groundGrass;
      ctx.fillRect(0, gy, this.width, 4);

      // Floor texture
      ctx.strokeStyle = this.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 2;
      for (let x = -20; x < this.width + 40; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, gy + 4);
        ctx.lineTo(x + 14, gy + h);
        ctx.stroke();
      }

      // Ground Label Badge
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = this.colors.groundText;
      ctx.textAlign = 'left';
      ctx.fillText('קרקע (y = 0.00m)', 65, gy + 24);
    }

    drawStateBanner() {
      const ctx = this.ctx;
      const sim = this.sim;

      let badgeBg = this.theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)';
      let badgeBorder = '#94a3b8';
      let badgeColor = '#334155';
      let icon = 'ℹ️';

      if (sim.isSlack) {
        badgeBg = this.theme === 'dark' ? 'rgba(234, 88, 12, 0.25)' : '#fff7ed';
        badgeBorder = '#ea580c';
        badgeColor = '#c2410c';
        icon = '⚠️ חוט רפוי (T = 0 N) | זריקה אנכית / נפילה חופשית';
      } else if (sim.stateType && sim.stateType.includes('EQUILIBRIUM')) {
        badgeBg = this.theme === 'dark' ? 'rgba(14, 165, 233, 0.25)' : '#f0f9ff';
        badgeBorder = '#0284c7';
        badgeColor = '#0369a1';
        icon = '⚖️ שיווי משקל סטטי (a = 0) | קיים כוח נורמלי מהקרקע';
      } else if (sim.stateType === 'LIFT_OFF') {
        badgeBg = this.theme === 'dark' ? 'rgba(168, 85, 247, 0.25)' : '#faf5ff';
        badgeBorder = '#9333ea';
        badgeColor = '#7e22ce';
        icon = '🚀 התרוממות מהקרקע!';
      } else if (sim.stateType === 'TAUT_MOTION') {
        badgeBg = this.theme === 'dark' ? 'rgba(34, 197, 94, 0.25)' : '#f0fdf4';
        badgeBorder = '#16a34a';
        badgeColor = '#15803d';
        icon = '🔄 תנועה מואצת משותפת (חוט מתוח)';
      }

      const text = `${icon} - ${sim.stateDescription || ''}`;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(text);
      const boxW = textMetrics.width + 26;
      const boxH = 28;
      const boxX = this.width / 2 - boxW / 2;
      const boxY = this.height - 38;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 14);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = badgeBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.width / 2, boxY + boxH / 2);
    }
  }

  return { AtwoodRenderer };
});
