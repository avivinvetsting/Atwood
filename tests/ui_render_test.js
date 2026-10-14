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
 const block=c.calls.find(a=>a[0]==='roundRect'&&a[3]===r.blockW&&a[4]===r.blockH);
 assert.ok(block);assert.ok(r.blockW>=36&&r.blockH>=30);assert.equal(block[2]+block[4],r.groundY);
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
test('Nice axes contain the planned range and use 1/2/2.5/5 steps',()=>{
 const {niceAxis}=require('../charts');
 for(const [min,max,expect]of [[0,6.5,[0,8,2]],[-4.3,4.3,[-5,5,2.5]],[0,32.4,[0,40,10]],[0,507.5,[0,600,200]],[0,0,[0,1,.25]]]){
  const a=niceAxis(min,max,4);assert.ok(a.min<=min&&a.max>=max,'contains '+min+'..'+max);
  assert.deepEqual([a.min,a.max,a.step],expect);
 }
});
test('Chart tick labels are round numbers; planned ranges stay unchanged',()=>{
 const c=canvas(600,510),charts=new AtwoodCharts(c),ranges={pos:{min:0,max:8.1},vel:{min:-6.4,max:6.4},force:{min:0,max:32.4}};
 charts.setPlan({duration:5.5,ranges});const before=JSON.stringify(charts.ranges);charts.draw();
 const labels=c.calls.filter(a=>a[0]==='fillText'&&/^-?\d+(\.\d+)?$/.test(a[1])).map(a=>a[1]);
 for(const l of ['0','1','2','3','4','5','2.5','7.5','10','-10','-5','20','30','40'])assert.ok(labels.includes(l),'missing tick '+l);
 for(const bad of ['8.1','6.4','32.4','21.6','2.7'])assert.ok(!labels.includes(bad),'non-round tick '+bad);
 assert.equal(JSON.stringify(charts.ranges),before);
});
test('Replay lookup returns the nearest recorded sample',()=>{
 const charts=new AtwoodCharts(canvas()),s=new AtwoodSimulation({m1:3,m2:1,initY1:3});
 for(let i=0;i<=100;i++){charts.record(s.time,s);s.step(.01);}
 assert.equal(charts.indexAt(-1),0);assert.equal(charts.indexAt(99),100);
 assert.equal(charts.dataPoints[charts.indexAt(.503)].t.toFixed(2),'0.50');
 assert.ok(Number.isFinite(charts.dataPoints[0].angle)&&typeof charts.dataPoints[0].state==='string');
});
test('Hidden force series are not plotted; ranges stay fixed',()=>{
 const c=canvas(600,510),charts=new AtwoodCharts(c),s=new AtwoodSimulation({m1:3,m2:1,initY1:3});
 charts.setPlan({duration:4,ranges:{pos:{min:0,max:8},vel:{min:-6,max:6},force:{min:0,max:32}}});
 charts.record(0,s);s.step(.1);charts.record(s.time,s);
 const dots=()=>{c.calls.length=0;charts.draw();return c.calls.filter(a=>a[0]==='arc').length;};
 assert.equal(dots(),7);
 charts.setSeriesVisible('N1',false);charts.setSeriesVisible('N2',false);assert.equal(dots(),5);
 charts.setActiveTab('force');assert.equal(dots(),1);
 charts.setSeriesVisible('N1',true);assert.equal(dots(),2);
 assert.deepEqual(charts.ranges.force,{min:0,max:32});
});
console.log(passed+' canvas and CSV tests passed.');
