import {TRAIN_STORAGE,TRAIN_RULES,TRAIN_HINTS,createTrainRun,trainAction,trainTick,trainHidden,trainInspection,trainMaxAir,trainPressure,trainClockPaused,retryTrain,trainCheckpoint,decodeTrainSave} from './train-state.js';
import {createTrainWorld} from './train-world.js';
import {createTrainAudio} from './train-audio.js';
import {installTrainTouchGuard,bindTrainHold} from './train-input.js';

export function mountLastTrain(host){
  const life=new AbortController(),signal=life.signal,audio=createTrainAudio();
  let stored={run:null,endings:[],writable:true};
  try{stored=decodeTrainSave(localStorage.getItem(TRAIN_STORAGE));}catch{stored.writable=false;}
  let run=stored.run||createTrainRun(),mode='title',world,frame,last=null,disposed=false,drag=null,captionTimer=0,caption='',lastPart='',cueBeat=-1,uiTime=0,stepSound=0,checkpointTime=0,heldTap={forward:0,strafe:0,time:0};
  let visibilityPause=false;
  let nextKnock=1.2,knockIndex=0,playerStep=0,pressureSecond=-1,voiceStep=-1;
  const keys=new Set(),heldPointers=new Set(),moveHeld=new Set(),inputResets=[],reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const q=s=>host.querySelector(s),qa=s=>[...host.querySelectorAll(s)];
  const safeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const on=(node,type,fn,options={})=>node?.addEventListener(type,fn,{...options,signal});
  host.innerHTML=`<section class="last-train" aria-label="마지막 승객 — 해진행 막차">
    <canvas id="train-canvas" tabindex="0" role="application" aria-label="객차 탐색 화면. WASD로 이동, 마우스 드래그로 시선, E로 조사"></canvas>
    <div class="train-vignette"></div><div class="train-noise"></div><div class="train-lids"><div class="closed-eyes-cues"><span>차륜의 충격을 기다린다.</span><div id="rail-beats"><i></i><i></i><i></i></div><small id="eyes-caption" aria-live="polite"></small></div></div><div class="train-hit"></div>
    <div id="train-pins">${[['ticket','17번 좌석 · 승차권'],['rules','접힌 이용 수칙'],['latch','비상 폐쇄 레버'],['cabinet','전원함 확인'],['leave-left','왼쪽 승강장으로 내리기'],['leave-right','오른쪽 승강장으로 내리기']].map(([id,label])=>`<button type="button" class="train-pin" data-object="${id}" hidden><span>＋</span><small>${label}</small></button>`).join('')}</div>
    <header class="train-hud"><button type="button" id="train-home" class="train-wordmark" aria-label="게임 메뉴"><span>금기록</span> 마지막 승객</button><div class="train-car-label"><span class="record-dot"></span> <span id="train-phase">해진행 017호</span></div><nav aria-label="게임 도구"><button type="button" id="train-ticket" aria-label="승차권 보기" title="승차권">▤</button><button type="button" id="train-rules" aria-label="이용 수칙 보기" title="이용 수칙">☷</button><button type="button" id="train-audio" aria-label="소리 켜기" aria-pressed="false" title="소리">♪</button><button type="button" id="train-pause" aria-label="일시정지" title="일시정지">Ⅱ</button></nav></header>
    <div class="train-countdown" id="train-countdown" role="timer" aria-live="off" hidden><span></span><strong></strong><i><b></b></i></div>
    <div class="train-crosshair" aria-hidden="true"><i></i></div><button type="button" id="train-interact" hidden><kbd>E</kbd><span></span></button>
    <div class="train-caption" id="train-caption" aria-live="polite"></div>
    <div class="train-controls" id="train-controls"><div class="movement-cluster"><div class="move-pad" aria-label="이동 조작"><button type="button" data-move="forward" aria-label="앞으로 이동">W</button><button type="button" data-move="left" aria-label="왼쪽으로 이동">A</button><button type="button" data-move="back" aria-label="뒤로 이동">S</button><button type="button" data-move="right" aria-label="오른쪽으로 이동">D</button></div><div class="look-pad"><button type="button" data-look="left" aria-label="왼쪽 보기">↶</button><span>드래그로 둘러보기</span><button type="button" data-look="right" aria-label="오른쪽 보기">↷</button></div></div>
    <div class="train-status"><div id="hide-state"></div><div class="air-meter" id="air-meter" hidden><span>숨</span><div><i></i></div><small></small></div><div class="wrist-marks" id="wrist-marks" aria-label="등록 흔적 0개"><i></i><i></i><i></i></div></div>
    <div class="survival-controls"><button type="button" id="action-flash" aria-label="손전등 켜기 끄기" aria-pressed="true"><b>◈</b><span>손전등</span><kbd>F</kbd></button><button type="button" id="action-crouch" aria-label="몸 낮추기" aria-pressed="false"><b>⌄</b><span>몸 낮추기</span><kbd>C</kbd></button><button type="button" id="action-eyes" aria-label="누르는 동안 눈 감기"><b>◡</b><span>눈 감기</span><kbd>SPACE · 누르기</kbd></button><button type="button" id="action-breath" aria-label="누르는 동안 숨 참기"><b>≋</b><span>숨 참기</span><kbd>SHIFT · 누르기</kbd></button></div></div>
    <div class="train-title-screen" id="train-title"><div class="title-kicker"><i></i> 01:13 AM / 해진행 막차</div><h1>마지막<br><em>승객</em></h1><div class="title-rule"></div><p>승차 인원은 한 명입니다.<br>다른 사람을 보셨다면, 수칙을 따르십시오.</p><div class="title-actions">${stored.run?.status==='playing'?'<button type="button" id="train-continue" class="train-primary" disabled>이어 타기 <span>→</span></button>':''}<button type="button" id="train-begin" class="${stored.run?.status==='playing'?'train-secondary':'train-primary'}" disabled>처음부터 승차 <span>→</span></button><button type="button" id="title-manual" class="title-manual">승차 전 이용 수칙</button></div><label class="title-sound"><input type="checkbox" id="start-audio" checked> 환경음과 함께 탑승</label><small id="train-loading">객차를 준비하고 있습니다…</small><div class="title-bottom"><span>1인칭 탐색 · 규칙 생존</span><button type="button" id="title-controls">조작 안내</button></div></div>
    <div class="train-ending" id="train-ending" hidden></div>
    <div class="train-save-warning" id="train-save-warning" ${stored.writable?'hidden':''}>기존 저장값을 읽을 수 없어 이번 진행은 저장하지 않습니다.</div>
    <dialog class="train-dialog" id="train-dialog" aria-labelledby="train-dialog-title"><button type="button" class="train-dialog-close" id="train-dialog-close" aria-label="닫고 돌아가기">×</button><div class="panel-deadline" id="train-panel-deadline" role="timer" aria-live="off" hidden><span></span><strong></strong></div><div id="train-dialog-body"></div></dialog>
  </section>`;
  const root=q('.last-train'),canvas=q('#train-canvas'),dialog=q('#train-dialog');
  installTrainTouchGuard(root,{signal});
  function save(){
    if(!stored.writable)return;
    try{localStorage.setItem(TRAIN_STORAGE,JSON.stringify({version:1,run:trainCheckpoint(run),endings:stored.endings}));}
    catch{stored.writable=false;q('#train-save-warning').hidden=false;q('#train-save-warning').textContent='이번 진행은 저장되지 않습니다. 브라우저 저장 공간을 확인해 주세요.';}
  }
  function paused(){return mode!=='play'||dialog.open||document.hidden||visibilityPause;}
  function clockPaused(){return trainClockPaused(mode,dialog.open?dialog.dataset.kind:null,document.hidden,visibilityPause);}
  function clearControls(){keys.clear();inputResets.forEach(reset=>reset());heldPointers.clear();moveHeld.clear();heldTap.time=0;run.eyes=false;run.holdingBreath=false;drag=null;}
  function resetCues(){lastPart='';cueBeat=-1;nextKnock=1.2;knockIndex=0;pressureSecond=-1;voiceStep=-1;}
  function say(text,seconds=5){caption=text;captionTimer=seconds;q('#train-caption').textContent=text;}
  function audioLabel(){q('#train-audio').textContent=audio.enabled?'♫':'♪';q('#train-audio').setAttribute('aria-label',audio.enabled?'소리 끄기':'소리 켜기');q('#train-audio').setAttribute('aria-pressed',String(audio.enabled));}
  function modal(kind,html){
    clearControls();dialog.dataset.kind=kind;q('#train-dialog-body').innerHTML=html;
    if(trainClockPaused(mode,kind,document.hidden,visibilityPause))audio.pause();else audio.resume();
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
  }
  function closeModal(){if(dialog.open)dialog.close();}
  on(dialog,'close',()=>{if(mode==='play'&&!document.hidden){visibilityPause=false;audio.resume();canvas.focus({preventScroll:true});}});
  on(q('#train-dialog-close'),'click',closeModal);
  function manual(highlight=-1){
    modal('rules',`<div class="paper-heading"><small>해진선 · 막차</small><h2 id="train-dialog-title">야간 승차 안내</h2><p>승차 인원은 한 명입니다.</p></div><ol class="train-rule-list" aria-label="야간 승차 수칙">${TRAIN_RULES.map((r,i)=>`<li data-rule-group="${r.group}" ${r.group===highlight?'class="rule-highlight"':''}><span class="train-rule-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><p>${r.text}</p></li>`).join('')}</ol><div class="paper-footer"><span class="paper-stamp">해진선 야간 운행실</span><button type="button" id="train-rules-fold">접어두기</button></div>`);
    q('#train-rules-fold').onclick=closeModal;
    if(highlight>=0)q('.rule-highlight')?.scrollIntoView({block:'center'});
  }
  function showTicket(){
    if(!run.ticket){say('17번 좌석에 승차권이 남아 있습니다.');return;}
    modal('ticket',`<h2 id="train-dialog-title" class="ticket-title">당신의 승차권</h2><div class="boarding-ticket"><div>해 진 선 <span>편도 / 마지막 열차</span></div><h3>출발지 미상 <b>→</b> 해 진</h3><section><span>좌석<strong>17</strong></span><span>승객<strong>1명</strong></span><span>도착<strong>05:10</strong></span></section><div class="ticket-cut">절취번호 <strong>${run.digits.split('').join(' ')}</strong></div><small>전원함에는 절취번호를 거꾸로 입력하십시오.<br>이 승차권은 당신 것만 보관하십시오.</small><div class="ticket-bars" aria-hidden="true"></div></div>`);
  }
  function controlHelp(){modal('controls',`<h2 id="train-dialog-title">차내에서 움직이는 법</h2><div class="control-guide"><p><kbd>W A S D</kbd><span>이동. 화면 왼쪽 버튼을 눌러도 됩니다.</span></p><p><kbd>드래그</kbd><span>시선 이동. ← → 방향키 또는 화면 회전 버튼도 사용할 수 있습니다.</span></p><p><kbd>E</kbd><span>가까운 사물 조사. 사물 위의 표시를 직접 눌러도 됩니다.</span></p><p><kbd>F</kbd><span>손전등 켜기 / 끄기</span></p><p><kbd>C</kbd><span>몸 낮추기 / 일어서기</span></p><p><kbd>SPACE</kbd><span>누르는 동안 눈 감기</span></p><p><kbd>SHIFT</kbd><span>누르는 동안 숨 참기. 숨이 차면 잠깐 풀어 회복하십시오.</span></p><p><kbd>ESC</kbd><span>일시정지. 수칙과 승차권을 읽는 동안에도 시간이 멈춥니다.</span></p></div><p class="guide-footnote">전원함을 조작하는 동안에도 시간은 흐릅니다. 소리 없이도 차륜 충격·발소리의 멈춤을 화면에서 확인할 수 있습니다. 기기의 움직임 줄이기 설정을 따릅니다.</p>`);}
  function pauseMenu(){
    modal('pause',`<small class="dialog-eyebrow">운행 일시정지</small><h2 id="train-dialog-title">잠시 숨을 고르세요.</h2><div class="pause-actions"><button type="button" id="pause-resume" class="train-primary">계속하기 →</button><button type="button" id="pause-controls">조작 안내</button><button type="button" id="pause-restart">처음부터 다시 승차</button></div>`);
    q('#pause-resume').onclick=()=>{visibilityPause=false;closeModal();};
    q('#pause-controls').onclick=controlHelp;
    q('#pause-restart').onclick=()=>{visibilityPause=false;closeModal();begin(false);};
  }
  async function begin(resume){
    if(!world?.ready)return;
    if(!resume)run=createTrainRun();
    clearControls();resetCues();visibilityPause=false;mode='play';root.classList.add('has-started');q('#train-title').hidden=true;q('#train-ending').hidden=true;
    await audio.enable(q('#start-audio').checked);audioLabel();if(disposed)return;
    say(run.stage==='search'?(run.ticket?'맞은편 좌석의 접힌 안내문.':'17번 좌석. 내 승차권이 남아 있다.'):TRAIN_HINTS[run.stage],8);audio.cue('bell');save();canvas.focus({preventScroll:true});
  }
  function keypad(){
    if(run.stage!=='power')return;
    if(run.panelUnlocked){switchPanel();return;}
    modal('keypad',`<small class="dialog-eyebrow">객차 전원함 / 봉인 잠금</small><h2 id="train-dialog-title">절취번호를 역순으로</h2><p class="panel-note">승차권을 확인한 뒤 세 자리를 입력하십시오.</p><form id="train-code-form"><label class="sr-only" for="train-code">전원함 암호</label><output id="train-code" tabindex="0" aria-live="polite">— — —</output><div class="train-keypad">${['1','2','3','4','5','6','7','8','9','⌫','0','↵'].map(x=>`<button type="button" data-key="${x}" aria-label="${x==='⌫'?'한 자리 지우기':x==='↵'?'번호 확인':x}">${x}</button>`).join('')}</div></form><button type="button" id="panel-ticket">승차권 확인</button>`);
    const display=q('#train-code');let code='';
    const submit=()=>{if(code.length===3)act('code',code);};
    const enter=k=>{if(k==='↵')submit();else{code=k==='⌫'?code.slice(0,-1):k==='clear'?'':(code+k).slice(0,3);display.value=code||'— — —';audio.resume();audio.cue('click');}};
    q('#train-code-form').onsubmit=e=>{e.preventDefault();submit();};
    q('#train-code-form').onkeydown=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=/^\d$/.test(e.key)?e.key:e.key==='Backspace'?'⌫':e.key==='Delete'?'clear':e.key==='Enter'&&e.target===display?'↵':null;if(k){e.preventDefault();enter(k);}};
    qa('[data-key]').forEach(b=>b.onclick=()=>enter(b.dataset.key));
    display.focus({preventScroll:true});
    q('#panel-ticket').onclick=()=>{showTicket();const back=document.createElement('button');back.type='button';back.className='back-to-panel';back.textContent='전원함으로 돌아가기';back.onclick=keypad;q('#train-dialog-body').append(back);};
  }
  function switchPanel(){
    modal('switches',`<small class="dialog-eyebrow">봉인 해제</small><h2 id="train-dialog-title">비상 전원</h2><p class="panel-note">수칙에 적힌 순서대로 조작하십시오.</p><div class="breaker-panel">${[['light','차내등','내림'],['radio','방송','내림'],['door','출입문 전원','올림']].map(([id,label,verb])=>`<button type="button" data-breaker="${id}" ${run.switches.includes(id)?'disabled':''} aria-label="${label} ${verb}" class="breaker ${run.switches.includes(id)?'switched':''}"><span class="breaker-light"></span><strong>${label}</strong><i class="breaker-track"><b></b></i><small>${run.switches.includes(id)?'조작 완료':verb}</small></button>`).join('')}</div>`);
    qa('[data-breaker]').forEach(b=>b.onclick=()=>act('switch',b.dataset.breaker));
  }
  function finish(){
    if(mode==='ending')return;
    mode='ending';clearControls();closeModal();const success=run.status==='escaped',alone=run.strikes===0;
    if(success){const ending=alone?'alone':'followed';if(!stored.endings.includes(ending))stored.endings.push(ending);}
    save();audio.cue(success?'ending':'voice');
    q('#train-ending').hidden=false;q('#train-ending').className=`train-ending ${success?'ending-return':'ending-register'}`;
    q('#train-ending').innerHTML=`${success&&!alone?'<img class="ending-presence" src="./assets/inspector.png" alt="">':''}<small>${success?'운행 종료 / 05:10':'승객 명부 갱신'}</small><h2>${success?(alone?'당신만 내렸다.':'두 사람이 내렸다.'):'새로운 승객이 등록되었습니다.'}</h2><p>${success?(alone?'열차가 떠난 뒤, 승차권의 글씨가 사라졌다.':'분명 혼자 걸었는데, 출구에는 발소리가 두 개였다.'):safeText(run.failure?.reason||'열차가 당신의 이름을 기억합니다.')}</p><div class="ending-seal">${success?(alone?'귀환 확인':'동행 확인'):'좌석 18번 / 하차 불가'}</div><div class="train-ending-actions">${!success?'<button type="button" id="retry-checkpoint" class="train-primary">이 구간부터 다시 →</button>':''}<button type="button" id="ending-new" class="${success?'train-primary':'train-secondary'}">다시 승차하기</button>${!success?'<button type="button" id="ending-rule">놓친 수칙 확인</button>':''}</div><small class="ending-count">발견한 귀환 기록 ${stored.endings.length} / 2</small>`;
    q('#ending-new').onclick=()=>begin(false);
    if(!success){q('#retry-checkpoint').onclick=()=>{run=retryTrain(run);resetCues();mode='play';q('#train-ending').hidden=true;audio.resume();say(TRAIN_HINTS[run.stage]);save();canvas.focus();};q('#ending-rule').onclick=()=>manual(run.failure?.rule??0);}
  }
  function handleEvents(events){
    for(const e of events){
      if(e.type==='phase'){
        resetCues();save();say(TRAIN_HINTS[e.stage],7);
        if(e.stage==='false-stop'){audio.cue('brake');audio.cue('warning',-.7);}else if(e.stage!=='inspection')audio.cue('bell');
        if(e.stage==='last-stop'){closeModal();run.crouch=false;}
      }else if(e.type==='hit'){closeModal();clearControls();resetCues();audio.resume();audio.cue('hit');say(e.fatal?'당신의 이름이 명부에 적혔다.':`손목에 검은 흔적이 생겼다. ${e.reason}`,7);save();}
      else if(e.type==='ticket'){save();say('맞은편 좌석에 접힌 안내문이 있다.');showTicket();}
      else if(e.type==='rules'){save();manual();}
      else if(e.type==='unlocked'){save();audio.resume();audio.cue('click');switchPanel();}
      else if(e.type==='switch'){audio.resume();audio.cue('switch');if(run.stage==='power')switchPanel();save();}
      else if(e.type==='latch'){audio.cue('switch',-.7);say('문이 닫힌다. 잠금쇠가 걸릴 때까지…',3);save();}
      else if(e.type==='sealed'){audio.cue('seal',-.7);say('잠금쇠가 걸렸다. 경보가 꺼졌다.',3);}
      else if(e.type==='door-forced'){audio.door(knockIndex++);say('밖에서 문을 벌리고 있다. 왼쪽 폐쇄 레버.',5);}
      else if(e.type==='hand')say('문틈으로 손가락이 들어왔다.',4);
      else if(e.type==='rail-beat'){audio.cue('rail');q('#eyes-caption').textContent=`차륜 충격 ${e.beat}회`;}
      else if(e.type==='safe'){audio.cue('safe');q('#eyes-caption').textContent='확인음. 이제 눈을 떠도 된다.';}
      else if(e.type==='ending')finish();
      else if(e.type==='gasp'){audio.cue('gasp');say('숨이 터져 나왔다.',2);}
      else if(e.type==='click')audio.cue('click');
    }
  }
  function act(action,value){if(mode!=='play')return;handleEvents(trainAction(run,action,value));}
  function interact(id){
    if(paused()||run.stun>0)return;
    if(id==='cabinet')keypad();else if(id?.startsWith('leave-'))act('leave',id.slice(6));else if(id)act(id);
  }
  on(q('#train-begin'),'click',()=>begin(false));on(q('#train-continue'),'click',()=>begin(true));
  on(q('#title-manual'),'click',()=>manual());on(q('#title-controls'),'click',controlHelp);
  on(q('#train-rules'),'click',()=>manual());on(q('#train-ticket'),'click',showTicket);
  on(q('#train-pause'),'click',()=>mode==='play'?pauseMenu():controlHelp());on(q('#train-home'),'click',()=>mode==='play'?pauseMenu():controlHelp());
  on(q('#train-audio'),'click',async()=>{await audio.enable(!audio.enabled);audioLabel();});
  on(q('#action-flash'),'click',()=>{if(!paused())act('flash');canvas.focus();});
  on(q('#action-crouch'),'click',()=>{if(!paused())act('crouch');canvas.focus();});
  on(q('#train-interact'),'click',()=>{interact(world.pick(run));canvas.focus();});
  qa('[data-object]').forEach(b=>on(b,'click',()=>{interact(b.dataset.object);if(!dialog.open)canvas.focus();}));
  function heldButton(button,action){
    inputResets.push(bindTrainHold(button,{signal,enabled:()=>!paused(),onChange:(held,{cancelled})=>{
      if(held)heldPointers.add(action);else heldPointers.delete(action);
      const keyboard=action==='eyes'?keys.has('Space'):keys.has('ShiftLeft')||keys.has('ShiftRight');
      if(cancelled)run[action==='eyes'?'eyes':'holdingBreath']=keyboard||held;else act(action,keyboard||held);
    },onRelease:()=>canvas.focus({preventScroll:true})}));
  }
  heldButton(q('#action-eyes'),'eyes');heldButton(q('#action-breath'),'breath');
  const moveKeys={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};
  qa('[data-move]').forEach(b=>{
    inputResets.push(bindTrainHold(b,{signal,enabled:()=>!paused(),onChange:held=>{if(held)moveHeld.add(moveKeys[b.dataset.move]);else moveHeld.delete(moveKeys[b.dataset.move]);},onTap:duration=>{if(duration<220&&!paused())heldTap={forward:b.dataset.move==='forward'?1:b.dataset.move==='back'?-1:0,strafe:b.dataset.move==='right'?1:b.dataset.move==='left'?-1:0,time:.36};},onRelease:()=>canvas.focus({preventScroll:true})}));
    on(b,'click',e=>{if(e.detail===0&&!paused()){heldTap={forward:b.dataset.move==='forward'?1:b.dataset.move==='back'?-1:0,strafe:b.dataset.move==='right'?1:b.dataset.move==='left'?-1:0,time:.36};}});
  });
  qa('[data-look]').forEach(b=>on(b,'click',()=>{if(!paused()&&!run.eyes){run.position.yaw+=b.dataset.look==='left'?Math.PI/2:-Math.PI/2;run.position.pitch=0;}canvas.focus();}));
  on(canvas,'pointerdown',e=>{if(paused()||e.button!==0||drag)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,distance:0};});
  on(canvas,'pointermove',e=>{if(!drag||drag.id!==e.pointerId||paused()||run.eyes)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);run.position.yaw-=dx*.004;run.position.pitch=Math.max(-1.05,Math.min(.85,run.position.pitch-dy*.003));drag.x=e.clientX;drag.y=e.clientY;});
  on(canvas,'pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(drag.distance<5&&!paused()){const rect=canvas.getBoundingClientRect();interact(world.pick(run,(e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1));}drag=null;});
  for(const type of ['pointercancel','lostpointercapture'])on(canvas,type,e=>{if(drag?.id===e.pointerId)drag=null;});
  on(document,'keydown',e=>{
    if(e.code==='Escape'){if(mode==='play'&&!dialog.open){e.preventDefault();pauseMenu();}return;}
    if(paused()||e.target.closest('input,textarea,select'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','ShiftLeft','ShiftRight','KeyF','KeyC','KeyE','KeyR'].includes(e.code))e.preventDefault();
    keys.add(e.code);if(e.repeat)return;
    if(e.code==='Space')act('eyes',true);else if(e.code.startsWith('Shift'))act('breath',true);else if(e.code==='KeyF')act('flash');else if(e.code==='KeyC')act('crouch');else if(e.code==='KeyE')interact(world.pick(run));else if(e.code==='KeyR')manual();
  });
  on(document,'keyup',e=>{keys.delete(e.code);if(paused())return;if(e.code==='Space')act('eyes',heldPointers.has('eyes'));else if(e.code.startsWith('Shift'))act('breath',heldPointers.has('breath')||keys.has('ShiftLeft')||keys.has('ShiftRight'));});
  on(window,'blur',()=>{clearControls();});
  on(window,'pagehide',clearControls);on(window,'orientationchange',clearControls);
  on(document,'visibilitychange',()=>{if(document.hidden){clearControls();audio.pause();if(mode==='play')visibilityPause=true;}else if(visibilityPause&&mode==='play')pauseMenu();});
  function refreshUI(){
    const active=mode==='play';root.dataset.stage=run.stage;root.dataset.state=mode;root.classList.toggle('train-playing',active);root.classList.toggle('eyes-closed',active&&run.eyes);root.classList.toggle('crouching',run.crouch);root.classList.toggle('is-stunned',run.stun>0);root.classList.toggle('motion-reduced',reduced.matches);
    q('#train-controls').hidden=!active;q('#train-interact').hidden=true;
    q('#train-ticket').disabled=!run.ticket;q('#action-flash').setAttribute('aria-pressed',String(run.flash));q('#action-crouch').setAttribute('aria-pressed',String(run.crouch));q('#action-eyes').setAttribute('aria-pressed',String(run.eyes));q('#action-breath').setAttribute('aria-pressed',String(run.holdingBreath));
    q('.train-lids').setAttribute('aria-hidden',String(!active||!run.eyes));
    q('#train-phase').textContent=mode==='title'||run.stage==='search'?'해진행 017호':run.stage==='false-stop'?'03:33 / 정차':run.stage==='last-stop'?'종착역 접근':run.stage==='escape'?'하차 중':'승객 01명';
    const pressure=active?trainPressure(run):null,urgent=Boolean(pressure&&pressure.remaining<=10);
    const seconds=pressure?Math.ceil(pressure.remaining):0,time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    for(const node of [q('#train-countdown'),q('#train-panel-deadline')]){
      node.hidden=!pressure||(node.id==='train-panel-deadline'&&(!dialog.open||!['keypad','switches'].includes(dialog.dataset.kind)));
      node.classList.toggle('urgent',urgent);node.querySelector('span').textContent=pressure?.label||'';node.querySelector('strong').textContent=time;
      node.setAttribute('aria-label',pressure?`${pressure.label} ${seconds}초`:'남은 시간');
    }
    if(pressure)q('#train-countdown b').style.width=`${pressure.fraction*100}%`;
    q('#air-meter').hidden=!active||(!run.holdingBreath&&run.air>=trainMaxAir(run)-1&&run.stage!=='inspection');q('#air-meter i').style.width=`${run.air}%`;q('#air-meter small').textContent=run.holdingBreath?'참는 중':run.air<trainMaxAir(run)-1?'회복 중':'';
    q('#hide-state').textContent=run.crouch?(trainHidden(run)?'좌석 아래':'가려지지 않음'):'';q('#hide-state').classList.toggle('exposed',run.crouch&&!trainHidden(run));
    qa('#wrist-marks i').forEach((i,n)=>i.classList.toggle('marked',n<run.strikes));q('#wrist-marks').setAttribute('aria-label',`등록 흔적 ${run.strikes}개`);
    qa('#rail-beats i').forEach((i,n)=>i.classList.toggle('heard',n<run.beats));
    q('.train-hit').style.opacity=run.stun>0?String(Math.min(.9,run.stun/3)):'0';
    const targets=active&&!paused()&&!run.eyes&&run.stun<=0?world.targets(run):[];
    const focused=active&&!paused()&&!run.eyes&&run.stun<=0?world.pick(run):null;
    qa('[data-object]').forEach(b=>{const t=targets.find(t=>t.id===b.dataset.object);b.hidden=!t||b.dataset.object===focused;if(t){b.style.left=`${Math.max(10,Math.min(90,t.x))}%`;b.style.top=`${Math.min(t.y,67)}%`;}});
    if(focused){q('#train-interact').hidden=false;q('#train-interact span').textContent=targets.find(t=>t.id===focused)?.title||'조사하기';}
    if(captionTimer<=0)q('#train-caption').textContent=active&&run.stage==='search'?(run.ticket?'맞은편 좌석의 접힌 안내문.':'17번 좌석의 승차권을 찾아보세요.'):'';
  }
  function animate(now){
    if(disposed)return;
    const dt=last===null?0:Math.min(.1,(now-last)/1000);last=now;
    const stop=clockPaused(),active=mode==='play';let moving=false;
    if(active&&!stop){
      const down=key=>keys.has(key)||moveHeld.has(key);
      let f=Number(down('KeyW'))-Number(down('KeyS')),st=Number(down('KeyD'))-Number(down('KeyA'));
      if(heldTap.time>0){heldTap.time-=dt;f+=heldTap.forward;st+=heldTap.strafe;}
      if(!run.eyes){run.position.yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.6;run.position.pitch=Math.max(-1.05,Math.min(.85,run.position.pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt));}
      const oldX=run.position.x,oldZ=run.position.z;world.move(run,f,st,dt);moving=Math.hypot(run.position.x-oldX,run.position.z-oldZ)>.0001;handleEvents(trainTick(run,dt));audio.state(run);
      captionTimer-=dt;checkpointTime+=dt;
      if(moving&&!run.crouch){stepSound+=dt;if(stepSound>.5){stepSound=0;audio.footstep(run,false,playerStep++);}}else stepSound=.35;
      const part=trainInspection(run);
      if(part!==lastPart){lastPart=part;if(part==='listening')say('발소리가 멈췄다.',5);if(part==='leaving')say('발소리가 다시 멀어진다.',5);}
      if(part&&part!=='listening'){const beat=Math.floor(run.time/.82);if(beat!==cueBeat){cueBeat=beat;audio.footstep(run,true,beat);}}
      if(run.stage==='false-stop'&&!run.latch&&run.time>=nextKnock){audio.door(knockIndex++);nextKnock=run.time+Math.max(.65,2.5-run.time*.065);if(run.time<4)audio.cue('warning',-.7);}
      const pressure=trainPressure(run),second=pressure?Math.ceil(pressure.remaining):-1;
      if(pressure&&second!==pressureSecond){pressureSecond=second;if(second<=10)audio.cue('tick');}
      if(run.stage==='power'){const syllable=Math.floor(run.time/12);if(syllable!==voiceStep){voiceStep=syllable;audio.cue('voice',.25);}}
      if(run.stage==='escape'&&run.time>1&&run.time<1+dt*1.5){audio.cue('voice',-.7);say('“같이 가.”',2.5);}
      if(run.status==='dead'&&run.stun<=0)finish();
      if(checkpointTime>5){checkpointTime=0;save();}
    }
    world.update(run,dt,{moving,reduced:reduced.matches,title:mode==='title',paused:stop});
    uiTime+=dt;if(uiTime>.08){refreshUI();uiTime=0;}
    if(mode==='title'&&world.ready){q('#train-loading').textContent='WASD 이동 · 드래그로 시선 · 모바일 터치 지원';q('#train-begin').disabled=false;if(q('#train-continue'))q('#train-continue').disabled=false;}
    frame=requestAnimationFrame(animate);
  }
  try{world=createTrainWorld(canvas,message=>{q('#train-loading').textContent=message;say(message,20);});frame=requestAnimationFrame(animate);}
  catch{q('#train-loading').textContent='3D 화면을 시작하지 못했습니다. 하드웨어 가속이 가능한 브라우저에서 다시 열어 주세요.';}
  return ()=>{disposed=true;cancelAnimationFrame(frame);life.abort();if(mode==='play')save();audio.dispose();world?.dispose();host.replaceChildren();};
}
