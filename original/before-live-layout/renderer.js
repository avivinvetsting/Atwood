/* Schematic canvas: heights refer to the lower face; forces use separate FBDs. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AtwoodRenderer=factory();})(typeof self!=='undefined'?self:this,function(){
class AtwoodRenderer{
  constructor(canvas,sim,o={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.sim=sim;this.theme=o.theme||'light';this.showFBD=o.showFBD??true;this.showRuler=o.showRuler??true;this.resize();}
  setTheme(t){this.theme=t;this.draw();}
  resize(){
    const rect=this.canvas.getBoundingClientRect(),dpr=typeof window==='undefined'?1:window.devicePixelRatio||1;
    this.width=rect.width||600;this.height=rect.height||410;
    this.canvas.width=this.width*dpr;this.canvas.height=this.height*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.groundY=this.height-44;this.meterScale=(this.groundY-82)/this.sim.pulleyHeight;
    this.pulleyCenterX=this.width/2;this.pulleyCenterY=64;
    this.pulleyRadiusPx=Math.min(46,Math.max(28,this.width*.058));
  }
  meterToPxY(y){return this.groundY-y*this.meterScale;}
  text(text,x,y,color='#626d64',size=12,align='center'){
    const c=this.ctx;c.font=size+'px "Segoe UI", Arial, sans-serif';c.fillStyle=color;c.direction='ltr';c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);
  }
  line(x1,y1,x2,y2,color,width=1){
    const c=this.ctx;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  arrow(x,y,length,color,label){
    const c=this.ctx,end=y-length,sign=length>=0?1:-1;
    this.line(x,y,x,end,color,2.5);c.fillStyle=color;c.beginPath();c.moveTo(x,end);c.lineTo(x-4,end+sign*7);c.lineTo(x+4,end+sign*7);c.closePath();c.fill();
    this.text(label,x,end-sign*12,color,11);
  }
  drawFBD(body,anchor){
    const s=this.sim,c=this.ctx,y=this.height*.48,m=body===1?s.m1:s.m2,N=body===1?s.N1:s.N2;
    const max=Math.max(s.m1*s.g,s.m2*s.g,s.T,s.N1,s.N2,1),scale=65/max;
    this.text('גוף '+body+' · כוחות',anchor,y-96,'#626d64',12);
    c.fillStyle=body===1?'#286354':'#ae543b';c.beginPath();c.arc(anchor,y,5,0,Math.PI*2);c.fill();
    if(s.T>1e-8)this.arrow(anchor-20,y,s.T*scale,'#397668','T');
    if(m*s.g>1e-8)this.arrow(anchor,y,-m*s.g*scale,'#ac4837','mg');
    if(N>1e-8)this.arrow(anchor+20,y,N*scale,'#75602e','N');
    this.text('T = '+s.T.toFixed(1)+' N',anchor,y+96,'#397668',12);
    this.text('mg = '+(m*s.g).toFixed(1)+' N',anchor,y+114,'#ac4837',12);
    this.text('N = '+N.toFixed(1)+' N',anchor,y+132,'#75602e',12);
  }
  draw(){
    const c=this.ctx,s=this.sim,w=this.width,h=this.height,cx=w/2,cy=this.pulleyCenterY,r=this.pulleyRadiusPx;
    c.clearRect(0,0,w,h);c.fillStyle='#fffcf5';c.fillRect(0,0,w,h);
    for(let k=0;k<=8;k++){
      const py=this.meterToPxY(k);this.line(0,py,w,py,'#eeeadd');
      if(this.showRuler){this.line(13,py,21,py,'#a7aa98');this.text(String(k),28,py,'#747c6d',11,'left');}
    }
    c.fillStyle='#e4e2d3';c.fillRect(0,this.groundY,w,44);
    this.line(0,this.groundY,w,this.groundY,'#8d9780',2);
    this.text('קרקע · y = 0',w-16,this.groundY+23,'#626d64',12,'right');
    this.line(cx-75,20,cx+75,20,'#a7aa98',4);this.line(cx,20,cx,cy,'#7f8876',5);
    // Rope endpoints attach to the upper face of the schematic blocks.
    for(const body of [1,2]){
      const x=cx+(body===1?-r:r),bottom=this.meterToPxY(body===1?s.y1:s.y2),top=bottom-39;
      c.strokeStyle=s.isSlack?'#ba7c38':'#58665c';c.lineWidth=2.5;c.beginPath();c.moveTo(x,cy);
      if(s.isSlack){
        const gap=Math.max(0,s.y1+s.y2-s.ropeSum),amp=Math.min(14,3+gap*8);
        for(let i=1;i<=36;i++){const t=i/36;c.lineTo(x+amp*Math.sin(t*Math.PI*6)*Math.sin(t*Math.PI),cy+(top-cy)*t);}
      }else c.lineTo(x,top);
      c.stroke();
      c.fillStyle=body===1?'#286354':'#ae543b';c.beginPath();c.roundRect(x-23,top,46,39,5);c.fill();
      this.text(body===1?'m₁':'m₂',x,top+12,'#fffaf0',13);
      this.text((body===1?s.m1:s.m2).toFixed(1)+' kg',x,top+28,'#fffaf0',11);
      if(bottom<this.groundY-23)this.text((body===1?s.y1:s.y2).toFixed(2)+' m',x,bottom+15,'#626d64',11);
    }
    c.fillStyle='#e4e2d3';c.strokeStyle='#6a7769';c.lineWidth=2;
    c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();c.stroke();
    c.save();c.translate(cx,cy);c.rotate(s.pulleyAngle);for(let i=0;i<4;i++){this.line(0,0,r-6,0,'#8d9780',2);c.rotate(Math.PI/2);}c.restore();
    c.fillStyle='#58665c';c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(cx,cy,r,Math.PI,0);c.strokeStyle='#58665c';c.stroke();
    if(this.showFBD){this.drawFBD(1,w*.18);this.drawFBD(2,w*.82);}
    this.text('גוף 1',cx-r,this.groundY+23,'#286354',11);
    this.text('גוף 2',cx+r,this.groundY+23,'#ae543b',11);
  }
}
return{AtwoodRenderer};
});
