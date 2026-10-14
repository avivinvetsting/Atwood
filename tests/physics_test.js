const assert = require('assert');
const { AtwoodSimulation } = require('../physics.js');

console.log('🧪 Starting Atwood Machine Physics Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

// ----------------------------------------------------------------------
// Test 1: Classic airborne acceleration & tension
// ----------------------------------------------------------------------
test('Classic Atwood: m1=3kg, m2=1kg, g=10m/s^2', () => {
  const sim = new AtwoodSimulation({
    m1: 3,
    m2: 1,
    g: 10,
    pulleyHeight: 10,
    stringLength: 10,
    initY1: 5,
    initV1: 0
  });

  // maxAllowedSum = 20 - 10 = 10.
  // initY1 = 5, so initY2 = 5. Both airborne!
  assert.strictEqual(sim.y1, 5);
  assert.strictEqual(sim.y2, 5);
  assert.strictEqual(sim.isSlack, false);

  // Theoretical:
  // a = (3 - 1) / (3 + 1) * 10 = 2/4 * 10 = 5 m/s^2 (m1 down: a1 = -5, m2 up: a2 = 5)
  // T = 2 * 3 * 1 / (3 + 1) * 10 = 6/4 * 10 = 15 N
  assert.strictEqual(sim.a1, -5);
  assert.strictEqual(sim.a2, 5);
  assert.strictEqual(sim.T, 15);
  assert.strictEqual(sim.N1, 0);
  assert.strictEqual(sim.N2, 0);

  // Advance by 0.2s
  sim.step(0.2);
  // v1 should be approximately -5 * 0.2 = -1.0 m/s
  // v2 should be approximately 5 * 0.2 = 1.0 m/s
  assert.ok(Math.abs(sim.v1 - (-1.0)) < 0.02, `v1 was ${sim.v1}, expected ~ -1.0`);
  assert.ok(Math.abs(sim.v2 - 1.0) < 0.02, `v2 was ${sim.v2}, expected ~ 1.0`);
  assert.strictEqual(sim.T, 15);
});

// ----------------------------------------------------------------------
// Test 2: Static Equilibrium on ground with normal force
// ----------------------------------------------------------------------
test('Static Equilibrium on Ground: m1=4kg on ground (y1=0), m2=2kg airborne, g=10', () => {
  const sim = new AtwoodSimulation({
    m1: 4,
    m2: 2,
    g: 10,
    pulleyHeight: 8,
    stringLength: 10,
    initY1: 0, // on ground
    initV1: 0
  });

  // maxAllowedSum = 16 - 10 = 6. initY2 = 6.
  assert.strictEqual(sim.y1, 0);
  assert.strictEqual(sim.y2, 6);
  assert.strictEqual(sim.stateType, 'EQUILIBRIUM_1');
  assert.strictEqual(sim.a1, 0);
  assert.strictEqual(sim.a2, 0);
  assert.strictEqual(sim.v1, 0);
  assert.strictEqual(sim.v2, 0);

  // Tension should balance suspended mass 2: T = m2 * g = 2 * 10 = 20 N
  assert.strictEqual(sim.T, 20);

  // Normal force on ground: N1 = m1*g - T = 40 - 20 = 20 N
  assert.strictEqual(sim.N1, 20);
  assert.strictEqual(sim.N2, 0);

  // Step 1 second: should remain completely stationary in equilibrium
  sim.step(1.0);
  assert.strictEqual(sim.y1, 0);
  assert.strictEqual(sim.y2, 6);
  assert.strictEqual(sim.v1, 0);
  assert.strictEqual(sim.v2, 0);
  assert.strictEqual(sim.T, 20);
  assert.strictEqual(sim.N1, 20);
});

// ----------------------------------------------------------------------
// Test 3: Lift-off from ground when suspended mass is heavier
// ----------------------------------------------------------------------
test('Lift-off from Ground: m1=1kg on ground (y1=0), m2=3kg airborne, g=10', () => {
  const sim = new AtwoodSimulation({
    m1: 1,
    m2: 3,
    g: 10,
    pulleyHeight: 8,
    stringLength: 10,
    initY1: 0,
    initV1: 0
  });

  // m2 is heavier (3kg > 1kg), so m1 must lift off!
  // a1 = (3 - 1)/(1 + 3) * 10 = 5 m/s^2 (upward)
  // a2 = -5 m/s^2 (downward)
  // N1 = 0
  assert.strictEqual(sim.stateType, 'LIFT_OFF');
  assert.strictEqual(sim.a1, 5);
  assert.strictEqual(sim.a2, -5);
  assert.strictEqual(sim.N1, 0);
  assert.strictEqual(sim.T, 15);

  sim.step(0.1);
  assert.ok(sim.y1 > 0, `m1 should have lifted off: y1 = ${sim.y1}`);
  assert.ok(sim.y2 < 6, `m2 should have lowered: y2 = ${sim.y2}`);
});

// ----------------------------------------------------------------------
// Test 4: Dynamic ground impact and slack string transition (חוט רפוי)
// ----------------------------------------------------------------------
test('Ground Impact & Slack String: m1 hits ground, T drops to 0, m2 free fall', () => {
  const sim = new AtwoodSimulation({
    m1: 3,
    m2: 1,
    g: 10,
    pulleyHeight: 8,
    stringLength: 10,
    initY1: 1.0, // starts close to ground
    initV1: 0
  });

  // Step until m1 reaches ground
  let stepped = 0;
  while (sim.y1 > 0 && stepped < 200) {
    sim.step(0.01);
    stepped++;
  }

  // m1 has hit the ground!
  assert.strictEqual(sim.y1, 0);
  assert.strictEqual(sim.v1, 0);

  // m2 should have an upward velocity and string should be SLACK
  assert.ok(sim.v2 > 0, `m2 upward velocity after impact was ${sim.v2}`);
  assert.strictEqual(sim.isSlack, true);
  assert.strictEqual(sim.T, 0, 'Tension must be 0 when slack');
  assert.strictEqual(sim.a2, -10, 'm2 acceleration must be free fall -g = -10');
  assert.strictEqual(sim.N1, 30, 'Normal force on m1 must be full weight m1*g = 30N');

  // Next step in slack free fall:
  const vBefore = sim.v2;
  sim.step(0.05);
  assert.strictEqual(sim.isSlack, true);
  assert.strictEqual(sim.T, 0);
  assert.ok(Math.abs(sim.v2 - (vBefore - 10 * 0.05)) < 0.01, 'm2 decelerates at -g');
});

// ----------------------------------------------------------------------
// Test 5: Initial Velocity Support (מהירות התחלתית)
// ----------------------------------------------------------------------
test('Initial Velocity: Equal masses m1=2kg, m2=2kg with initV1 = -3m/s', () => {
  const sim = new AtwoodSimulation({
    m1: 2,
    m2: 2,
    g: 10,
    pulleyHeight: 10,
    stringLength: 10,
    initY1: 5,
    initV1: -3
  });

  // Equal masses: a = 0 (constant velocity motion!)
  assert.strictEqual(sim.a1, 0);
  assert.strictEqual(sim.a2, 0);
  assert.strictEqual(sim.T, 20); // T = mg = 20N
  assert.strictEqual(sim.v1, -3);
  assert.strictEqual(sim.v2, 3);

  sim.step(0.5);
  // After 0.5s at constant velocity:
  // y1 should be 5 - 3 * 0.5 = 3.5m
  // y2 should be 5 + 3 * 0.5 = 6.5m
  assert.ok(Math.abs(sim.y1 - 3.5) < 0.01, `y1 was ${sim.y1}`);
  assert.ok(Math.abs(sim.y2 - 6.5) < 0.01, `y2 was ${sim.y2}`);
});

// ----------------------------------------------------------------------
// Test 6: Symmetrical Ground Impact: m2 hits ground, m1 free falls
// ----------------------------------------------------------------------
test('Symmetrical Impact: m2 hits ground, m1 enters free fall (slack string)', () => {
  const sim = new AtwoodSimulation({
    m1: 1,
    m2: 3,
    g: 10,
    pulleyHeight: 8,
    stringLength: 10,
    initY1: 5.0,
    initV1: 0
  });

  // m2 is heavier (3kg), so m2 accelerates down towards ground
  let stepped = 0;
  while (sim.y2 > 0 && stepped < 300) {
    sim.step(0.01);
    stepped++;
  }

  assert.strictEqual(sim.y2, 0);
  assert.strictEqual(sim.v2, 0);
  assert.strictEqual(sim.isSlack, true);
  assert.strictEqual(sim.T, 0);
  assert.ok(sim.v1 > 0, `m1 upward velocity after impact was ${sim.v1}`);
  assert.strictEqual(sim.a1, -10, 'm1 must be in free fall -g = -10');
  assert.strictEqual(sim.N2, 30, 'Normal force on m2 must be 30N');
});

// ----------------------------------------------------------------------
// Test 7: Multi-cycle dynamic bounce: m1 hits ground, m2 flies up, falls, retightens
// ----------------------------------------------------------------------
test('Multi-cycle: m1 hits ground, slack string, m2 rises to peak, falls and retightens', () => {
  const sim = new AtwoodSimulation({
    m1: 3,
    m2: 1,
    g: 10,
    pulleyHeight: 8,
    stringLength: 10,
    initY1: 1.0,
    initV1: 0
  });

  // Run through impact, slack phase, peak, and retightening
  let hitGround = false;
  let becameSlack = false;
  let retightened = false;

  for (let i = 0; i < 500; i++) {
    sim.step(0.01);
    if (sim.y1 === 0 && !hitGround) hitGround = true;
    if (sim.isSlack) becameSlack = true;
    if (becameSlack && !sim.isSlack && sim.time > 0.8) {
      retightened = true;
      break;
    }
  }

  assert.strictEqual(hitGround, true, 'm1 should hit ground');
  assert.strictEqual(becameSlack, true, 'string should become slack');
  assert.strictEqual(retightened, true, 'string should retighten after m2 falls back');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🎉 ALL RIGOROUS PHYSICS TESTS PASSED PERFECTLY!\n');
}

