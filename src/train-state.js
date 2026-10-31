// The episode's rules are independent from rendering, input devices and storage.
export const TRAIN_STORAGE='taboo-last-passenger-episode-v1';
export const TRAIN_STAGES=['search','reflection','false-stop','inspection','power','last-stop','escape'];
export const TRAIN_RULES=[
  {title:'01 / 승차권을 먼저 확인하십시오.',text:'이 열차의 탑승객은 한 명입니다. 17번 좌석의 승차권과 맞은편 안내문을 챙기십시오. 목적지는 해진입니다. 승차권의 절취번호는 운행마다 바뀌며, 내릴 때까지 필요합니다. 객차의 앞은 전광판이 있는 쪽입니다.'},
  {title:'02 / 유리가 먼저 움직이면.',text:'빈 좌석 앞 유리에 사람이 비쳐도 그쪽으로 다가가지 마십시오. 손전등을 끄고 눈을 감으십시오. 차륜이 레일의 이음매를 세 번 넘는 동안 유지해야 합니다. 세 번째 충격 뒤 낮은 확인음이 나면 눈을 떠도 됩니다. 불을 켠 채 감거나, 중간에 뜨면 처음부터 다시 해야 합니다.'},
  {title:'03 / 첫 정차에서는 내리지 마십시오.',text:'03:33에 도착하는 역은 목적지의 이름을 흉내 냅니다. 초록 출구등만으로 판단하지 마십시오. 앞쪽 왼편 출입문의 붉은 수동 잠금 레버를 내려 문을 고정하십시오. 문이 열리고 약 30초 뒤 바깥의 손이 안으로 들어옵니다. 닫히기 전 하차하면 돌아올 수 없습니다.'},
  {title:'04 / 이 열차에는 검표원이 없습니다.',text:'발소리가 시작되면 불을 끄고 좌석 옆으로 붙어 몸을 낮추십시오. 빈 객차 중앙에서는 웅크려도 보입니다. 출입문 앞에는 숨을 곳이 없습니다. 화면에 「좌석 아래」가 표시되는지 확인하십시오. 발소리가 멈출 때부터 다시 멀어질 때까지 숨을 참으십시오. 처음부터 참으면 버티지 못합니다. 숨을 참을 수 있는 시간은 약 8초이며, 손목에 흔적이 생길수록 짧아집니다. 눈을 감는 것만으로는 숨을 수 없습니다.'},
  {title:'05 / 방송을 끊어야 종착역에 갑니다.',text:'검표원이 사라진 뒤 객차 맨 앞 전원함을 여십시오. 잠금번호는 승차권 절취번호의 역순입니다. 봉인을 연 뒤 ① 차내등 내림 ② 방송 내림 ③ 출입문 전원 올림 순서로 조작하십시오. 잘못된 번호나 순서는 객차에 당신이 남아 있음을 알립니다. 손전등은 차내등과 별개의 전원입니다.'},
  {title:'06 / 이름, 시간, 표식을 모두 맞추십시오.',text:'마지막 정차에서 양쪽 문이 열립니다. 승차권의 목적지 「해진」, 승강장 시계 「05:10」, 출구 아래의 흰 막대 「세 개」가 함께 있는 쪽으로만 내리십시오. 한 가지만 다르더라도 가짜입니다. 안전한 쪽은 운행마다 달라집니다. 손전등으로 양쪽 표지를 살펴보십시오.'},
  {title:'07 / 내린 뒤에는 앞만 보십시오.',text:'흰 선을 지나 밝은 출구까지 걸어가십시오. 뒤에서 부르는 목소리는 방금 내린 당신의 것입니다. 목소리를 확인하려고 뒤돌아보거나 열차로 되돌아가지 마십시오. 출구를 통과하기 전까지는 끝나지 않았습니다.'},
  {title:'08 / 이름이 세 번 불리지 않도록.',text:'규칙을 어길 때마다 손목에 검은 흔적이 하나 생깁니다. 첫 두 번에는 다시 행동할 기회가 있습니다. 세 번째에는 승객 명부에 등록됩니다. 가짜 역 하차와 출구에서 뒤돌아보기에는 두 번째 기회가 없습니다. 실패하면 그 구간의 시작부터 다시 시도할 수 있습니다.'}
];
export const TRAIN_HINTS={search:'주머니가 비어 있다. 17번 좌석을 찾아보자.',reflection:'비어 있는 좌석인데, 유리에는 누군가 있다.', 'false-stop':'첫 번째 정차. 바깥에서 문을 당긴다.',inspection:'뒤에서 발소리가 들린다.',power:'누군가 계속 이름을 방송한다. 전원함을 찾아야 한다.','last-stop':'양쪽 문이 열린다. 정말 같은 역일까?',escape:'흰 선을 따라 출구까지. 뒤돌아보지 마세요.'};
export function trainStartPosition(stage){
  return stage==='search'?{x:0,z:8.5,yaw:0,pitch:-.08}:stage==='reflection'?{x:0,z:3.5,yaw:-.55,pitch:0}:stage==='false-stop'?{x:0,z:-2,yaw:.35,pitch:0}:stage==='inspection'?{x:0,z:-2.9,yaw:0,pitch:0}:{x:0,z:-8.3,yaw:0,pitch:0};
}
export function createTrainRun(seed=Date.now()){
  const n=Math.abs(Math.trunc(seed))%2147483647||12345;
  let r=n;const random=()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;};
  const digits=Array.from({length:3},()=>Math.floor(random()*9)+1).join('');
  return {seed:n,digits,safeSide:random()<.5?'left':'right',stage:'search',status:'playing',time:0,totalTime:0,strikes:0,checkpointStrikes:0,ticket:false,rules:false,latch:false,panelUnlocked:false,switches:[],flash:true,crouch:false,eyes:false,holdingBreath:false,air:100,eyeTime:0,previousEyes:false,detected:0,stun:0,failure:null,escapeDistance:0,turnTime:0,position:trainStartPosition('search'),events:[],beats:0};
}
export function trainHidden(s){return s.crouch&&Math.abs(s.position.x)>1.12&&s.position.z>-4.45&&s.position.z<10.45;}
export function trainMaxAir(s){return 100-s.strikes*10;}
export function trainDoorOpen(s){return (s.stage==='false-stop'&&!s.latch)||(s.stage==='last-stop'&&s.time>=9)||s.stage==='escape';}
export function trainInspection(s){return s.stage==='inspection'?(s.time<12?'approach':s.time<17?'listening':'leaving'):null;}
function trainEvent(s,type,data={}){s.events.push({type,...data});}
function trainPhase(s,stage){
  s.stage=stage;s.time=0;s.eyeTime=0;s.detected=0;s.beats=0;s.checkpointStrikes=s.strikes;
  trainEvent(s,'phase',{stage});
}
function trainFault(s,reason,rule,fatal=false){
  if(s.stun>0||s.status!=='playing')return;
  s.strikes=Math.min(3,s.strikes+1);s.failure={reason,rule};s.stun=3;
  s.eyes=false;s.holdingBreath=false;s.eyeTime=0;s.detected=0;s.time=0;s.beats=0;s.air=trainMaxAir(s);
  if(fatal||s.strikes>=3)s.status='dead';
  trainEvent(s,'hit',{fatal:s.status==='dead',reason,rule});
}
export function trainAction(s,action,value){
  s.events=[];
  if(s.status!=='playing'||s.stun>0)return s.events;
  if(action==='flash'){s.flash=!s.flash;trainEvent(s,'click');}
  else if(action==='crouch')s.crouch=!s.crouch;
  else if(action==='eyes'){
    if(!value&&s.stage==='reflection'&&s.eyeTime>.8&&s.eyeTime<4.8)trainFault(s,'세 번째 차륜음이 끝나기 전에 눈을 떴습니다.',1);
    s.eyes=Boolean(value);
  }
  else if(action==='breath')s.holdingBreath=Boolean(value);
  else if(action==='ticket'&&s.stage==='search'){s.ticket=true;trainEvent(s,'ticket');}
  else if(action==='rules'){s.rules=true;trainEvent(s,'rules');}
  else if(action==='latch'&&s.stage==='false-stop'){s.latch=true;trainEvent(s,'latch');}
  else if(action==='code'&&s.stage==='power'){
    if(!/^\d{3}$/.test(value))return s.events;
    if(value===s.digits.split('').reverse().join('')){s.panelUnlocked=true;trainEvent(s,'unlocked');}
    else trainFault(s,'전원함이 잘못된 번호를 방송했습니다.',4);
  }
  else if(action==='switch'&&s.stage==='power'&&s.panelUnlocked){
    const order=['light','radio','door'];
    if(value===order[s.switches.length]){s.switches.push(value);trainEvent(s,'switch',{value});if(s.switches.length===3)trainPhase(s,'last-stop');}
    else {s.switches=[];trainFault(s,'전원함의 스위치를 정해진 순서와 다르게 조작했습니다.',4);}
  }
  else if(action==='leave'){
    if(s.stage==='false-stop')trainFault(s,'03:33의 승강장은 해진이 아니었습니다.',2,true);
    else if(s.stage==='last-stop'&&s.time>=9){
      if(value!==s.safeSide)trainFault(s,'역명만 확인했습니다. 시계와 흰 표식이 달랐습니다.',5,true);
      else {trainPhase(s,'escape');s.position={x:value==='left'?-2.7:2.7,z:-6.5,yaw:value==='left'?Math.PI/2:-Math.PI/2,pitch:0};s.crouch=false;s.eyes=false;s.holdingBreath=false;}
    }
  }
  return s.events;
}
export function trainTick(s,delta){
  s.events=[];
  const dt=Math.min(Math.max(Number.isFinite(delta)?delta:0,0),.1);
  if(s.status!=='playing'){s.stun=Math.max(0,s.stun-dt);return s.events;}
  if(s.stun>0){s.stun=Math.max(0,s.stun-dt);return s.events;}
  s.time+=dt;s.totalTime+=dt;
  if(s.holdingBreath){s.air=Math.max(0,s.air-dt*12);if(s.air===0){s.holdingBreath=false;trainEvent(s,'gasp');if(s.stage==='inspection'&&trainInspection(s)==='listening')trainFault(s,'가까이에 멈춘 검표원에게 숨소리가 들렸습니다.',3);}}
  else s.air=Math.min(trainMaxAir(s),s.air+dt*21);
  if(s.stage==='search'&&s.ticket&&s.rules&&s.time>6)trainPhase(s,'reflection');
  else if(s.stage==='reflection'){
    if(s.eyes&&!s.flash){s.eyeTime+=dt;const beat=Math.min(3,Math.floor(s.eyeTime/1.3));if(beat>s.beats){s.beats=beat;trainEvent(s,'rail-beat',{beat});}if(s.eyeTime>=4.8){trainEvent(s,'safe');trainPhase(s,'false-stop');}}
    else if(s.eyes&&s.flash&&s.time>7){s.detected+=dt;if(s.detected>2.5)trainFault(s,'눈은 감았지만 손전등이 당신의 위치를 비추고 있었습니다.',1);}
    if(s.time>42)trainFault(s,'유리 속의 승객이 객차 안으로 들어왔습니다.',1);
  }
  else if(s.stage==='false-stop'){
    if(s.latch&&s.time>9){trainPhase(s,'inspection');s.crouch=false;}
    else if(s.time>30)trainFault(s,'수동 잠금을 내리기 전에 바깥의 손이 들어왔습니다.',2);
  }
  else if(s.stage==='inspection'){
    const part=trainInspection(s);
    const exposed=s.time>8&&(!trainHidden(s)||s.flash);
    const audible=part==='listening'&&!s.holdingBreath;
    s.detected=Math.max(0,s.detected+(exposed||audible?dt:-dt*3));
    if(s.detected>1.4)trainFault(s,s.flash?'불빛이 좌석 아래에서 새어 나왔습니다.':!trainHidden(s)?'객차 중앙에서는 몸을 낮춰도 보입니다.':'검표원이 멈췄을 때 숨소리를 들었습니다.',3);
    else if(s.time>=22){s.holdingBreath=false;trainEvent(s,'safe');trainPhase(s,'power');}
  }
  else if(s.stage==='escape'){
    const facing=s.safeSide==='left'?Math.PI/2:-Math.PI/2;
    const turned=Math.cos(s.position.yaw-facing)<-.05;
    s.turnTime=Math.max(0,s.turnTime+(turned?dt:-dt*2));
    if(s.turnTime>.7||Math.abs(s.position.x)<2.2)trainFault(s,'출구를 통과하기 전에 열차 쪽을 돌아보았습니다.',6,true);
    else if(Math.abs(s.position.x)>10){s.status='escaped';trainEvent(s,'ending',{ending:s.strikes===0?'alone':'followed'});}
  }
  return s.events;
}
export function retryTrain(s){
  const next=createTrainRun(s.seed);
  Object.assign(next,{stage:s.stage==='escape'?'last-stop':s.stage,strikes:s.checkpointStrikes,checkpointStrikes:s.checkpointStrikes,ticket:s.ticket,rules:s.rules,latch:s.stage==='false-stop'?false:s.latch,panelUnlocked:s.panelUnlocked,switches:s.stage==='power'?[]:[...s.switches],totalTime:s.totalTime});
  next.position=trainStartPosition(next.stage);next.air=trainMaxAir(next);return next;
}
export function trainCheckpoint(s){
  return {seed:s.seed,stage:s.stage,status:s.status,strikes:s.strikes,checkpointStrikes:s.checkpointStrikes,ticket:s.ticket,rules:s.rules,latch:s.latch,panelUnlocked:s.panelUnlocked,switches:s.switches,totalTime:s.totalTime,failure:s.failure};
}
export function decodeTrainSave(raw){
  if(!raw)return {run:null,endings:[],writable:true};
  try{
    const data=JSON.parse(raw),v=data?.run;
    if(data?.version!==1||!Array.isArray(data.endings)||data.endings.some(e=>!['alone','followed'].includes(e)))throw Error();
    if(!v)return {run:null,endings:[...new Set(data.endings)],writable:true};
    if(!Number.isSafeInteger(v.seed)||v.seed<=0||v.seed>=2147483647||!TRAIN_STAGES.includes(v.stage)||!['playing','dead','escaped'].includes(v.status)||!Number.isInteger(v.strikes)||v.strikes<0||v.strikes>3||!Number.isInteger(v.checkpointStrikes)||v.checkpointStrikes<0||v.checkpointStrikes>v.strikes||!['ticket','rules','latch','panelUnlocked'].every(k=>typeof v[k]==='boolean')||!Array.isArray(v.switches)||v.switches.length>3||v.switches.some((x,i)=>x!==['light','radio','door'][i])||!Number.isFinite(v.totalTime)||v.totalTime<0)throw Error();
    if(v.stage!=='search'&&(!v.ticket||!v.rules))throw Error();
    if(['last-stop','escape'].includes(v.stage)&&(!v.panelUnlocked||v.switches.length!==3))throw Error();
    if(v.status==='escaped'&&v.stage!=='escape')throw Error();
    if(v.status==='playing'&&v.strikes>=3)throw Error();
    const run=createTrainRun(v.seed);
    Object.assign(run,trainCheckpoint(v),{failure:v.failure&&typeof v.failure.reason==='string'&&Number.isInteger(v.failure.rule)&&v.failure.rule>=0&&v.failure.rule<8?{reason:v.failure.reason.slice(0,200),rule:v.failure.rule}:null});
    if(run.stage==='escape'&&run.status==='playing')run.stage='last-stop';
    run.position=trainStartPosition(run.stage);run.flash=run.stage==='inspection'?false:true;run.air=trainMaxAir(run);
    return {run,endings:[...new Set(data.endings)],writable:true};
  }catch{return {run:null,endings:[],writable:false};}
}
