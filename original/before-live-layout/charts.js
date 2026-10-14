/* Last 20 s displayed; full run retained for CSV. Sampling controlled by app.js. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AtwoodCharts=factory();})(typeof self!=='undefined'?self:this,function(){
class AtwoodCharts{
 constructor(canvas,o={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.dataPoints=[];this.activeTab='all';this.theme=o.theme||'light';this.maxDuration=20;this.resize();}
 setTheme(t){this.theme=t;this.draw();}
 resize(){const r=this.canvas.getBoundingClientRect(),d=typeof window==='undefined'?1:window.devicePixelRatio||1;this.width=r.width||600;this.height=r.height||510;this.canvas.width=this.width*d;this.canvas.height=this.height*d;this.ctx.setTransform(d,0,0,d,0,0);}
 reset(){this.dataPoints=[];this.draw();}
 record(time,s){this.dataPoints.push({t:time,y1:s.y1,y2:s.y2,v1:s.v1,v2:s.v2,a1:s.a1??0,a2:s.a2??0,T:s.T,N1:s.N1,N2:s.N2??0,isSlack:s.isSlack});}
 setActiveTab(tab){this.activeTab=tab;this.draw();}
 exportCSV(){
   if(!this.dataPoints.length)return null;
   const keys=['t','y1','y2','v1','v2','a1','a2','T','N1','N2'];
   return 'Time (s),y1 (m),y2 (m),v1 (m/s),v2 (m/s),a1 (m/s^2),a2 (m/s^2),Tension (N),Normal1 (N),Normal2 (N),isSlack\n'+this.dataPoints.map(p=>keys.map(k=>p[k].toFixed(6)).join(',')+','+(p.isSlack?1:0)).join('\n')+'\n';
 }
 text(t,x,y,color='#626d64',align='left',size=11){const c=this.ctx;c.font=size+'px "Segoe UI", Arial, sans-serif';c.direction='ltr';c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(t,x,y);}
 line(x,y,x2,y2,color,width=1){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
 draw(){
   const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);c.fillStyle='#fffcf5';c.fillRect(0,0,w,h);
   const defs={
     pos:{title:'גובה [m]',series:[['y1','גוף 1','#286354'],['y2','גוף 2','#ae543b']]},
     vel:{title:'מהירות [m/s]',series:[['v1','גוף 1','#286354'],['v2','גוף 2','#ae543b']]},
     force:{title:'כוחות [N]',series:[['T','T','#397668'],['N1','N₁','#75602e'],['N2','N₂','#a05276']]}
   };
   const plots=this.activeTab==='all'?['pos','vel','force']:[this.activeTab],slot=h/plots.length;
   const latest=this.dataPoints.at(-1)?.t||0,minT=Math.max(0,latest-20),maxT=Math.max(minT+2,latest);
   const data=this.dataPoints.filter(p=>p.t>=minT);
   plots.forEach((key,index)=>{
     const cfg=defs[key],top=index*slot;
     this.text(cfg.title,w-18,top+19,'#293e37','right',13);
     let lx=18;
     cfg.series.forEach(([k,label,color],i)=>{
       this.line(lx,top+19,lx+13,top+19,color,2);
       this.text(label,lx+18,top+19,color,'left',12);lx+=key==='force'?57:78;
     });
     const x=52,y=top+42,pw=w-76,ph=slot-75;
     let minY=Math.min(0,...data.flatMap(p=>cfg.series.map(s=>p[s[0]])));
     let maxY=Math.max(0,...data.flatMap(p=>cfg.series.map(s=>p[s[0]])));
     if(maxY-minY<.1){maxY+=1;minY-=key==='force'?0:1;}
     const span=maxY-minY;minY=key==='vel'?minY-span*.08:0;maxY+=span*.08;
     const sx=t=>x+(t-minT)/(maxT-minT)*pw,sy=v=>y+ph-(v-minY)/(maxY-minY)*ph;
     for(let i=0;i<=3;i++){
       const v=minY+(maxY-minY)*i/3,yy=sy(v);
       this.line(x,yy,x+pw,yy,'#e8e5d9');this.text(v.toFixed(1),x-8,yy,'#626d64','right');
     }
     for(let i=0;i<=4;i++){const t=minT+(maxT-minT)*i/4;this.line(sx(t),y,sx(t),y+ph,'#eeebdf');this.text(t.toFixed(1),sx(t),y+ph+15,'#626d64','center');}
     this.text('זמן t [s]',x+pw/2,y+ph+28,'#626d64','center',11);
     if(minY<=0&&maxY>=0)this.line(x,sy(0),x+pw,sy(0),'#a6ae9a',1.2);
     c.save();c.beginPath();c.rect(x,y,pw,ph);c.clip();
     cfg.series.forEach(([key,label,color],i)=>{
       c.strokeStyle=color;c.lineWidth=2;c.setLineDash(i===1?[5,3]:i===2?[2,3]:[]);
       c.beginPath();data.forEach((p,j)=>{if(j)c.lineTo(sx(p.t),sy(p[key]));else c.moveTo(sx(p.t),sy(p[key]));});c.stroke();
       if(data.length===1){c.beginPath();c.arc(sx(data[0].t),sy(data[0][key]),3,0,Math.PI*2);c.fillStyle=color;c.fill();}
     });
     c.restore();c.setLineDash([]);
     if(data.length<=1)this.text('הפעל או התקדם צעד כדי להתחיל למדוד',x+pw/2,y+ph/2,'#626d64','center',12);
   });
 }
}
return{AtwoodCharts};
});
