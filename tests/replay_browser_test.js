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
  const text=id=>page.locator('#'+id).textContent();
  const scrub=t=>page.evaluate(t=>{const s=document.getElementById('replaySlider');s.value=String(t);s.dispatchEvent(new Event('input'));},t);
  assert.ok(await page.locator('#replaySlider').isDisabled(),'Replay disabled before any measurement');
  await page.evaluate(()=>{for(let i=0;i<20;i++)document.getElementById('btnStep').click();});
  assert.equal(await text('valTime'),'1.00 s');assert.ok(!(await page.locator('#replaySlider').isDisabled()));
  const samples=await page.evaluate(()=>testChart.dataPoints.length);

  // Classic preset: y1 = 3 − 2.5 t² while the string is taut.
  await scrub(.5);
  const replay=await page.evaluate(()=>({time:document.getElementById('valTime').textContent,y1:Number(document.getElementById('valY1').textContent),
   badge:document.getElementById('valStateBadge').textContent,live:!document.getElementById('btnLive').hidden,
   cursorT:testChart.dataPoints[testChart.cursorIndex].t,samples:testChart.dataPoints.length}));
  assert.equal(replay.time,'0.50 s');assert.ok(Math.abs(replay.y1-2.375)<.01,'replayed y1 '+replay.y1);
  assert.ok(replay.badge.includes('צפייה חוזרת'));assert.ok(replay.live,'Back-to-end button shown');
  assert.ok(Math.abs(replay.cursorT-.5)<1e-9);assert.equal(replay.samples,samples,'Replay must not add samples');
  await page.screenshot({path:path.resolve(__dirname,'../verification/replay-scrub.png'),fullPage:false});

  await page.locator('#btnLive').click();
  assert.equal(await text('valTime'),'1.00 s');assert.ok(await page.locator('#btnLive').isHidden());
  assert.equal(await page.evaluate(()=>testChart.cursorIndex),null);

  await scrub(.3);assert.equal(await text('valTime'),'0.30 s');
  await page.locator('#btnStep').click();assert.equal(await text('valTime'),'1.05 s','Step continues from the live end');

  await scrub(.3);
  await page.locator('#btnPlayPause').click();await page.waitForTimeout(250);
  assert.ok(await page.locator('#replaySlider').isDisabled(),'Slider locked while running');
  await page.locator('#btnPlayPause').click();
  assert.ok(Number((await text('valTime')).split(' ')[0])>1.05,'Play continues from the live end');

  // Run to the end, then scrub back to the impact region.
  await page.evaluate(()=>{for(let i=0;i<200&&!document.getElementById('btnStep').disabled;i++)document.getElementById('btnStep').click();});
  assert.ok((await text('valStateBadge')).includes('הניסוי הסתיים'));
  await scrub(1.2);
  assert.equal(await text('valTime'),'1.20 s');assert.equal(await text('valY1'),'0.00');assert.equal(await text('valT'),'0.00 N');
  assert.ok(await page.evaluate(()=>document.getElementById('simCanvas').getBoundingClientRect().bottom<innerHeight),'Canvas still fits viewport');

  await page.locator('#btnReset').click();
  assert.equal(await text('valTime'),'0.00 s');assert.ok(await page.locator('#replaySlider').isDisabled());
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.resolve(__dirname,'../verification/replay-results.json'),JSON.stringify({samples,replay,errors},null,2));
  console.log('PASS replay scrub syncs machine, table, badge and chart cursor; no new samples; step/play resume live; reset clears');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
