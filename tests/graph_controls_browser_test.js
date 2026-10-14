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
  await page.locator('[data-preset="ground_impact"]').click();
  await page.evaluate(()=>{for(let i=0;i<20;i++)document.getElementById('btnStep').click();});
  const box=()=>page.evaluate(()=>document.getElementById('graphCanvas').getBoundingClientRect().toJSON());

  // Force toggles
  const n1=page.locator('.series-btn[data-series="N1"]');
  await n1.click();
  assert.equal(await n1.getAttribute('aria-pressed'),'false');
  assert.deepEqual(await page.evaluate(()=>[...testChart.hiddenSeries]),['N1']);
  await page.locator('.series-btn[data-series="N2"]').click();
  assert.deepEqual(await page.evaluate(()=>[...testChart.hiddenSeries].sort()),['N1','N2']);
  await page.locator('#tabPos').click();assert.ok(await page.locator('#forceToggles').isHidden(),'Force toggles hidden on height tab');
  await page.locator('#tabForce').click();assert.ok(await page.locator('#forceToggles').isVisible(),'Force toggles shown on force tab');
  await page.screenshot({path:path.resolve(__dirname,'../verification/force-toggles.png'),fullPage:false});
  await n1.click();assert.deepEqual(await page.evaluate(()=>[...testChart.hiddenSeries]),['N2']);
  await page.locator('#btnReset').click();
  assert.deepEqual(await page.evaluate(()=>[...testChart.hiddenSeries]),['N2'],'Choice survives reset');
  await page.locator('#tabAll').click();

  // Full-window graphs
  const normal=await box();
  await page.locator('#btnExpand').click();await page.waitForTimeout(120);
  const big=await box();
  assert.equal(await page.locator('#btnExpand').getAttribute('aria-pressed'),'true');
  assert.ok(big.height>normal.height*1.3,'Expanded graph is taller: '+normal.height+' → '+big.height);
  assert.ok(big.width>normal.width*1.5,'Expanded graph is wider: '+normal.width+' → '+big.width);
  assert.ok(big.bottom<=768&&big.top>=0,'Expanded graph fits the window');
  assert.ok(await page.evaluate(()=>testChart.height>400),'Chart redrawn at the new size');
  await page.keyboard.press('Space');await page.waitForTimeout(200);await page.keyboard.press('Space');
  assert.notEqual(await page.locator('#valTime').textContent(),'0.00 s','Space plays while expanded');
  await page.screenshot({path:path.resolve(__dirname,'../verification/graphs-expanded.png'),fullPage:false});
  await page.keyboard.press('Escape');await page.waitForTimeout(120);
  const after=await box();
  assert.equal(await page.locator('#btnExpand').getAttribute('aria-pressed'),'false');
  assert.ok(Math.abs(after.height-normal.height)<2&&Math.abs(after.width-normal.width)<2,'Escape restores the layout');

  for(const [w,h]of [[390,844],[1024,768]]){
   await page.setViewportSize({width:w,height:h});
   await page.locator('#btnExpand').click();await page.waitForTimeout(120);
   const b=await box();assert.ok(b.width>w-80&&b.bottom<=h,'Expanded fits '+w+'x'+h);
   await page.locator('#btnExpand').click();
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.resolve(__dirname,'../verification/graph-controls-results.json'),JSON.stringify({normal,big,after,errors},null,2));
  console.log('PASS force toggles hide/show series per tab and survive reset; full-window graphs enlarge, keep Space shortcut, close with Escape');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
