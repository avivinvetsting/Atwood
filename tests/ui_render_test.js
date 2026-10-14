const assert=require('node:assert/strict');
const {AtwoodSimulation}=require('../physics');
const {AtwoodRenderer}=require('../renderer');
const {AtwoodCharts}=require('../charts');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
function canvas(w=600,h=410){
 const calls=[];
 const ctx=new Proxy({}, {get:(o,k)=>{
  if(k==='measureText')return t=>({width:t.length*6});
  return (...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),k+' had nonfinite coordinate');calls.push([k,...args]);};
 }});
 return {calls,getContext:()=>ctx,getBoundingClientRect:()=>({width:w,height:h})};
}
test('Finite geometry at narrow width and extreme forces',()=>{
 const c=canvas(288),s=new AtwoodSimulation({m1:20,m2:.1,g:25}),r=new AtwoodRenderer(c,s);
 r.draw();assert.ok(r.pulleyRadiusPx>0);assert.ok(c.calls.length>20);
});
test('Grounded body lower face is exactly on floor',()=>{
 const c=canvas(),s=new AtwoodSimulation({m1:4,m2:2,initY1:0}),r=new AtwoodRenderer(c,s);r.draw();
 const block=c.calls.find(a=>a[0]==='roundRect'&&a[3]===36&&a[4]===30);
 assert.ok(block);assert.equal(block[2]+block[4],r.groundY);
});
test('Chart canvas renders all plot modes with both normal forces',()=>{
 const c=canvas(288,590),charts=new AtwoodCharts(c);
 const s=new AtwoodSimulation({m1:2,m2:4,initY1:6});charts.record(0,s);s.step(.1);charts.record(s.time,s);
 for(const mode of ['all','pos','vel','force']){charts.setActiveTab(mode);charts.draw();}
 assert.ok(c.calls.some(a=>a[0]==='fillText'&&a[1]==='N₂'));
});
test('CSV includes t=0, a1/a2, N2 and history older than displayed window',()=>{
 const c=canvas(),charts=new AtwoodCharts(c),s=new AtwoodSimulation({m1:2,m2:4,initY1:6});
 for(let i=0;i<=3100;i++){charts.record(s.time,s);s.step(.01);}
 const lines=charts.exportCSV().trim().split('\n');assert.equal(lines.length,3102);
 assert.ok(lines[0].includes('Normal2 (N)'));assert.ok(lines[0].includes('a2 (m/s^2)'));
 assert.ok(lines[1].startsWith('0.000000,'));assert.equal(lines[1].split(',')[9],'20.000000');
});
console.log(passed+' canvas and CSV tests passed.');
