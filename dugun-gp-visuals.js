(function () {
"use strict";
const W=960,H=540,PI=Math.PI;
const C={sky:"#2195f6",sky2:"#74d7f3",navy:"#0e2b5b",pink:"#f5a0bf",white:"#fff7e8"};
const caches=new Map();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const hash=n=>{const v=Math.sin(n*127.13+18.87)*43758.5453;return v-Math.floor(v)};
const rect=(c,x,y,w,h,co)=>{c.fillStyle=co;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))};
const line=(c,x1,y1,x2,y2,col,w=2)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
const poly=(c,points,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.closePath();c.fill()};
const text=(c,t,x,y,size,col,align="center")=>{c.textAlign=align;c.font="900 "+size+"px monospace";c.lineWidth=3;c.strokeStyle="rgba(20,38,62,.65)";c.strokeText(String(t),x,y);c.fillStyle=col;c.fillText(String(t),x,y)};
function skyCloud(c,x,y,s){
  const blocks=[[0,20,78,19],[13,10,62,22],[27,0,39,25],[50,6,38,24],[-12,24,110,10],[12,34,78,8]];
  for(let i=0;i<blocks.length;i++){let [a,b,w,h]=blocks[i];rect(c,x+a*s,y+b*s,w*s,h*s,i%3===0?"#c5edfc":"#f9feff")}
  rect(c,x+10*s,y+38*s,85*s,6*s,"#a0daf6");
}
function skyline(c,stage){
 const gradient=c.createLinearGradient(0,76,0,263);
 gradient.addColorStop(0,"#1277e6");gradient.addColorStop(1,stage===3?"#ffd7a2":"#7fddff");
 rect(c,0,77,W,200,gradient);
 for(let i=0;i<12;i++)skyCloud(c,((i*155+71)%1120)-65,130+(i%4)*12,.43+(i%3)*.22);
 // Far-away green hills and low-rise pastel Istanbul buildings.
 poly(c,[[0,282],[0,252],[60,235],[160,254],[265,240],[355,267],[460,246],[538,257],[645,230],[734,245],[841,227],[960,247],[960,290]],"#4ba65c");
 for(let i=0;i<127;i++){
   const x=i*8-5,h=12+Math.floor(hash(i+stage*3)*34);
   const y=272-h;
   const colors=["#fbdcc7","#edbfbd","#d0e0d0","#ffdba3","#b5ccd0"];
   rect(c,x,y,9,h,colors[i%5]);rect(c,x,y,9,2,i%3===0?"#a77790":"#deaa90");
   if(h>23){rect(c,x+2,y+7,2,3,"#7fb6d0");rect(c,x+6,y+15,2,3,"#6885a7")}
 }
 // Bosphorus and sparkling shore, main bridge skyline.
 if(stage===2){
   rect(c,0,263,W,26,"#128dcf");
   for(let i=0;i<145;i++){let x=hash(i+6)*960,y=265+hash(i+183)*20;rect(c,x,y,2+hash(i)*9,1,i%3?"#b7f3fa":"#54bee3")}
   // Twin suspension bridge towers, deck and suspended cable.
   rect(c,103,207,10,73,"#375277");rect(c,658,214,10,66,"#375277");
   rect(c,73,258,690,6,"#4b6281");
   for(let i=0;i<59;i++){
     let x=97+i*10;
     let dip=220+40*(1-Math.pow(Math.abs((x-382)/290),1.5));
     if(i%2===0)line(c,x,dip,x,260,"#486181",1.1);
   }
   const bridgePts=[];
   for(let x=98;x<=664;x+=5)bridgePts.push([x,219+40*(1-Math.pow(Math.abs((x-382)/284),1.5))]);
   c.strokeStyle="#354c79";c.lineWidth=5;c.beginPath();bridgePts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();
   // City ferry pixel silhouette on the water.
   rect(c,780,269,72,8,"#f6f9ed");rect(c,788,258,51,12,"#edf5f4");
   rect(c,810,250,18,8,"#f8f8e7");
   for(let i=0;i<8;i++)rect(c,791+i*6,261,4,3,"#4c8fb4");
   poly(c,[[776,277],[859,277],[849,284],[790,284]],"#164d82");
   line(c,834,248,834,258,"#3a4d7e",2);rect(c,835,248,8,5,"#e9344e");
 }else if(stage===1){
   // Neighborhood roofs and welcoming houses.
   for(let i=0;i<23;i++){
     let x=i*47-8,w=34+hash(i)*22,y=245+hash(i+45)*17,h=34+hash(i+23)*30;
     rect(c,x,y-h,w,h,["#f5ccac","#efc0a7","#d8d2ba","#ffdcbf"][i%4]);
     poly(c,[[x-4,y-h],[x+w+4,y-h],[x+w-8,y-h-12],[x+9,y-h-12]],["#b75b66","#a85d51","#b77964"][i%3]);
     for(let j=0;j<3;j++)rect(c,x+6+j*13,y-h+9,7,10,"#6ca0b2");
     if(i%3===0){rect(c,x+5,y-8,26,7,"#b83d52");text(c,"DÜĞÜN",x+18,y-3,5,"#fff4ce")}
   }
 }else{
   // Wedding venue with arch and fairy lights.
   rect(c,65,218,141,63,"#f8e9d2");rect(c,64,218,144,7,"#a53c61");
   rect(c,65,229,140,15,"#c74765");text(c,"DÜĞÜN SALONU",135,241,12,"#fff2d7");
   for(let i=0;i<5;i++){rect(c,78+i*25,253,12,24,"#bd6e6b");rect(c,82+i*25,259,5,4,"#ffe9a1")}
   for(let i=0;i<22;i++)rect(c,20+i*26,202+(i%4)*5,4,5,i%2?"#e8dd96":"#e69cab");
 }
}
function staticScene(stage){
 if(caches.has(stage))return caches.get(stage);
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 const c=canvas.getContext("2d");
 const sky=c.createLinearGradient(0,0,0,285);
 sky.addColorStop(0,"#084fc6");sky.addColorStop(.5,"#1c94ef");sky.addColorStop(1,"#92e0fa");
 rect(c,0,0,W,540,sky);skyline(c,stage);
 caches.set(stage,canvas);return canvas;
}
function roadGeom(y,distance){
 const t=clamp((y-274)/266,0,1);
 const curve=Math.sin(distance*.0019+.3-t*.72)*43*t*t;
 return {t,cx:480+curve,half:20+515*Math.pow(t,1.31)};
}
function roadY(z){return 275+264*Math.pow(clamp(1-z,0,1),1.52)}
function road(c,distance,stage){
 // Speed-sensitive lane markers and shoulder texture, drawn from horizon to foreground.
 rect(c,0,277,960,263,stage===3?"#71b149":"#5ca538");
 for(let y=276;y<540;y+=2){
   const {t,cx,half}=roadGeom(y,distance);
   const period=distance*.10+1/(t+.075)*11;
   const cycle=((Math.floor(period)%7)+7)%7;
   const curb=((Math.floor(period*1.6)%4)+4)%4;
   rect(c,0,y,960,2,Math.floor(y/14)%2?"#5ca838":"#60ac38");
   rect(c,cx-half-9*t,y,2*half+18*t,2,"#f5e7cf");
   rect(c,cx-half-7*t,y,2*half+14*t,2,curb<2?"#ec404a":"#fff4e3");
   rect(c,cx-half,y,2*half,2,Math.floor(y)%4?"#303c4c":"#384657");
   if(t>.27&&Math.floor((y+distance*.14)*.4)%13===0)rect(c,cx-half+22*t,y,half*2-43*t,1,"#455362");
   rect(c,cx-half+3*t,y,Math.max(1,t*3),2,"#f5e6d1");
   rect(c,cx+half-6*t,y,Math.max(1,t*3),2,"#f5e6d1");
   if(cycle>1&&cycle<6){
     for(let k=-1;k<=1;k+=2){const x=cx+k*half/3;rect(c,x,y,Math.max(2,t*4.3),2,"#f6f6ed")}
   }
 }
 // Guard rails and perspective roadside poles.
 for(let side of [-1,1]){
   for(let i=0;i<19;i++){
     const z=((i/19+distance*.00031)%1),y=roadY(z);
     if(y<277||y>545)continue;
     const g=roadGeom(y,distance),x=g.cx+side*(g.half+13+24*(1-z));
     let h=10+40*Math.pow(1-z,1.4);
     line(c,x,y,x,y-h,"#57697b",Math.max(1,(1-z)*3.8));
     rect(c,x-3,y-h-2,7,3,"#b2b5b0");
   }
 }
}
function starFlag(c,x,y,size){
 const s=size;
 rect(c,x,y-s*1.3,Math.max(2,s*.08),s*1.32,"#b2aa91");
 poly(c,[[x+2,y-s*1.27],[x+s*.86,y-s*1.18],[x+s*.86,y-s*.68],[x+2,y-s*.76]],"#e82e46");
 c.fillStyle="#fff7de";c.beginPath();c.arc(x+s*.36,y-s*.98,s*.15,0,2*PI);c.fill();
 c.fillStyle="#e82e46";c.beginPath();c.arc(x+s*.42,y-s*1.02,s*.13,0,2*PI);c.fill();
 rect(c,x+s*.60,y-s*1.04,Math.max(1,s*.055),Math.max(1,s*.06),"#fff7dc");
}
function bystander(c,x,y,s,look=0){
 // Guests: little pixel characters waving and wearing wedding clothes.
 const skin=["#e9ac7a","#bf815e","#edc298"][look%3];
 rect(c,x-s*.085,y-s*1.39,s*.17,s*.24,skin);
 rect(c,x-s*.2,y-s*1.16,s*.4,s*.58,["#f0d4e5","#213e75","#ea6886","#e6e5c1"][look%4]);
 rect(c,x-s*.19,y-s*.56,s*.13,s*.56,"#26344f");rect(c,x+s*.06,y-s*.56,s*.13,s*.56,"#26344f");
 line(c,x-s*.19,y-s*1.03,x-s*.46,y-s*1.35,skin,Math.max(2,s*.09));
 line(c,x+s*.16,y-s*1.02,x+s*.38,y-s*1.46,skin,Math.max(2,s*.09));
 if(look%4===0)rect(c,x+s*.24,y-s*1.63,s*.24,s*.2,"#f2e9cf");
}
function sideDecor(c,state){
 const d=state.g.distance,stage=state.g.lap;
 for(let i=0;i<28;i++){
  let z=((i/28+d*.00023)%1),y=roadY(z);
  if(y<279)continue;
  const g=roadGeom(y,d),side=i%2?1:-1;
  const size=5+54*Math.pow(1-z,1.65),x=g.cx+side*(g.half+22+12*(1-z));
  if(x<-80||x>1050)continue;
  if(i%5===0)starFlag(c,x,y,size*.88);
  else if(i%5===1)bystander(c,x,y,size*.68,i);
  else if(i%5===2){
   rect(c,x-size*.38,y-size*1.21,size*.76,size*.44,"#f8efd6");
   rect(c,x-size*.38,y-size*1.21,size*.76,size*.09,"#d5455e");
   if(size>25){text(c,stage===3?"SALON":stage===2?"E-5":"GELİN",x,y-size*.92,Math.max(6,size*.15),"#a83d56")}
  }else if(i%5===3){
   rect(c,x-size*.065,y-size*.83,size*.13,size*.85,"#755a42");
   poly(c,[[x,y-size*1.7],[x-size*.53,y-size*.45],[x+size*.53,y-size*.45]],"#146d48");
   poly(c,[[x,y-size*1.34],[x-size*.7,y-size*.11],[x+size*.70,y-size*.11]],"#278d53");
  }else{
   rect(c,x-size*.09,y-size*.91,size*.15,size*.9,"#515e76");
   rect(c,x-size*.18,y-size*.95,size*.9,size*.16,"#eee9db");
   if(size>20)text(c,"♥",x+size*.23,y-size*.85,Math.max(8,size*.26),"#e64d78");
  }
 }
}
function lampPosts(c,state){
 const d=state.g.distance;
 for(let side of [-1,1]){
  for(let i=0;i<13;i++){
   let z=(i/13+d*.00024)%1,y=roadY(z);
   if(y<279)continue;
   let g=roadGeom(y,d),h=10+90*Math.pow(1-z,1.75);
   let x=g.cx+side*(g.half+30+20*(1-z));
   if(x<-30||x>1000)continue;
   line(c,x,y,x,y-h,"#3f5066",Math.max(2,h*.07));
   line(c,x,y-h,x-side*h*.38,y-h,"#465568",Math.max(2,h*.047));
   rect(c,x-side*h*.41,y-h-2,Math.max(2,h*.19),Math.max(2,h*.05),"#ffebbb");
  }
 }
}
function weddingRibbon(c,x,y,w,h,ribbon="#f0a5ba"){
  const z=w/110;
  poly(c,[[x,y],[x-w*.19,y-h*.15],[x-w*.15,y+h*.22],[x,y+h*.08]],ribbon);
  poly(c,[[x,y],[x+w*.19,y-h*.15],[x+w*.15,y+h*.22],[x,y+h*.08]],ribbon);
  rect(c,x-w*.04,y,w*.08,h*.14,"#c7476d");
  line(c,x,y+h*.1,x-w*.12,y+h*.5,"#fff2e9",Math.max(2,w*.025));
  line(c,x,y+h*.1,x+w*.12,y+h*.5,"#fff2e9",Math.max(2,w*.025));
}
function vehicle(c,x,y,w,model,color,decorated,player=false,seconds=0){
 const h=w*(model==="van"?.66:.56),l=x-w*.5,t=y-h;
 if(w<8){rect(c,x-3,y-5,6,5,color);return;}
 // Ground shadow + tires.
 rect(c,l-w*.06,y-h*.16,w*1.12,h*.25,"#17293b");
 rect(c,l-w*.04,y-h*.26,w*.18,h*.29,"#142033");
 rect(c,l+w*.83,y-h*.26,w*.18,h*.29,"#142033");
 // Body and cabin silhouette.
 poly(c,[[l+w*.08,t+h*.38],[l+w*.22,t+h*.09],[l+w*.76,t+h*.09],[l+w*.92,t+h*.38],[l+w*.98,t+h*.54],[l+w*.98,y-h*.10],[l+w*.02,y-h*.1],[l+w*.02,t+h*.54]],color);
 rect(c,l+w*.06,t+h*.39,w*.88,h*.07,"#f3dcc4");
 poly(c,[[l+w*.24,t+h*.34],[l+w*.28,t+h*.13],[l+w*.72,t+h*.13],[l+w*.76,t+h*.34]],"#1f5277");
 poly(c,[[l+w*.29,t+h*.30],[l+w*.32,t+h*.17],[l+w*.48,t+h*.17],[l+w*.46,t+h*.30]],"#78c8ea");
 rect(c,l+w*.06,t+h*.70,w*.88,h*.12,"#a9afb1");
 rect(c,l+w*.08,t+h*.70,w*.14,h*.12,"#f86f65");
 rect(c,l+w*.78,t+h*.70,w*.14,h*.12,"#fa776d");
 rect(c,l+w*.13,t+h*.84,w*.75,h*.04,"#f6f0db");
 rect(c,l+w*.36,t+h*.78,w*.28,h*.14,"#fff6dd");
 if(w>28)text(c,player?"DÜĞÜN VAR":"34",x,t+h*.88,Math.max(6,w*.091),"#2f3d53");
 if(decorated){
  // White-pink V ribbon from roof to boot.
  line(c,l+w*.28,t+h*.08,x,t+h*.62,"#ffedf2",Math.max(2,w*.035));
  line(c,l+w*.72,t+h*.08,x,t+h*.62,"#f5b7d1",Math.max(2,w*.035));
  weddingRibbon(c,x,t+h*.57,w*.85,h*.65,player?"#f9a5bd":"#fbd2e1");
  for(let i=-2;i<=2;i++){
   let xx=x+i*w*.065,yy=t+h*.43+Math.abs(i)*w*.01;
   rect(c,xx-2,yy-2,Math.max(3,w*.04),Math.max(3,w*.04),["#f9d6a3","#f18caf","#f7ece1","#89b76b","#f8b4cf"][i+2]);
  }
  if(player&&w>70){
    // Big floral bouquet and trailing ribbons, distinct main player.
    for(let i=0;i<15;i++){
      let a=i*2.39,r=Math.sqrt(i)*w*.052,xx=x+Math.cos(a)*r,yy=t+h*.58+Math.sin(a)*r*.42;
      rect(c,xx-4,yy-4,8,8,i%3===0?"#ed6491":i%3===1?"#fff2dc":"#5e9b65");
      rect(c,xx-2,yy-2,4,4,"#f8d98f");
    }
    weddingRibbon(c,l+w*.1,t+h*.56,w*.5,h*.62);
    weddingRibbon(c,l+w*.9,t+h*.56,w*.5,h*.62);
    for(let i=-2;i<=2;i++){const xx=x+i*w*.17;line(c,xx,y-3,xx+(i%2?-2:5),y+12+i%2*4,"#fee6eb",2);rect(c,xx,y+9+i%2*3,7,7,i%2?"#b5d7df":"#d8b7d3")}
  }
 }
 if(player){
   line(c,l+w*.13,y-1,l+w*.13,y+Math.sin(seconds*13)*2+5,"#343d45",3);
   line(c,l+w*.86,y-1,l+w*.86,y+Math.sin(seconds*13)*2+5,"#343d45",3);
 }
}
function roadTarget(c,x,y,size,t){
 const pulse=1+.08*Math.sin(t*7),w=size*1.15*pulse;
 c.strokeStyle="#ffe05d";c.lineWidth=Math.max(2,size*.07);c.beginPath();c.ellipse(x,y-size*.39,w*.55,w*.29,0,0,2*PI);c.stroke();
 const boxW=clamp(size*1.08,48,132);rect(c,x-boxW/2,y-size*1.18,boxW,25,"#ffe9aa");
 rect(c,x-boxW/2,y-size*1.18,boxW,3,"#e57d44");
 text(c,"KORNA!",x,y-size*1.18+17,clamp(size*.15,9,14),"#ad3e4b");
}
function roadblock(c,x,y,w){rect(c,x-w*.6,y-w*.3,w*1.2,8,"#f8edcf");text(c,"FREN!",x,y-w*.48,Math.max(10,w*.22),"#e23d59");for(let i=-1;i<=1;i+=2)bystander(c,x+i*w*.56,y,w*.52,i+2)}
function distantConvoy(c,state){
 const {g,seconds}=state;
 // Lead bridal car and persistent convoy around it, matching real player progress.
 let z=.63+.02*Math.sin(seconds*.5),y=roadY(z),gg=roadGeom(y,g.distance);
 vehicle(c,gg.cx,y,56,"sedan","#fcf4e4",true,false,seconds);
 const n=Math.min(5,Math.max(0,g.convoy-1));
 for(let i=n-1;i>=0;i--){
   const zz=.43+(i/2|0)*.13,y2=roadY(zz),gr=roadGeom(y2,g.distance);
   let lane=[-.73,.73,0][i%3],x=gr.cx+lane*gr.half*.81,w=15+95*Math.pow(1-zz,1.5);
   vehicle(c,x,y2,w,i%3===1?"van":"sedan",["#e5d4bb","#273f5e","#c4cabe","#dfdfd4"][i%4],true,false,seconds);
 }
}
function displayTraffic(c,state){
 const {objects,g,seconds}=state;
 const onscreen=objects.filter(o=>o.z<1.03&&o.z>-.1).sort((a,b)=>b.z-a.z);
 const target=onscreen.filter(o=>o.type==="guest"&&!o.joined&&o.z<.76&&o.z>.14&&Math.abs(o.lane-g.lane)<.74).sort((a,b)=>a.z-b.z)[0];
 for(const o of onscreen){
   const y=roadY(o.z),geom=roadGeom(y,g.distance),x=geom.cx+o.lane*geom.half*.81,w=10+112*Math.pow(1-clamp(o.z,0,1),1.6);
   if(o.type==="roadblock"){roadblock(c,x,y,w);continue}
   const decorated=!!o.joined||o.type==="rival"||o.type==="escort";
   const color=o.type==="rival"?"#34395b":o.type==="guest"?"#e8dfd2":["#a4b2bc","#cc9f76","#ae8ab3"][o.variant%3];
   vehicle(c,x,y,w,o.variant%6===3?"van":"sedan",color,decorated,false,seconds);
   if(o===target&&g.hornCD<=.02)roadTarget(c,x,y,w,seconds);
   else if(o.type==="guest"&&o.z>.2&&w>30){text(c,"+",x,y-w*.87,Math.max(15,w*.23),"#fff0b1")}
   if(o.joined&&o.z<.7)text(c,"♥",x,y-w*.75,Math.max(10,w*.17),"#ff92bf");
 }
}
function playerVehicle(c,state){
 const {g,activeCar,seconds}=state;
 const y=506,geom=roadGeom(y,g.distance);
 const x=geom.cx+g.lane*geom.half*.81;
 if(g.invuln>0&&Math.floor(seconds*9)%3===0)return;
 if(g.dortluOn>0&&Math.floor(seconds*7)%2===0){rect(c,x-73,y-30,17,9,"#ffd34c");rect(c,x+56,y-30,17,9,"#ffd34c")}
 const color=activeCar==="toros"?"#6f9374":activeCar==="doblo"?"#dfb750":"#faf9ef";
 vehicle(c,x,y,170,activeCar==="doblo"?"van":"sedan",color,true,true,seconds);
}
function confetti(c,state){
 const {particles,g,seconds}=state;
 for(const p of particles){let col=p.color||"#fa8dba";rect(c,p.x*2,p.y*2,Math.max(2,p.life*5),Math.max(2,p.life*6),col)}
 if(g.halay>0)for(let i=0;i<18;i++){let t=seconds*1.4+i*2,x=(i*59+t*15)%960,y=310+(i*13+t*39)%240;rect(c,x,y,5,4,["#ef709d","#ffdb9c","#fff0de"][i%3])}
 if(state.input?.boost&&g.speed>145)for(let i=0;i<22;i++){let x=(i*73+seconds*120)%960,y=355+(i*43+seconds*300)%190;rect(c,x,y,2,12,"#c4d4dc")}
}
function render(c,state){
 const {g}=state;
 c.setTransform(1,0,0,1,0,0);
 c.imageSmoothingEnabled=false;
 c.drawImage(staticScene(g.lap),0,0);
 road(c,g.distance,g.lap);
 // Layering: roadside before cars.
 sideDecor(c,state);lampPosts(c,state);
 distantConvoy(c,state);displayTraffic(c,state);playerVehicle(c,state);confetti(c,state);
 if(state.mode==="menu"){rect(c,330,120,300,44,"#ffe4af");text(c,"DÜĞÜN KONVOYU GP",480,149,22,"#b33a53")}
 if(state.flash>0){c.fillStyle="rgba(255,240,225,"+clamp(state.flash*.8,0,.4)+")";c.fillRect(0,120,960,420)}
}
window.DugunVisuals={render,version:"2026.10.31"};
})();