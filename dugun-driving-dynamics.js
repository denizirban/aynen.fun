// Düğün Konvoyu — continuous arcade-driving model.
// Distances are metres, speed in metres/sec, angles clockwise from north.
// Assisted mode is Road Rage-style: responsive steering, forward momentum,
// anticipatory corner braking and no hard position teleport.
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const approach=(value,target,maxDelta)=>value+clamp(target-value,-maxDelta,maxDelta);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const bearing=(a,b)=>Math.atan2((b[0]-a[0])*Math.cos(a[1]*Math.PI/180),b[1]-a[1]);
export function travelMeters(point,heading,meters){
 const lat=point[1],cos=Math.max(.25,Math.cos(lat*Math.PI/180));
 return [point[0]+Math.sin(heading)*meters/(111320*cos),point[1]+Math.cos(heading)*meters/111320];
}
export function roadHalfWidth(road){
 const kind=road?.typ||"";
 const statedWidth=Number(road?.width),lanes=Number(road?.lanes);
 if(Number.isFinite(statedWidth)&&statedWidth>4)return clamp(statedWidth/2,2.5,10.5);
 if(Number.isFinite(lanes)&&lanes>=2)return clamp((lanes*3.05+2.2)/2,3.85,10.5);
 return /^(trunk|primary)/.test(kind)?7.5:/^secondary/.test(kind)?6.0:/^(tertiary)/.test(kind)?5.0:/^(service|living_street)/.test(kind)?3.2:4.05;
}
export function evaluateTurn(nav,position,heading,speed){
 if(!nav?.ready)return {error:0,curve:0,limit:Infinity,valid:false};
 const lookDist=clamp(8+Math.max(speed,0)*1.45,11,29);
 const close=nav.at(lookDist),far=nav.at(lookDist+13),short=nav.at(6);
 if(!close||!far||!short)return {error:0,curve:0,limit:Infinity,valid:false};
 const delta=wrap(bearing(position,close)-heading);
 const next=wrap(bearing(close,far)-bearing(short,close));
 const curve=Math.abs(next);
 // Soft slowing ahead of actual bends, not just while the steering key is down.
 const limit=curve>.88?6.5:curve>.50?8.1:curve>.27?10.0:15.0;
 return {error:delta,curve,limit,valid:true};
}
export function stepVehicle(state,controls,environment,dt){
 if(!state?.pos||!dt)return state;
 const car=state,automatic=environment.mode!=="manual",spec=environment.spec||{};
 const input=clamp((controls.right?1:0)-(controls.left?1:0),-1,1);
 const near=environment.road||null;
 const surfaceWidth=roadHalfWidth(near?.road);
 const crossTrack=near?.dist??0;
 const onRoad=!!near&&crossTrack<surfaceWidth+1.1;
 car.offroad=!!near&&!onRoad;
 car.speed=Number.isFinite(car.speed)?car.speed:0;
 car.steering=Number.isFinite(car.steering)?car.steering:0;
 car.heading=Number.isFinite(car.heading)?car.heading:0;
 car.yawRate=Number.isFinite(car.yawRate)?car.yawRate:0;
 car.slip=Number.isFinite(car.slip)?car.slip:0;
 car.velocityLateral=Number.isFinite(car.velocityLateral)?car.velocityLateral:0;
 car.brakeHold=Number.isFinite(car.brakeHold)?car.brakeHold:0;
 car.engineRPM=Number.isFinite(car.engineRPM)?car.engineRPM:850;
 car.suspension=Number.isFinite(car.suspension)?car.suspension:0;
 car.suspensionVelocity=Number.isFinite(car.suspensionVelocity)?car.suspensionVelocity:0;
 const targetSpeed=Math.max(0,car.speed);
 const preview=evaluateTurn(environment.navigation,car.pos,car.heading,targetSpeed);
 const steerMax=clamp(.62/(1+targetSpeed/26),.35,.62);
 let targetSteer=input*steerMax;
 if(automatic&&input===0&&targetSpeed>1){
  const nearRoad=near?.p&&crossTrack>2?wrap(bearing(car.pos,near.p)-car.heading):0;
  // Forward-look steering is deliberately limited: the driver is still in control.
  if(preview.valid&&Math.abs(preview.error)<1.05){
   targetSteer+=clamp(preview.error*.47,-.31,.31);
  }else if(near?.p&&crossTrack<11&&Math.abs(nearRoad)<1.05){
   targetSteer+=clamp(nearRoad*.18,-.19,.19);
  }
 }
 targetSteer=clamp(targetSteer,-steerMax,steerMax);
 // Steering responds quickly without a sudden heading jump.
 const response=automatic?9.5:7.5;
 car.steering+=(targetSteer-car.steering)*(1-Math.exp(-response*dt));
 if(controls.brake){
  car.brakeHold+=dt;
  const strength=spec.brake||13.0;
  if(car.speed>0)car.speed=Math.max(0,car.speed-strength*dt);
  else if(!automatic||car.brakeHold>1.05)
   car.speed=approach(car.speed,-Math.min(5.0,spec.top||5),7.5*dt);
 }else{
  car.brakeHold=0;
  if(automatic){
   let cruise=Math.min(15.3,spec.top||16.8,preview.valid?preview.limit:13.9);
   if(Math.abs(car.steering)>steerMax*.66)cruise=Math.min(cruise,8.4);
   if(car.offroad)cruise=Math.min(cruise,7.0);
   if(controls.gas)cruise=Math.min(spec.top||19.5,19.5);
   car.speed=approach(car.speed,cruise,(car.speed>cruise?11.4:8.5)*dt);
  }else if(controls.gas){
   const t=Math.max(0,1-Math.max(0,car.speed)/(spec.top||19.5));
   car.speed+=Math.max(3.8,(spec.accel||7)*1.30*t)*dt;
  }else{
   const drag=2.10+.010*car.speed*car.speed;
   car.speed=approach(car.speed,0,drag*dt);
  }
 }
 if(controls.handbrake)car.speed=approach(car.speed,0,3.1*dt);
 if(car.offroad){
  const decel=crossTrack>16?6.7:3.3;
  if(car.speed>0)car.speed=Math.max(0,car.speed-decel*dt);
 }
 car.speed=clamp(car.speed,-5.2,(spec.top||20.5)*(car.offroad?.72:1));
 const grip=(car.offroad?.67:1)*(controls.handbrake?.60:1);
 // Bicycle steering with limited yaw response: turn radius stays legible.
 const effectiveSpeed=clamp(car.speed,-7,22);
 const wheelbase=3.10;
 const requestedYaw=clamp(effectiveSpeed*Math.tan(car.steering)/wheelbase*(spec.grip||1)*grip,-1.0,1.0);
 car.yawRate+=(requestedYaw-car.yawRate)*(1-Math.exp(-(controls.handbrake?4.3:9.6)*dt));
 const slipTarget=controls.handbrake?clamp(car.steering*Math.abs(car.speed)/15,-.64,.64):clamp(car.yawRate*car.speed/27,-.12,.12);
 car.slip+=(slipTarget-car.slip)*(1-Math.exp(-4.5*dt));
 car.heading=(car.heading+(car.yawRate+car.slip*.10)*dt+Math.PI*2)%(Math.PI*2);
 // Lateral displacement is damped rather than teleporting onto the road center.
 car.velocityLateral+=(car.yawRate*car.speed*.065-car.velocityLateral)*(1-Math.exp(-dt*(controls.handbrake?1.6:7.4)));
 const forward=car.speed*dt;
 const side=car.velocityLateral*dt*.17;
 car.pos=travelMeters(travelMeters(car.pos,car.heading,forward),car.heading+Math.PI/2,side);
 // Mild spring-damper suspension feeds scene-body tilt only.
 const targetCompression=Math.min(.08,Math.abs(car.yawRate)*.018+Math.abs(car.velocityLateral)*.008);
 car.suspensionVelocity+=(targetCompression-car.suspension)*24*dt-car.suspensionVelocity*9*dt;
 car.suspension+=car.suspensionVelocity*dt;
 car.engineRPM=approach(car.engineRPM,900+Math.abs(car.speed)*155+(controls.gas?650:0),4400*dt);
 return car;
}
