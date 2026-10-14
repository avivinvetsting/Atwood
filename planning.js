/* A private dry run determines the entire experiment's axes and clearance.
 * It never supplies future samples to the live graph.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./physics.js'));
 else root.AtwoodPlanning=factory(root.AtwoodPhysics);
})(typeof self!=='undefined'?self:this,function(physics){
 function planExperiment(parameters={}){
  const probe=new physics.AtwoodSimulation({...parameters,stopAtPulley:false});
  const moving=probe.v1!==0||probe.v2!==0||probe.a1!==0||probe.a2!==0;
  const unending=moving&&(probe.g===0||probe.m1===probe.m2);
  const horizon=unending?Math.max(10,2*probe.ropeSum/Math.max(Math.abs(probe.initV1),.1)):
   Math.max(120,4*(Math.abs(probe.initV1)/Math.max(probe.g,.001)+Math.sqrt(2*probe.ropeSum/Math.max(probe.g,.001))));
  const dt=horizon/6000,keys=['y1','y2','v1','v2','T','N1','N2'];
  const bounds=Object.fromEntries(keys.map(k=>[k,{min:0,max:0}]));
  let maxHeight=Math.max(probe.y1,probe.y2),settled=!moving;
  function capture(s){
   for(const k of keys){bounds[k].min=Math.min(bounds[k].min,s[k]);bounds[k].max=Math.max(bounds[k].max,s[k]);}
   maxHeight=Math.max(maxHeight,s.y1,s.y2);
   // Include the exact projectile peak, which may fall between forecast samples.
   if(s.isSlack&&s.g>0)for(const id of [1,2]){
    if(s['v'+id]>0){
     const peak=s['y'+id]+s['v'+id]**2/(2*s.g);
     maxHeight=Math.max(maxHeight,peak);bounds['y'+id].max=Math.max(bounds['y'+id].max,peak);
    }
   }
  }
  probe.onEvent=capture;capture(probe);
  if(moving)for(let i=0;i<6000;i++){
   probe.step(dt);capture(probe);
   if(probe.v1===0&&probe.v2===0&&probe.a1===0&&probe.a2===0){settled=true;break;}
  }
  // Round upward and leave a little stationary tail; do not change after play.
  const duration=settled?Math.max(2,Math.ceil((probe.time+.4)*2)/2):Math.ceil(horizon);
  const pulleyHeight=Math.max(14,Math.ceil(maxHeight*1.8+2));
  const stringLength=2*pulleyHeight-probe.ropeSum;
  const range=ids=>{
   let min=Math.min(...ids.map(k=>bounds[k].min)),max=Math.max(...ids.map(k=>bounds[k].max));
   if(max-min<1e-9){max=Math.max(1,max);if(ids[0][0]==='v')min=-1;}
   const span=Math.max(max-min,1);
   return {min:ids[0][0]==='v'?min-span*.08:0,max:max+span*.08};
  };
  return {duration,pulleyHeight,stringLength,maxHeight,settled,
   reason:settled?'settled':unending?'unending':'observation',
   ranges:{pos:range(['y1','y2']),vel:range(['v1','v2']),force:range(['T','N1','N2'])}};
 }
 return{planExperiment};
});
