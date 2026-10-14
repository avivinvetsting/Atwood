/**
 * physics.js - Atwood Machine Physics Engine
 * Handles full Newtonian mechanics of two bodies connected by a string over an ideal pulley:
 * - Both airborne & taut string (coupled acceleration, tension)
 * - Dynamic ground collision & inelastic stop
 * - Slack string detection (T = 0, free vertical projectile motion a = -g)
 * - Retightening impulse (conservation of momentum along string)
 * - Static equilibrium with normal force N when resting on ground
 * - Initial velocities in either direction
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AtwoodPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const cleanZero = (val) => (Object.is(val, -0) ? 0 : val);

  class AtwoodSimulation {
    constructor(options = {}) {
      this.setParameters(options);
      this.reset();
    }

    setParameters(options = {}) {
      this.m1 = options.m1 !== undefined ? Math.max(0.01, Number(options.m1)) : 3.0; // kg
      this.m2 = options.m2 !== undefined ? Math.max(0.01, Number(options.m2)) : 1.0; // kg
      this.g = options.g !== undefined ? Math.max(0, Number(options.g)) : 10.0;      // m/s^2
      this.pulleyHeight = options.pulleyHeight !== undefined ? Number(options.pulleyHeight) : 8.0; // m
      this.stringLength = options.stringLength !== undefined ? Number(options.stringLength) : 10.0; // m
      this.pulleyRadius = options.pulleyRadius !== undefined ? Math.max(0.1, Number(options.pulleyRadius)) : 0.45; // m
      
      this.initY1 = options.initY1 !== undefined ? Math.max(0, Number(options.initY1)) : 2.0;
      this.initV1 = options.initV1 !== undefined ? Number(options.initV1) : 0.0;
      
      const maxAllowedSum = 2 * this.pulleyHeight - this.stringLength;

      if (options.initY2 !== undefined) {
        this.initY2 = Math.max(0, Number(options.initY2));
      } else {
        this.initY2 = Math.max(0, maxAllowedSum - this.initY1);
      }

      if (options.initV2 !== undefined) {
        this.initV2 = Number(options.initV2);
      } else {
        const isTautAtStart = Math.abs((this.initY1 + this.initY2) - maxAllowedSum) < 1e-3;
        this.initV2 = isTautAtStart ? -this.initV1 : 0.0;
      }
    }

    reset() {
      this.time = 0;
      this.y1 = this.initY1;
      this.y2 = this.initY2;
      this.v1 = this.initV1;
      this.v2 = this.initV2;
      this.a1 = 0;
      this.a2 = 0;
      this.T = 0;
      this.N1 = 0;
      this.N2 = 0;
      this.isSlack = false;
      this.stateType = 'INIT';
      this.stateDescription = 'מוכן להפעלה';
      this.pulleyAngle = 0;

      this.computeForces();
    }

    computeForces() {
      const EPS = 1e-4;
      const m1 = this.m1;
      const m2 = this.m2;
      const g = this.g;
      const H = this.pulleyHeight;
      const L = this.stringLength;

      const maxAllowedSum = 2 * H - L;
      const currentSum = this.y1 + this.y2;
      
      const onGround1 = this.y1 <= EPS;
      const onGround2 = this.y2 <= EPS;

      this.N1 = 0;
      this.N2 = 0;
      this.T = 0;
      this.a1 = 0;
      this.a2 = 0;

      // -------------------------------------------------------------
      // Case 1: Geometrically Slack (y1 + y2 > maxAllowedSum + EPS)
      // -------------------------------------------------------------
      if (currentSum > maxAllowedSum + EPS) {
        this.isSlack = true;
        this.T = 0;

        if (onGround1 && this.v1 <= EPS) {
          this.y1 = 0;
          this.v1 = 0;
          this.a1 = 0;
          this.N1 = m1 * g;
        } else {
          this.a1 = -g;
          this.N1 = 0;
        }

        if (onGround2 && this.v2 <= EPS) {
          this.y2 = 0;
          this.v2 = 0;
          this.a2 = 0;
          this.N2 = m2 * g;
        } else {
          this.a2 = -g;
          this.N2 = 0;
        }

        this.stateType = 'SLACK';
        this.stateDescription = 'חוט רפוי (T = 0) - נפילה חופשית / זריקה אנכית';
        this._cleanZeros();
        return;
      }

      // -------------------------------------------------------------
      // Case 2: Mass 1 on ground
      // -------------------------------------------------------------
      if (onGround1 && !onGround2) {
        if (this.v2 > EPS) {
          // Mass 2 moving up -> string immediately slacks
          this.isSlack = true;
          this.T = 0;
          this.a1 = 0;
          this.v1 = 0;
          this.N1 = m1 * g;
          this.a2 = -g;
          this.N2 = 0;
          this.stateType = 'SLACK';
          this.stateDescription = 'חוט רפוי (T = 0) - גוף 2 בזריקה אנכית מעלה';
          this._cleanZeros();
          return;
        }

        // Mass 2 at rest or trying to pull
        this.isSlack = false;
        if (m2 > m1) {
          const a = ((m2 - m1) / (m1 + m2)) * g;
          this.a1 = a;
          this.a2 = -a;
          this.T = (2 * m1 * m2 / (m1 + m2)) * g;
          this.N1 = 0;
          this.stateType = 'LIFT_OFF';
          this.stateDescription = 'גוף 1 מורם מהקרקע (m₂ > m₁)';
        } else {
          this.a1 = 0;
          this.a2 = 0;
          this.v1 = 0;
          this.v2 = 0;
          this.T = m2 * g;
          this.N1 = (m1 - m2) * g;
          this.N2 = 0;
          this.stateType = 'EQUILIBRIUM_1';
          this.stateDescription = 'שיווי משקל סטטי - גוף 1 על הקרקע';
        }
        this._cleanZeros();
        return;
      }

      // -------------------------------------------------------------
      // Case 3: Mass 2 on ground (Symmetric)
      // -------------------------------------------------------------
      if (onGround2 && !onGround1) {
        if (this.v1 > EPS) {
          this.isSlack = true;
          this.T = 0;
          this.a2 = 0;
          this.v2 = 0;
          this.N2 = m2 * g;
          this.a1 = -g;
          this.N1 = 0;
          this.stateType = 'SLACK';
          this.stateDescription = 'חוט רפוי (T = 0) - גוף 1 בזריקה אנכית מעלה';
          this._cleanZeros();
          return;
        }

        this.isSlack = false;
        if (m1 > m2) {
          const a = ((m1 - m2) / (m1 + m2)) * g;
          this.a1 = -a;
          this.a2 = a;
          this.T = (2 * m1 * m2 / (m1 + m2)) * g;
          this.N2 = 0;
          this.stateType = 'LIFT_OFF';
          this.stateDescription = 'גוף 2 מורם מהקרקע (m₁ > m₂)';
        } else {
          this.a1 = 0;
          this.a2 = 0;
          this.v1 = 0;
          this.v2 = 0;
          this.T = m1 * g;
          this.N2 = (m2 - m1) * g;
          this.N1 = 0;
          this.stateType = 'EQUILIBRIUM_2';
          this.stateDescription = 'שיווי משקל סטטי - גוף 2 על הקרקע';
        }
        this._cleanZeros();
        return;
      }

      // -------------------------------------------------------------
      // Case 4: Both on ground
      // -------------------------------------------------------------
      if (onGround1 && onGround2) {
        this.a1 = 0;
        this.a2 = 0;
        this.v1 = 0;
        this.v2 = 0;
        this.T = 0;
        this.N1 = m1 * g;
        this.N2 = m2 * g;
        this.isSlack = true;
        this.stateType = 'BOTH_GROUND';
        this.stateDescription = 'שני הגופים על הקרקע';
        this._cleanZeros();
        return;
      }

      // -------------------------------------------------------------
      // Case 5: Both airborne and taut
      // -------------------------------------------------------------
      this.isSlack = false;
      const a = ((m1 - m2) / (m1 + m2)) * g;
      this.a1 = -a;
      this.a2 = a;
      this.T = (2 * m1 * m2 / (m1 + m2)) * g;
      this.N1 = 0;
      this.N2 = 0;
      this.stateType = 'TAUT_MOTION';
      this.stateDescription = 'תנועה מואצת - שני הגופים באוויר';
      this._cleanZeros();
    }

    _cleanZeros() {
      this.a1 = cleanZero(this.a1);
      this.a2 = cleanZero(this.a2);
      this.v1 = cleanZero(this.v1);
      this.v2 = cleanZero(this.v2);
      this.T = cleanZero(this.T);
      this.N1 = cleanZero(this.N1);
      this.N2 = cleanZero(this.N2);
    }

    step(totalDt) {
      if (totalDt <= 0) return;

      const maxSubStep = 0.001; // 1 ms sub-step
      const numSteps = Math.ceil(totalDt / maxSubStep);
      const dt = totalDt / numSteps;

      const EPS = 1e-4;
      const H = this.pulleyHeight;
      const L = this.stringLength;
      const maxAllowedSum = 2 * H - L;

      for (let s = 0; s < numSteps; s++) {
        this.computeForces();

        // Integrate positions & velocities
        this.v1 += this.a1 * dt;
        this.v2 += this.a2 * dt;

        this.y1 += this.v1 * dt;
        this.y2 += this.v2 * dt;

        this.pulleyAngle += (this.v1 * dt) / 0.5;

        // Ground collision (y <= 0)
        if (this.y1 <= 0) {
          this.y1 = 0;
          if (this.v1 < 0) {
            this.v1 = 0;
          }
        }

        if (this.y2 <= 0) {
          this.y2 = 0;
          if (this.v2 < 0) {
            this.v2 = 0;
          }
        }

        // Pulley ceiling collision (y >= H)
        if (this.y1 >= H) {
          this.y1 = H;
          if (this.v1 > 0) this.v1 = 0;
        }
        if (this.y2 >= H) {
          this.y2 = H;
          if (this.v2 > 0) this.v2 = 0;
        }

        // Check String Retightening
        // Only if string tries to stretch: currentSum <= maxAllowedSum AND (v1 + v2 < -EPS)
        const currentSum = this.y1 + this.y2;
        if (currentSum <= maxAllowedSum) {
          // If the relative velocity along string tries to lengthen the string beyond L:
          // Rate of lengthening is d(l1+l2)/dt = -(v1 + v2). Lengthening occurs if v1 + v2 < -EPS.
          if (this.v1 + this.v2 < -EPS) {
            // Retightening jerk impulse:
            const vShared = (this.m1 * this.v1 - this.m2 * this.v2) / (this.m1 + this.m2);
            this.v1 = vShared;
            this.v2 = -vShared;
            this.isSlack = false;
          }

          // Enforce geometric bound: y1 + y2 cannot be strictly less than maxAllowedSum if taut
          if (!this.isSlack && currentSum < maxAllowedSum) {
            const diff = maxAllowedSum - currentSum;
            if (this.y1 > 0 && this.y2 > 0) {
              this.y1 += diff * 0.5;
              this.y2 += diff * 0.5;
            } else if (this.y1 <= 0) {
              this.y1 = 0;
              this.y2 = maxAllowedSum;
            } else if (this.y2 <= 0) {
              this.y2 = 0;
              this.y1 = maxAllowedSum;
            }
          }
        }

        this.time += dt;
      }

      this.computeForces();
    }

    getTheoretical() {
      const m1 = this.m1;
      const m2 = this.m2;
      const g = this.g;
      const a = ((m1 - m2) / (m1 + m2)) * g;
      const T = (2 * m1 * m2 / (m1 + m2)) * g;

      return {
        acceleration: cleanZero(a),
        accelerationM1: cleanZero(-a),
        accelerationM2: cleanZero(a),
        tension: cleanZero(T),
        weight1: cleanZero(m1 * g),
        weight2: cleanZero(m2 * g),
        deltaMass: cleanZero(Math.abs(m1 - m2)),
        totalMass: m1 + m2,
        formulaA: `a = \\frac{m_1 - m_2}{m_1 + m_2} g = \\frac{${m1.toFixed(2)} - ${m2.toFixed(2)}}{${(m1 + m2).toFixed(2)}} \\cdot ${g.toFixed(1)} = ${cleanZero(a).toFixed(2)} \\text{ m/s}^2`,
        formulaT: `T = \\frac{2 m_1 m_2}{m_1 + m_2} g = \\frac{2 \\cdot ${m1.toFixed(2)} \\cdot ${m2.toFixed(2)}}{${(m1 + m2).toFixed(2)}} \\cdot ${g.toFixed(1)} = ${cleanZero(T).toFixed(2)} \\text{ N}`
      };
    }
  }

  return { AtwoodSimulation };
});
