import * as THREE from 'three';
import {trainHidden,trainDoorOpen,trainInspection} from './train-state.js';

export function createTrainWorld(canvas,onError){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#070a0c');scene.fog=new THREE.FogExp2('#080d10',.035);
  const camera=new THREE.PerspectiveCamera(67,1,.04,70);camera.rotation.order='YXZ';scene.add(camera);
  const materials=[],textures=[],geometries=[],objects=[],lamps=[],handles=[],doorLeaves=[],boards=[];
  let assetLoaded=false,assetFailed=false,signKey='',ticketKey='',doorAmount=0,eyeHeight=1.63,motionTime=0,disposed=false;
  const up=new THREE.Vector3(0,1,0),projected=new THREE.Vector3(),direction=new THREE.Vector3(),ray=new THREE.Raycaster();
  const mat=(color,more={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.15,...more});materials.push(m);return m;};
  function texture(paint,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t;}
  function grunge(base,lines=false){return texture((g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);let r=917;const rnd=()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;};for(let i=0;i<5500;i++){g.fillStyle=`rgba(${rnd()>.5?'235,232,207':'9,20,18'},${rnd()*.11})`;g.fillRect(rnd()*w,rnd()*h,rnd()*3+1,rnd()*7+1);}if(lines){g.strokeStyle='#111a1744';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(0,i*128);g.lineTo(w,i*128);g.stroke();}g.strokeStyle='#a8aaa044';g.lineWidth=1;g.strokeRect(2,2,w-4,h-4);}});}
  const wall=mat('#bbc0b1',{map:grunge('#8a958c',true)}),floor=mat('#525d56',{map:grunge('#3d4944',true),roughness:.46,metalness:.26});
  const steel=mat('#89968d',{roughness:.32,metalness:.8}),dark=mat('#131b1a'),seat=mat('#315348',{map:grunge('#365e53'),roughness:.67}),rubber=mat('#111715');
  const glass=mat('#07171c',{metalness:.7,roughness:.23,transparent:true,opacity:.82}),red=mat('#a14232'),skin=mat('#a2a98e',{roughness:.95});
  const ceiling=mat('#b7bbab',{map:grunge('#a4a99a')});
  const glow=new THREE.MeshBasicMaterial({color:'#d1dec4'});materials.push(glow);
  function mesh(geometry,material,x=0,y=0,z=0,parent=scene){geometries.push(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
  const box=(w,h,d,m,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
  const cylinder=(r,h,m,x,y,z,parent)=>mesh(new THREE.CylinderGeometry(r,r,h,10),m,x,y,z,parent);
  const plane=(w,h,m,x,y,z,rotation=0,parent=scene)=>{const m2=mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,parent);m2.rotation.y=rotation;return m2;};
  function label(text,w,h,style={}){const t=texture((g,W,H)=>{g.fillStyle=style.background||'#14231e';g.fillRect(0,0,W,H);g.strokeStyle=style.border||'#728275';g.lineWidth=7;g.strokeRect(5,5,W-10,H-10);g.textAlign='center';g.textBaseline='middle';g.fillStyle=style.color||'#d2dbc1';g.font=`${style.weight||500} ${style.size||64}px "Malgun Gothic", sans-serif`;String(text).split('\n').forEach((line,i,arr)=>g.fillText(line,W/2,H/2+(i-(arr.length-1)/2)*(style.lineHeight||80)));},w,h);const m=new THREE.MeshBasicMaterial({map:t});materials.push(m);return m;}
  function interactive(id,title,node,point,range=2.8){objects.push({id,title,node,point:new THREE.Vector3(...point),range});node.userData.interaction=id;return node;}
  box(4.5,.18,25,floor,0,-.13,0);box(4.5,.18,25,ceiling,0,2.9,0);
  box(4.5,2.9,.2,wall,0,1.4,-12.3);box(4.5,2.9,.2,wall,0,1.4,12.3);
  // Every side is assembled around real window and door openings.
  for(const side of [-1,1]){
    const x=side*2.2,face=-side*Math.PI/2;
    box(.12,.98,15.8,wall,x,.49,3.4);box(.12,.73,25,wall,x,2.51,0);
    box(.12,1,3.1,wall,x,.5,-10.7);box(.12,1,1.5,wall,x,.5,-4.3);
    for(const z of [-10.3,-2.4,1.1,4.6,8.1,11.2]){
      const width=z===11.2?2.1:2.85;
      plane(width,1.15,glass,side*2.16,1.58,z,face);
      for(const y of [1,2.16])box(.1,.055,width+.12,steel,x-side*.06,y,z);
      for(const zz of [z-width/2-.03,z+width/2+.03])box(.1,1.2,.06,steel,x-side*.06,1.58,zz);
    }
    for(const z of [-8.6,-4.3,-.7,2.9,6.4,9.75,12.1])box(.13,1.2,.4,wall,x,1.58,z);
    // The doors slide along the length of the car, revealing a real platform.
    box(.14,2.6,.12,steel,x,1.3,-8);box(.14,2.6,.12,steel,x,1.3,-5);
    for(const direction of [-1,1]){
      const leaf=new THREE.Group();leaf.position.set(x,0,-6.5+direction*.73);scene.add(leaf);
      box(.13,2.62,1.45,wall,0,1.31,0,leaf);plane(.92,1.08,glass,-side*.075,1.73,0,face,leaf);
      box(.15,.65,.035,rubber,-side*.03,.8,-direction*.7,leaf);doorLeaves.push({leaf,base:leaf.position.z,direction});
    }
    box(.5,.035,3.1,steel,side*2.16,.025,-6.5);
    const exit=plane(1.35,.22,label('비상 출입문',512,90,{size:43}),side*2.11,2.63,-6.5,face);
    const doorTarget=box(.04,1.5,2.7,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),side*2.09,1.25,-6.5);
    interactive(side===-1?'leave-left':'leave-right',side===-1?'왼쪽 승강장으로 내리기':'오른쪽 승강장으로 내리기',doorTarget,[side*1.92,1.25,-6.5],2.9);
    // Banks of seats. Under-seat clearance is a playable hiding space.
    for(const z of [-3,0,3,6,9]){
      box(.72,.15,2.73,seat,side*1.72,.56,z);box(.13,.65,2.73,seat,side*2.06,.93,z);
      box(.69,.045,2.78,steel,side*1.72,.47,z);
      for(const zz of [z-1.18,z+1.18]){cylinder(.028,.44,steel,side*1.52,.23,zz);cylinder(.035,2.4,steel,side*1.32,1.52,zz);}
      for(let i=0;i<4;i++)box(.73,.003,.012,dark,side*1.72,.641,z-1.1+i*.73);
    }
    // Tunnel lights and concrete outside; separate platforms become visible on stops.
    for(let i=0;i<11;i++)box(.15,3,.14,dark,side*2.8,1.4,-15+i*3);
    const platform=box(11,.25,6,mat('#697167',{map:grunge('#666c61',true)}),side*7.6,-.18,-6.5);
    box(11,.05,.12,glow,side*7.6,-.02,-4.7);box(.12,.035,5.8,mat('#b6ac69'),side*2.73,.02,-6.5);
    box(11,.14,6,mat('#3a493f'),side*7.6,3.25,-6.5);
    for(const z of [-9,-4])cylinder(.11,3.2,wall,side*6.4,1.5,z);
    const board=plane(2.5,1.25,label('해진\n03:33',768,384,{size:100,lineHeight:125}),side*5.2,1.85,-6.5,face);
    boards.push({side,node:board});
    box(.15,3.4,2.5,dark,side*12.4,1.5,-6.5);
    plane(1.8,2.8,new THREE.MeshBasicMaterial({color:'#d6dfcc'}),side*11.9,1.4,-6.5,face);
    const pl=new THREE.PointLight('#b4c5b3',8,12,2);pl.position.set(side*7,2.8,-6.5);scene.add(pl);boards.at(-1).light=pl;
  }
  // Front control cabinet and destination board.
  box(1.05,1.6,.15,dark,.85,1.0,-12.1);box(.86,.83,.12,steel,.85,1.34,-11.95);
  const cabinet=box(.76,.7,.08,mat('#506459'),.85,1.33,-11.84);
  interactive('cabinet','전원함 확인',cabinet,[.85,1.33,-11.76],2.7);
  plane(.67,.16,label('비 상 전 원',512,100,{size:47}),.85,1.67,-11.785);
  for(let i=0;i<3;i++){box(.11,.19,.08,i===2?red:dark,.62+i*.22,1.36,-11.77);}
  const frontBoard=plane(2.15,.42,label('막차  ㅣ  해 진',1024,180,{size:78}),0,2.34,-12.17);
  plane(.5,.6,label('출입\n금지',256,320,{size:72,color:'#b7a791'}),-.8,1.35,-12.18);
  // Latch has an unmistakable red lever and a small diagram etched in metal.
  box(.09,.62,.36,steel,-2.08,1.19,-5.05);
  const latch=cylinder(.038,.35,red,-2,1.27,-5.05);latch.rotation.z=Math.PI/3;
  interactive('latch','수동 잠금 레버',latch,[-1.91,1.28,-5.05],2.7);
  plane(.35,.4,label('수동\n잠금 ↓',256,300,{size:64,background:'#b2ab8b',color:'#302c22'}),-2.02,1.73,-5.05,Math.PI/2);
  const paper=mat('#c9c4a3',{roughness:1});
  const ticket=box(.32,.012,.48,paper,-1.55,.65,6.6);ticket.rotation.y=.15;
  interactive('ticket','17번 좌석 · 승차권',ticket,[-1.55,.71,6.6],3.2);
  const notes=box(.46,.014,.62,paper,1.57,.65,5.7);notes.rotation.y=-.12;
  interactive('rules','접힌 이용 수칙',notes,[1.57,.72,5.7],3.2);
  plane(.33,.13,label('17',256,100,{size:70}),-2.1,1.03,6.6,Math.PI/2);
  // Handrails, straps and light housings, all lit by the same world lights.
  for(const x of [-.96,.96]){
    const rail=cylinder(.025,22.4,steel,x,2.5,0);rail.rotation.x=Math.PI/2;
    for(let z=-10;z<=10;z+=2){
      const group=new THREE.Group();group.position.set(x,2.47,z);scene.add(group);
      cylinder(.013,.24,mat('#afb5a0'),0,-.12,0,group);
      const ring=mesh(new THREE.TorusGeometry(.1,.017,6,12),mat('#bdc3af'),0,-.32,0,group);handles.push(group);
    }
  }
  for(let z=-10;z<=10;z+=4){
    box(.5,.05,1.9,steel,0,2.79,z);box(.29,.03,1.65,glow,0,2.75,z);
    const l=new THREE.PointLight('#c2dbb8',7.4,7,2);l.position.set(0,2.53,z);scene.add(l);lamps.push(l);
  }
  scene.add(new THREE.HemisphereLight('#91adac','#161d19',.53));
  const flashlight=new THREE.SpotLight('#e2e7d4',27,14,Math.PI/7,.52,1.5);
  flashlight.position.set(.16,-.12,-.1);camera.add(flashlight);camera.add(flashlight.target);flashlight.target.position.set(0,-.03,-5);
  const hand=new THREE.Group();hand.position.set(-2.15,1.17,-7.7);scene.add(hand);
  box(.13,.17,.25,skin,0,0,0,hand);for(let i=0;i<4;i++){const f=cylinder(.025,.31+(i%2)*.03,skin,.04,.12,-.09+i*.065,hand);f.rotation.z=.23;}
  const ghostMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,alphaTest:.12,depthWrite:false,side:THREE.DoubleSide,color:'#afbbb1'});materials.push(ghostMaterial);
  const ghost=mesh(new THREE.PlaneGeometry(1.8,2.7),ghostMaterial,0,1.35,7);
  const reflectionMaterial=ghostMaterial.clone();materials.push(reflectionMaterial);
  const reflection=mesh(new THREE.PlaneGeometry(1.85,2.78),reflectionMaterial,2.23,1.31,4.6);reflection.rotation.y=-Math.PI/2;
  const shadow=mesh(new THREE.CircleGeometry(.54,24),new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:.4,depthWrite:false}),0,.015,7);shadow.rotation.x=-Math.PI/2;
  new THREE.TextureLoader().load('./assets/inspector.png',t=>{if(disposed){t.dispose();return;}t.colorSpace=THREE.SRGBColorSpace;textures.push(t);ghostMaterial.map=t;reflectionMaterial.map=t;ghostMaterial.needsUpdate=true;reflectionMaterial.needsUpdate=true;assetLoaded=true;},undefined,()=>{assetFailed=true;onError?.('검표원 그림을 불러오지 못했습니다. 새로고침해 주세요.');});
  function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function activeObject(o,s){
    if(o.id==='ticket')return !s.ticket;
    if(o.id==='rules')return true;
    if(o.id==='latch')return s.stage==='false-stop'&&!s.latch;
    if(o.id==='cabinet')return s.stage==='power';
    return o.id.startsWith('leave-')&&trainDoorOpen(s)&&s.stage!=='escape';
  }
  function targets(s){
    camera.updateMatrixWorld();
    return objects.filter(o=>activeObject(o,s)).map(o=>{
      projected.copy(o.point).project(camera);const distance=camera.position.distanceTo(o.point);
      return {id:o.id,title:o.title,x:(projected.x*.5+.5)*100,y:(-.5*projected.y+.5)*100,distance,visible:distance<o.range&&projected.z<1&&projected.x>-.94&&projected.x<.94&&projected.y>-.84&&projected.y<.85};
    }).filter(o=>o.visible);
  }
  function pick(s,x=0,y=0){
    ray.setFromCamera(new THREE.Vector2(x,y),camera);
    const eligible=objects.filter(o=>activeObject(o,s)&&camera.position.distanceTo(o.point)<o.range);
    const hits=ray.intersectObjects(eligible.map(o=>o.node),true);
    if(hits.length)return hits[0].object.userData.interaction;
    const points=targets(s);points.sort((a,b)=>Math.hypot(a.x-50,a.y-50)-Math.hypot(b.x-50,b.y-50));
    return points[0]&&Math.hypot(points[0].x-50,points[0].y-50)<27?points[0].id:null;
  }
  function move(s,forward,strafe,dt){
    if(s.eyes||s.stun>0)return;
    const speed=s.crouch?.92:1.85,norm=Math.max(1,Math.hypot(forward,strafe));
    const dx=(-Math.sin(s.position.yaw)*forward+Math.cos(s.position.yaw)*strafe)*speed*dt/norm;
    const dz=(-Math.cos(s.position.yaw)*forward-Math.sin(s.position.yaw)*strafe)*speed*dt/norm;
    if(s.stage==='escape'){
      s.position.x=THREE.MathUtils.clamp(s.position.x+dx,s.safeSide==='left'?-12:1.9,s.safeSide==='left'?-1.9:12);
      s.position.z=THREE.MathUtils.clamp(s.position.z+dz,-8.7,-4.3);
    }else{
      const limit=s.crouch?1.84:1.2;
      s.position.x=THREE.MathUtils.clamp(s.position.x+dx,-limit,limit);
      s.position.z=THREE.MathUtils.clamp(s.position.z+dz,-10.75,11.5);
    }
  }
  function update(s,dt,{moving=false,reduced=false,title=false,paused=false}={}){
    if(!paused)motionTime+=dt;
    const t=motionTime,dim=s.stage==='inspection'||s.switches.includes('light');
    const darken=s.stage==='reflection'?.72:dim?.12:1;
    for(let i=0;i<lamps.length;i++)lamps[i].intensity=7.4*darken*(reduced?1:.91+.09*Math.sin(t*1.5+i));
    glow.color.set(dim?'#334d3d':'#d1dec4');flashlight.intensity=s.flash&&!s.eyes?27:0;
    if(!paused){doorAmount=THREE.MathUtils.damp(doorAmount,trainDoorOpen(s)?1:0,2.2,dt);eyeHeight=THREE.MathUtils.damp(eyeHeight,s.crouch?.32:1.63,8,dt);}
    for(const d of doorLeaves)d.leaf.position.z=d.base+d.direction*doorAmount*1.48;
    for(let i=0;i<handles.length;i++)handles[i].rotation.z=reduced?0:Math.sin(t*1.4+i*.3)*.065;
    const stopped=['false-stop','last-stop','escape'].includes(s.stage);
    for(const b of boards)b.light.intensity=stopped?10:.1;
    const newSign=`${s.stage}/${s.safeSide}`;
    if(signKey!==newSign){signKey=newSign;for(const b of boards){const safe=(b.side===-1?'left':'right')===s.safeSide;
      const text=s.stage==='false-stop'?'해 진\n03:33\n┃┃┃':`해 진\n${safe?'05:10':'05:11'}\n${safe?'┃┃┃':'┃┃'}`;
      const old=b.node.material;b.node.material=label(text,768,384,{size:83,lineHeight:105,color:'#d6e5cc'});old.map?.dispose();old.dispose();}}
    ticket.visible=!s.ticket;latch.rotation.z=s.latch?-Math.PI/3:Math.PI/3;
    notes.visible=true;hand.visible=s.stage==='false-stop'&&!s.latch;hand.position.y=1.17+(reduced?0:Math.sin(t*1.6)*.035);
    reflection.visible=s.stage==='reflection';reflectionMaterial.opacity=assetLoaded?.68+Math.sin(t*.7)*.1:0;
    ghost.visible=assetLoaded&&(s.stage==='inspection'||s.stun>0||s.status==='dead');shadow.visible=ghost.visible;
    if(s.stun>0||s.status==='dead'){
      direction.set(-Math.sin(s.position.yaw),0,-Math.cos(s.position.yaw));ghost.position.set(s.position.x+direction.x*.9,eyeHeight-1.03,s.position.z+direction.z*.9);ghost.scale.setScalar(1.15);ghostMaterial.opacity=.97;
    }else{
      const part=trainInspection(s);const p=s.time<12?s.time/12:s.time<17?1:Math.max(0,1-(s.time-17)/5);
      const far=11.1,near=Math.min(8,s.position.z+2.4);
      ghost.position.set(.1+Math.sin(t*.42)*.07,1.35+(reduced?0:Math.abs(Math.sin(t*2.4))*.027),THREE.MathUtils.lerp(far,near,p));ghost.scale.setScalar(1);ghostMaterial.opacity=part==='leaving'?Math.max(0,1-(s.time-19)/3):1;
    }
    ghost.lookAt(s.position.x,ghost.position.y,s.position.z);shadow.position.set(ghost.position.x,.01,ghost.position.z);
    if(title){camera.position.set(.2,1.5,10.2);camera.rotation.set(-.025,Math.sin(t*.1)*.06,0);}
    else{
      const sway=reduced||s.eyes||paused?0:Math.sin(t*1.4)*.003;
      const bob=reduced||!moving||s.crouch?0:Math.sin(t*9)*.018;
      camera.position.set(s.position.x,eyeHeight+bob,s.position.z);camera.rotation.set(s.position.pitch+sway,s.position.yaw,sway*.6);
    }
    renderer.render(scene,camera);
  }
  return {update,move,pick,targets,resize,get ready(){return assetLoaded;},get failed(){return assetFailed;},dispose(){disposed=true;observer.disconnect();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();}};
}
