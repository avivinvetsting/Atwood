/* Upward-positive ideal Atwood model. Exact motion between contact events.
 * stringLength = effective length of the two straight rope segments.
 * Ground impact and rope retightening are perfectly inelastic.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.AtwoodPhysics=factory();
})(typeof self!=='undefined'?self:this,function(){
  const EPS=1e-9, clean=x=>Math.abs(x)<EPS?0:x;
  function finite(value,fallback){
    const n=Number(value===undefined?fallback:value);
    if(!Number.isFinite(n)) throw new RangeError('יש להזין מספר סופי');
    return n;
  }
  function crossing(p,v,a,direction){
    let roots=[];
    if(Math.abs(a)<EPS){if(Math.abs(v)>EPS) roots=[-p/v];}
    else {const d=v*v-2*a*p;if(d>=0) roots=[(-v-Math.sqrt(d))/a,(-v+Math.sqrt(d))/a];}
    return Math.min(...roots.filter(t=>t>=-1e-10&&direction*(v+a*t)>EPS).map(t=>Math.max(0,t)),Infinity);
  }
  class AtwoodSimulation {
    constructor(o={}){this.setParameters(o);this.reset();}
    setParameters(o={}){
      this.m1=finite(o.m1,3);this.m2=finite(o.m2,1);this.g=finite(o.g,10);
      this.pulleyHeight=finite(o.pulleyHeight,8);this.stringLength=finite(o.stringLength,10);
      this.pulleyRadius=finite(o.pulleyRadius,.45);
      this.ropeSum=2*this.pulleyHeight-this.stringLength;
      this.upperLimit=this.pulleyHeight-.7;
      this.initY1=finite(o.initY1,3);
      this.initY2=finite(o.initY2,this.ropeSum-this.initY1);
      this.initV1=finite(o.initV1,0);
      this.initV2=finite(o.initV2,Math.abs(this.initY1+this.initY2-this.ropeSum)<EPS?-this.initV1:0);
      if(this.m1<=0||this.m2<=0||this.g<0||this.pulleyRadius<=0||this.ropeSum<0||
         this.initY1<0||this.initY2<0||this.initY1>this.upperLimit||this.initY2>this.upperLimit||
         this.initY1+this.initY2<this.ropeSum-EPS)
        throw new RangeError('פרמטרים לא תקינים או גבהים שאינם תואמים לאורך החוט');
    }
    reset(){
      this.time=0;this.y1=this.initY1;this.y2=this.initY2;
      this.v1=this.initV1;this.v2=this.initV2;this.pulleyAngle=0;this.boundaryReached=false;
      if(this.y1===0&&this.v1<0)this.v1=0;
      if(this.y2===0&&this.v2<0)this.v2=0;
      if(this.y1+this.y2<=this.ropeSum+EPS&&this.v1+this.v2<-EPS)this.retighten();
      this.computeForces();
    }
    retighten(){
      let u=(this.m1*this.v1-this.m2*this.v2)/(this.m1+this.m2);
      if((this.y1<=EPS&&u<0)||(this.y2<=EPS&&u>0))u=0;
      this.v1=clean(u);this.v2=clean(-u);
    }
    computeForces(){
      if(this.y1+this.y2<=this.ropeSum+EPS&&this.v1+this.v2<-EPS){
        this.retighten();
      }
      const ground1=this.y1<=EPS&&this.v1<=EPS,ground2=this.y2<=EPS&&this.v2<=EPS;
      this.N1=0;this.N2=0;this.T=0;this.a1=0;this.a2=0;
      this.isSlack=this.y1+this.y2>this.ropeSum+EPS||this.v1+this.v2>EPS||(ground1&&ground2);
      if(this.isSlack){
        this.a1=ground1?0:-this.g;this.N1=ground1?this.m1*this.g:0;
        this.a2=ground2?0:-this.g;this.N2=ground2?this.m2*this.g:0;
        this.stateType=ground1&&ground2?'BOTH_GROUND':'SLACK';
        this.stateDescription=ground1&&ground2?'שני הגופים על הקרקע · חוט רפוי':'חוט רפוי · T = 0 · הגוף שבאוויר בנפילה חופשית';
      }else if(ground1&&this.m1>=this.m2&&Math.abs(this.v2)<EPS){
        this.T=this.m2*this.g;this.N1=(this.m1-this.m2)*this.g;
        this.stateType='EQUILIBRIUM_1';this.stateDescription='שיווי משקל · גוף 1 על הקרקע';
      }else if(ground2&&this.m2>=this.m1&&Math.abs(this.v1)<EPS){
        this.T=this.m1*this.g;this.N2=(this.m2-this.m1)*this.g;
        this.stateType='EQUILIBRIUM_2';this.stateDescription='שיווי משקל · גוף 2 על הקרקע';
      }else{
        this.a1=(this.m2-this.m1)/(this.m1+this.m2)*this.g;this.a2=-this.a1;
        this.T=2*this.m1*this.m2/(this.m1+this.m2)*this.g;
        this.stateType=ground1||ground2?'LIFT_OFF':'TAUT_MOTION';
        this.stateDescription=ground1||ground2?'התרוממות מהקרקע · N = 0':
          Math.abs(this.a1)<EPS?'חוט מתוח · מהירות קבועה (a = 0)':'חוט מתוח · תנועה בתאוצה קבועה';
      }
      for(const key of ['a1','a2','v1','v2','T','N1','N2'])this[key]=clean(this[key]);
      if(this.boundaryReached){this.stateType='LIMIT';this.stateDescription='ההדמיה נעצרה: גוף הגיע לגבול העליון של המתקן';}
    }
    step(dt){
      if(!Number.isFinite(dt)||dt<=0||this.boundaryReached)return;
      let remaining=dt,guard=0;
      while(remaining>1e-10&&guard++<1000){
        this.computeForces();
        let duration=remaining,event=null;
        const consider=(t,kind)=>{if(t<=duration){duration=t;event=kind;}};
        consider(crossing(this.y1,this.v1,this.a1,-1),'ground1');
        consider(crossing(this.y2,this.v2,this.a2,-1),'ground2');
        consider(crossing(this.y1-this.upperLimit,this.v1,this.a1,1),'ceiling1');
        consider(crossing(this.y2-this.upperLimit,this.v2,this.a2,1),'ceiling2');
        if(this.isSlack)consider(crossing(this.y1+this.y2-this.ropeSum,this.v1+this.v2,this.a1+this.a2,-1),'rope');
        const dy1=this.v1*duration+.5*this.a1*duration*duration;
        this.y1+=dy1;this.y2+=this.v2*duration+.5*this.a2*duration*duration;
        this.v1+=this.a1*duration;this.v2+=this.a2*duration;
        if(!this.isSlack)this.pulleyAngle-=dy1/this.pulleyRadius;
        this.time+=duration;remaining-=duration;
        if(event){
          if(this.onEvent)this.onEvent(this);
          if(event==='ground1'){this.y1=0;this.v1=0;}
          if(event==='ground2'){this.y2=0;this.v2=0;}
          if(event==='rope'){this.y2=this.ropeSum-this.y1;this.retighten();}
          if(event.startsWith('ceiling')){this.boundaryReached=true;remaining=0;}
          this.computeForces();
          if(this.onEvent)this.onEvent(this);
        }
      }
      if(guard>=1000)throw new Error('יותר מדי אירועים בצעד אחד');
      this.computeForces();
    }
    getTheoretical(){
      const a=(this.m2-this.m1)/(this.m1+this.m2)*this.g;
      return {acceleration:clean(a),accelerationM1:clean(a),accelerationM2:clean(-a),
        tension:2*this.m1*this.m2/(this.m1+this.m2)*this.g,weight1:this.m1*this.g,weight2:this.m2*this.g};
    }
  }
  return {AtwoodSimulation};
});
