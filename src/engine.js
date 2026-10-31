import { games, gameById } from './games.js';

export const STORAGE_KEY = 'taboo-archive-v1';
export const newLibrary = () => ({version:1, favorites:[], endings:{}, sessions:{}, sound:false});
export const createSession = id => {
  if (!gameById(id)) throw new Error('알 수 없는 기록입니다.');
  return {id, step:0, status:'playing', phase:'decision', history:[]};
};
export function validAnswer(round, answer) {
  if (round.type === 'code') return typeof answer === 'string' && new RegExp(`^\\d{${round.answer.length}}$`).test(answer);
  if (round.type === 'sequence') return Array.isArray(answer) && answer.length === round.answer.length && answer.every(id => round.options.some(option => option.id === id));
  const options = round.type === 'inspect' ? round.objects : round.options;
  return typeof answer === 'string' && options.some(option => option.id === answer);
}
export function answerRound(session, answer) {
  const game = gameById(session.id);
  if (!game || session.status !== 'playing' || session.phase !== 'decision') return session;
  const round = game.rounds[session.step];
  if (!round || !validAnswer(round, answer)) return session;
  const correct = JSON.stringify(answer) === JSON.stringify(round.answer);
  return {...session, phase:'feedback', status:correct ? 'playing' : 'lost', history:[...session.history, {answer:Array.isArray(answer) ? [...answer] : answer, correct}]};
}
export function advanceRound(session) {
  if (session.status !== 'playing' || session.phase !== 'feedback') return session;
  const game = gameById(session.id);
  if (session.step === game.rounds.length - 1) return {...session,status:'escaped'};
  return {...session,step:session.step + 1,phase:'decision'};
}

// Replay saved decisions instead of trusting a stored status, index or outcome.
export function restoreSession(raw, id) {
  const game = gameById(id);
  if (!game || !raw || raw.id !== id || !Array.isArray(raw.history) || raw.history.length > game.rounds.length) return null;
  let session = createSession(id);
  for (let i=0; i<raw.history.length; i++) {
    const entry = raw.history[i];
    if (session.status !== 'playing' || !entry || !validAnswer(game.rounds[session.step],entry.answer)) return null;
    session = answerRound(session,entry.answer);
    if (i < raw.history.length - 1) session = advanceRound(session);
  }
  if (raw.phase === 'decision' || raw.status === 'escaped') session = advanceRound(session);
  if (raw.step !== session.step || raw.phase !== session.phase || raw.status !== session.status) return null;
  return session;
}
export function decodeLibrary(serialized) {
  if (!serialized) return {library:newLibrary(),writable:true,warning:''};
  let raw;
  try { raw = JSON.parse(serialized); } catch { return {library:newLibrary(),writable:false,warning:'저장된 기록을 읽을 수 없어 이번 방문의 기록만 보관해요. 기존 기록은 그대로 두었어요.'}; }
  if (!raw || raw.version !== 1) return {library:newLibrary(),writable:false,warning:'다른 버전의 기록이 있어 이번 방문의 기록만 보관해요. 기존 기록은 그대로 두었어요.'};
  const library = newLibrary();
  library.sound = raw.sound === true;
  library.favorites = [...new Set(Array.isArray(raw.favorites) ? raw.favorites.filter(id => gameById(id)) : [])];
  for (const game of games) {
    const found = raw.endings?.[game.id];
    if (Array.isArray(found)) library.endings[game.id] = [...new Set(found.filter(value => value === 'escaped' || value === 'lost'))];
    const session = restoreSession(raw.sessions?.[game.id],game.id);
    if (session) library.sessions[game.id] = session;
  }
  return {library,writable:true,warning:''};
}
export function recordSession(library, session) {
  library.sessions[session.id] = session;
  if (session.status === 'escaped' || session.status === 'lost') {
    library.endings[session.id] = [...new Set([...(library.endings[session.id] || []),session.status])];
  }
  return library;
}
export const endingCount = library => Object.values(library.endings).reduce((sum, endings) => sum + endings.length,0);
export const escapeCount = library => Object.values(library.endings).filter(endings => endings.includes('escaped')).length;
export function selectGames({category='all',query='',sort='archive',favoritesOnly=false}={},library=newLibrary()) {
  const term = query.trim().toLocaleLowerCase('ko');
  return games.filter(game => (category === 'all' || game.category === category) && (!favoritesOnly || library.favorites.includes(game.id)) && (!term || `${game.title} ${game.summary} ${game.category} ${game.location} ${game.id} ${game.subtitle}`.toLocaleLowerCase('ko').includes(term))).sort((a,b) => sort === 'short' ? a.minutes-b.minutes || Number(a.number)-Number(b.number) : sort === 'fear' ? b.fear-a.fear || Number(a.number)-Number(b.number) : Number(a.number)-Number(b.number));
}
