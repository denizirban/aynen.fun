/* House Boss / Garden & Build — garden objects are actual placeable 3D entities. */
(function(){
 'use strict';
 const t=window.HouseBossFurnitureTypes;
 if(!t)return;
 const garden={
  daisypatch:{name:'Daisy Meadow',category:'flowers',price:45,level:1,w:.82,d:.78,color:'#f6e1b9',shape:'flower',growthDays:2,beauty:6,comfort:3,action:'talk',desc:'Plant tiny white daisies and watch them bloom.'},
  lavender:{name:'Lavender Bush',category:'flowers',price:90,level:1,w:.75,d:.75,color:'#9a8cc5',shape:'flower',growthDays:3,beauty:7,comfort:4,action:'talk',desc:'Purple lavender sways over fragrant foliage.'},
  wildflowers:{name:'Wildflower Patch',category:'flowers',price:70,level:1,w:1.10,d:.83,color:'#f5b5ba',shape:'flower',growthDays:2,beauty:6,comfort:3,action:'talk',desc:'A bright field of miniature wildflowers.'},
  rosemary:{name:'Rosemary Herb Bed',category:'flowers',price:130,level:1,w:1.05,d:.75,color:'#86a57c',shape:'planter',growthDays:3,harvest:25,beauty:5,comfort:4,action:'talk',desc:'An aromatic herb patch with a harvest bonus.'},
  sunflowers:{name:'Sunflower Cluster',category:'flowers',price:155,level:2,w:.82,d:.85,color:'#f2ca62',shape:'flower',growthDays:4,beauty:9,comfort:5,action:'talk',desc:'Sunflowers climb above the garden grass.'},
  rosebush:{name:'Peach Rose Bush',category:'flowers',price:195,level:3,w:1.0,d:1.0,color:'#eaa0a5',shape:'flower',growthDays:4,beauty:11,comfort:6,action:'talk',desc:'A flowering shrub in warm peach-pink.'},
  lemontree:{name:'Meyer Lemon Tree',category:'trees',price:295,level:2,w:1.45,d:1.44,color:'#a5b779',shape:'tree',growthDays:5,harvest:55,beauty:13,comfort:7,action:'talk',desc:'Grow lemons for a small recurring harvest.'},
  olivetree:{name:'Mediterranean Olive',category:'trees',price:375,level:3,w:1.65,d:1.62,color:'#849a7d',shape:'tree',growthDays:7,harvest:70,beauty:17,comfort:8,action:'talk',desc:'A twisting silver-leaf olive tree.'},
  blossomtree:{name:'Pink Blossom Tree',category:'trees',price:460,level:4,w:1.75,d:1.75,color:'#e7a3bb',shape:'tree',growthDays:7,beauty:21,comfort:10,action:'talk',desc:'A delicate flowering tree with pink canopies.'},
  minipine:{name:'Miniature Cypress',category:'trees',price:225,level:2,w:1.15,d:1.16,color:'#567f61',shape:'tree',growthDays:5,beauty:9,comfort:6,action:'talk',desc:'A dark green Mediterranean evergreen.'},
  claypot:{name:'Round Clay Pot',category:'planters',price:50,level:1,w:.55,d:.55,color:'#c8845e',shape:'pot',comfort:2,action:'talk',desc:'Terracotta pot with sculptural green foliage.'},
  planterbox:{name:'Timber Planter Box',category:'planters',price:125,level:1,w:1.30,d:.63,color:'#b88c69',shape:'planter',comfort:3,action:'talk',desc:'A hand-crafted planter with trailing greenery.'},
  gardenbench:{name:'Garden Slat Bench',category:'outdoor-seating',price:190,level:1,w:1.62,d:.78,color:'#aa8765',shape:'bench',comfort:8,action:'talk',desc:'Rest among the plants on a wooden bench.'},
  bistroset:{name:'Pastel Bistro Set',category:'outdoor-seating',price:470,level:2,w:1.95,d:1.55,color:'#a1bfbd',shape:'bistro',comfort:12,action:'talk',desc:'A round cafe table with two colourful chairs.'},
  hammock:{name:'Canvas Hammock',category:'outdoor-seating',price:540,level:3,w:2.40,d:1.45,color:'#e4c9b1',shape:'hammock',comfort:15,action:'nap',desc:'An outdoor swing for a well-earned afternoon rest.'},
  pebblepath:{name:'Stepping Stone Path',category:'paths',price:38,level:1,w:1.0,d:.55,color:'#d4cab5',shape:'path',layer:'floor',comfort:1,action:'talk',desc:'Connect your garden with stone stepping paths.'},
  gravelpath:{name:'Pea Gravel Tile',category:'paths',price:55,level:1,w:1.0,d:1.0,color:'#c6bbaa',shape:'path',layer:'floor',comfort:1,action:'talk',desc:'A clean pale pebble courtyard tile.'},
  gardenlantern:{name:'Little Garden Lantern',category:'outdoor-lighting',price:75,level:1,w:.41,d:.41,color:'#f1c77e',shape:'lantern',comfort:2,action:'talk',desc:'A warm illuminated path lantern.'},
  globelights:{name:'Garden Globe Lights',category:'outdoor-lighting',price:255,level:2,w:2.15,d:.43,color:'#f2d8b3',shape:'string',comfort:6,action:'talk',desc:'Twinkling globe lights on a freestanding frame.'},
  birdbath:{name:'Bird Bath',category:'outdoor-decor',price:140,level:2,w:.81,d:.81,color:'#c8c9b8',shape:'bath',comfort:5,action:'talk',desc:'A stone basin that welcomes garden visitors.'},
  woodarch:{name:'Garden Arch',category:'outdoor-decor',price:360,level:3,w:1.75,d:.70,color:'#a97d60',shape:'arch',comfort:8,action:'talk',desc:'A climbing rose arch over the garden path.'},
  waterfountain:{name:'Pebble Fountain',category:'outdoor-decor',price:980,level:5,w:1.55,d:1.55,color:'#a8c7c7',shape:'fountain',comfort:16,action:'talk',desc:'A quiet ceramic fountain for your garden sanctuary.'}
 };
 for(const [id,obj]of Object.entries(garden)){
  obj.zone='garden';obj.collection='GARDEN';obj.style='organic';
  obj.tier=obj.level<=2?'starter':obj.level<=4?'modern':'premium';
  t[id]=obj;
 }
 window.HouseBossGardenCatalog=Object.freeze({
  ids:Object.keys(garden),
  categories:{flowers:'FLOWERS',trees:'TREES',planters:'PLANTERS','outdoor-seating':'SEATING',paths:'PATHS','outdoor-lighting':'LIGHTING','outdoor-decor':'DECOR'},
  expansions:[
   {id:'garden_patch',name:'Garden Plot Expansion',price:360,level:1,desc:'Expand your plantable garden from a compact patch to the full lawn.',benefit:'Larger planting area'},
   {id:'patio',name:'Outdoor Patio',price:980,level:2,desc:'Add a landscaped patio with benches and a dining area.',benefit:'Outdoor social space'},
   {id:'greenhouse',name:'Glass Greenhouse',price:2250,level:4,desc:'Build a miniature glasshouse with raised growing beds.',benefit:'Extra growth for all plants'},
   {id:'studio',name:'Garden Studio Extension',price:3250,level:5,desc:'Extend the home with a bright, furnished creative studio.',benefit:'New architectural room'}
  ]
 });
})();
