(function(){
"use strict";
const records=window.TAX_ATLAS_RECORDS||[];
const countries=window.TAX_ATLAS_COUNTRIES||[];
const countryByCode=Object.fromEntries(countries.map(c=>[c.code,c]));
const isoCountry=Object.fromEntries(countries.map(c=>[String(c.iso).padStart(3,"0"),c]));
const byId=Object.fromEntries(records.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);
const normalize=s=>String(s||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusName={gecmis:"GEÇMİŞ",aktif:"GÜNCEL",plan:"PLANLANAN",donemsel:"DÖNEMSEL"};
const colors={"Ev":"#a5d4d5","Giyim":"#dbb9ab","Gündelik":"#d5c7b5","Ulaşım":"#a7bdcf","Toplum":"#debaac","Yiyecek":"#e3c589","Hayvan":"#aad1ad","Seyahat":"#a2cfe1","Çevre":"#b2cd96","Teknoloji":"#c2b6de"};
const shapes={"Ev":"▤","Giyim":"◒","Gündelik":"◈","Ulaşım":"◉","Toplum":"◌","Yiyecek":"◐","Hayvan":"♧","Seyahat":"✈","Çevre":"◎","Teknoloji":"⌘"};
let selected="GB",unknownCountry=null,filter="hepsi",query="",view="globe",expandedId=null;
let graphZoom=null,graphSVG=null,graphFit=null;
const globe={playing:true,dragging:false,lastX:0,lastY:0,downX:0,downY:0,moved:false,rotation:[2,-54,0],projection:null,path:null,features:null,ctx:null,canvas:$("globe"),width:0,height:0,radius:0,hit:null,lastFrame:0,previousFrame:0};
function filterRecord(r){return filter==="hepsi"||r.status===filter||(filter==="aktif"&&r.status==="donemsel");}
function findMatches(){
 const q=normalize(query.trim());
 return records.filter(r=>filterRecord(r)&&(!q||normalize([r.title,r.period,r.teaser,r.story,r.group,r.motifs.join(" "),countryByCode[r.country]?.name].join(" ")).includes(q)));
}
function recordsForPanel(){const matches=findMatches();return query.trim()?matches:matches.filter(r=>r.country===selected).sort((a,b)=>(a.status==="gecmis")-(b.status==="gecmis")||b.year-a.year);}
function renderList(){
 const list=$("recordList"),found=recordsForPanel(),selectedMeta=countryByCode[selected];
 const searching=!!query.trim();
 if(searching){$("countryCode").textContent="GLOBAL / ARAMA";$("countryTitle").textContent="Arama sonuçları";$("countryDescription").textContent='"'+query.trim()+'" için kaynaklı kayıtlar.';}
 else if(unknownCountry){$("countryCode").textContent="DÜNYA / KAYIT YOK";$("countryTitle").textContent=unknownCountry.name;$("countryDescription").textContent="Bu ülke için henüz doğrulanmış sıra dışı vergi dosyası indekslenmedi. Aşağıdaki ülke dizininden başka bir ülke seçebilirsin.";}
 else{$("countryCode").textContent=(selected||"—")+" / ÜLKE DOSYASI";$("countryTitle").textContent=selectedMeta?.name||"Dünya";$("countryDescription").textContent="Tarih boyunca vergilendirilen ilginç şeyler. Bir kaydın yanındaki + işaretine dokun; bilgiler burada açılsın.";}
 $("countLabel").textContent=found.length+" DOSYA";
 if(!found.length){
  if(unknownCountry){
   const pos=unknownCountry.center;
   const nearby=countries.map(c=>({c,d:pos?Math.acos(Math.max(-1,Math.min(1,Math.sin(pos[1]*Math.PI/180)*Math.sin(c.lat*Math.PI/180)+Math.cos(pos[1]*Math.PI/180)*Math.cos(c.lat*Math.PI/180)*Math.cos((pos[0]-c.lon)*Math.PI/180)))):Math.PI})).sort((a,b)=>a.d-b.d).slice(0,6).map(x=>x.c);
   list.innerHTML='<div class="empty"><strong>Bu ülkenin dosyası henüz hazırlanmadı.</strong><p>Doğrulanmamış bir vergi uydurmamak için boş bırakıldı. Yakındaki arşivleri keşfet:</p><div class="nearby-choices">'+nearby.map(c=>'<button type="button" class="nearby-country" data-nearby="'+esc(c.code)+'">'+esc(c.name)+' <small>'+c.count+' kayıt ↗</small></button>').join("")+'</div></div>';
  }else list.innerHTML='<div class="empty">'+(searching?"Bu aramayla eşleşen kayıt bulunamadı.":"Bu dönemde kayıt yok. Diğer filtreleri deneyebilirsin.")+'</div>';
  return;
 }
 const html=found.map((r,i)=>{
  const open=expandedId===r.id, id="tax-detail-"+r.id;
  const related=open?relatedRecords(r).slice(0,5):[];
  const metadata='<div class="expanded-meta"><span>'+esc(r.period)+'</span><span>'+esc(statusName[r.status]||r.status)+'</span><span>'+esc(r.type||"Vergi / mali uygulama")+'</span><span>'+esc(r.group)+'</span></div>';
  const relatedHTML=related.length?'<div class="inline-related"><div class="inline-related-title">İLGİLİ DOSYALAR · '+related.length+'</div><div class="inline-related-grid">'+related.map(x=>'<button type="button" class="related-mini" data-related="'+esc(x.id)+'">'+esc(x.title)+'<small>'+esc(countryByCode[x.country]?.name||x.country)+' · '+esc(x.period)+'</small></button>').join("")+'</div></div>':"";
  return '<article class="record-shell'+(open?' is-expanded':'')+'" data-row="'+esc(r.id)+'">'+
   '<button type="button" class="record" data-id="'+esc(r.id)+'" aria-expanded="'+String(open)+'" aria-controls="'+esc(id)+'" aria-label="'+esc(r.title)+' ayrıntılarını '+(open?'kapat':'aç')+'">'+
   '<span class="rec-num">'+String(i+1).padStart(2,"0")+'</span><span><strong>'+esc(r.title)+'</strong><small>'+esc(countryByCode[r.country]?.name||r.country)+' · '+esc(r.period)+' · '+esc(statusName[r.status])+'</small></span><span class="record-plus" aria-hidden="true">'+(open?'−':'+')+'</span></button>'+
   (open?'<div class="record-expand" id="'+esc(id)+'">'+
   '<div class="inline-eyebrow">ARŞİV NOTU / '+esc(r.id.toUpperCase())+'</div>'+
   '<p class="inline-teaser">'+esc(r.teaser)+'</p><p class="inline-story">'+esc(r.story)+'</p>'+metadata+
   '<div class="inline-tools"><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer" class="inline-source">KAYNAĞI GÖR ↗ <small>'+esc(r.source)+'</small></a><button type="button" class="inline-copy" data-copy="'+esc(r.id)+'">BAĞLANTIYI KOPYALA</button></div>'+relatedHTML+
   '</div>':'')+
   '</article>';
 }).join("");
 list.innerHTML=html;
}
function renderFilters(){document.querySelectorAll(".filter").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.filter===filter)));}
function renderCountries(){
 const el=$("countries");el.innerHTML=countries.slice().sort((a,b)=>a.name.localeCompare(b.name,"tr")).map(c=>'<button type="button" data-country="'+esc(c.code)+'" class="country-chip" aria-pressed="'+String(c.code===selected&&!unknownCountry)+'">'+esc(c.name)+'<small>'+c.count+'</small></button>').join("");
 $("countryCountLabel").textContent=countries.length+" ÜLKE · "+records.length+" DOSYA";
}
function selectCountry(code,opts={}){
 const c=countryByCode[code];
 if(!c)return;
 selected=c.code;unknownCountry=null;
 if(opts.clearSearch!==false){query="";$("search").value="";$("clearSearch").hidden=true;}
 renderCountries();renderList();
 if(globe.projection){
  globe.rotation=[-c.lon,-c.lat,0];globe.projection.rotate(globe.rotation);globe.playing=false;toggleRotationText();drawGlobe();
 }
 if(opts.scroll&&window.innerWidth<700){$("countryTitle").scrollIntoView({behavior:reducedMotion()?"auto":"smooth",block:"start"});}
}
function selectUnknown(feature){
 const c=isoCountry[String(feature.id).padStart(3,"0")];
 if(c){selectCountry(c.code);return;}
 unknownCountry={name:feature.properties?.name||"Seçilen ülke",center:window.d3?d3.geoCentroid(feature):null};selected="";
 query="";$("search").value="";$("clearSearch").hidden=true;
 globe.playing=false;toggleRotationText();renderCountries();renderList();drawGlobe();
}
function applySearch(value){
 query=value;
 $("clearSearch").hidden=!value.trim();
 renderList();
 if(view==="graph")drawGraph();
}
function showView(which){
 view=which;
 const isGraph=which==="graph";
 $("atlasView").hidden=isGraph;
 $("graphView").classList.toggle("active",isGraph);
 $("viewGlobe").setAttribute("aria-pressed",String(!isGraph));
 $("viewGraph").setAttribute("aria-pressed",String(isGraph));
 if(isGraph){globe.wasPlaying=globe.playing;globe.playing=false;drawGraph();}
 else{if(globe.wasPlaying)globe.playing=true;requestAnimationFrame(()=>{resizeGlobe();drawGlobe();});}
}
function reducedMotion(){return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}
function makeGlobe(){
 if(!window.d3||!window.topojson){$("globeNotice").textContent="Küre yüklenemedi; aşağıdaki ülke dizinini kullan.";return;}
 const ctx=globe.canvas.getContext("2d",{alpha:true});
 if(!ctx){$("globeNotice").textContent="Küre desteklenmiyor; aşağıdaki ülke dizinini kullan.";return;}
 globe.ctx=ctx;
 globe.projection=d3.geoOrthographic().clipAngle(90).precision(.6).rotate(globe.rotation);
 globe.path=d3.geoPath(globe.projection,ctx);
 resizeGlobe();
 attachGlobeControls();
 const atlasURL="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
 const altURL="https://raw.githubusercontent.com/topojson/world-atlas/master/countries-110m.json";
 fetch(atlasURL).then(r=>{if(!r.ok)throw Error("atlas");return r.json();}).catch(()=>fetch(altURL).then(r=>{if(!r.ok)throw Error("fallback");return r.json();}))
 .then(world=>{
  globe.features=topojson.feature(world,world.objects.countries).features;
  $("globeFallback").hidden=true;
  $("globeNotice").textContent="PARMAKLA / FAREYLE ÇEVİR · ÜLKEYE TIKLA";
  drawGlobe();
  if(!reducedMotion())requestAnimationFrame(globeLoop);
  else{globe.playing=false;toggleRotationText();}
 }).catch(e=>{$("globeNotice").textContent="Harita verisi alınamadı; ülke dizininden keşfet.";console.warn("Globe unavailable",e);});
}
function resizeGlobe(){
 if(!globe.ctx||!globe.projection)return;
 const rect=globe.canvas.getBoundingClientRect();
 let w=Math.max(250,rect.width||590),h=Math.max(250,rect.height||540);
 const pixelRatio=Math.min(2,window.devicePixelRatio||1);
 globe.canvas.width=Math.round(w*pixelRatio);globe.canvas.height=Math.round(h*pixelRatio);
 globe.ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 globe.width=w;globe.height=h;
 globe.radius=Math.min(w*.467,h*.475,285);
 globe.projection.translate([w/2,h/2]).scale(globe.radius);
 drawGlobe();
}
function drawGlobe(){
 if(!globe.ctx||!globe.features||!globe.projection||view!=="globe")return;
 const ctx=globe.ctx,r=globe.radius,cx=globe.width/2,cy=globe.height/2;
 ctx.clearRect(0,0,globe.width,globe.height);
 // Sphere and sunlit atmosphere.
 const glow=ctx.createRadialGradient(cx-r*.17,cy-r*.18,r*.2,cx,cy,r*1.14);
 glow.addColorStop(0,"#8ddaea");glow.addColorStop(.65,"#49a9d0");glow.addColorStop(1,"#31769e");
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();ctx.fillStyle=glow;ctx.fillRect(cx-r,cy-r,r*2,r*2);
 const path=globe.path;
 // Latitudes and longitudes are subtle under the countries.
 ctx.strokeStyle="rgba(226,248,244,.28)";ctx.lineWidth=.6;ctx.beginPath();path(d3.geoGraticule10());ctx.stroke();
 for(const feature of globe.features){
  const numeric=String(feature.id).padStart(3,"0"),match=isoCountry[numeric],isChosen=match?.code===selected&&!unknownCountry;
  ctx.beginPath();path(feature);
  ctx.fillStyle=isChosen?"#f5cb72":match?["#a4d693","#aadab6","#b8d889","#d8d6a0"][Number(feature.id)%4]:"#a7c9ae";
  ctx.fill();
  ctx.strokeStyle=isChosen?"#fdf2d3":"rgba(42,113,103,.36)";
  ctx.lineWidth=isChosen?1.65:.6;ctx.stroke();
 }
 // Illumination stays in front of land and water without hiding detail.
 const shade=ctx.createRadialGradient(cx-r*.23,cy-r*.30,r*.12,cx+r*.33,cy+r*.28,r*1.43);
 shade.addColorStop(0,"rgba(255,255,255,.17)");shade.addColorStop(.6,"rgba(35,92,108,0)");shade.addColorStop(1,"rgba(9,53,72,.44)");
 ctx.fillStyle=shade;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
 ctx.restore();
 ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle="#6cabbf";ctx.lineWidth=1;ctx.stroke();
 // Catalog markers are distinct from country borders, on the visible hemisphere only.
 const center=[-globe.rotation[0],-globe.rotation[1]];
 for(const c of countries){
  if(d3.geoDistance(center,[c.lon,c.lat])>1.48)continue;
  const xy=globe.projection([c.lon,c.lat]);if(!xy)continue;
  const [x,y]=xy;if((x-cx)**2+(y-cy)**2>r*r)continue;
  ctx.beginPath();ctx.arc(x,y,c.code===selected?6.4:3.5,0,Math.PI*2);
  ctx.fillStyle=c.code===selected?"#111":"#fffdf4";ctx.fill();
  ctx.strokeStyle=c.code===selected?"#fff":"#396b6d";ctx.lineWidth=1.3;ctx.stroke();
 }
}
function globeLoop(time){
 if(!globe.features||reducedMotion())return;
 if(view==="globe"&&!globe.dragging&&globe.playing&&time-globe.lastFrame>45){
  const dt=Math.min(55,time-(globe.previousFrame||time));globe.rotation[0]=(globe.rotation[0]-.0019*dt)%360;globe.projection.rotate(globe.rotation);drawGlobe();globe.lastFrame=time;
 }
 globe.previousFrame=time;
 requestAnimationFrame(globeLoop);
}
function toggleRotationText(){$("toggleRotation").textContent=globe.playing?"Dönüşü durdur Ⅱ":"Döndür ↻";}
function attachGlobeControls(){
 const canvas=globe.canvas;
 canvas.addEventListener("pointerdown",e=>{globe.dragging=true;globe.downX=globe.lastX=e.clientX;globe.downY=globe.lastY=e.clientY;globe.moved=false;canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener("pointermove",e=>{
  if(!globe.dragging)return;
  const dx=e.clientX-globe.lastX,dy=e.clientY-globe.lastY;
  if(Math.abs(e.clientX-globe.downX)+Math.abs(e.clientY-globe.downY)>5)globe.moved=true;
  if(globe.moved){globe.rotation[0]+=dx*.42;globe.rotation[1]=Math.max(-85,Math.min(85,globe.rotation[1]-dy*.42));globe.projection.rotate(globe.rotation);drawGlobe();}
  globe.lastX=e.clientX;globe.lastY=e.clientY;
 });
 canvas.addEventListener("pointerup",e=>{
  if(!globe.dragging)return;
  globe.dragging=false;
  if(!globe.moved){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;pickGlobe(x,y);}
 });
 canvas.addEventListener("pointercancel",()=>{globe.dragging=false;});
 canvas.addEventListener("keydown",e=>{
  const d=e.key==="ArrowLeft"?-12:e.key==="ArrowRight"?12:0;
  if(d){e.preventDefault();globe.rotation[0]+=d;globe.playing=false;toggleRotationText();globe.projection.rotate(globe.rotation);drawGlobe();}
  if(e.key===" "){e.preventDefault();globe.playing=!globe.playing;toggleRotationText();}
 });
 $("toggleRotation").onclick=()=>{globe.playing=!globe.playing;toggleRotationText();};
}
function pickGlobe(x,y){
 if(!globe.features)return;
 const dx=x-globe.width/2,dy=y-globe.height/2;
 if(dx*dx+dy*dy>globe.radius*globe.radius)return;
 // Small countries are available through their markers even if the world atlas simplifies them.
 for(const c of countries){
  if(d3.geoDistance([-globe.rotation[0],-globe.rotation[1]],[c.lon,c.lat])>1.48)continue;
  const p=globe.projection([c.lon,c.lat]);
  if(p&&Math.hypot(p[0]-x,p[1]-y)<13){selectCountry(c.code);return;}
 }
 const position=globe.projection.invert([x,y]);
 if(!position)return;
 const feature=globe.features.find(g=>d3.geoContains(g,position));
 if(feature)selectUnknown(feature);
}
function connectionScore(a,b){
 const shared=a.motifs.filter(t=>b.motifs.includes(t));
 return shared.length*3+(a.group===b.group?1:0)+(a.country===b.country?.5:0);
}
function relatedRecords(rec){
 return records.filter(x=>x.id!==rec.id).map(x=>({record:x,weight:connectionScore(rec,x)+(x.country!==rec.country?.55:0)})).filter(x=>x.weight>=1).sort((a,b)=>b.weight-a.weight||a.record.year-b.record.year).slice(0,6).map(x=>x.record);
}
function openTax(id,options={}){
 const r=byId[id];if(!r)return;
 const fromGraph=view==="graph";
 if(fromGraph)showView("globe");
 if(query.trim()||selected!==r.country||unknownCountry||!filterRecord(r)){
  selected=r.country;unknownCountry=null;filter="hepsi";query="";$("search").value="";$("clearSearch").hidden=true;renderFilters();renderCountries();
  if(globe.projection){const c=countryByCode[r.country];globe.rotation=[-c.lon,-c.lat,0];globe.projection.rotate(globe.rotation);drawGlobe();}
 }
 const willClose=expandedId===id&&!options.forceOpen&&!fromGraph;
 expandedId=willClose?null:id;
 renderList();
 try{history.replaceState(null,"",location.pathname+location.search+(expandedId?"#vergi="+encodeURIComponent(expandedId):""));}catch(_){}
 if(expandedId&&(options.scroll||fromGraph)){
  const row=document.querySelector('[data-row="'+id+'"]');
  if(row)requestAnimationFrame(()=>row.scrollIntoView({behavior:reducedMotion()?"auto":"smooth",block:"center"}));
 }
}
function closeTax(){
 if(!expandedId)return;
 expandedId=null;renderList();
 try{history.replaceState(null,"",location.pathname+location.search);}catch(_){}
}
function edgeGraphData(list){
 const nodes=list.map((r,i)=>({...r,x:560+(i%9-4)*110+(Math.sin(i*7)*26),y:355+(Math.floor(i/9)-2)*130+(Math.cos(i*4)*25)}));
 const edges=[],seen=new Set();
 for(const a of nodes){
  const scores=nodes.filter(b=>a.id!==b.id).map(b=>({b,score:connectionScore(a,b)})).filter(x=>x.score>0).sort((x,y)=>y.score-x.score).slice(0,3);
  for(const {b,score} of scores){const key=[a.id,b.id].sort().join("_");if(seen.has(key))continue;seen.add(key);edges.push({source:a.id,target:b.id,score});}
 }
 return {nodes,edges};
}
function drawGraph(){
 if(view!=="graph")return;
 const list=findMatches();
 if(!window.d3){$("graphSvg").hidden=true;$("graphFallback").hidden=false;$("graphFallback").innerHTML=list.map(r=>'<button type="button" data-id="'+esc(r.id)+'">'+esc(r.title)+'<small>'+esc(r.period)+'</small></button>').join("");return;}
 $("graphSvg").hidden=false;$("graphFallback").hidden=true;
 const svg=d3.select("#graphSvg");svg.selectAll("*").remove();
 const width=Math.max(400,$("graphView").clientWidth),height=window.innerWidth<700?560:650;
 svg.attr("viewBox",[0,0,width,height]);
 const root=svg.append("g");
 const {nodes,edges}=edgeGraphData(list);
 if(!nodes.length){root.append("text").attr("x",width/2).attr("y",height/2).attr("text-anchor","middle").attr("fill","#777").text("Eşleşen kayıt yok.");return;}
 const simulation=d3.forceSimulation(nodes).force("link",d3.forceLink(edges).id(d=>d.id).distance(165).strength(.55)).force("charge",d3.forceManyBody().strength(-700)).force("collide",d3.forceCollide(93).iterations(1)).force("center",d3.forceCenter(0,0)).force("x",d3.forceX().strength(.026)).force("y",d3.forceY().strength(.036)).stop();
 for(let i=0;i<Math.min(175,Math.max(85,190-nodes.length*.55));i++)simulation.tick();
 const linkLayer=root.append("g");
 const links=linkLayer.selectAll("line").data(edges).join("line").attr("class","connection").attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
 const card=root.append("g").selectAll("g").data(nodes).join("g").attr("class","node-card").attr("tabindex",0).attr("role","button").attr("aria-label",d=>d.title+" detayına git").attr("transform",d=>"translate("+(d.x-64)+","+(d.y-51)+")");
 card.append("rect").attr("class","card-frame").attr("width",128).attr("height",102).attr("fill","#fff").attr("stroke","#a9a9a9").attr("stroke-width",.9);
 card.append("rect").attr("width",128).attr("height",15).attr("fill","#f8f8f7").attr("stroke","#d6d6d6").attr("stroke-width",.8);
 card.append("circle").attr("cx",7).attr("cy",7.5).attr("r",2).attr("fill","#b8b8b8");
 card.append("circle").attr("cx",14).attr("cy",7.5).attr("r",2).attr("fill","#d8d8d8");
 card.append("text").attr("x",23).attr("y",10.8).attr("fill","#616161").attr("font-size",7).attr("font-family","monospace").text(d=>d.id+".jpg");
 card.append("rect").attr("x",7).attr("y",22).attr("width",114).attr("height",49).attr("fill",d=>colors[d.group]||"#ddd");
 card.append("circle").attr("cx",64).attr("cy",46).attr("r",22).attr("fill","#fff").attr("opacity",.27);
 card.append("text").attr("x",64).attr("y",59).attr("text-anchor","middle").attr("fill","#344957").attr("font-size",34).attr("font-weight",700).text(d=>shapes[d.group]||"◇");
 card.append("text").attr("x",7).attr("y",83).attr("font-size",10.1).attr("font-weight",700).attr("fill","#171717").text(d=>d.title.length>19?d.title.slice(0,18)+"…":d.title);
 card.append("text").attr("x",7).attr("y",95).attr("font-size",8).attr("fill","#777").text(d=>countryByCode[d.country]?.name+" · "+d.period.slice(0,11));
 card.on("click",(e,d)=>{e.stopPropagation();openTax(d.id);}).on("keydown",(e,d)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openTax(d.id);}})
 .on("mouseenter",(_,d)=>links.classed("emphasis",e=>e.source.id===d.id||e.target.id===d.id))
 .on("mouseleave",()=>links.classed("emphasis",false));
 const zoom=d3.zoom().scaleExtent([.15,3.2]).on("zoom",e=>root.attr("transform",e.transform));
 svg.call(zoom).on("dblclick.zoom",null);
 const minX=d3.min(nodes,d=>d.x)-85,maxX=d3.max(nodes,d=>d.x)+85,minY=d3.min(nodes,d=>d.y)-80,maxY=d3.max(nodes,d=>d.y)+80;
 const scale=Math.min((width-80)/(maxX-minX),(height-100)/(maxY-minY),1.25);
 const transform=d3.zoomIdentity.translate(width/2-scale*(minX+maxX)/2,height/2-scale*(minY+maxY)/2).scale(scale);
 svg.call(zoom.transform,transform);
 graphSVG=svg;graphZoom=zoom;graphFit=transform;
}
function bindEvents(){
 $("viewGlobe").onclick=()=>showView("globe");$("viewGraph").onclick=()=>showView("graph");
 $("search").addEventListener("input",e=>applySearch(e.target.value));$("clearSearch").onclick=()=>{$("search").value="";applySearch("");$("search").focus();};
 document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderFilters();renderList();if(view==="graph")drawGraph();});
 $("recordList").addEventListener("click",async e=>{
  const nearby=e.target.closest("[data-nearby]");if(nearby){selectCountry(nearby.dataset.nearby,{scroll:window.innerWidth<700});return;}
  const related=e.target.closest("[data-related]");if(related){openTax(related.dataset.related,{forceOpen:true,scroll:true});return;}
  const copy=e.target.closest("[data-copy]");if(copy){
   const id=copy.dataset.copy,url=location.origin+location.pathname+"#vergi="+encodeURIComponent(id);
   try{await navigator.clipboard.writeText(url);copy.textContent="KOPYALANDI ✓";}
   catch(_){window.prompt("Bağlantıyı kopyala:",url);}
   return;
  }
  const button=e.target.closest(".record[data-id]");if(button)openTax(button.dataset.id);
 });
 $("countries").addEventListener("click",e=>{const b=e.target.closest("[data-country]");if(b){selectCountry(b.dataset.country,{scroll:true});if(view==="graph")showView("globe");}});
 $("graphFallback").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)openTax(b.dataset.id);});
 $("graphPlus").onclick=()=>{if(graphSVG&&graphZoom)graphSVG.transition().duration(220).call(graphZoom.scaleBy,1.35);};
 $("graphMinus").onclick=()=>{if(graphSVG&&graphZoom)graphSVG.transition().duration(220).call(graphZoom.scaleBy,.72);};
 $("graphReset").onclick=()=>{if(graphSVG&&graphZoom&&graphFit)graphSVG.transition().duration(240).call(graphZoom.transform,graphFit);};
 window.addEventListener("keydown",e=>{if(e.key==="Escape")closeTax();});
 window.addEventListener("resize",()=>{resizeGlobe();if(view==="graph")drawGraph();});
 window.addEventListener("hashchange",()=>{const id=decodeURIComponent(location.hash.replace(/^#vergi=/,""));if(byId[id])openTax(id,{forceOpen:true,scroll:true});else if(expandedId)closeTax();});
}
function boot(){
 $("statRecords").textContent=records.length;
 $("statCountries").textContent=countries.length;
 bindEvents();renderCountries();renderFilters();renderList();makeGlobe();
 const id=decodeURIComponent(location.hash.replace(/^#vergi=/,""));if(byId[id])openTax(id,{forceOpen:true,scroll:true});
}
boot();
})();