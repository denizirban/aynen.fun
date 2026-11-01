(function(){
"use strict";
const W=960,H=540,PI=Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const seed=(n)=>{const t=Math.sin(n*127.1+26.4)*43758.5453;return t-Math.floor(t)};
const grad=(c,x,y,x2,y2,stops)=>{const g=c.createLinearGradient(x,y,x2,y2);for(const [p,v] of stops)g.addColorStop(p,v);return g};
const fill=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
const line=(c,x1,y1,x2,y2,color,width=2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke()};
function shape(c,pts,color,stroke="#273d4b",width=2){c.beginPath();c.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)c.lineTo(...pts[i]);c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin="round";c.stroke()}}
function oval(c,x,y,rx,ry,color,stroke,sw=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=sw;c.stroke()}}
function print(c,t,x,y,size=16,col="#fff",align="center",stroke="#293647"){c.textAlign=align;c.font="900 "+size+"px system-ui,Arial,sans-serif";if(stroke){c.lineJoin="round";c.strokeStyle=stroke;c.lineWidth=Math.max(2,size*.24);c.strokeText(String(t),x,y)}c.fillStyle=col;c.fillText(String(t),x,y)}
const roadY=z=>230+310*Math.pow(1-clamp(z,0,1),1.55);
function roadG(y,d){const t=clamp((y-230)/310,0,1),bend=(Math.sin(d*.0024-t*.95)*58+Math.sin(d*.00067)*16)*t*t;return {t,center:480+bend,half:22+584*Math.pow(t,1.20)}}
const place=(z,lane,d,roadEdge=false)=>{const y=roadY(z),r=roadG(y,d);return{x:r.center+(roadEdge?((lane>0?1:-1)*(r.half+15+(1-z)*32)):lane*r.half*.79),y,scale:Math.pow(1-clamp(z,0,1),1.45),r}};
function clouds(c,t){
 const cloudList=[[60,115,1],[285,82,.76],[580,139,.56],[855,92,.91],[1040,148,.62]];
 for(let i=0;i<cloudList.length;i++){const [bx,by,z]=cloudList[i],x=((bx-t*.07+1400)%1400)-200;
  c.fillStyle="rgba(255,255,255,.83)";c.beginPath();c.ellipse(x,by,58*z,16*z,0,0,PI*2);c.ellipse(x-24*z,by-10*z,28*z,23*z,0,0,PI*2);c.ellipse(x+13*z,by-16*z,37*z,28*z,0,0,PI*2);c.fill();
 }
}
function sky(c,s){
 fill(c,0,0,W,H,grad(c,0,0,0,290,[[0,"#54c8fb"],[.56,"#9ce3f5"],[1,"#d7f0e5"]]));
 oval(c,805,85,30,30,"#fff0ad");clouds(c,s.g.distance);
 // Hills, skyline and coastal/urban landmarks, layered with atmospheric depth.
 shape(c,[[0,237],[0,200],[100,192],[171,207],[294,179],[407,207],[511,181],[630,207],[743,184],[848,200],[960,177],[960,244]],"#8bcf89",null);
 shape(c,[[0,242],[0,217],[118,206],[230,226],[321,207],[452,234],[564,211],[654,224],[789,204],[883,219],[960,206],[960,250]],"#54a878",null);
 for(let i=0;i<39;i++){
  const x=i*27-5,h=18+seed(i+12)*63,y=235-h;
  const co=["#f4c6a8","#f9dfa9","#b8bfe0","#d6e8e0","#eab9b3"][i%5];
  fill(c,x,y,30,h,co);fill(c,x,y,30,4,"#dfb4a2");
  for(let j=0;j<4;j++)if(12+j*15<h)fill(c,x+6+(i%2)*10,y+10+j*15,6,8,"#8fb4c6");
 }
 if(s.g.lap===2){
  fill(c,0,230,300,10,"#76cfe7");
  line(c,70,201,740,214,"#58788e",6);for(let i=0;i<19;i++)line(c,100+i*35,205,100+i*35,230,"#6a8191",1);
 }else if(s.g.lap===3){
  fill(c,55,159,178,83,"#fff2d9");fill(c,55,158,178,12,"#d96878");
  print(c,"DÜĞÜN SALONU",144,199,17,"#ab3d60");for(let i=0;i<6;i++)fill(c,68+i*26,211,15,20,"#8cc8cf");
 }
}
function roadway(c,s){
 const d=s.g.distance;
 fill(c,0,230,W,310,"#79b763");
 // Build road surface as projected strips, allowing the bend to change with depth.
 for(let y=231;y<542;y+=4){
  const r=roadG(y,d),b=roadG(y+4,d);
  const pts=[[r.center-r.half,y],[r.center+r.half,y],[b.center+b.half,y+5],[b.center-b.half,y+5]];
  shape(c,pts,grad(c,0,y,0,y+16,[[0,"#67757e"],[1,"#64727e"]]),null);
 }
 for(let i=0;i<53;i++){
  const z=(i/53+d*.00044)%1,position=place(z,0,d),r=position.r,yy=position.y,al=clamp((1-z)*.28,0,.25);
  if(yy<230)continue;
  fill(c,r.center-r.half+12,yy,Math.max(1,3*position.scale),1,"rgba(255,255,255,"+al+")");
 }
 // Roadside pavement and kerbs have solid 3D profiles.
 for(let side of [-1,1]){
  const curb=[];const edge=[];
  for(let y=231;y<=540;y+=5){const r=roadG(y,d);curb.push([r.center+side*(r.half+11*r.t),y]);edge.push([r.center+side*(r.half-2),y]);}
  for(let j=0;j<curb.length-1;j++){
   const a=curb[j],b=curb[j+1],aa=edge[j],bb=edge[j+1];
   shape(c,[a,b,bb,aa],j%2===0?"#f0e5cc":"#d4d6cc",null);
  }
  c.beginPath();edge.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle="#fff5d9";c.lineWidth=3;c.stroke();
 }
 // Physical lane dividers, projected road segments that move with the car.
 for(let i=0;i<23;i++){
  const z=((i/23+d*.00105)%1),z2=clamp(z-.022,0,1);
  const a=place(z,0,d),b=place(z2,0,d);
  if(a.y<233||b.y>544)continue;
  const r1=a.r,r2=b.r;
  for(const lateral of [-1/3,1/3]){
   shape(c,[[r1.center+lateral*r1.half,a.y],[r1.center+lateral*r1.half+Math.max(1,3*a.scale),a.y],[r2.center+lateral*r2.half+Math.max(2,6*b.scale),b.y],[r2.center+lateral*r2.half,b.y]],"#f5f0dc",null);
  }
 }
}
function tree(c,x,y,s,t){
 if(s<3)return;const h=s*1.8;
 oval(c,x,y+3,s*.40,s*.14,"rgba(26,64,51,.17)");
 shape(c,[[x-s*.10,y],[x+s*.10,y],[x+s*.15,y-h*.50],[x-s*.11,y-h*.50]],"#82644b","#514d44",Math.max(.7,s*.025));
 for(let i=0;i<5;i++){const theta=i*2.31+t*.08,xx=x+Math.cos(theta)*s*.31,yy=y-h*.67+Math.sin(theta)*s*.14;
  oval(c,xx,yy,s*.49,s*.44,i%2?"#3d9f58":"#52b967","#347b55",Math.max(.8,s*.035));
 }
 oval(c,x-s*.17,y-h*.87,s*.14,s*.08,"#a8de8f");
}
const SKINS=["#dba37d","#a9684a","#efc4a7"];
function person(c,x,y,s,i){
 if(s<5)return;
 oval(c,x,y+1,s*.28,s*.10,"rgba(28,37,40,.18)");
 // Shoes, pants, torso, raised wave and face.
 line(c,x-s*.13,y-s*.42,x-s*.17,y,"#414653",Math.max(2,s*.12));
 line(c,x+s*.11,y-s*.42,x+s*.17,y,"#414653",Math.max(2,s*.12));
 shape(c,[[x-s*.28,y-s*1.16],[x+s*.24,y-s*1.16],[x+s*.29,y-s*.42],[x-s*.28,y-s*.42]],["#fcf2dc","#d75f75","#67869e","#e3ba68"][i%4],"#53464a",Math.max(1,s*.035));
 const skin=SKINS[i%3];
 line(c,x+s*.23,y-s*1.03,x+s*.52,y-s*1.43,skin,Math.max(2,s*.13));
 line(c,x-s*.22,y-s*1.04,x-s*.39,y-s*.84,skin,Math.max(2,s*.11));
 oval(c,x,y-s*1.42,s*.21,s*.26,skin,"#705b54",Math.max(.8,s*.04));
 oval(c,x,y-s*1.65,s*.22,s*.11,["#553c34","#77513d","#353c46"][i%3]);
}
function house(c,x,y,s,i,side,stage){
 if(s<5)return;const w=s*1.25,h=s*(stage===2?2.1:1.45),depth=s*.24;
 oval(c,x,y+4,w*.70,s*.16,"rgba(24,56,42,.18)");
 const base=x-w*.5;
 shape(c,[[base,y-h],[base+side*depth,y-h-depth*.47],[base+w+side*depth,y-h-depth*.47],[base+w,y-h]],"#d2a486","#293a45",Math.max(1,s*.023));
 shape(c,[[base+w,y-h],[base+w+side*depth,y-h-depth*.47],[base+w+side*depth,y-depth*.48],[base+w,y]],"#d5a6a0","#384856",Math.max(1,s*.025));
 const colors=stage===2?["#e6c5a4","#d1d7be","#c6c3dc","#f0c4a4"]:["#fee4bd","#ecc2b3","#d3d8b4","#bfd9dd"];
 shape(c,[[base,y-h],[base+w,y-h],[base+w,y],[base,y]],colors[i%4],"#46505a",Math.max(1,s*.035));
 if(stage!==2){
  shape(c,[[base-5,y-h],[base+w+4,y-h],[base+w*.7,y-h-s*.33],[base+w*.19,y-h-s*.33]],["#c9706d","#b65d61","#d69a67"][i%3],"#66545b",Math.max(1,s*.04));
 } else fill(c,base,y-h-5,w,9,"#58677b");
 const rows=stage===2?3:2;
 for(let k=0;k<rows;k++)for(let j=0;j<2;j++){
  const xx=base+w*(.18+j*.47),yy=y-h+s*(.23+k*.32);
  fill(c,xx,yy,s*.19,s*.21,"#567f8e");fill(c,xx+2,yy+2,s*.07,s*.16,"#a9dbea");
  line(c,xx+s*.095,yy,xx+s*.095,yy+s*.20,"#f8e9ce",Math.max(1,s*.014));
 }
 if(s>37&&i%3===0){
  const name=stage===3?["SALON","TAKI","DÜĞÜN"][i%3]:stage===2?["LASTİK","SERVİS","BÜFE"][i%3]:["ÇİÇEKÇİ","BERBER","BÜFE"][i%3];
  fill(c,base+3,y-s*.38,w-6,s*.28,"#f3dfae");print(c,name,x,y-s*.18,Math.max(8,s*.15),"#8a4d52","center",null);
 }
}
function flag(c,x,y,s){
 line(c,x,y,x,y-s*1.4,"#596a75",Math.max(1,s*.035));
 shape(c,[[x,y-s*1.38],[x+s*.9,y-s*1.26],[x+s*.9,y-s*.66],[x,y-s*.82]],"#e83f4c",null);
 oval(c,x+s*.36,y-s*1.03,s*.13,s*.14,"#fff5e8");oval(c,x+s*.40,y-s*1.05,s*.13,s*.13,"#e83f4c");
}
function streets(c,s){
 const d=s.g.distance,stage=s.g.lap;
 // Painter's algorithm: render distant props before nearby props for stable perspective.
 const slots=[];
 for(let i=0;i<34;i++)slots.push({i,z:((i/34+d*.00026)%1)});
 slots.sort((a,b)=>b.z-a.z);
 for(const {i,z} of slots){
  const side=i%2===0?-1:1,p=place(z,side,d,true),sz=8+135*Math.pow(1-z,1.8);
  const x=p.x+side*sz*.72,y=p.y;
  if(x<-260||x>1220)continue;
  if(i%5===0)house(c,x,y,sz*(stage===2?1.25:1),i,side,stage);
  else if(i%5===1)tree(c,x,y,sz*.75,d);
  else if(i%5===2)house(c,x,y,sz*.85,i+4,side,stage);
  else if(i%5===3){person(c,x,y,sz*.53,i);if(i%3===0)flag(c,x+side*sz*.5,y,sz*.8);}
  else{
   const h=sz*1.9;
   line(c,x,y,x,y-h,"#687b84",Math.max(1,sz*.065));
   line(c,x,y-h,x-side*sz*.36,y-h,"#687b84",Math.max(1,sz*.065));
   oval(c,x-side*sz*.36,y-h,sz*.18,sz*.07,"#fff4bc","#718b8e",1);
  }
 }
}
function plate(c,pts,color,outline="#364653",width=2){shape(c,pts,color,outline,width)}
function weddingVehicle(c,x,y,w,kind,color,decorated,sec,steer=0){
 if(w<6)return;
 const h=w*(kind==="doblo"?.69:kind==="toros"?.57:.60);
 c.save();c.translate(x,y);c.rotate(steer*.033);
 oval(c,0,-h*.04,w*.59,h*.15,"rgba(12,30,34,.25)");
 // Four wheels and dark outlined volumetric body.
 plate(c,[[-w*.49,-h*.19],[-w*.37,-h*.28],[-w*.32,h*.07],[-w*.48,h*.1]],"#253641","#172934",Math.max(1,w*.025));
 plate(c,[[w*.49,-h*.19],[w*.37,-h*.28],[w*.32,h*.07],[w*.48,h*.1]],"#253641","#172934",Math.max(1,w*.025));
 // Body roof taper, front/back surfaces and angular chassis side.
 plate(c,[[-w*.45,-h*.22],[-w*.37,-h*.75],[-w*.24,-h*.92],[w*.24,-h*.92],[w*.37,-h*.75],[w*.45,-h*.22],[w*.50,-h*.08],[w*.48,0],[-w*.48,0],[-w*.50,-h*.08]],color,"#314350",Math.max(1,w*.031));
 plate(c,[[-w*.48,-h*.22],[-w*.40,-h*.52],[w*.40,-h*.52],[w*.48,-h*.22]],"#dce0d2","#425062",Math.max(1,w*.017));
 plate(c,[[-w*.35,-h*.73],[-w*.27,-h*.89],[w*.27,-h*.89],[w*.35,-h*.73],[w*.39,-h*.47],[-w*.39,-h*.47]],kind==="doblo"?"#344961":"#446d86","#283f53",Math.max(1,w*.021));
 plate(c,[[-w*.29,-h*.80],[-w*.23,-h*.86],[-w*.03,-h*.86],[-w*.06,-h*.56],[-w*.32,-h*.56]],"#a6d3e4",null);
 line(c,0,-h*.87,0,-h*.49,"#304e68",Math.max(1,w*.016));
 plate(c,[[-w*.47,-h*.25],[w*.47,-h*.25],[w*.47,-h*.04],[-w*.47,-h*.04]],color,"#36444f",Math.max(1,w*.014));
 plate(c,[[-w*.49,-h*.12],[w*.49,-h*.12],[w*.45,-h*.025],[-w*.45,-h*.025]],"#42505d",null);
 fill(c,-w*.44,-h*.23,w*.16,h*.105,"#fb6c67");fill(c,w*.28,-h*.23,w*.16,h*.105,"#fb6c67");
 fill(c,-w*.21,-h*.115,w*.42,h*.075,"#e9dfc6");
 fill(c,-w*.11,-h*.104,w*.22,h*.057,"#fff6da");
 if(w>46)print(c,decorated?"34 DGN":"34",0,-h*.062,Math.max(8,w*.080),"#3c4650","center",null);
 if(decorated){
  line(c,-w*.26,-h*.72,0,-h*.26,"#fff6e2",Math.max(1.5,w*.027));
  line(c,w*.26,-h*.72,0,-h*.26,"#f8dce2",Math.max(1.5,w*.027));
  oval(c,0,-h*.26,w*.12,w*.07,"#f486a3","#fff1db",Math.max(1,w*.013));
  for(let i=0;i<5;i++)oval(c,(i-2)*w*.078,-h*.30-Math.sin(i)*w*.038,w*.03,w*.03,i%2?"#f4df81":"#fff4e4");
  if(w>90)for(let i=-2;i<=2;i++){
   line(c,i*w*.17,-h*.02,i*w*.17+Math.sin(sec*10+i)*3,h*.13,"#f9eef2",Math.max(1,w*.013));
   oval(c,i*w*.17+Math.sin(sec*10+i)*3,h*.13,w*.033,w*.05,i%2?"#e5b6bd":"#e3d6a2");
  }
 }
 // Cel-shaded side highlights and warm rim light.
 line(c,-w*.42,-h*.23,-w*.37,-h*.66,"rgba(255,255,255,.55)",Math.max(1,w*.022));
 line(c,w*.42,-h*.22,w*.38,-h*.60,"rgba(45,67,81,.3)",Math.max(1,w*.026));
 c.restore();
}
function roadblock(c,x,y,s){const w=s*.95;
 oval(c,x,y,w*.5,s*.13,"rgba(16,36,41,.21)");
 fill(c,x-w*.5,y-s*.40,w,s*.22,"#eae4d6");
 for(let i=0;i<5;i++)shape(c,[[x-w*.5+i*w/5,y-s*.40],[x-w*.5+(i+.5)*w/5,y-s*.40],[x-w*.5+(i+1)*w/5,y-s*.18],[x-w*.5+(i+.5)*w/5,y-s*.18]],"#e9684d",null);
 if(s>32)print(c,"YOL KESME",x,y-s*.54,Math.max(11,s*.2),"#fff5c8");
}
function traffic(c,s){
 const {g,objects,seconds}=s,d=g.distance;
 const base=objects.filter(o=>o.z<1.02&&o.z>-.12).sort((a,b)=>b.z-a.z);
 const target=base.filter(o=>o.type==="guest"&&!o.joined&&o.z<.76&&o.z>.14&&Math.abs(o.lane-g.lane)<.75).sort((a,b)=>a.z-b.z)[0];
 for(const o of base){
  const p=place(o.z,o.lane,d),x=p.x,y=p.y,w=16+120*p.scale;
  if(o.type==="roadblock"){roadblock(c,x,y,w);continue}
  const colored=o.type==="rival"?"#ab62a7":o.type==="guest"?"#f1bd70":["#c9d7cf","#df917d","#82a5ac","#d7d1bf"][o.variant%4];
  weddingVehicle(c,x,y,w,o.variant%5===1?"doblo":"sahin",colored,!!o.joined||o.type==="rival",seconds);
  if(o===target&&g.hornCD<=.03){
   oval(c,x,y-4,w*.58,w*.19,"rgba(255,235,112,.25)","#ffe37f",Math.max(3,w*.04));
   print(c,"KORNA",x,y-w*.97,Math.max(13,w*.19),"#fff7cd","#753c4c");
  }else if(o.type==="guest"&&!o.joined&&w>25)print(c,"+",x,y-w*.72,Math.max(14,w*.25),"#ffe88f");
 }
}
function laneDestination(c,s){
 const {ride,g,seconds}=s;if(!ride)return;
 const d=g.distance;
 if(ride.phase==="waiting"&&ride.z<1.06&&ride.z>-.15){
  const p=place(ride.z,ride.lane,d),sz=22+110*p.scale,x=p.x,y=p.y;
  const breathe=1+Math.sin(seconds*5)*.055;
  oval(c,x,y,sz*.72*breathe,sz*.24*breathe,"rgba(255,217,99,.21)","#ffdf73",Math.max(2,sz*.038));
  oval(c,x,y,sz*.40,sz*.14,"rgba(255,226,154,.5)",null);
  person(c,x,y,sz*.69,Math.floor(g.distance/140)%3);
  if(sz>23){fill(c,x-sz*.64,y-sz*1.57,sz*1.28,Math.max(22,sz*.28),"#ffe4a2");print(c,"YOLCU AL",x,y-sz*1.57+Math.max(16,sz*.19),Math.max(10,sz*.16),"#874857","center",null)}
 }else if(ride.phase==="riding"){
  const z=(ride.destinationDist-d)/190;if(z>1.05||z<-.2)return;
  const p=place(z,ride.destLane,d),sz=26+155*p.scale,x=p.x,y=p.y;
  oval(c,x,y,sz*.66,sz*.24,"rgba(111,239,194,.29)","#82ffcb",Math.max(3,sz*.04));
  oval(c,x,y,sz*.45,sz*.17,"rgba(186,255,221,.23)","#dcffef",Math.max(2,sz*.015));
  if(sz>30){
   line(c,x,y,x,y-sz*.85,"#d7ffed",Math.max(2,sz*.028));
   fill(c,x-sz*.63,y-sz*1.13,sz*1.26,sz*.32,"#d7ffe9");
   print(c,"BURADA İNDİR",x,y-sz*.91,Math.max(11,sz*.15),"#2b7068","center",null);
  }
 }
}
function backgroundConvoy(c,s){
 const {g,seconds}=s,d=g.distance;
 const leader=place(.72,0,d);
 weddingVehicle(c,leader.x,leader.y,30,"sahin","#fff7e5",true,seconds);
 const n=Math.min(4,Math.max(0,g.convoy-1));
 for(let i=0;i<n;i++){const z=.47+(i>>1)*.11,side=i%2?-.72:.72,p=place(z,side,d);weddingVehicle(c,p.x,p.y,23+86*p.scale,i%3===1?"doblo":"sahin",["#f4e6cb","#e4afa5","#9faeb7","#c4cfad"][i],true,seconds)}
}
function actors(c,s){
 const {g,seconds,activeCar,rival,ride}=s;
 if(s.versus){
  const rp=place(.075,rival.lane,g.distance),rx=rp.x,ry=495;
  weddingVehicle(c,rx,ry,140,"sahin","#bc5aab",true,seconds,Math.sin(seconds*2)*.1);
  print(c,ride?.owner==="p2"?"YOLCU RAKİPTE":"RAKİP",rx,ry-116,13,"#fff5f8","#6c3b66");
 }
 const cp=place(.01,g.lane,g.distance);
 // Fixed third-person chase camera, with mild steering body roll and road vibration.
 const x=cp.x+(g.invuln>0?Math.sin(seconds*12)*1:0);
 const y=522+Math.sin(seconds*g.speed*.07)*1.4;
 if(g.invuln>0&&Math.floor(seconds*13)%3===0)c.globalAlpha=.6;
 weddingVehicle(c,x,y,192,activeCar==="doblo"?"doblo":activeCar==="toros"?"toros":"sahin",activeCar==="toros"?"#8ca87f":activeCar==="doblo"?"#f1be6c":"#f0e4d2",true,seconds,g.lane);
 c.globalAlpha=1;
 if(g.dortluOn>0&&Math.floor(seconds*6)%2===0){oval(c,x-75,y-25,16,8,"#ffb44d");oval(c,x+75,y-25,16,8,"#ffb44d")}
}
function navigation(c,s){
 const {ride,g}=s;
 if(!ride||s.mode!=="playing")return;
 const destination=ride.phase==="waiting"?ride.lane:ride.destLane;
 const hint=destination<-.25?"SOL ŞERİT":destination>.25?"SAĞ ŞERİT":"ORTA ŞERİT";
 // Large floating navigation chevron directly over the distant roadway.
 const nx=480+destination*155,ny=185+Math.sin(s.seconds*4)*6;
 if(ride.phase==="riding"){
  shape(c,[[nx-17,ny-7],[nx,ny+16],[nx+17,ny-7],[nx+9,ny-7],[nx,ny+4],[nx-9,ny-7]],"#90fbd4","#35695f",2);
 }else{
  oval(c,nx,ny,22,22,"#ffdf83","#ac773d",3);print(c,"!",nx,ny+9,25,"#774457","center",null);
 }
 print(c,hint,nx,ny-31,12,"#fff7de","#34525c");
}
function map(c,s){
 const x=22,y=382,w=155,h=142;
 c.save();c.globalAlpha=.92;fill(c,x,y,w,h,"#233e4b");c.globalAlpha=1;
 c.strokeStyle="#eff3cd";c.lineWidth=2;c.strokeRect(x,y,w,h);
 fill(c,x+7,y+7,w-14,h-14,"#a1c89e");
 const roads=[[13,100,70,40],[70,40,122,15],[70,40,136,94],[20,20,70,40],[15,104,140,109]];
 for(const [x1,y1,x2,y2]of roads)line(c,x+x1,y+y1,x+x2,y+y2,"#f5eee1",13);
 for(const [x1,y1,x2,y2]of roads)line(c,x+x1,y+y1,x+x2,y+y2,"#6c858a",8);
 // Player route, destination, and checkpoint label.
 const px=x+71+(s.g.lane||0)*16,py=y+97;
 const aim=s.ride?.phase==="riding"?s.ride.destLane:s.ride?.phase==="waiting"?s.ride.lane:0;
 const tx=x+70+aim*51,ty=y+32;
 line(c,px,py,tx,ty,"#ffcf60",4);
 oval(c,tx,ty,7,7,"#c5ffde","#2d625b",2);
 oval(c,px,py,7,7,"#fbe079","#343f47",2);
 shape(c,[[px,py-12],[px-5,py+6],[px+5,py+6]],"#fff7d2","#344956",1);
 fill(c,x,y,w,20,"#283f4b");print(c,"YOL TARİFİ",x+10,y+14,12,"#f5f0d5","left",null);
 c.restore();
}
function actionEffects(c,s){
 const {seconds,g,particles,input}=s;
 for(const p of particles){const xx=p.x*2,yy=p.y*2;oval(c,xx,yy,Math.max(2,p.life*4),Math.max(2,p.life*3),p.color||"#fff1bf")}
 if(input?.boost&&g.speed>147){
  for(let i=0;i<10;i++){let x=(i*143+seconds*240)%1000,y=318+(i*79+seconds*170)%230;line(c,x,y,x-2,y+14,"rgba(255,250,225,.5)",2)}
 }
 if(s.flash>0){fill(c,0,0,W,H,"rgba(255,232,191,"+clamp(s.flash*.28,0,.15)+")")}
}
function render(c,s){
 c.save();c.setTransform(1,0,0,1,0,0);
 c.imageSmoothingEnabled=true;c.lineCap="round";c.lineJoin="round";
 sky(c,s);roadway(c,s);streets(c,s);backgroundConvoy(c,s);traffic(c,s);laneDestination(c,s);actors(c,s);navigation(c,s);actionEffects(c,s);map(c,s);
 if(s.mode==="menu"){print(c,"DÜĞÜN KONVOYU",480,150,29,"#fff0ad","#915b5e");}
 c.restore();
}
window.DugunVisuals={render,version:"2026.11.01-cartoon-chase"};
})();