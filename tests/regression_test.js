const assert=require('node:assert/strict');
const {AtwoodSimulation:Sim}=require('../physics');
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,a+' != '+b);
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const energy=s=>.5*s.m1*s.v1**2+.5*s.m2*s.v2**2+s.g*(s.m1*s.y1+s.m2*s.y2);
test('Exact analytic position, velocity and energy before contact',()=>{
 const s=new Sim(),E=energy(s);s.step(.4);close(s.y1,2.6);close(s.y2,3.4);close(s.v1,-2);close(energy(s),E);
});
test('Initial upward velocity is preserved for a heavier grounded mass',()=>{
 const s=new Sim({m1:4,m2:2,initY1:0,initV1:2});close(s.v1,2);close(s.v2,-2);close(s.N1,0);s.step(.1);assert.ok(s.y1>0);
});
test('Symmetric initial lift from ground',()=>{
 const s=new Sim({m1:2,m2:4,initY1:6,initV1:-2});close(s.v2,2);close(s.N2,0);s.step(.1);assert.ok(s.y2>0);
});
test('Zero gravity is supported exactly',()=>{
 const s=new Sim({g:0,initV1:1});s.step(.4);close(s.y1,3.4);close(s.y2,2.6);close(s.T,0);close(s.a1,0);
});
test('Analytic ground impact and projectile peak',()=>{
 const s=new Sim({initY1:1});let events=[];s.onEvent=p=>events.push({t:p.time,v2:p.v2,T:p.T,y1:p.y1});
 const impact=Math.sqrt(2/5),speed=Math.sqrt(10);s.step(impact+.1);
 close(events[0].t,impact);close(events[0].v2,speed);close(events[1].T,0);
 close(s.y2,6+speed*.1-.05);close(s.v2,speed-1);
 s.step(speed/10-.1);close(s.y2,6.5);close(s.v2,0);close(s.a2,-10);
});
test('Retightening impulse lifts a heavier grounded mass and dissipates energy',()=>{
 const s=new Sim({initY1:1});let samples=[];
 s.onEvent=p=>samples.push({t:p.time,v1:p.v1,v2:p.v2,E:energy(p)});
 const ti=Math.sqrt(2/5),u=Math.sqrt(10),tr=ti+2*u/10;
 s.step(tr+1e-6);
 const before=samples[2],after=samples[3];close(before.t,tr);
 close(after.v1,u/4);close(after.v2,-u/4);assert.ok(after.E<before.E);
 close(3*before.v1-before.v2,3*after.v1-after.v2);
 assert.ok(s.y1>0);
});
test('Symmetric ground equilibrium includes N2',()=>{
 const s=new Sim({m1:2,m2:4,initY1:6});close(s.T,20);close(s.N2,20);close(s.N1,0);s.step(2);close(s.y2,0);
});
test('Initially slack string has no tension',()=>{
 const s=new Sim({initY1:4,initY2:4,initV1:0,initV2:0});close(s.T,0);s.step(.1);close(s.y1,3.95);close(s.a1,-10);
});
test('Opening velocities at the taut geometric limit produce slack',()=>{
 const s=new Sim({initY1:3,initY2:3,initV1:1,initV2:1});assert.ok(s.isSlack);close(s.T,0);s.step(.1);close(s.y1,3.05);
});
test('Invalid masses, NaN and impossible geometry are rejected',()=>{
 for(const o of [{m1:0},{m2:-1},{g:NaN},{g:Infinity},{initY1:7},{initY1:2,initY2:2}])assert.throws(()=>new Sim(o),RangeError);
});
test('Pulley limit stops at the crossing without inventing a rebound',()=>{
 const s=new Sim({m1:2,m2:2,g:0,initV1:10});s.step(1);
 close(s.y1,7.3);close(s.y2,0);close(s.time,.43);close(s.v1,10);assert.ok(s.boundaryReached);const t=s.time;s.step(10);close(s.time,t);
});

test('Time partition does not change impact or impulse results',()=>{
 const a=new Sim({initY1:1}),b=new Sim({initY1:1});a.step(1.3);for(let i=0;i<130;i++)b.step(.01);
 for(const k of ['time','y1','y2','v1','v2','T','N1','N2'])close(a[k],b[k],1e-7);
});
test('Constraints and Newton laws over many contact cycles',()=>{
 for(const m1 of [.1,1,3,20])for(const m2 of [.1,2,20])for(const v of [-3,0,3]){
  const s=new Sim({m1,m2,initV1:v});
  for(let j=0;j<400&&!s.boundaryReached;j++){
   s.step(.01);
   for(const k of ['y1','y2','v1','v2','a1','a2','T','N1','N2'])assert.ok(Number.isFinite(s[k]));
   assert.ok(s.y1>=-1e-8&&s.y2>=-1e-8&&s.y1+s.y2>=6-1e-8);
   assert.ok(s.T>=0&&s.N1>=0&&s.N2>=0);
   close(s.T+s.N1-s.m1*s.g,s.m1*s.a1,1e-6);
   close(s.T+s.N2-s.m2*s.g,s.m2*s.a2,1e-6);
   if(!s.isSlack){close(s.y1+s.y2,6,1e-7);close(s.v1+s.v2,0,1e-7);}
  }
 }
});
console.log(passed+' regression tests passed.');
