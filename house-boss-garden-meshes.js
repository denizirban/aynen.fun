/* Original low-poly garden objects for House Boss; no external model downloads. */
(function(){
 'use strict';
 window.HouseBossGardenMesh=function(type,g,a,stage){
  const data=window.HouseBossFurnitureTypes?.[type];
  if(data?.zone!=='garden')return false;
  const {THREE,box,ball,cylinder,torus,capsule,addMesh}=a;
  const mat=(c,r=.77,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:metal});
  const stem=mat('#6b936d'),deep=mat('#466c50'),soil=mat('#6d5541'),
    clay=mat('#bf8261'),wood=mat('#a7815b'),ivory=mat('#e9e5d5'),
    yellow=mat('#f3d16c'),pink=mat('#e9a1b4'),stone=mat('#c7c5b7'),
    color=mat(data.color),glass=mat('#b3d6d4',.18,.2),night=mat('#50535a');
  color.userData.houseBossEdition=true;
  const el=(x,y,z,rx,ry,rz,m=color)=>ball(g,rx,ry,rz,m,x,y,z);
  const rod=(x,y,z,x2,y2,z2,r,m)=>capsule(g,[x,y,z],[x2,y2,z2],r,m);
  const ground=()=>{cylinder(g,.28,.35,.07,soil,0,.038,0)};
  const growth=Math.max(.18,Math.min(1,(Number(stage)||0)/3));
  function bloom(x,y,z,r=.22,m=color){
    for(let i=0;i<6;i++){
     const th=i*Math.PI/3;
     el(x+Math.cos(th)*r*.62,y+Math.sin(th)*r*.62,z,r*.44,r*.48,r*.22,m)
    }
    el(x,y,z,.085,.085,.09,yellow)
  }
  if(data.category==='flowers'){
   if(type==='rosemary'){
    box(g,1.02,.27,.66,wood,0,.17,0);
    box(g,.89,.035,.54,soil,0,.32,0)
   }else ground();
   const count=type==='sunflowers'?5:type==='rosebush'?11:13;
   const h=(type==='sunflowers'?1.42:type==='rosebush'?.85:.64)*growth;
   for(let i=0;i<count;i++){
    const angle=i*2.399,rad=(.13+.16*(i%4))*(type==='rosebush'?1.6:1);
    const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad,y=h*(.66+(i%5)*.07);
    rod(x*.45,.04,z*.45,x,y,z,.018,stem);
    for(let j=0;j<2;j++){
     const xx=x*(.45+j*.28),zz=z*(.45+j*.28),yy=y*(.30+j*.20);
     const leaf=el(xx,yy,zz,.13,.045,.10,deep);leaf.rotation.y=angle
    }
    if(growth>.35){
     if(type==='lavender')el(x,y,z,.078,.19,.077,color);
     else if(type==='rosemary')el(x,y,z,.075,.11,.062,stem);
     else bloom(x,y,z,type==='sunflowers'?.31:.14,type==='daisypatch'?ivory:color)
    }
   }
  }else if(data.category==='trees'){
   ground();const h=(type==='blossomtree'?2.4:2.15)*growth,leafColor=type==='blossomtree'?pink:color;
   const trunk=mat('#8e775e');
   cylinder(g,.11*growth,.18*growth,h*.65,trunk,0,h*.33,0);
   for(let i=0;i<6;i++){
    const t=i*Math.PI/3,rad=.45*growth;
    rod(0,h*.56,0,Math.cos(t)*rad,h*(.70+i%3*.07),Math.sin(t)*rad,.035*growth,trunk);
    el(Math.cos(t)*rad,h*(.73+i%3*.065),Math.sin(t)*rad,.38*growth,.30*growth,.32*growth,leafColor)
   }
   el(0,h*.89,0,.47*growth,.35*growth,.44*growth,leafColor);
   if(type==='lemontree'&&growth>.78)for(let i=0;i<6;i++){
    const th=i*Math.PI/3;
    el(Math.cos(th)*.54,h*(.75+i%3*.06),Math.sin(th)*.42,.083,.10,.08,yellow)
   }
   if(type==='olivetree'&&growth>.8)for(let i=0;i<8;i++){
    const th=i*Math.PI/4;
    el(Math.cos(th)*.40,h*(.84+i%2*.035),Math.sin(th)*.37,.035,.045,.035,mat('#596071'))
   }
  }else if(data.category==='planters'){
   if(type==='claypot'){
    cylinder(g,.24,.18,.38,color,0,.23,0);
    cylinder(g,.25,.25,.045,clay,0,.44,0);
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4;
     rod(0,.42,0,Math.cos(a)*.25,.76+i%3*.07,Math.sin(a)*.25,.018,deep);
     el(Math.cos(a)*.25,.76+i%3*.07,Math.sin(a)*.25,.11,.07,.15,stem)
    }
   }else{
    box(g,1.25,.42,.60,wood,0,.25,0);box(g,1.08,.05,.48,soil,0,.48,0);
    for(let i=0;i<7;i++){
     let x=-.46+i*.15;
     rod(x,.49,0,x,.80+i%3*.11,0,.016,deep);
     el(x,.80+i%3*.11,0,.09,.12,.08,stem)
    }
   }
  }else if(data.category==='outdoor-seating'){
   if(type==='gardenbench'){
    box(g,1.55,.14,.58,wood,0,.54,0);box(g,1.55,.48,.10,wood,0,.98,-.23);
    for(const x of [-.63,.63])for(const z of [-.19,.19])box(g,.08,.51,.08,night,x,.28,z)
   }else if(type==='bistroset'){
    cylinder(g,.16,.25,.65,night,0,.38,0);
    cylinder(g,.66,.65,.10,color,0,.77,0);
    for(const x of [-.78,.78]){
     cylinder(g,.09,.15,.43,night,x,.27,0);
     cylinder(g,.29,.28,.08,color,x,.50,0);
     el(x,.80,-.23,.28,.36,.09,color)
    }
   }else{
    for(const x of [-1.06,1.06]){
     cylinder(g,.06,.09,1.24,wood,x,.67,0);
     rod(x,1.27,0,x,.17,-.58,.055,wood)
    }
    el(0,.80,0,1.13,.14,.48,color);
    for(let i=0;i<8;i++)box(g,2.10,.015,.025,ivory,0,.94-i*.028,-.36+i*.10)
   }
  }else if(data.category==='paths'){
   const n=type==='pebblepath'?3:11;
   for(let i=0;i<n;i++){
    const x=type==='pebblepath'?(i-1)*.30:(i%4-1.5)*.22;
    const z=type==='pebblepath'?(i%2)*.10:(Math.floor(i/4)-1)*.24;
    el(x,.025,z,type==='pebblepath'?.19:.14,.021,type==='pebblepath'?.22:.12,i%3===0?ivory:stone)
   }
  }else if(data.category==='outdoor-lighting'){
   if(type==='gardenlantern'){
    cylinder(g,.18,.22,.07,night,0,.035,0);
    rod(0,.08,0,0,.88,0,.04,night);
    box(g,.26,.35,.26,mat('#ffe8b7',.22),0,.99,0);
    box(g,.34,.06,.34,night,0,1.20,0)
   }else{
    for(const x of [-.95,.95]){
     rod(x,.04,0,x,2.4,0,.043,wood);
     el(x,2.43,0,.085,.08,.08,night)
    }
    rod(-.95,2.27,0,.95,2.27,0,.014,night);
    for(let i=0;i<9;i++){
     const x=-.88+i*.22,y=2.24-(i%2)*.11;
     el(x,y,0,.085,.11,.085,mat('#ffe3ae',.24))
    }
   }
  }else if(data.category==='outdoor-decor'){
   if(type==='birdbath'){
    cylinder(g,.25,.35,.09,stone,0,.06,0);
    cylinder(g,.10,.13,.91,stone,0,.55,0);
    cylinder(g,.46,.21,.13,color,0,1.08,0);
    el(0,1.13,0,.34,.025,.33,glass)
   }else if(type==='woodarch'){
    for(const x of [-.78,.78]){
     rod(x,.05,0,x,2.15,0,.09,wood);
     for(let y=.3;y<2.0;y+=.4){
      const p=el(x,y,0,.15,.08,.15,stem);p.rotation.z=.25
     }
    }
    const arch=torus(g,.80,.075,wood,0,2.14,0);arch.rotation.x=Math.PI/2;
    for(let i=0;i<5;i++)bloom((i-2)*.26,2.35+Math.sin(i)*.12,.02,.12,pink)
   }else{
    cylinder(g,.62,.60,.12,stone,0,.10,0);
    cylinder(g,.40,.25,.51,color,0,.42,0);
    el(0,.73,0,.49,.11,.48,glass);
    rod(0,.71,0,0,1.24,0,.026,glass);
    el(0,1.26,0,.14,.14,.14,glass)
   }
  }
  g.userData.decorCategory='garden';
  return true
 };
})();