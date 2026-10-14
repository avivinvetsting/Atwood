const assert=require('node:assert/strict'),{planExperiment}=require('../planning'),{AtwoodSimulation}=require('../physics'),{AtwoodCharts}=require('../charts');
const close=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
function prepared(o){const p=planExperiment(o),s=new AtwoodSimulation({...o,pulleyHeight:p.pulleyHeight,stringLength:p.stringLength});return {p,s};}
test('Classic forecast includes peak, return and final equilibrium',()=>{
 const {p,s}=prepared({});close(p.maxHeight,7.5);assert.ok(p.settled);
 for(let t=0;t<p.duration;t+=.02)s.step(.02);
 assert.ok(!s.boundaryReached);assert.equal(s.v1,0);assert.equal(s.v2,0);assert.ok(s.stateType.startsWith('EQUILIBRIUM'));
});
test('Strong downward push passes former ceiling, reaches exact peak and falls',()=>{
 const {p,s}=prepared({initV1:-10}),impact=(Math.sqrt(130)-10)/5,peakTime=impact+Math.sqrt(130)/10;
 close(p.maxHeight,12.5);assert.ok(p.pulleyHeight>p.maxHeight+2);
 s.step(peakTime);close(s.y2,12.5);close(s.v2,0);assert.ok(!s.boundaryReached);
 s.step(.1);assert.ok(s.v2<0);assert.ok(s.y2<12.5);assert.ok(!s.boundaryReached);
 assert.ok(p.duration>peakTime+.1);
});
test('Symmetric high-speed impact has the same peak and duration',()=>{
 const a=planExperiment({m1:3,m2:1,initV1:-10}),b=planExperiment({m1:1,m2:3,initV1:10});
 close(a.duration,b.duration);close(a.maxHeight,b.maxHeight);
});
test('Raising pulley preserves original initial geometry and forces',()=>{
 const original=new AtwoodSimulation({initV1:-10}),{s}=prepared({initV1:-10});
 for(const k of ['y1','y2','v1','v2','a1','a2','T','N1','N2'])close(s[k],original[k]);close(s.ropeSum,6);
});
test('Weak gravity forecast exceeds old 120 s cap and covers projectile peak',()=>{
 const {p,s}=prepared({g:.1,initV1:-10}),impact=(Math.sqrt(100.3)-10)/.05,peakTime=impact+Math.sqrt(100.3)/.1;
 assert.ok(p.duration>120);s.step(peakTime);close(s.y2,507.5,1e-5);close(s.v2,0);assert.ok(!s.boundaryReached);
});
test('Static and unending cases have explicit finite observation windows',()=>{
 assert.equal(planExperiment({initY1:0,m1:4,m2:2}).reason,'settled');
 const p=planExperiment({g:0,initV1:10});assert.equal(p.reason,'unending');assert.equal(p.duration,10);
 const equal=planExperiment({m1:2,m2:2,initV1:-2.5});assert.equal(equal.reason,'unending');
});
test('Fixed chart domains remain unchanged past two and twenty seconds',()=>{
 const ctx=new Proxy({}, {get:()=>()=>{}}),c={getContext:()=>ctx,getBoundingClientRect:()=>({width:600,height:510})},charts=new AtwoodCharts(c),plan=planExperiment({g:.1,initV1:-10});
 charts.setPlan(plan);const initial=JSON.stringify({time:charts.timeDomain,ranges:charts.ranges});
 const s=new AtwoodSimulation();
 for(const t of [0,1,2,20,40,plan.duration]){charts.record(t,s);charts.draw();assert.equal(JSON.stringify({time:charts.timeDomain,ranges:charts.ranges}),initial);}
 assert.equal(charts.dataPoints[0].t,0);assert.equal(charts.timeDomain.min,0);assert.equal(charts.timeDomain.max,plan.duration);
});
test('Prepared experiments stay inside forecast axes and clear the pulley',()=>{
 for(const m1 of [.1,1,3,20])for(const m2 of [.1,2,20])for(const v of [-10,0,10]){
  const {p,s}=prepared({m1,m2,initV1:v});
  for(let i=0;i<=1000;i++){
   s.step(p.duration/1000);assert.ok(!s.boundaryReached,[m1,m2,v,s.time].join(','));
   assert.ok(s.y1<=p.ranges.pos.max+1e-6&&s.y2<=p.ranges.pos.max+1e-6);
   assert.ok(s.v1>=p.ranges.vel.min-1e-6&&s.v1<=p.ranges.vel.max+1e-6);
   assert.ok(s.v2>=p.ranges.vel.min-1e-6&&s.v2<=p.ranges.vel.max+1e-6);
  }
 }
});
console.log(count+' planning tests passed.');
