/* HOUSE BOSS · EDITIONS / collectible interiors. All objects have real 3D counterparts. */
(function(){
 'use strict';
 const t=window.HouseBossFurnitureTypes;if(!t)return;
 const items={
  ceramicvase:{name:'Pebble Ceramic Vase',category:'objects',style:'organic',price:85,level:1,tier:'starter',w:.32,d:.32,shape:'vase',layer:'tabletop',comfort:2,color:'#d99786',action:'talk',desc:'Hand-thrown ceramic in warm coral.'},
  lemonbowl:{name:'Citrus Studio Bowl',category:'objects',style:'pop',price:100,level:1,tier:'starter',w:.38,d:.38,shape:'bowl',layer:'tabletop',comfort:2,color:'#f4bf48',action:'talk',desc:'A glazed bowl with tiny sculpted fruit.'},
  petalstool:{name:'Petal Pop Stool',category:'seating',style:'pop',price:165,level:1,tier:'starter',w:.78,d:.78,shape:'stool',comfort:5,color:'#ed9ca8',action:'nap',desc:'Soft, oversized petals on a bright stem.'},
  terracottatotem:{name:'Terracotta Totem',category:'objects',style:'organic',price:210,level:2,tier:'modern',w:.56,d:.56,shape:'sculpture',comfort:3,color:'#d07854',action:'talk',desc:'Stacked hand-built forms with imperfect charm.'},
  bouclepouf:{name:'Marshmallow Pouf',category:'seating',style:'soft',price:230,level:2,tier:'modern',w:.84,d:.84,shape:'pouf',comfort:7,color:'#e7d8c6',action:'nap',desc:'A cloud-like seat with an exaggerated silhouette.'},
  cactusplanter:{name:'Blue Cactus Garden',category:'plants',style:'pop',price:185,level:2,tier:'modern',w:.65,d:.65,shape:'plant',comfort:3,color:'#5c9fa2',action:'clean',desc:'Playful ceramic pot and sculpted desert greenery.'},
  mushroomlamp:{name:'Milk-Glass Mushroom',category:'lighting',style:'retro',price:290,level:2,tier:'modern',w:.52,d:.52,shape:'mushroom',comfort:5,color:'#f8c1a7',action:'read',desc:'A glowing retro mushroom silhouette.'},
  candychecker:{name:'Candy Checker Rug',category:'rugs',style:'pop',price:295,level:2,tier:'modern',w:2.25,d:1.65,shape:'rug',layer:'floor',comfort:5,color:'#edafbd',action:'nap',desc:'A graphic pink-and-cream checkerboard.'},
  galleryprint:{name:'Gallery Print on Easel',category:'art',style:'modern',price:355,level:3,tier:'modern',w:.80,d:.49,shape:'art',comfort:4,color:'#789a97',action:'paint',desc:'An abstract framed print on a slim gallery stand.'},
  spoolstool:{name:'Ribbon Spool Stool',category:'seating',style:'retro',price:390,level:3,tier:'modern',w:.76,d:.76,shape:'stool',comfort:6,color:'#edb34d',action:'nap',desc:'A rounded lacquered hourglass in butter yellow.'},
  checkerottoman:{name:'Chess Club Ottoman',category:'seating',style:'pop',price:395,level:3,tier:'modern',w:.96,d:.82,shape:'pouf',comfort:9,color:'#a1b9d6',action:'nap',desc:'Soft blue-and-cream check upholstery.'},
  knotpillow:{name:'Oversized Knot Cushion',category:'objects',style:'soft',price:265,level:3,tier:'modern',w:.42,d:.42,shape:'knot',layer:'tabletop',comfort:3,color:'#b899d4',action:'talk',desc:'A playful sculpted twist in lilac velvet.'},
  bobbinlamp:{name:'Wavy Bobbin Lamp',category:'lighting',style:'pop',price:450,level:4,tier:'modern',w:.56,d:.56,shape:'lamp',comfort:5,color:'#b4b7e8',action:'read',desc:'A lilac bobbin base with a warm linen shade.'},
  squigglemirror:{name:'Squiggle Full Mirror',category:'art',style:'pop',price:560,level:4,tier:'modern',w:.88,d:.32,shape:'mirror',comfort:4,color:'#e98ca8',action:'talk',desc:'Wavy pink frame, oversized and unapologetic.'},
  cloudstool:{name:'Cloud Nine Stool',category:'seating',style:'soft',price:510,level:4,tier:'modern',w:.96,d:.86,shape:'pouf',comfort:9,color:'#ebdad5',action:'nap',desc:'Rounded cloud modules with no sharp edges.'},
  pebblecoffee:{name:'Pebble Coffee Table',category:'tables',style:'organic',price:630,level:4,tier:'modern',w:1.20,d:.82,shape:'table',comfort:7,color:'#a7c0a7',action:'talk',desc:'An asymmetric organic pebble-shaped tabletop.'},
  scallopshelf:{name:'Scalloped Display Shelf',category:'storage',style:'retro',price:690,level:5,tier:'premium',w:1.10,d:.48,shape:'shelf',comfort:8,color:'#edb0a0',action:'read',desc:'Wavy lacquered edges and collectible niches.'},
  coilmatt:{name:'Ribbon Wave Rug',category:'rugs',style:'organic',price:590,level:5,tier:'premium',w:2.40,d:1.65,shape:'rug',layer:'floor',comfort:7,color:'#a5bca5',action:'nap',desc:'Freeform sage-and-cream waves, thick tufting.'},
  roombloom:{name:'Giant Paper Flower',category:'plants',style:'pop',price:680,level:5,tier:'premium',w:.70,d:.70,shape:'flower',comfort:6,color:'#f3b6d0',action:'talk',desc:'A floor-standing sculptural flower.'},
  ribbonchair:{name:'Ribbon Lounge Chair',category:'seating',style:'pop',price:1120,level:6,tier:'premium',w:1.22,d:1.18,shape:'chair',comfort:19,color:'#c77cba',action:'nap',desc:'One continuous velvet loop becomes a chair.'},
  travertinetable:{name:'Travertine Totem Table',category:'tables',style:'organic',price:840,level:6,tier:'premium',w:1.12,d:.82,shape:'table',comfort:9,color:'#d5bfaa',action:'talk',desc:'Hand-finished stone with stacked cylindrical feet.'},
  spherevase:{name:'Glass Bubble Bud Vase',category:'objects',style:'modern',price:430,level:6,tier:'premium',w:.34,d:.34,shape:'vase',layer:'tabletop',comfort:4,color:'#7ec6c1',action:'talk',desc:'Translucent cyan glass bubbles with one stem.'},
  galleryframe:{name:'Colour Field Triptych',category:'art',style:'pop',price:750,level:6,tier:'premium',w:1.40,d:.50,shape:'art',comfort:8,color:'#f29d6f',action:'paint',desc:'Three oversized colourful modern panels.'},
  sunsetlamp:{name:'Sunset Disc Light',category:'lighting',style:'retro',price:790,level:7,tier:'premium',w:.66,d:.66,shape:'lamp',comfort:8,color:'#ffb763',action:'read',desc:'A luminous amber disc on a thin sculptural frame.'},
  glassgarden:{name:'Glasshouse Terrarium',category:'plants',style:'organic',price:1180,level:7,tier:'premium',w:.70,d:.66,shape:'plant',comfort:8,color:'#83b99d',action:'clean',desc:'A tiny indoor garden beneath a glass bell.'},
  croissantsofa:{name:'Croissant Velvet Sofa',category:'seating',style:'soft',price:2110,level:8,tier:'premium',w:2.25,d:1.22,shape:'sofa',comfort:31,color:'#d88e6c',action:'nap',desc:'One plump continuous crescent in burnt orange.'},
  galleryplinth:{name:'Gallery Sculpture Plinth',category:'art',style:'modern',price:1050,level:8,tier:'premium',w:.65,d:.65,shape:'sculpture',comfort:7,color:'#e6ddd0',action:'paint',desc:'A museum pedestal holding a folded abstract form.'},
  orbitlamp:{name:'Orbit Ring Lamp',category:'lighting',style:'modern',price:1520,level:9,tier:'luxury',w:.80,d:.72,shape:'lamp',comfort:11,color:'#d5ad70',action:'read',desc:'Gold orbital rings around a glowing glass sphere.'},
  wavebookcase:{name:'Ribbon Gallery Shelf',category:'storage',style:'retro',price:2280,level:9,tier:'luxury',w:1.52,d:.50,shape:'shelf',comfort:14,color:'#90b1cf',action:'read',desc:'An undulating pastel blue display bookcase.'},
  tulipchair:{name:'Tulip Swivel Chair',category:'seating',style:'retro',price:1900,level:10,tier:'luxury',w:1.22,d:1.14,shape:'chair',comfort:24,color:'#edb8a4',action:'nap',desc:'A scalloped petal back on a sculpted pedestal.'},
  mirrorball:{name:'Disco Cloud Sculpture',category:'art',style:'pop',price:1330,level:10,tier:'luxury',w:.78,d:.78,shape:'sculpture',comfort:11,color:'#bfcbd3',action:'dance',desc:'A mirrored sphere mounted on a black pedestal.'},
  giantflower:{name:'Statement Bloom Lamp',category:'lighting',style:'pop',price:1580,level:11,tier:'luxury',w:1.12,d:.86,shape:'flower',comfort:12,color:'#f1c78d',action:'read',desc:'An enormous luminous petal flower.'},
  formscreens:{name:'Wave Room Divider',category:'storage',style:'organic',price:2390,level:11,tier:'luxury',w:1.70,d:.40,shape:'screen',comfort:12,color:'#9ac1aa',action:'talk',desc:'Three sculpted arches define a new living zone.'},
  chrometable:{name:'Liquid Chrome Table',category:'tables',style:'modern',price:2050,level:12,tier:'luxury',w:1.25,d:.90,shape:'table',comfort:13,color:'#c4cad5',action:'talk',desc:'Fluid polished metal that looks poured into shape.'},
  collectiblechair:{name:'Collector’s Loop Chair',category:'seating',style:'pop',price:2950,level:13,tier:'luxury',w:1.33,d:1.27,shape:'chair',comfort:34,color:'#e69776',action:'nap',desc:'An iconic looped seat, hand-finished terracotta.'},
  haloarmchair:{name:'Halo Bouclé Throne',category:'seating',style:'soft',price:3350,level:14,tier:'luxury',w:1.45,d:1.35,shape:'chair',comfort:38,color:'#e5c5d8',action:'nap',desc:'A broad enveloping circular back with cloud cushions.'},
  limitedsofa:{name:'One-of-One Cloud Sofa',category:'seating',style:'soft',price:4800,level:16,tier:'luxury',w:2.45,d:1.34,shape:'sofa',comfort:45,color:'#d7c5e9',action:'nap',desc:'Gallery-grade modular seating, a dreamy statement piece.'}
 };
 const coreCategories={
  plant:'plants',bookshelf:'storage',floorlamp:'lighting',armchair:'seating',ottoman:'seating',petbed:'seating',easel:'art',
  yogamat:'objects',sidetable:'tables',stereo:'objects',loungechair:'seating',loveseat:'seating',recliner:'seating',
  walnutdesk:'tables',chaise:'seating',daybed:'seating',pendant:'lighting',statementsofa:'seating',hifi:'objects',grandbookcase:'storage'
 };
 Object.entries(coreCategories).forEach(([id,cat])=>{if(t[id]){t[id].category=cat;t[id].style=t[id].style||'modern';t[id].layer=t[id].layer||'solid'}});
 Object.entries(items).forEach(([id,v])=>{v.layer=v.layer||'solid';v.style=v.style||'modern';v.collection='EDITIONS';t[id]=v});
 window.HouseBossDesignerCollection=Object.freeze({ids:Object.keys(items),categories:{seating:'SEATING',tables:'TABLES',lighting:'LIGHTING',rugs:'RUGS',art:'ART & SCULPTURE',objects:'SMALL OBJECTS',plants:'GREENERY',storage:'STORAGE'}});
})();
