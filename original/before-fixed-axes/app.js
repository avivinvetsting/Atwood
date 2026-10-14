document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id);
 const sim=new AtwoodPhysics.AtwoodSimulation(),renderer=new AtwoodRenderer.AtwoodRenderer($('simCanvas'),sim),charts=new AtwoodCharts.AtwoodCharts($('graphCanvas'));
 const presets={
  classic:{m1:3,m2:1,initY1:3,initV1:0,g:10},
  ground_equilibrium:{m1:4,m2:2,initY1:0,initV1:0,g:10},
  ground_impact:{m1:3,m2:1,initY1:1.2,initV1:0,g:10},
  liftoff:{m1:1,m2:3,initY1:0,initV1:0,g:10},
  equal_velocity:{m1:2,m2:2,initY1:3,initV1:-2.5,g:10},
  downward_push:{m1:2.5,m2:1.5,initY1:4,initV1:-3,g:10}
 };
 const fields=[['M1','m1'],['M2','m2'],['G','g'],['Y1','initY1'],['V1','initV1']];
 let running=false,speed=1,last=null,accumulator=0,selected='classic';
 const buttons=[...document.querySelectorAll('.preset-btn')];
 function notice(t){$('configNotice').textContent=t;$('configNotice').hidden=!t;}
 function play(value){
  running=value&&!sim.boundaryReached&&sim.time<120;last=null;accumulator=0;
  $('btnPlayPause').textContent=running?'Ⅱ השהה':'▶ הפעל';
  $('btnPlayPause').setAttribute('aria-pressed',String(running));
 }
 function sync(){
  for(const [id,key]of fields){$('input'+id).value=sim[key];$('slider'+id).value=sim[key];}
  $('initY2Label').textContent=sim.initY2.toFixed(1)+' m';
  $('formulaBoxA').textContent='a₁ = (m₂ − m₁)g / (m₁ + m₂) = '+sim.getTheoretical().accelerationM1.toFixed(2)+' m/s²;  a₂ = −a₁';
  $('formulaBoxT').textContent='T = 2m₁m₂g / (m₁ + m₂) = '+sim.getTheoretical().tension.toFixed(2)+' N';
 }
 function update(){
  $('valTime').textContent=sim.time.toFixed(2)+' s';
  for(const [id,k]of [['Y1','y1'],['Y2','y2'],['V1','v1'],['V2','v2'],['A1','a1'],['A2','a2'],['N1','N1'],['N2','N2']])$('val'+id).textContent=sim[k].toFixed(2);
  $('valT').textContent=sim.T.toFixed(2)+' N';
  const badge=$('valStateBadge'),text=sim.time>=120?'המדידה הושהתה לאחר 120 שניות. אפשר לייצא או לאפס.':sim.stateDescription;
  if(badge.textContent!==text)badge.textContent=text;
  badge.className='status-badge'+(sim.boundaryReached?' status-limit':sim.isSlack?' status-slack':'');
  let explanation;
  if(sim.boundaryReached)explanation='הגענו לגבול העליון שהוגדר למתקן. בחרו מהירות קטנה יותר או אפסו כדי לחקור ניסוי חדש.';
  else if(sim.isSlack)explanation='החוט יכול למשוך, אך אינו יכול לדחוף. לכן המתיחות אפס; הגוף שבאוויר מאיץ מטה גם כשהוא עדיין נע מעלה.';
  else if(sim.stateType.startsWith('EQUILIBRIUM'))explanation='המתיחות מאזנת את משקל הגוף התלוי. הקרקע מספקת את יתרת הכוח לגוף המונח עליה: N = mg − T.';
  else if(sim.stateType==='LIFT_OFF')explanation='הגוף מתחיל להתרומם: המגע עם הקרקע מסתיים, והכוח הנורמלי מתאפס.';
  else if(sim.a1===0)explanation='מסות שוות: הכוח השקול על כל גוף אפס. במנוחה הם נשארים במנוחה; עם מהירות התחלתית הם נעים במהירות קבועה עד לפגיעה.';
  else explanation='החוט המתוח מחייב מהירויות ותאוצות מנוגדות. הגוף הכבד מאיץ מטה; כיוון המהירות נקבע גם לפי תנאי ההתחלה.';
  if($('stateExplanation').textContent!==explanation)$('stateExplanation').textContent=explanation;
  $('btnPlayPause').disabled=sim.boundaryReached||sim.time>=120;
  $('btnStep').disabled=sim.boundaryReached||sim.time>=120;
  renderer.draw();charts.draw();
 }
 function record(s=sim){charts.record(s.time,s);}
 sim.onEvent=record;
 function reset(){
  play(false);sim.reset();charts.reset();record();sync();update();
 }
 function markPreset(id){
  selected=id;for(const b of buttons){b.classList.toggle('active',b.dataset.preset===id);b.setAttribute('aria-pressed',String(b.dataset.preset===id));}
  $('experimentTitle').textContent=id?buttons.find(b=>b.dataset.preset===id).textContent:'ניסוי בהתאמה אישית';
 }
 function apply(custom=true){
  const config={};let message='';
  for(const [id,key]of fields){
   const el=$('input'+id),n=el.value.trim()===''?NaN:Number(el.value);
   if(!Number.isFinite(n)){sync();notice('יש להזין מספר תקין. הערך הקודם הוחזר.');play(false);return;}
   config[key]=Math.min(Number(el.max),Math.max(Number(el.min),n));
   if(config[key]!==n)message='הערך הותאם לטווח המותר שמופיע בשדה.';
  }
  if((config.initY1===0&&config.initV1<0)||(config.initY1===6&&config.initV1>0)){
   config.initV1=0;message='גוף שעל הקרקע אינו יכול לקבל מהירות לתוך הקרקע. המהירות ההתחלתית הוגדרה לאפס.';
  }
  play(false);sim.setParameters(config);if(custom)markPreset(null);reset();notice(message);
 }
 for(const [id]of fields){
  $('slider'+id).addEventListener('input',()=>{$('input'+id).value=$('slider'+id).value;apply();});
  $('input'+id).addEventListener('change',()=>apply());
 }
 for(const b of buttons)b.addEventListener('click',()=>{
  sim.setParameters(presets[b.dataset.preset]);markPreset(b.dataset.preset);notice('');reset();
 });
 $('btnPlayPause').addEventListener('click',()=>play(!running));
 $('btnReset').addEventListener('click',()=>{notice('');reset();});
 function advance(dt){
  sim.step(Math.min(dt,120-sim.time));record();if(sim.boundaryReached||sim.time>=120)play(false);
 }
 $('btnStep').addEventListener('click',()=>{play(false);advance(.05);update();});
 $('btnGround1').addEventListener('click',()=>{$('inputY1').value=0;$('inputV1').value=0;apply();});
 $('btnGround2').addEventListener('click',()=>{$('inputY1').value=6;$('inputV1').value=0;apply();});
 $('btnG10').addEventListener('click',()=>{$('inputG').value=10;apply();});
 $('btnG98').addEventListener('click',()=>{$('inputG').value=9.8;apply();});
 $('speedSelect').addEventListener('change',()=>{speed=Number($('speedSelect').value);accumulator=0;last=null;});
 $('toggleFBD').addEventListener('change',()=>{renderer.showFBD=$('toggleFBD').checked;renderer.draw();});
 $('toggleRuler').addEventListener('change',()=>{renderer.showRuler=$('toggleRuler').checked;renderer.draw();});
 for(const [id,key]of [['All','all'],['Pos','pos'],['Vel','vel'],['Force','force']]){
  $('tab'+id).addEventListener('click',()=>{
   for(const b of document.querySelectorAll('.tab-btn')){const active=b.id==='tab'+id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
   charts.setActiveTab(key);
  });
 }
 $('btnExportCSV').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob(['﻿'+charts.exportCSV()],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='atwood-measurements.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 window.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea,button,summary')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(e.code==='Space'){e.preventDefault();play(!running);}
  else if(e.code==='KeyR')$('btnReset').click();
  else if(e.code==='KeyS')$('btnStep').click();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)play(false);});
 const resize=()=>{renderer.resize();charts.resize();update();};
 if(typeof ResizeObserver!=='undefined'){
  const observer=new ResizeObserver(resize);observer.observe($('simCanvas').parentElement);observer.observe($('graphCanvas').parentElement);
 }else window.addEventListener('resize',resize);
 function tick(timestamp){
  if(last===null)last=timestamp;
  if(running){
   accumulator+=Math.min(.1,(timestamp-last)/1000)*speed;
   while(accumulator>=.01&&running){accumulator-=.01;advance(.01);}
   update();
  }
  last=timestamp;requestAnimationFrame(tick);
 }
 reset();requestAnimationFrame(tick);
});
