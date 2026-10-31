import {games,gameById} from './games.js';
import {STORAGE_KEY,newLibrary,decodeLibrary,createSession,answerRound,advanceRound,recordSession,selectGames,endingCount,escapeCount} from './engine.js';
import {sceneArt} from './art.js';
import {setSound} from './audio.js';

const $ = selector => document.querySelector(selector);
const icons = {
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
  bookmark:'<path d="M6 4h12v17l-6-4-6 4Z"/>',
  volume:'<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="M16 8q5 4 0 8m3-11q8 7 0 14"/>',
  muted:'<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="m17 9 5 6m0-6-5 6"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  file:'<path d="M6 3h9l4 4v14H6Zm9 0v5h4M9 12h7m-7 4h7"/>',
  back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  shuffle:'<path d="M3 6h3c5 0 7 12 12 12h3m-5-4 4 4-4 4M3 18h3c2 0 4-3 5-6m3-5c1-1 2-1 4-1h3m-5-4 4 4-4 4"/>'
};
const icon = (name, extra='') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.file}</svg>`;
const pad = n => String(n).padStart(2,'0');
let library, writable=true, warning='';
try { ({library,writable,warning} = decodeLibrary(localStorage.getItem(STORAGE_KEY))); }
catch { library=newLibrary(); writable=false; warning='브라우저가 저장을 허용하지 않아 이번 방문 동안만 기록이 유지돼요.'; }
// Audio always needs a fresh gesture, even when the previous preference was on.
library.sound=false;
const filters={category:'all',query:'',sort:'archive',favoritesOnly:false};
const ruleVisibility=new Map();
let sequenceInput=[], inspected=null, toastTimer, soundEnabled=false;
const main = $('#content');
const dialog = $('#info-dialog');

function notify(text) {
  $('#toast').textContent=text; $('#toast').hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3500);
}
function save() {
  if (writable) {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(library)); }
    catch { writable=false; warning='브라우저 저장 공간을 사용할 수 없어 이후 기록은 이번 방문 동안만 유지돼요.'; showWarning(); }
  }
  $('#collection-count').textContent=pad(endingCount(library));
}
function showWarning() { $('#storage-warning').hidden=!warning; $('#storage-warning').textContent=warning; }
function activeGame() { return gameById(location.hash.slice(6)); }
function navigate(id) { location.hash=id ? `game/${id}` : ''; }
function saveSession(session) { recordSession(library,session); save(); }
function bookmarkButton(game) {
  const saved=library.favorites.includes(game.id);
  return `<button class="bookmark-button ${saved?'saved':''}" data-bookmark="${game.id}" type="button" aria-label="${game.title} ${saved?'보관 해제':'보관하기'}" aria-pressed="${saved}">${icon('bookmark')}</button>`;
}
function renderCard(game) {
  const endings=library.endings[game.id] || [];
  const playing=library.sessions[game.id]?.status==='playing';
  return `<article class="game-card" style="--accent:${game.accent}"><div class="card-picture"><a href="#game/${game.id}" class="art-link" tabindex="-1" aria-hidden="true">${sceneArt(game.scene,{seed:Number(game.number)})}</a><span class="file-number">FILE_${game.number}</span>${bookmarkButton(game)}<span class="card-status ${endings.includes('escaped')?'is-clear':''}">${endings.includes('escaped')?'귀환 확인':playing?'기록 진행 중':`미확인 기록`}</span><span class="picture-arrow">${icon('arrow')}</span></div><div class="card-body"><div class="card-meta"><span>${game.category}</span><span>${icon('clock')}${game.minutes}분</span></div><h3><a href="#game/${game.id}">${game.title}</a></h3><p>${game.summary}</p><div class="card-bottom"><span class="fear" aria-label="공포도 ${game.fear}, 3단계 중"><span class="fear-label">공포도</span>${[1,2,3].map(n=>`<i class="${n<=game.fear?'filled':''}"></i>`).join('')}</span><span class="play-link">${playing?'이어서 읽기':'기록 열기'} ${icon('arrow')}</span></div></div></article>`;
}
function renderHome() {
  main.innerHTML=`<div class="home-wrap"><section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><div class="eyebrow"><span class="red-dot"></span> 일상에 숨어든 열 가지 괴담</div><h1 id="hero-title">돌아오려면,<br><em>규칙을 기억하세요.</em></h1><p>아무도 없는 막차. 꺼지지 않는 복도.<br>평범했던 장소에, 지켜야 할 규칙이 생겼습니다.</p><div class="hero-actions"><a class="button primary" href="#game/last-train">첫 번째 기록 열기 ${icon('arrow')}</a><span class="hero-note">${icon('clock')} 잠깐이면 충분해요.</span></div><div class="hero-stats"><div><strong>10</strong><span>개의 기록</span></div><span class="stat-divider"></span><div><strong>2–4</strong><span>분의 악몽</span></div><span class="stat-divider"></span><div><strong>20</strong><span>개의 결말</span></div></div></div><div class="hero-visual">${sceneArt('train',{seed:7})}<div class="hero-image-top"><span><i class="red-dot"></i> REC</span><span>CAM 01 / 00:13:06</span></div><div class="crosshair top-left"></div><div class="crosshair bottom-right"></div><div class="hero-annotation"><span>01</span><div><small>첫 번째 기록</small><strong>마지막 승객</strong></div><a href="#game/last-train" aria-label="마지막 승객 플레이">${icon('arrow')}</a></div><span class="image-side-note">DO NOT LOOK BEHIND YOU.</span></div></section>
  <aside class="notice"><span class="notice-label">${icon('file')} 열람 전 안내</span><p>규칙은 끝까지 읽어 주세요. <span>이곳에서는 작은 선택 하나가 결말을 바꿉니다.</span></p><button id="notice-about" type="button" aria-label="열람 안내 자세히 보기">${icon('arrow')}</button></aside>
  <section class="archive" id="archive" aria-labelledby="archive-heading"><div class="section-heading"><div><span class="eyebrow">THE ARCHIVE</span><h2 id="archive-heading">기록 보관소 <span>10</span></h2></div><button class="random-button" id="random-game" type="button">${icon('shuffle')} 운명에 맡기기</button></div>
  <div class="archive-toolbar"><div class="filter-tabs" role="group" aria-label="게임 분류">${[['all','전체 기록'],['규칙 생존','규칙 생존'],['이상 현상','이상 현상'],['심리 공포','심리 공포']].map(([value,label])=>`<button type="button" data-filter="${value}" aria-pressed="${filters.category===value}" class="${filters.category===value?'selected':''}">${label}${value==='all'?'<span>10</span>':''}</button>`).join('')}</div><div class="catalog-tools"><label class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="기록 검색" aria-label="게임 검색" autocomplete="off"></label><label class="sort-label"><span class="sr-only">게임 정렬</span><select id="sort-select"><option value="archive">기록 번호순</option><option value="short">짧은 게임순</option><option value="fear">공포도 높은순</option></select></label></div></div>
  <div class="filter-summary"><p id="result-count" aria-live="polite"></p><label class="saved-filter"><input id="favorites-filter" type="checkbox" ${filters.favoritesOnly?'checked':''}> 보관한 기록만</label></div><div id="game-grid" class="game-grid"></div></section>
  <section class="archive-bottom"><span class="seal-outline" aria-hidden="true">禁</span><div><h2>모든 기록에는 끝이 있습니다.</h2><p>당신이 돌아오는 결말이기를 바랍니다.</p></div><span class="bottom-label">END OF ARCHIVE<br>다음 기록을 기다리며.</span></section></div>`;
  $('#search-input').value=filters.query;
  $('#sort-select').value=filters.sort;
  $('#search-input').addEventListener('input',event=>{filters.query=event.target.value; renderGrid();});
  $('#sort-select').addEventListener('change',event=>{filters.sort=event.target.value; renderGrid();});
  $('#favorites-filter').addEventListener('change',event=>{filters.favoritesOnly=event.target.checked; renderGrid();});
  $('[data-filter]')?.parentElement.addEventListener('click',event=>{const button=event.target.closest('[data-filter]'); if(!button)return; filters.category=button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});renderGrid();});
  $('#random-game').addEventListener('click',()=>navigate(games[Math.floor(Math.random()*games.length)].id));
  $('#notice-about').addEventListener('click',showAbout);
  renderGrid();
}
function renderGrid() {
  const selected=selectGames(filters,library);
  $('#result-count').textContent=`${pad(selected.length)}개의 기록을 찾았습니다`;
  $('#game-grid').innerHTML=selected.length ? selected.map(renderCard).join('') : '<div class="empty-state"><span>∅</span><h3>아직 발견되지 않은 기록입니다.</h3><p>다른 단어로 검색하거나 보관 필터를 해제해 보세요.</p><button type="button" class="button secondary" id="reset-filters">전체 기록 보기</button></div>';
  $('#reset-filters')?.addEventListener('click',()=>{Object.assign(filters,{category:'all',query:'',favoritesOnly:false});renderHome();$('#archive-heading').scrollIntoView({block:'start'});});
}
function renderRules(game) {
  return `<aside class="rules-panel"><details ${ruleVisibility.get(game.id)!==false?'open':''}><summary>${icon('file')} 반드시 지킬 것 <span>−</span></summary><div class="rule-sheet"><span class="paper-label">열람용 사본 / FILE_${game.number}</span><h2>${game.title}<br><em>이용 수칙</em></h2><ol>${game.rules.map(rule=>`<li>${rule}</li>`).join('')}</ol><p class="rule-footnote">기억나지 않으면 다시 읽어도 괜찮습니다.<br>살아 돌아오는 것이 더 중요하니까요.</p><span class="paper-stamp">열람 허가</span></div></details></aside>`;
}
function renderGame(game,focus=false) {
  sequenceInput=[]; inspected=null;
  const session=library.sessions[game.id];
  const round=session ? game.rounds[session.step] : null;
  const finished=session && session.status!=='playing';
  const progress=session ? (session.step + (session.phase==='feedback'?1:0))/game.rounds.length*100 : 0;
  main.innerHTML=`<div class="game-wrap"><div class="game-breadcrumb"><a href="#">${icon('back')} 기록 보관소</a><span>FILE_${game.number} / ${game.subtitle}</span></div><div class="game-heading"><div><div class="eyebrow">${game.category} <span>·</span> 약 ${game.minutes}분</div><h1>${game.title}</h1></div>${bookmarkButton(game)}</div><div class="game-layout"><div class="play-column"><div class="game-stage ${finished?'stage-finished':''}">${sceneArt(game.scene,{seed:Number(game.number)})}<div class="stage-top"><span><i class="red-dot"></i> ${finished?'END OF RECORD':'LIVE'}</span><span>${game.location}</span></div><div class="stage-bottom"><span>${session?`기록 ${pad(session.step+1)} / ${pad(game.rounds.length)}`:'기록을 열기 전'}</span><span>${finished?(session.status==='escaped'?'신호 확인':'신호 소실'):game.subtitle}</span></div></div><div class="progress-track" role="progressbar" aria-label="게임 진행" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div><div class="story-panel" id="story-panel" tabindex="-1">${!session?renderIntro(game):finished?renderEnding(game,session):session.phase==='feedback'?renderFeedback(game,session):renderRound(round)}</div><div class="game-bottom-note">${icon('eye')} ${writable?'진행 상황은 이 브라우저에 자동으로 기록됩니다.':'이번 방문 동안만 기록이 유지됩니다.'}<button class="text-button" id="restart-game" type="button">처음부터</button></div></div>${renderRules(game)}</div></div>`;
  $('.rules-panel details').addEventListener('toggle',event=>ruleVisibility.set(game.id,event.currentTarget.open));
  $('#begin-game')?.addEventListener('click',()=>{saveSession(createSession(game.id));renderGame(game,true);});
  $('#continue-game')?.addEventListener('click',()=>{saveSession(advanceRound(session));renderGame(game,true);});
  $('#replay-game')?.addEventListener('click',()=>{saveSession(createSession(game.id));renderGame(game,true);});
  $('#restart-game')?.addEventListener('click',()=>{
    if(!session || finished) {saveSession(createSession(game.id));renderGame(game,true);return;}
    openDialog('<h2 id="dialog-title">처음으로 돌아갈까요?</h2><p>이 게임의 진행 상황이 처음으로 돌아갑니다. 이미 발견한 엔딩과 보관한 기록은 남습니다.</p><div class="dialog-actions"><button class="button primary" id="confirm-restart" type="button">처음부터 시작</button><button class="button secondary" id="cancel-restart" type="button">계속 플레이</button></div>');
    $('#confirm-restart').addEventListener('click',()=>{dialog.close();saveSession(createSession(game.id));renderGame(game,true);});
    $('#cancel-restart').addEventListener('click',()=>dialog.close());
  });
  if(session?.status==='playing' && session.phase==='decision') bindRound(game,session,round);
  if(focus) $('#story-panel').focus({preventScroll:true});
}
function renderIntro(game) {
  return `<span class="eyebrow">BEFORE YOU ENTER</span><h2>당신에게 남겨진 안내문</h2><p class="story-text">${game.intro}</p><div class="intro-note">${icon('file')} 이용 수칙을 읽고 입장하세요. 플레이 중에도 다시 볼 수 있습니다.</div><button class="button primary full" type="button" id="begin-game">규칙을 읽었습니다 · 입장하기 ${icon('arrow')}</button><p class="control-note">마우스 · 터치 · 키보드로 조작 / 시간 제한 없음</p>`;
}
function renderEvidence(round) {
  return round.evidence?.length ? `<div class="evidence-row">${round.evidence.map(item=>`<div><small>${item.label}</small><strong>${item.value}</strong></div>`).join('')}</div>` : '';
}
function renderRound(round) {
  let controls='';
  if(round.type==='choice') controls=`<div class="choice-list">${round.options.map((option,i)=>`<button type="button" data-answer="${option.id}" class="choice-button"><span class="choice-number">${pad(i+1)}</span><span>${option.label}</span>${icon('arrow')}</button>`).join('')}</div>`;
  if(round.type==='code') controls=`<form id="code-form" class="code-form"><label for="code-input">${round.answer.length}자리 숫자 입력</label><div><input id="code-input" type="text" inputmode="numeric" pattern="[0-9]{${round.answer.length}}" minlength="${round.answer.length}" maxlength="${round.answer.length}" required autocomplete="off" placeholder="${'—'.repeat(round.answer.length)}" aria-describedby="code-help"><button type="submit" class="button primary">입력 ${icon('arrow')}</button></div><p id="code-help">주변 단서와 이용 수칙에서 번호를 확인하세요.</p></form>`;
  if(round.type==='sequence') controls=`<div class="sequence-controls"><p class="control-label">순서대로 선택 · ${round.answer.length}회</p><div class="sequence-slots" id="sequence-slots" aria-live="polite">${round.answer.map(()=>'<span>—</span>').join('')}</div><div class="sequence-buttons">${round.options.map(option=>`<button class="button secondary" type="button" data-sequence="${option.id}">${option.label}</button>`).join('')}</div><div class="sequence-actions"><button type="button" id="undo-sequence" class="text-button" disabled>하나 지우기</button><button type="button" class="button primary" id="submit-sequence" disabled>순서 확정 ${icon('arrow')}</button></div></div>`;
  if(round.type==='inspect') controls=`<div class="inspection"><p class="control-label">각 지점을 눌러 관찰한 뒤 이상이 있는 곳을 선택하세요.</p><div class="inspect-grid">${round.objects.map((object,i)=>`<button type="button" class="inspect-button" data-inspect="${object.id}" aria-pressed="false"><span>${icon('eye')} ${pad(i+1)}</span>${object.label}</button>`).join('')}</div><div id="inspection-detail" class="inspection-detail" aria-live="polite">아직 살펴본 곳이 없습니다.</div><button type="button" class="button primary full" id="submit-inspection" disabled>선택한 이상 신고 ${icon('arrow')}</button></div>`;
  return `<span class="eyebrow">FOLLOW THE RULES</span><h2>${round.title}</h2><p class="story-text">${round.text}</p>${renderEvidence(round)}${controls}`;
}
function bindRound(game,session,round) {
  const submit=answer=>{const next=answerRound(session,answer);if(next===session)return;saveSession(next);renderGame(game,true);};
  document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.answer)));
  $('#code-form')?.addEventListener('submit',event=>{event.preventDefault();if($('#code-form').reportValidity())submit($('#code-input').value);});
  const updateSequence=()=>{
    $('#sequence-slots').innerHTML=round.answer.map((_,i)=>`<span class="${sequenceInput[i]!==undefined?'entered':''}">${sequenceInput[i]!==undefined?round.options.find(option=>option.id===sequenceInput[i]).label:'—'}</span>`).join('');
    $('#submit-sequence').disabled=sequenceInput.length!==round.answer.length;
    $('#undo-sequence').disabled=!sequenceInput.length;
    document.querySelectorAll('[data-sequence]').forEach(button=>button.disabled=sequenceInput.length>=round.answer.length);
  };
  document.querySelectorAll('[data-sequence]').forEach(button=>button.addEventListener('click',()=>{if(sequenceInput.length<round.answer.length){sequenceInput.push(button.dataset.sequence);updateSequence();}}));
  $('#undo-sequence')?.addEventListener('click',()=>{sequenceInput.pop();updateSequence();});
  $('#submit-sequence')?.addEventListener('click',()=>submit([...sequenceInput]));
  document.querySelectorAll('[data-inspect]').forEach(button=>button.addEventListener('click',()=>{
    inspected=button.dataset.inspect;
    document.querySelectorAll('[data-inspect]').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
    $('#inspection-detail').textContent=round.objects.find(object=>object.id===inspected).detail;
    $('#submit-inspection').disabled=false;
  }));
  $('#submit-inspection')?.addEventListener('click',()=>submit(inspected));
}
function renderFeedback(game,session) {
  const round=game.rounds[session.step];
  return `<span class="eyebrow feedback-label">${icon('check')} 아직은, 괜찮습니다.</span><h2>규칙을 지켰습니다.</h2><p class="story-text">${round.success}</p><button type="button" class="button primary full" id="continue-game">${session.step===game.rounds.length-1?'결말 확인하기':'다음 기록으로'} ${icon('arrow')}</button>`;
}
function renderEnding(game,session) {
  const escaped=session.status==='escaped', ending=game[session.status];
  const next=games[(games.indexOf(game)+1)%games.length];
  return `<div class="ending ${escaped?'escaped':'lost'}"><span class="ending-stamp">${escaped?'귀환 확인':'신호 소실'}</span><span class="eyebrow">ENDING ${escaped?'A':'B'} / FILE_${game.number}</span><h2>${ending.title}</h2>${!escaped?`<p class="story-text failure-reason">${game.rounds[session.step].failure}</p>`:''}<p class="story-text">${ending.text}</p><div class="ending-record">${icon('file')} 발견한 결말 ${(library.endings[game.id] || []).length} / 2 <span>·</span> 전체 ${endingCount(library)} / 20</div><div class="ending-actions"><button type="button" class="button secondary" id="replay-game">다시 도전하기</button><a href="#game/${next.id}" class="button primary">다음 게임 ${icon('arrow')}</a></div><a class="ending-home" href="#">기록 보관소로 돌아가기</a></div>`;
}
function openDialog(content) { $('#dialog-content').innerHTML=content; if(!dialog.open)dialog.showModal(); }
function showAbout() {
  openDialog(`<h2 id="dialog-title">열람 전 안내</h2><p>금기록은 익숙한 장소의 이상한 규칙을 따라 살아 돌아오는 짧은 나폴리탄 공포게임 모음입니다. 모든 이야기와 장면은 이 프로젝트를 위해 만들었습니다.</p><ul class="about-list"><li><strong>짧은 열 가지 이야기</strong><span>게임마다 약 2–4분. 읽는 속도에 따라 달라지며 시간 제한은 없습니다.</span></li><li><strong>규칙을 기억하세요</strong><span>선택·관찰·암호·순서 입력으로 진행합니다. 이용 수칙은 언제든 다시 읽을 수 있습니다.</span></li><li><strong>두 가지 결말</strong><span>각 게임에 귀환과 실종 엔딩이 있습니다. 보관한 기록과 엔딩은 이 브라우저에 저장합니다. 브라우저 데이터를 지우면 기록도 사라집니다.</span></li><li><strong>원하는 만큼의 분위기</strong><span>환경음은 직접 켰을 때만 작게 재생됩니다. 갑작스러운 큰 소리나 점멸 효과는 없습니다.</span></li></ul><p class="small-copy">실제 장소·인물과 관련 없는 허구입니다. 기기나 브라우저 간 기록은 자동으로 공유되지 않습니다.</p>`);
}
function showCollection() {
  openDialog(`<h2 id="dialog-title">당신이 남긴 기록</h2><div class="collection-stats"><div><strong>${pad(escapeCount(library))}<small>/ 10</small></strong><span>귀환한 이야기</span></div><div><strong>${pad(endingCount(library))}<small>/ 20</small></strong><span>발견한 결말</span></div></div><div class="collection-list">${games.map(game=>`<a href="#game/${game.id}" class="collection-item"><span class="collection-number">${game.number}</span><span>${game.title}<small>${library.sessions[game.id]?.status==='playing'?'진행 중 · 이어서 플레이':'기록 열기'}</small></span><div><span class="ending-dot ${(library.endings[game.id]||[]).includes('escaped')?'found-good':''}" aria-label="귀환 엔딩 ${(library.endings[game.id]||[]).includes('escaped')?'발견':'미발견'}">귀환</span><span class="ending-dot ${(library.endings[game.id]||[]).includes('lost')?'found-lost':''}" aria-label="실종 엔딩 ${(library.endings[game.id]||[]).includes('lost')?'발견':'미발견'}">실종</span></div></a>`).join('')}</div>`);
  document.querySelectorAll('.collection-item').forEach(link=>link.addEventListener('click',()=>dialog.close()));
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-bookmark]');
  if(!button)return;
  const id=button.dataset.bookmark;
  const wasSaved=library.favorites.includes(id);
  library.favorites=wasSaved?library.favorites.filter(value=>value!==id):[...library.favorites,id];
  save();
  button.classList.toggle('saved',!wasSaved);
  button.setAttribute('aria-pressed',String(!wasSaved));
  button.setAttribute('aria-label',`${gameById(id).title} ${wasSaved?'보관하기':'보관 해제'}`);
  if(!activeGame() && filters.favoritesOnly)renderGrid();
  notify(wasSaved?'보관을 해제했습니다.':'기록을 보관했습니다.');
});
$('#about-button').addEventListener('click',showAbout);
$('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
$('#collection-button').addEventListener('click',showCollection);
$('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)dialog.close();}});
async function toggleSound() {
  const requested=!soundEnabled;
  $('#sound-button').disabled=true;
  const success=await setSound(requested);
  soundEnabled=requested && success;
  library.sound=soundEnabled; save(); updateSound();
  if(requested&&!success)notify('이 브라우저에서는 환경음을 재생할 수 없어요. 게임은 그대로 즐길 수 있습니다.');
  $('#sound-button').disabled=false;
}
function updateSound() {$('#sound-button').innerHTML=`${icon(soundEnabled?'volume':'muted')}<span>소리 ${soundEnabled?'켜짐':'꺼짐'}</span>`;$('#sound-button').setAttribute('aria-label',`환경음 ${soundEnabled?'끄기':'켜기'}`);$('#sound-button').setAttribute('aria-pressed',String(soundEnabled));}
$('#sound-button').addEventListener('click',toggleSound);
document.addEventListener('visibilitychange',()=>{if(document.hidden){soundEnabled=false;library.sound=false;updateSound();}});
function route() {
  if(dialog.open)dialog.close();
  const game=location.hash.startsWith('#game/')?activeGame():null;
  document.title=game?`${game.title} — 금기록`:'금기록 — 돌아오려면, 규칙을 기억하세요.';
  if(game)renderGame(game);else renderHome();
  $('#archive-link').classList.toggle('active',!game);
  window.scrollTo(0,0);
  main.focus({preventScroll:true});
  if(location.hash.startsWith('#game/')&&!game)notify('찾을 수 없는 기록이에요. 보관소로 돌아왔습니다.');
}
window.addEventListener('hashchange',route);
showWarning(); updateSound(); save(); route();
