const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),{pathToFileURL}=require('node:url');
let pw;try{pw=require('playwright');}catch{pw=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
(async()=>{
 const browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   Object.defineProperty(window,'AtwoodCharts',{configurable:true,get(){return this.chartModule;},set(value){
    this.chartModule=value;const draw=value.AtwoodCharts.prototype.draw;
    value.AtwoodCharts.prototype.draw=function(){window.testChart=this;return draw.call(this);};
   }});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../atwood-lab.html')).href);
  await page.locator('#inputV1').fill('-10');await page.locator('#inputV1').press('Tab');
  const initial=await page.evaluate(()=>({domain:JSON.stringify(testChart.timeDomain),ranges:JSON.stringify(testChart.ranges),samples:testChart.dataPoints.length}));
  assert.equal(initial.samples,1);
  const beforePeak=await page.evaluate(()=>{
   for(let i=0;i<28;i++)document.getElementById('btnStep').click();
   return {v:Number(document.getElementById('valV2').textContent),y:Number(document.getElementById('valY2').textContent),domain:JSON.stringify(testChart.timeDomain)};
  });
  assert.ok(beforePeak.v>0&&beforePeak.y>12);assert.equal(beforePeak.domain,initial.domain);
  await page.locator('#btnStep').click();assert.ok(Number(await page.locator('#valV2').textContent())<0);
  await page.screenshot({path:path.resolve(__dirname,'../verification/fixed-axes-peak.png'),fullPage:true});
  const finished=await page.evaluate(()=>{
   for(let i=0;i<120&&!document.getElementById('btnStep').disabled;i++)document.getElementById('btnStep').click();
   return {domain:JSON.stringify(testChart.timeDomain),ranges:JSON.stringify(testChart.ranges),first:testChart.dataPoints[0].t,last:testChart.dataPoints.at(-1).t,max:testChart.timeDomain.max,samples:testChart.dataPoints.length,y1:document.getElementById('valY1').textContent,v1:document.getElementById('valV1').textContent,state:document.getElementById('valStateBadge').textContent};
  });
  assert.equal(finished.domain,initial.domain);assert.equal(finished.ranges,initial.ranges);
  assert.equal(finished.first,0);assert.ok(Math.abs(finished.last-finished.max)<1e-7);assert.equal(finished.v1,'0.00');assert.ok(finished.state.includes('הניסוי הסתיים'));
  for(const [w,h]of [[1366,768],[1024,768],[768,768],[390,844]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(80);
   if(w>=768)assert.ok(await page.evaluate(()=>document.getElementById('graphCanvas').getBoundingClientRect().bottom<innerHeight));
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.resolve(__dirname,'../verification/fixed-axes-results.json'),JSON.stringify({initial,beforePeak,finished,errors},null,2));
  console.log('PASS fixed axes before motion, after two seconds and at end; no future samples; full peak and descent; all samples visible; responsive layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
