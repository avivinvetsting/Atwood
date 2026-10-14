/**
 * app.js - Main Application Controller
 * Handles user interface events, presets, inputs, animation loop, and CSV export.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const simCanvas = document.getElementById('simCanvas');
  const graphCanvas = document.getElementById('graphCanvas');

  // Control Buttons
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const btnGround1 = document.getElementById('btnGround1');
  const btnGround2 = document.getElementById('btnGround2');
  const btnExportCSV = document.getElementById('btnExportCSV');

  // Speed selection
  const speedSelect = document.getElementById('speedSelect');

  // Input Sliders & Number Fields
  const inputM1 = document.getElementById('inputM1');
  const sliderM1 = document.getElementById('sliderM1');
  const inputM2 = document.getElementById('inputM2');
  const sliderM2 = document.getElementById('sliderM2');

  const inputY1 = document.getElementById('inputY1');
  const sliderY1 = document.getElementById('sliderY1');

  const inputV1 = document.getElementById('inputV1');
  const sliderV1 = document.getElementById('sliderV1');

  const inputG = document.getElementById('inputG');
  const sliderG = document.getElementById('sliderG');
  const btnG10 = document.getElementById('btnG10');
  const btnG98 = document.getElementById('btnG98');

  // Toggles
  const toggleFBD = document.getElementById('toggleFBD');
  const toggleRuler = document.getElementById('toggleRuler');

  // Readouts
  const valTime = document.getElementById('valTime');
  const valY1 = document.getElementById('valY1');
  const valY2 = document.getElementById('valY2');
  const valV1 = document.getElementById('valV1');
  const valV2 = document.getElementById('valV2');
  const valA1 = document.getElementById('valA1');
  const valA2 = document.getElementById('valA2');
  const valT = document.getElementById('valT');
  const valN1 = document.getElementById('valN1');
  const valStateBadge = document.getElementById('valStateBadge');

  // Theory formulas
  const formulaBoxA = document.getElementById('formulaBoxA');
  const formulaBoxT = document.getElementById('formulaBoxT');

  // Graph tab buttons
  const tabAll = document.getElementById('tabAll');
  const tabPos = document.getElementById('tabPos');
  const tabVel = document.getElementById('tabVel');
  const tabForce = document.getElementById('tabForce');

  // Presets
  const presetButtons = document.querySelectorAll('.preset-btn');

  // Physics Simulation Instance
  const sim = new AtwoodPhysics.AtwoodSimulation({
    m1: 3.0,
    m2: 1.0,
    g: 10.0,
    pulleyHeight: 8.0,
    stringLength: 10.0,
    initY1: 2.0,
    initV1: 0.0
  });

  // Renderer & Charts Instances (Light theme default - bright and clear)
  const renderer = new AtwoodRenderer.AtwoodRenderer(simCanvas, sim, {
    theme: 'light',
    showFBD: true,
    showRuler: true
  });

  const charts = new AtwoodCharts.AtwoodCharts(graphCanvas, {
    theme: 'light'
  });

  // App State
  let isRunning = false;
  let speedMultiplier = 1.0;
  let lastTimestamp = 0;

  // Window resize handler
  function handleResize() {
    renderer.resize();
    charts.resize();
    renderer.draw();
    charts.draw();
  }
  window.addEventListener('resize', handleResize);

  // Update UI Inputs to reflect Simulation Parameters
  function syncInputsFromSim() {
    inputM1.value = sim.m1.toFixed(1);
    sliderM1.value = sim.m1;

    inputM2.value = sim.m2.toFixed(1);
    sliderM2.value = sim.m2;

    inputY1.value = sim.initY1.toFixed(1);
    sliderY1.value = sim.initY1;

    inputV1.value = sim.initV1.toFixed(1);
    sliderV1.value = sim.initV1;

    inputG.value = sim.g.toFixed(1);
    sliderG.value = sim.g;

    updateTheoreticalBoxes();
  }

  // Update Theoretical Boxes
  function updateTheoreticalBoxes() {
    const th = sim.getTheoretical();
    if (formulaBoxA) {
      formulaBoxA.innerHTML = `\\( a = \\frac{m_1 - m_2}{m_1 + m_2} g = \\frac{${sim.m1.toFixed(1)} - ${sim.m2.toFixed(1)}}{${(sim.m1 + sim.m2).toFixed(1)}} \\cdot ${sim.g.toFixed(1)} = \\mathbf{${th.acceleration.toFixed(2)}} \\text{ m/s}^2 \\)`;
    }
    if (formulaBoxT) {
      formulaBoxT.innerHTML = `\\( T = \\frac{2 m_1 m_2}{m_1 + m_2} g = \\frac{2 \\cdot ${sim.m1.toFixed(1)} \\cdot ${sim.m2.toFixed(1)}}{${(sim.m1 + sim.m2).toFixed(1)}} \\cdot ${sim.g.toFixed(1)} = \\mathbf{${th.tension.toFixed(2)}} \\text{ N} \\)`;
    }
    if (window.renderMathInElement) {
      window.renderMathInElement(document.getElementById('theorySection'));
    }
  }

  // Update Live Numerical Readouts
  function updateReadouts() {
    valTime.textContent = `${sim.time.toFixed(2)} s`;
    valY1.textContent = `${sim.y1.toFixed(2)} m`;
    valY2.textContent = `${sim.y2.toFixed(2)} m`;
    valV1.textContent = `${sim.v1.toFixed(2)} m/s`;
    valV2.textContent = `${sim.v2.toFixed(2)} m/s`;
    valA1.textContent = `${sim.a1.toFixed(2)} m/s²`;
    valA2.textContent = `${sim.a2.toFixed(2)} m/s²`;
    valT.textContent = `${sim.T.toFixed(1)} N`;
    valN1.textContent = `${sim.N1.toFixed(1)} N`;

    // State Badge
    if (sim.isSlack) {
      valStateBadge.className = 'status-badge status-slack';
      valStateBadge.textContent = '⚠️ חוט רפוי (T = 0 N) | זריקה אנכית / נפילה חופשית';
    } else if (sim.stateType.includes('EQUILIBRIUM')) {
      valStateBadge.className = 'status-badge status-equilibrium';
      valStateBadge.textContent = '⚖️ שיווי משקל סטטי (a = 0) | קיים כוח נורמלי';
    } else if (sim.stateType === 'LIFT_OFF') {
      valStateBadge.className = 'status-badge status-liftoff';
      valStateBadge.textContent = '🚀 התרוממות מהקרקע!';
    } else {
      valStateBadge.className = 'status-badge status-taut';
      valStateBadge.textContent = '🔄 תנועה מואצת (חוט מתוח)';
    }
  }

  // Animation Loop
  function animationStep(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const elapsedSec = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    if (isRunning) {
      const dt = elapsedSec * speedMultiplier;
      sim.step(dt);
      charts.record(sim.time, {
        y1: sim.y1,
        y2: sim.y2,
        v1: sim.v1,
        v2: sim.v2,
        T: sim.T,
        N1: sim.N1,
        isSlack: sim.isSlack
      });
    }

    renderer.draw();
    if (isRunning) {
      charts.draw();
      updateReadouts();
    }

    requestAnimationFrame(animationStep);
  }

  // Control Handlers
  function setPlayState(play) {
    isRunning = play;
    btnPlayPause.innerHTML = isRunning
      ? '<span class="icon">⏸️</span> השהה'
      : '<span class="icon">▶️</span> הפעל';
    btnPlayPause.classList.toggle('btn-primary', !isRunning);
    btnPlayPause.classList.toggle('btn-warning', isRunning);
  }

  btnPlayPause.addEventListener('click', () => {
    setPlayState(!isRunning);
  });

  btnStep.addEventListener('click', () => {
    setPlayState(false);
    sim.step(0.05);
    charts.record(sim.time, {
      y1: sim.y1,
      y2: sim.y2,
      v1: sim.v1,
      v2: sim.v2,
      T: sim.T,
      N1: sim.N1,
      isSlack: sim.isSlack
    });
    renderer.draw();
    charts.draw();
    updateReadouts();
  });

  btnReset.addEventListener('click', () => {
    setPlayState(false);
    sim.reset();
    charts.reset();
    renderer.draw();
    charts.draw();
    updateReadouts();
  });

  speedSelect.addEventListener('change', (e) => {
    speedMultiplier = parseFloat(e.target.value);
  });

  // Ground placement buttons
  btnGround1.addEventListener('click', () => {
    setPlayState(false);
    inputY1.value = 0;
    sliderY1.value = 0;
    applyConfigFromInputs();
  });

  btnGround2.addEventListener('click', () => {
    setPlayState(false);
    // When mass 2 is on ground, y1 must be maxAllowedSum = 2*H - L
    const maxAllowedSum = 2 * sim.pulleyHeight - sim.stringLength;
    inputY1.value = maxAllowedSum.toFixed(1);
    sliderY1.value = maxAllowedSum;
    applyConfigFromInputs();
  });

  // Synchronize 2-way inputs (Slider <-> Number input)
  function setupLinkedInput(slider, numberInput, onChange) {
    slider.addEventListener('input', () => {
      numberInput.value = Number(slider.value).toFixed(1);
      onChange();
    });
    numberInput.addEventListener('change', () => {
      slider.value = numberInput.value;
      onChange();
    });
  }

  function applyConfigFromInputs() {
    const m1 = Math.max(0.1, parseFloat(inputM1.value) || 1.0);
    const m2 = Math.max(0.1, parseFloat(inputM2.value) || 1.0);
    const y1 = Math.max(0, parseFloat(inputY1.value) || 0.0);
    const v1 = parseFloat(inputV1.value) || 0.0;
    const g = Math.max(0, parseFloat(inputG.value) || 10.0);

    sim.setParameters({
      m1,
      m2,
      initY1: y1,
      initV1: v1,
      g,
      pulleyHeight: 8.0,
      stringLength: 10.0
    });

    sim.reset();
    charts.reset();
    renderer.draw();
    charts.draw();
    updateReadouts();
    updateTheoreticalBoxes();
  }

  setupLinkedInput(sliderM1, inputM1, applyConfigFromInputs);
  setupLinkedInput(sliderM2, inputM2, applyConfigFromInputs);
  setupLinkedInput(sliderY1, inputY1, applyConfigFromInputs);
  setupLinkedInput(sliderV1, inputV1, applyConfigFromInputs);
  setupLinkedInput(sliderG, inputG, applyConfigFromInputs);

  btnG10.addEventListener('click', () => {
    inputG.value = '10.0';
    sliderG.value = '10.0';
    applyConfigFromInputs();
  });

  btnG98.addEventListener('click', () => {
    inputG.value = '9.8';
    sliderG.value = '9.8';
    applyConfigFromInputs();
  });

  // Toggles
  toggleFBD.addEventListener('change', (e) => {
    renderer.showFBD = e.target.checked;
    renderer.draw();
  });

  toggleRuler.addEventListener('change', (e) => {
    renderer.showRuler = e.target.checked;
    renderer.draw();
  });

  // Graph Tabs
  const graphTabs = [
    { btn: tabAll, key: 'all' },
    { btn: tabPos, key: 'pos' },
    { btn: tabVel, key: 'vel' },
    { btn: tabForce, key: 'force' }
  ];

  graphTabs.forEach(item => {
    item.btn.addEventListener('click', () => {
      graphTabs.forEach(t => t.btn.classList.remove('active'));
      item.btn.classList.add('active');
      charts.setActiveTab(item.key);
    });
  });

  // Export CSV
  btnExportCSV.addEventListener('click', () => {
    const csvContent = charts.exportCSV();
    if (!csvContent) {
      alert('אין עדיין נתונים מוקלטים לייצוא. הפעל את הסימולציה לכמה שניות תחילה.');
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atwood_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Theme Toggle (Light mode by default, high-contrast and crystal clear)
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  let currentTheme = 'light';

  function setTheme(newTheme) {
    currentTheme = newTheme === 'dark' ? 'dark' : 'light';
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'עיצוב כהה';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'עיצוב בהיר';
    }
    renderer.setTheme(currentTheme);
    charts.setTheme(currentTheme);
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      setTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
  }

  // Presets Handlers
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetId = btn.dataset.preset;
      applyPreset(presetId);
    });
  });

  function applyPreset(id) {
    setPlayState(false);
    switch (id) {
      case 'classic':
        // Classic: m1=3kg, m2=1kg, both in air, v0=0
        inputM1.value = '3.0'; sliderM1.value = '3.0';
        inputM2.value = '1.0'; sliderM2.value = '1.0';
        inputY1.value = '3.0'; sliderY1.value = '3.0';
        inputV1.value = '0.0'; sliderV1.value = '0.0';
        inputG.value = '10.0'; sliderG.value = '10.0';
        break;

      case 'ground_equilibrium':
        // Mass 1 on ground (4kg), mass 2 airborne (2kg). Static equilibrium!
        inputM1.value = '4.0'; sliderM1.value = '4.0';
        inputM2.value = '2.0'; sliderM2.value = '2.0';
        inputY1.value = '0.0'; sliderY1.value = '0.0'; // ON GROUND!
        inputV1.value = '0.0'; sliderV1.value = '0.0';
        inputG.value = '10.0'; sliderG.value = '10.0';
        break;

      case 'ground_impact':
        // m1 starts 1.2m above ground, m1 heavier. Hits ground, string slacks, m2 flies up!
        inputM1.value = '3.0'; sliderM1.value = '3.0';
        inputM2.value = '1.0'; sliderM2.value = '1.0';
        inputY1.value = '1.2'; sliderY1.value = '1.2';
        inputV1.value = '0.0'; sliderV1.value = '0.0';
        inputG.value = '10.0'; sliderG.value = '10.0';
        break;

      case 'liftoff':
        // Mass 1 on ground (1kg), but mass 2 airborne is heavier (3kg). Pulls m1 up!
        inputM1.value = '1.0'; sliderM1.value = '1.0';
        inputM2.value = '3.0'; sliderM2.value = '3.0';
        inputY1.value = '0.0'; sliderY1.value = '0.0';
        inputV1.value = '0.0'; sliderV1.value = '0.0';
        inputG.value = '10.0'; sliderG.value = '10.0';
        break;

      case 'equal_velocity':
        // Equal masses with initial velocity: steady constant velocity motion!
        inputM1.value = '2.0'; sliderM1.value = '2.0';
        inputM2.value = '2.0'; sliderM2.value = '2.0';
        inputY1.value = '3.0'; sliderY1.value = '3.0';
        inputV1.value = '-2.5'; sliderV1.value = '-2.5';
        inputG.value = '10.0'; sliderG.value = '10.0';
        break;

      case 'downward_push':
        // Initial velocity push downwards for m1
        inputM1.value = '2.5'; sliderM1.value = '2.5';
        inputM2.value = '1.5'; sliderM2.value = '1.5';
        inputY1.value = '4.0'; sliderY1.value = '4.0';
        inputV1.value = '-3.0'; sliderV1.value = '-3.0';
        inputG.value = '10.0'; sliderG.value = '10.0';
        break;
    }

    applyConfigFromInputs();
  }

  // Keyboard Shortcuts (Space for Play/Pause, R for Reset, S for Step)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      setPlayState(!isRunning);
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'ר') {
      btnReset.click();
    } else if (e.key === 's' || e.key === 'S' || e.key === 'ד') {
      btnStep.click();
    }
  });

  // Initial setup
  setTheme('light');
  syncInputsFromSim();
  handleResize();
  updateReadouts();
  requestAnimationFrame(animationStep);
});
