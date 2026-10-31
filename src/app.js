import {games,gameById} from './games.js';
import {STORAGE_KEY,newLibrary,decodeLibrary,recordSession,selectGames,endingCount,escapeCount} from './engine.js';
import {sceneArt} from './art.js';
import {setSound} from './audio.js';
import {mountCinema} from './cinema.js';

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
let toastTimer, soundEnabled=false, destroyCinema=null;
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
  return `<article class="game-card" style="--accent:${game.accent}"><div class="card-picture"><a href="#game/${game.id}" class="art-link" tabindex="-1" aria-hidden="true">${sceneArt(game.scene,{seed:Number(game.number)})}</a><span class="file-number">FILE_${game.number}</span>${bookmarkButton(game)}<span class="card-status ${endings.includes('escaped')?'is-clear':''}">${endings.includes('escaped')?'귀환 확인':playing?'기록 진행 중':`미확인 기록`}</span><span class="picture-arrow">${icon('arrow')}</span></div><div class="card-body"><div class="card-meta"><span>${game.category}</span><span>${icon('clock')}${game.minutes}분</span></div><h3><a href="#game/${game.id}">${game.title}</a></h3><div class="card-bottom"><span class="fear" aria-label="공포도 ${game.fear}, 3단계 중"><span class="fear-label">공포도</span>${[1,2,3].map(n=>`<i class="${n<=game.fear?'filled':''}"></i>`).join('')}</span><span class="play-link">${playing?'이어서 플레이':'들어가기'} ${icon('arrow')}</span></div></div></article>`;
}
function renderHome() {
  main.innerHTML=`<div class="home-wrap"><section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><div class="eyebrow"><span class="red-dot"></span> 일상에 숨어든 열 가지 괴담</div><h1 id="hero-title">돌아오려면,<br><em>규칙을 기억하세요.</em></h1><p>움직임을 살피고, 직접 행동하세요.</p><div class="hero-actions"><a class="button primary" href="#game/last-train">막차에 오르기 ${icon('arrow')}</a><span class="hero-note">${icon('clock')} 잠깐이면 충분해요.</span></div><div class="hero-stats"><div><strong>10</strong><span>개의 기록</span></div><span class="stat-divider"></span><div><strong>2–4</strong><span>분의 악몽</span></div><span class="stat-divider"></span><div><strong>20</strong><span>개의 결말</span></div></div></div><div class="hero-visual">${sceneArt('train',{seed:7})}<div class="hero-image-top"><span><i class="red-dot"></i> REC</span><span>CAM 01 / 00:13:06</span></div><div class="crosshair top-left"></div><div class="crosshair bottom-right"></div><div class="hero-annotation"><span>01</span><div><small>첫 번째 기록</small><strong>마지막 승객</strong></div><a href="#game/last-train" aria-label="마지막 승객 플레이">${icon('arrow')}</a></div><span class="image-side-note">DO NOT LOOK BEHIND YOU.</span></div></section>
  <aside class="notice"><span class="notice-label">${icon('file')} 열람 전 안내</span><p>장면 속 사물을 눌러 행동하세요. <span>규칙이 기억나지 않으면 수첩을 펼치세요.</span></p><button id="notice-about" type="button" aria-label="열람 안내 자세히 보기">${icon('arrow')}</button></aside>
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
function renderGame(game) {
  destroyCinema=mountCinema(main,game,{
    getSession:()=>library.sessions[game.id],saveSession,
    onSound:toggleSound,isSoundOn:()=>soundEnabled,
    nextId:games[(games.indexOf(game)+1)%games.length].id
  });
}
function openDialog(content) { $('#dialog-content').innerHTML=content; if(!dialog.open)dialog.showModal(); }
function showAbout() {
  openDialog(`<h2 id="dialog-title">열람 전 안내</h2><p>금기록은 익숙한 장소의 이상한 규칙을 따라 살아 돌아오는 짧은 나폴리탄 공포게임 모음입니다. 모든 이야기와 장면은 이 프로젝트를 위해 만들었습니다.</p><ul class="about-list"><li><strong>짧은 열 가지 이야기</strong><span>움직이는 장면 속 사물을 눌러 진행합니다. 시간 제한은 없습니다.</span></li><li><strong>규칙을 기억하세요</strong><span>손잡이·문·전화기·모니터를 직접 조작하세요. 상단 수첩을 열면 세계가 멈추고 규칙을 확인할 수 있습니다.</span></li><li><strong>두 가지 결말</strong><span>각 게임에 귀환과 실종 엔딩이 있습니다. 보관한 기록과 엔딩은 이 브라우저에 저장합니다. 브라우저 데이터를 지우면 기록도 사라집니다.</span></li><li><strong>원하는 만큼의 분위기</strong><span>소리 버튼으로 환경음과 행동음을 켭니다. 일시정지 버튼이나 Esc로 멈출 수 있습니다. 기기의 움직임 줄이기 설정을 따릅니다.</span></li></ul><p class="small-copy">실제 장소·인물과 관련 없는 허구입니다. 기기나 브라우저 간 기록은 자동으로 공유되지 않습니다.</p>`);
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
  destroyCinema?.();destroyCinema=null;
  if(dialog.open)dialog.close();
  const game=location.hash.startsWith('#game/')?activeGame():null;
  document.title=game?`${game.title} — 금기록`:'금기록 — 돌아오려면, 규칙을 기억하세요.';
  document.body.classList.toggle('playing',Boolean(game));
  if(game)renderGame(game);else renderHome();
  $('#archive-link').classList.toggle('active',!game);
  window.scrollTo(0,0);
  main.focus({preventScroll:true});
  if(location.hash.startsWith('#game/')&&!game)notify('찾을 수 없는 기록이에요. 보관소로 돌아왔습니다.');
}
window.addEventListener('hashchange',route);
showWarning(); updateSound(); save(); route();
