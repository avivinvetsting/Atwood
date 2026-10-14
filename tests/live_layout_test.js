const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),{pathToFileURL}=require('node:url');
let pw;try{pw=require('playwright');}catch{pw=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
(async()=>{
 const browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage(),errors=[],results=[];
  page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../atwood-lab.html')).href);
  for(const [width,height]of [[1366,768],[1440,900],[1280,720],[1024,768],[900,720],[768,768],[390,844],[320,740]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(60);
   const boxes=await page.evaluate(()=>{
    const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();
    const overflow=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<-1||r.right>innerWidth+1)}).map(e=>e.id||e.tagName);
    return {sim:rect('simCanvas'),graph:rect('graphCanvas'),settings:document.querySelector('.controls-sidebar').getBoundingClientRect().toJSON(),overflow};
   });
   assert.deepEqual(boxes.overflow,[],width+' overflow');
   if(width>=768){
    assert.ok(boxes.sim.bottom<height&&boxes.graph.bottom<height,'Both canvases must fit viewport at '+width+'x'+height);
    assert.ok(boxes.graph.right<=boxes.sim.left||boxes.sim.right<=boxes.graph.left,'Canvases must be side by side');
    assert.ok(Math.abs(boxes.sim.top-boxes.graph.top)<100,'Canvases must align');
    assert.ok(boxes.settings.top>Math.max(boxes.sim.bottom,boxes.graph.bottom),'Parameters must be below the live workspace');
   }
   results.push({width,height,boxes});console.log('PASS layout '+width+'x'+height);
  }
  await page.setViewportSize({width:1366,height:768});
  const progress=await page.evaluate(async()=>{
   const marks=[],draw=AtwoodCharts.AtwoodCharts.prototype.draw;
   AtwoodCharts.AtwoodCharts.prototype.draw=function(){marks.push({time:this.dataPoints.at(-1)?.t??0,length:this.dataPoints.length});return draw.call(this);};
   document.getElementById('speedSelect').value='0.5';document.getElementById('speedSelect').dispatchEvent(new Event('change'));
   document.getElementById('btnPlayPause').click();
   await new Promise(r=>setTimeout(r,1400));document.getElementById('btnPlayPause').click();
   return {marks,y:document.getElementById('valY1').textContent,time:document.getElementById('valTime').textContent};
  });
  const live=progress.marks.filter(p=>p.time>0);
  assert.ok(live.length>10);assert.ok(live.at(-1).time>live[0].time);assert.ok(live.at(-1).length>live[0].length);assert.notEqual(progress.y,'3.00');
  assert.deepEqual(errors,[]);console.log('PASS moving bodies and progressively sampled graphs');
  await page.screenshot({path:path.resolve(__dirname,'../verification/live-layout-1366.png'),fullPage:true});
  await fs.writeFile(path.resolve(__dirname,'../verification/live-layout-results.json'),JSON.stringify({results,progress,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
