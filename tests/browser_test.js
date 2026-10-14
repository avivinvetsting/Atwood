const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
let pw;try{pw=require('playwright');}catch{pw=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
(async()=>{
 const browser=await pw.chromium.launch({headless:true,downloadsPath:path.resolve(__dirname,'../verification'),executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const original=URL.createObjectURL;window.csvExports=[];URL.createObjectURL=function(blob){window.csvExports.push(blob.text());return original.call(URL,blob);};});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
 const step=async(n)=>{for(let i=0;i<n;i++){if(await page.locator('#btnStep').isDisabled())break;await page.locator('#btnStep').click();}};
 const preset=async(id)=>page.locator('[data-preset="'+id+'"]').click();
 const number=async(id,v)=>{await page.locator('#input'+id).fill(String(v));await page.locator('#input'+id).press('Tab');};
 const val=async(id)=>Number(await page.locator('#val'+id).textContent());
 await check('Initial analytic values, signs and warm background',async()=>{
  assert.equal(await val('A1'),-5);assert.equal(await val('A2'),5);
  assert.equal(await page.locator('#valT').textContent(),'15.00 N');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(243, 239, 229)');
 });
 await check('All six presets reset and select the right title',async()=>{
  for(const id of ['classic','ground_equilibrium','ground_impact','liftoff','equal_velocity','downward_push']){
   await preset(id);assert.equal(await page.locator('#valTime').textContent(),'0.00 s');
   assert.equal(await page.locator('#experimentTitle').textContent(),await page.locator('[data-preset="'+id+'"]').textContent());
  }
 });
 await check('Ground equilibria and both normal readouts',async()=>{
  await preset('ground_equilibrium');assert.equal(await val('N1'),20);await step(2);assert.equal(await val('Y1'),0);
  await page.locator('#btnGround2').click();await number('M1',2);await number('M2',4);assert.equal(await val('N2'),20);assert.equal(await val('N1'),0);
 });
 await check('Ground impact changes tension to zero and retains upward speed',async()=>{
  await preset('ground_impact');await step(14);assert.equal(await val('Y1'),0);assert.equal(await page.locator('#valT').textContent(),'0.00 N');assert.ok(await val('V2')>0);assert.equal(await val('A2'),-10);
 });
 await check('Initial upward velocity on ground is preserved',async()=>{
  await preset('ground_equilibrium');await number('V1',2);assert.equal(await val('V1'),2);await step(1);assert.ok(await val('Y1')>0);
 });
 await check('Zero gravity and matching range limits',async()=>{
  await preset('classic');await number('G',0);assert.equal(await val('A1'),0);await number('V1',1);await step(2);assert.equal(await val('Y1'),3.1);
  for(const id of ['M1','M2','G','Y1','V1'])for(const key of ['min','max'])assert.equal(await page.locator('#input'+id).getAttribute(key),await page.locator('#slider'+id).getAttribute(key));
  await number('M1',99);assert.equal(await page.locator('#inputM1').inputValue(),'20');assert.equal(await page.locator('#sliderM1').inputValue(),'20');
  await page.locator('#inputM1').fill('');await page.locator('#inputM1').press('Tab');assert.equal(await page.locator('#inputM1').inputValue(),'20');
 });
 await check('Playing, pause on parameter edit, step, reset and keyboard',async()=>{
  await preset('classic');await page.locator('#btnPlayPause').click();await page.waitForTimeout(150);assert.notEqual(await page.locator('#valTime').textContent(),'0.00 s');
  await number('M1',4);assert.equal(await page.locator('#btnPlayPause').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#valTime').textContent(),'0.00 s');
  await page.locator('body').click({position:{x:2,y:2}});await page.keyboard.press('KeyS');assert.equal(await page.locator('#valTime').textContent(),'0.05 s');
  await page.keyboard.press('KeyR');assert.equal(await page.locator('#valTime').textContent(),'0.00 s');
 });
 await check('CSV download has initial sample, acceleration and N2',async()=>{
  await preset('ground_equilibrium');await step(2);
  const downloadPromise=page.waitForEvent('download');await page.locator('#btnExportCSV').click();const d=await downloadPromise;
  assert.equal(d.suggestedFilename(),'atwood-measurements.csv');
  const csv=await page.evaluate(async()=>await window.csvExports.at(-1)),rows=csv.replace(/^\uFEFF/,'').trim().split('\n');
  await fs.writeFile(path.resolve(__dirname,'../verification/export.csv'),csv);
  assert.ok(rows[0].includes('Normal2 (N)'));assert.ok(rows[0].includes('a1 (m/s^2)'));assert.ok(rows[1].startsWith('0.000000,'));
  assert.equal(rows.at(-1).split(',')[0],'0.100000');
 });
 await check('Graphs, toggles, formulas and full projectile peak',async()=>{
  await preset('classic');await step(4);
  for(const id of ['Pos','Vel','Force','All'])await page.locator('#tab'+id).click();
  await page.locator('#toggleFBD').uncheck();await page.locator('#toggleFBD').check();
  await page.locator('#toggleRuler').uncheck();await page.locator('#toggleRuler').check();
  await page.locator('#theorySection summary').click();assert.ok((await page.locator('#formulaBoxA').textContent()).includes('−'));
  await preset('classic');await number('V1',-10);await step(28);assert.ok(await val('Y2')>12);assert.ok(await val('V2')>0);await step(1);assert.ok(await val('V2')<0);assert.ok(!(await page.locator('#btnStep').isDisabled()));
 });
 await check('No overflow at 320, 390, 768, 1024 and 1440 pixels',async()=>{
  await preset('ground_impact');await step(14);await page.locator('#theorySection').evaluate(e=>e.open=true);
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(80);
   const over=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)}).map(e=>e.id||e.tagName));
   assert.deepEqual(over,[],width+' px overflow');
  }
 });
 await check('No JavaScript errors and no network dependencies',async()=>{
  assert.deepEqual(errors,[]);
  assert.equal(await page.locator('script[src^="http"],link[href^="http"]').count(),0);
 });
 const out=path.resolve(__dirname,'../verification');await fs.mkdir(out,{recursive:true});
 await preset('classic');await page.locator('#theorySection').evaluate(e=>e.open=false);await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await preset('ground_impact');await step(14);await page.screenshot({path:path.join(out,'slack-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({date:'2026-10-13',browser:'Chrome',checks,errors,limitation:'Browser download event and CSV bytes verified. Chrome canceled saving the download in the test environment; OS download persistence not verified.'},null,2));
 console.log(checks.length+' browser checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
