import {sceneScripts,tickScene} from './scene-data.js';
import {sceneArtwork} from './scenery.js';
import {createSession,answerRound,advanceRound} from './engine.js';
import {playCue} from './audio.js';

export function mountCinema(host,game,{getSession,saveSession,onSound,isSoundOn,nextId}) {
  const abort=new AbortController(),signal=abort.signal;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame,disposed=false,paused=false,notebook=false,locked=false,viewAbort=new AbortController();
  let picks=[],picked=null,clock={last:null,elapsed:0},action=null,beat=-1;
  const find=selector=>host.querySelector(selector);
  const listen=(node,event,fn)=>node?.addEventListener(event,fn,{signal:viewAbort.signal});
  const actuallyPaused=()=>paused||notebook||document.hidden;
  const button=(label,content,extra='')=>`<button type="button" aria-label="${label}" ${extra}>${content}</button>`;
  const shortLabel=id=>sceneScripts[game.id][getSession()?.step||0].spots?.find(s=>s.id===id)?.label||id;

  function render(focus=false) {
    viewAbort.abort();viewAbort=new AbortController();
    let session=getSession();
    // Older versions saved an explicit feedback screen. Finish that transition once.
    if(session?.status==='playing'&&session.phase==='feedback'){
      session=advanceRound(session); saveSession(session);
    }
    locked=false;picks=[];picked=null;action=null;beat=-1;clock={last:null,elapsed:0};
    const step=session?.step||0,round=game.rounds[step],script=sceneScripts[game.id][step];
    const intro=!session,ending=session&&session.status!=='playing';
    host.innerHTML=`<section class="cinema scene-${game.scene} ${intro?'is-intro':''} ${ending?`is-ending ending-${session.status}`:''}" aria-label="${game.title}" data-step="${step}">
      <header class="cinema-header"><a href="#" class="cinema-back" aria-label="보관소로 돌아가기">← <span>보관소</span></a><div class="cinema-title"><small>FILE ${game.number}</small><h1>${game.title}</h1></div><div class="cinema-tools">${button('소리 켜기','♪','id="cinema-sound" aria-pressed="false"')}${button('규칙 수첩','☷','id="cinema-notes"')}${button('일시정지','Ⅱ','id="cinema-pause"')}</div></header>
      <div class="scene-viewport"><div class="scene-space"><div class="cinema-world">${sceneArtwork(game.scene,step)}</div><div class="scene-shade"></div><div class="scene-grain"></div><div class="scene-controls">${!intro&&!ending?controls(round,script):''}</div><div class="effect-curtain"></div><div class="effect-lids"></div><div class="effect-fade"></div><div class="scene-crosshair" aria-hidden="true">+</div>
      ${intro?`<div class="cinema-intro"><span class="intro-number">${game.number}</span><p>${game.location}</p><h2>${game.title}</h2><div class="intro-line"></div><button class="enter-scene" id="cinema-enter" type="button">들어가기 <span>→</span></button><small>장면 속 사물을 눌러 행동하세요.</small></div>`:''}
      ${ending?`<div class="cinema-ending" role="status"><span>${session.status==='escaped'?'SIGNAL RESTORED':'SIGNAL LOST'}</span><h2>${game[session.status].title}</h2><div class="ending-actions">${button('다시 도전하기','다시 도전','id="cinema-replay"')}<a href="#game/${nextId}">다음 기록 →</a></div>${session.status==='lost'?button('놓친 규칙 보기','놓친 규칙','id="failure-note" class="failure-note"'):''}</div>`:''}
      </div></div>
      <footer class="cinema-footer"><div class="chapter-dots" role="progressbar" aria-label="장면 진행" aria-valuenow="${ending?100:Math.round(step/game.rounds.length*100)}" aria-valuemin="0" aria-valuemax="100">${game.rounds.map((_,i)=>`<i class="${i<=step?'reached':''}"></i>`).join('')}</div><p id="scene-cue" aria-live="polite">${intro?'규칙은 수첩에 남겨 두었습니다.':ending?'기록이 저장되었습니다.':script.cue}</p><span class="scene-counter">${String(step+1).padStart(2,'0')} / ${String(game.rounds.length).padStart(2,'0')}</span></footer>
      <div class="pause-screen" hidden><p>숨을 고르세요.</p>${button('계속 플레이','계속하기','id="cinema-resume"')}${button('처음부터 다시 시작','처음부터','id="cinema-restart"')}</div>
      <dialog class="scene-notebook" aria-labelledby="notebook-title"><div class="notebook-head"><span>접힌 메모</span>${button('수첩 닫기','×','id="notebook-close"')}</div><h2 id="notebook-title">돌아오는 방법</h2><ol>${game.rules.map(r=>`<li>${r}</li>`).join('')}</ol><details><summary>장면 설명</summary><p>${round.text}</p>${(round.objects||[]).map(o=>`<p><strong>${o.label}</strong> · ${o.detail}</p>`).join('')}</details></dialog>
    </section>`;
    updateSound();syncPause();
    listen(find('#cinema-enter'),'click',()=>{saveSession(createSession(game.id));playCue('door');render(true);});
    listen(find('#cinema-replay'),'click',()=>{saveSession(createSession(game.id));render(true);});
    listen(find('#cinema-pause'),'click',()=>{paused=!paused;syncPause();if(paused)find('#cinema-resume').focus();});
    listen(find('#cinema-resume'),'click',()=>{paused=false;syncPause();find('#cinema-pause').focus();});
    listen(find('#cinema-restart'),'click',()=>{paused=false;saveSession(createSession(game.id));render(true);});
    listen(find('#cinema-notes'),'click',openNotebook);
    listen(find('#failure-note'),'click',openNotebook);
    listen(find('#notebook-close'),'click',()=>find('.scene-notebook').close());
    listen(find('.scene-notebook'),'close',()=>{notebook=false;syncPause();});
    listen(find('#cinema-sound'),'click',async()=>{const b=find('#cinema-sound');b.disabled=true;await onSound();if(!disposed){updateSound();b.disabled=false;}});
    if(!intro&&!ending)bindControls(round,script);
    if(focus){find('.scene-controls button, .enter-scene, #cinema-replay')?.focus({preventScroll:true});}
  }
  function controls(round,script) {
    if(round.type==='code')return `<form class="scene-keypad" id="scene-code-form"><span class="device-label">${script.clue}</span><input id="scene-code" type="text" inputmode="numeric" autocomplete="off" maxlength="${round.answer.length}" aria-label="세 자리 암호" placeholder="— — —"><div class="keypad-grid">${['1','2','3','4','5','6','7','8','9','back','0','enter'].map(n=>button(n==='back'?'한 자리 지우기':n==='enter'?'암호 확인':n,n==='back'?'⌫':n==='enter'?'↵':n,`data-digit="${n}" ${n==='enter'?'disabled':''}`)).join('')}</div></form>`;
    return `${script.clue?`<div class="scene-clue">${script.clue}</div>`:''}${script.spots.map((s,i)=>`<button type="button" class="scene-hotspot ${script.panel?'physical-button':''}" data-action="${s.id}" style="--x:${s.x}%;--y:${s.y}%" aria-label="${s.label}"><span class="hotspot-ring" aria-hidden="true">${script.panel?s.label:'+'}</span><span class="hotspot-label">${script.panel?'':s.label}</span></button>`).join('')}
    ${round.type==='inspect'?`<div class="inspect-commit" hidden><span id="inspected-name"></span>${button(script.commit,`${script.commit} →`,'id="scene-inspect-submit"')}</div>`:''}
    ${round.type==='sequence'?`<div class="scene-sequence"><output aria-label="입력 순서" id="scene-sequence-value">${'○ '.repeat(round.answer.length)}</output>${button('마지막 입력 취소','↶','id="scene-undo" disabled')}${button('순서 실행','→','id="scene-sequence-submit" disabled')}</div>`:''}`;
  }
  function bindControls(round,script) {
    find('.scene-controls').querySelectorAll('[data-action]').forEach(b=>listen(b,'click',()=>{
      if(locked||actuallyPaused())return;
      const id=b.dataset.action;
      if(round.type==='choice'){perform(id,script.spots.find(s=>s.id===id).effect);return;}
      playCue('tap');
      if(round.type==='inspect'){
        picked=id;
        find('.scene-controls').querySelectorAll('[data-action]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
        find('.cinema-world').querySelectorAll('[data-object]').forEach(el=>el.classList.toggle('object-selected',el.dataset.object===id));
        find('.inspect-commit').hidden=false;find('#inspected-name').textContent=shortLabel(id);
      }else if(picks.length<round.answer.length){picks.push(id);updateSequence(round);}
    }));
    listen(find('#scene-inspect-submit'),'click',()=>{if(picked)perform(picked,script.effect);});
    listen(find('#scene-undo'),'click',()=>{if(locked||actuallyPaused())return;picks.pop();updateSequence(round);playCue('tap');});
    listen(find('#scene-sequence-submit'),'click',()=>perform([...picks],script.effect));
    if(round.type==='code'){
      const input=find('#scene-code');
      const update=()=>{input.value=input.value.replace(/\D/g,'').slice(0,round.answer.length);find('[data-digit="enter"]').disabled=input.value.length!==round.answer.length;};
      listen(input,'input',update);
      find('.keypad-grid').querySelectorAll('button').forEach(b=>listen(b,'click',()=>{
        if(locked||actuallyPaused())return;
        if(b.dataset.digit==='enter'){perform(input.value,script.effect);return;}
        input.value=b.dataset.digit==='back'?input.value.slice(0,-1):(input.value+b.dataset.digit).slice(0,round.answer.length);update();playCue('key');
      }));
      listen(find('#scene-code-form'),'submit',e=>{e.preventDefault();if(input.value.length===round.answer.length)perform(input.value,script.effect);});
    }
  }
  function updateSequence(round){
    find('#scene-sequence-value').textContent=picks.map(shortLabel).join(' · ')+(picks.length<round.answer.length?` ${'○ '.repeat(round.answer.length-picks.length)}`:'');
    find('#scene-undo').disabled=!picks.length;
    find('#scene-sequence-submit').disabled=picks.length!==round.answer.length;
    find('.scene-controls').querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(picks.includes(b.dataset.action))));
    if(game.scene==='classroom'||game.scene==='laundry'||game.scene==='store')find('.cinema-world').querySelectorAll('[data-object]').forEach(el=>el.classList.toggle('object-used',picks.includes(el.dataset.object)));
  }
  function perform(answer,effect='wait'){
    if(locked||actuallyPaused())return;
    const before=getSession(),after=answerRound(before,answer);
    if(after===before)return;
    locked=true;saveSession(after);
    const failed=after.status==='lost';
    action={start:clock.elapsed,duration:motion.matches?600:failed?2300:effect==='wait'?2700:2100,after};
    find('.cinema').dataset.effect=failed?'lost':effect;
    find('.cinema').classList.add('is-acting');
    find('.scene-controls').inert=true;
    find('#scene-cue').textContent='';
    playCue(failed?'lost':effect);
  }
  function openNotebook(){notebook=true;syncPause();find('.scene-notebook').showModal();}
  function updateSound(){const b=find('#cinema-sound');if(!b)return;b.textContent=isSoundOn()?'♫':'♪';b.setAttribute('aria-label',isSoundOn()?'소리 끄기':'소리 켜기');b.setAttribute('aria-pressed',String(isSoundOn()));}
  function syncPause(){
    const root=find('.cinema');if(!root)return;
    root.classList.toggle('is-paused',actuallyPaused());root.classList.toggle('reduce-motion',motion.matches);
    find('.pause-screen').hidden=!paused;find('#cinema-pause').setAttribute('aria-pressed',String(paused));
    find('.scene-controls').inert=locked||actuallyPaused();
  }
  function animate(now){
    if(disposed)return;
    clock=tickScene(clock,now,actuallyPaused());
    if(action&&!actuallyPaused()){
      const progress=Math.min(1,(clock.elapsed-action.start)/action.duration);
      find('.cinema').style.setProperty('--action-progress',progress.toFixed(3));
      find('.cinema').style.setProperty('--veil',Math.sin(progress*Math.PI).toFixed(3));
      find('.cinema').style.setProperty('--fade',Math.max(0,(progress-.65)/.35).toFixed(3));
      if(progress>=1){if(action.after.status==='playing')saveSession(advanceRound(action.after));render(true);}
    }
    const session=getSession();
    if(!locked&&!actuallyPaused()&&session?.status==='playing'){
      const b=Math.floor(clock.elapsed/900);
      if(b!==beat){beat=b;const cycle=b%9;
        if((game.scene==='classroom'&&session.step===1&&cycle<4)||(game.scene==='hotel'&&session.step===0&&cycle<3)||(game.scene==='laundry'&&session.step===1&&cycle<3))playCue(game.scene==='classroom'?'bell':'knock');
        if(game.scene==='phone'&&session.step===0&&cycle<3)playCue('ring');
      }
    }
    frame=requestAnimationFrame(animate);
  }
  document.addEventListener('visibilitychange',()=>{syncPause();updateSound();},{signal});
  motion.addEventListener('change',syncPause,{signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!notebook){e.preventDefault();paused=!paused;syncPause();if(paused)find('#cinema-resume').focus();}},{signal});
  render();frame=requestAnimationFrame(animate);
  return ()=>{disposed=true;cancelAnimationFrame(frame);abort.abort();viewAbort.abort();host.replaceChildren();};
}
